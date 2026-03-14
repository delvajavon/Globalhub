const DEFAULT_COUNTRIES = ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'IN', 'BR', 'JP', 'KR']

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'for', 'with', 'from', 'that',
  'this', 'these', 'those', 'into', 'about', 'over', 'under', 'after', 'before', 'between', 'without',
  'you', 'your', 'ours', 'their', 'they', 'them', 'was', 'were', 'are', 'is', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'may', 'might', 'will',
  'to', 'of', 'in', 'on', 'at', 'by', 'as', 'it', 'its', 'we', 'our', 'i', 'me', 'my'
])

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function parseTrendsJson(rawText) {
  // Google Trends prepends a JSON guard sequence. Strip it before parsing.
  const sanitized = rawText.replace(/^\)\]\}',?\n?/, '')
  return JSON.parse(sanitized)
}

export function extractKeywords(title = '', content = '', limit = 6) {
  const merged = `${title || ''} ${content || ''}`.toLowerCase()
  const terms = merged
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))

  const unigramCounts = new Map()
  for (const term of terms) {
    unigramCounts.set(term, (unigramCounts.get(term) || 0) + 1)
  }

  const bigramCounts = new Map()
  for (let i = 0; i < terms.length - 1; i += 1) {
    const first = terms[i]
    const second = terms[i + 1]
    if (STOP_WORDS.has(first) || STOP_WORDS.has(second)) {
      continue
    }
    const bigram = `${first} ${second}`
    bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1)
  }

  const combined = [
    ...Array.from(unigramCounts.entries()),
    ...Array.from(bigramCounts.entries()).map(([term, count]) => [term, count + 0.5])
  ]

  return combined
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term)
}

function deterministicFallback(keyword, country) {
  const input = `${keyword}:${country}`
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash |= 0
  }

  const seed = Math.abs(hash)
  const demand = 35 + (seed % 55)
  const trendMomentum = 30 + ((Math.floor(seed / 7) % 60))
  const saturation = 40 + ((Math.floor(seed / 13) % 50))

  return {
    demand,
    trendMomentum,
    saturation,
    series: []
  }
}

async function fetchTrendsTimeSeries(keyword, country) {
  const req = {
    comparisonItem: [
      { keyword, geo: country, time: 'today 1-m' }
    ],
    category: 0,
    property: ''
  }

  const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`

  const exploreResp = await fetch(exploreUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 GlobalHub/1.0',
      Accept: 'application/json,text/plain,*/*'
    }
  })

  if (!exploreResp.ok) {
    throw new Error(`Google Trends explore failed (${exploreResp.status})`)
  }

  const exploreData = parseTrendsJson(await exploreResp.text())
  const widget = (exploreData.widgets || []).find((item) => item.id === 'TIMESERIES')
  if (!widget?.token || !widget?.request) {
    throw new Error('Google Trends timeseries widget not found')
  }

  const multilineUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${encodeURIComponent(widget.token)}`

  const multilineResp = await fetch(multilineUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 GlobalHub/1.0',
      Accept: 'application/json,text/plain,*/*'
    }
  })

  if (!multilineResp.ok) {
    throw new Error(`Google Trends multiline failed (${multilineResp.status})`)
  }

  const multilineData = parseTrendsJson(await multilineResp.text())
  const timeline = multilineData.default?.timelineData || []
  const series = timeline
    .map((item) => Number(item.value?.[0] ?? 0))
    .filter((value) => Number.isFinite(value))

  if (series.length === 0) {
    throw new Error('Google Trends returned empty timeline')
  }

  const avgDemand = series.reduce((sum, value) => sum + value, 0) / series.length
  const midpoint = Math.max(1, Math.floor(series.length / 2))
  const firstHalf = series.slice(0, midpoint)
  const secondHalf = series.slice(midpoint)
  const firstAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, value) => sum + value, 0) / Math.max(1, secondHalf.length)
  const delta = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : secondAvg
  const trendMomentum = clamp(50 + (delta * 0.8))
  const highPeaks = series.filter((value) => value >= 70).length
  const saturation = clamp((avgDemand * 0.7) + ((highPeaks / series.length) * 30))

  return {
    demand: clamp(avgDemand),
    trendMomentum,
    saturation,
    series
  }
}

async function getTrendSnapshot(keyword, country) {
  try {
    return await fetchTrendsTimeSeries(keyword, country)
  } catch (error) {
    console.warn(`[AI] Using fallback trends for ${keyword}/${country}:`, error.message)
    return deterministicFallback(keyword, country)
  }
}

function estimateCompetition(keywords, saturation) {
  const safeKeywords = keywords.length > 0 ? keywords : ['topic']
  const avgWordCount = safeKeywords
    .map((keyword) => keyword.split(/\s+/).filter(Boolean).length)
    .reduce((sum, size) => sum + size, 0) / safeKeywords.length
  const avgCharCount = safeKeywords
    .map((keyword) => keyword.replace(/\s+/g, '').length)
    .reduce((sum, size) => sum + size, 0) / safeKeywords.length

  // Long-tail keywords generally reduce competition.
  const longTailBoost = clamp((((avgWordCount - 1) / 4) * 60) + (((avgCharCount - 8) / 24) * 40), 0, 100)
  const lengthCompetition = 100 - longTailBoost

  return clamp((lengthCompetition * 0.5) + (saturation * 0.5))
}

function classifySeoLevel(score) {
  if (score >= 80) {
    return 'Highest'
  }
  if (score >= 50) {
    return 'Medium'
  }
  return 'Low'
}

function calculateSeoPotentialScore(demand, trendMomentum, competitionInverse) {
  const weightedDemand = demand * 0.4
  const weightedTrendMomentum = trendMomentum * 0.4
  const weightedCompetitionInverse = competitionInverse * 0.2

  // Keep score on a 0-100 scale while preserving the multiplicative model.
  const raw = weightedDemand * weightedTrendMomentum * weightedCompetitionInverse
  const maxRaw = 40 * 40 * 20
  const normalized = raw / maxRaw

  // Geometric scaling avoids collapsing most practical combinations near zero.
  return Math.round(Math.pow(normalized, 1 / 3) * 100)
}

export async function generateMarketRecommendations({ title = '', content = '', countries = DEFAULT_COUNTRIES }) {
  const keywords = extractKeywords(title, content)
  if (keywords.length === 0) {
    return {
      keywords: [],
      recommendations: countries.map((country) => ({
        country,
        score: 0,
        level: 'Low'
      }))
    }
  }

  const recommendations = await Promise.all(
    countries.map(async (country) => {
      const snapshots = await Promise.all(
        keywords.slice(0, 4).map((keyword) => getTrendSnapshot(keyword, country))
      )

      const avgDemand = snapshots.reduce((sum, row) => sum + row.demand, 0) / snapshots.length
      const avgTrendMomentum = snapshots.reduce((sum, row) => sum + row.trendMomentum, 0) / snapshots.length
      const avgSaturation = snapshots.reduce((sum, row) => sum + row.saturation, 0) / snapshots.length

      const competition = estimateCompetition(keywords, avgSaturation)
      const competitionInverse = clamp(100 - competition)
      const score = clamp(calculateSeoPotentialScore(avgDemand, avgTrendMomentum, competitionInverse), 0, 100)

      return {
        country,
        score,
        level: classifySeoLevel(score)
      }
    })
  )

  recommendations.sort((a, b) => b.score - a.score)

  return {
    keywords,
    recommendations
  }
}
