import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { generateMarketRecommendations } from '../services/ai/marketRecommendationEngine.js'
import { extractArticleFromUrl } from '../services/ai/articleExtractor.js'

const router = express.Router()
const FREE_ARTICLE_LIMIT = Number(process.env.FREE_ARTICLE_LIMIT || 5)
const DEMO_EMAIL_ALLOWLIST = new Set([
  'delvajavon@gmail.com',
  ...String(process.env.UNLIMITED_DEMO_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
])
const inMemoryUsageByUser = new Map()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const MARKET_LANG_CODE = {
  english: 'en',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  portuguese: 'pt',
  italian: 'it',
  japanese: 'ja',
  korean: 'ko',
  chinese: 'zh-CN',
  arabic: 'ar',
  russian: 'ru',
  hindi: 'hi',
  dutch: 'nl',
  polish: 'pl'
}

function inferLanguageCode(market = {}) {
  const raw = String(market.lang || '').trim().toLowerCase()
  return MARKET_LANG_CODE[raw] || 'en'
}

function normalizeSlug(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .split('-')
    .slice(0, 8)
    .join('-')
}

function isUnlimitedDemoAccount(userEmail = '') {
  const normalized = String(userEmail || '').trim().toLowerCase()
  return Boolean(normalized) && (
    DEMO_EMAIL_ALLOWLIST.has(normalized) ||
    normalized.includes('delvajavon') ||
    normalized.includes('javondelva')
  )
}

async function getUserUsageCount(userId = '') {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) return 0

  if (inMemoryUsageByUser.has(normalizedUserId)) {
    return inMemoryUsageByUser.get(normalizedUserId)
  }

  // Prefer durable usage count from the articles table if available.
  try {
    const { count, error } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', normalizedUserId)

    if (!error && Number.isFinite(Number(count))) {
      const safeCount = Number(count)
      inMemoryUsageByUser.set(normalizedUserId, safeCount)
      return safeCount
    }
  } catch {
    // Fall through to in-memory only tracking.
  }

  return 0
}

function incrementUsageCount(userId = '') {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) return 0
  const nextCount = (inMemoryUsageByUser.get(normalizedUserId) || 0) + 1
  inMemoryUsageByUser.set(normalizedUserId, nextCount)
  return nextCount
}

function toParagraphHtml(text = '') {
  return String(text)
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${chunk.replace(/\n/g, ' ')}</p>`)
    .join('')
}

async function translateText(text, targetLang) {
  const source = String(text || '').trim()
  if (!source || targetLang === 'en') return source

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(source)}`
  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!resp.ok) {
    throw new Error(`Translation API failed (${resp.status})`)
  }

  const data = await resp.json().catch(() => null)
  const translated = Array.isArray(data?.[0])
    ? data[0].map((part) => Array.isArray(part) ? part[0] : '').join('')
    : ''

  if (!translated) {
    throw new Error('Translation API returned empty text')
  }

  return translated
}

async function fallbackLocalize({ sourceTitle, sourceContent, markets }) {
  const shortDescription = String(sourceContent).replace(/\s+/g, ' ').slice(0, 150)
  const excerptSeed = String(sourceContent).replace(/\s+/g, ' ').slice(0, 220)
  const contentSeed = String(sourceContent).slice(0, 5000)

  const localized = await Promise.all(markets.map(async (market) => {
    const langCode = inferLanguageCode(market)

    const [localizedTitle, metaDescription, excerpt, culturalNote, localizedBody] = await Promise.all([
      translateText(sourceTitle, langCode).catch(() => sourceTitle),
      translateText(shortDescription, langCode).catch(() => shortDescription),
      translateText(excerptSeed, langCode).catch(() => excerptSeed),
      translateText(`Adapt wording, examples, and tone for readers in ${market.name}.`, langCode).catch(() => `Adapted for ${market.name} audience.`),
      translateText(contentSeed, langCode).catch(() => contentSeed)
    ])

    const keywords = [
      localizedTitle.split(/\s+/).slice(0, 2).join(' '),
      localizedTitle.split(/\s+/).slice(2, 4).join(' '),
      String(market.name || ''),
      'guide',
      '2026'
    ].map((k) => k.trim()).filter(Boolean).slice(0, 5)

    return {
      countryCode: market.code,
      localizedTitle,
      seoTitle: localizedTitle.slice(0, 60),
      metaDescription: metaDescription.slice(0, 160),
      keywords,
      slug: normalizeSlug(localizedTitle || sourceTitle) || normalizeSlug(sourceTitle),
      excerpt,
      culturalNote,
      localizedBodyHtml: toParagraphHtml(localizedBody)
    }
  }))

  return localized
}

/**
 * POST /api/ai/market-recommendations
 * Body: { title, content }
 */
router.post('/market-recommendations', async (req, res) => {
  try {
    const { title, content, countries } = req.body

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'title and content are required'
      })
    }

    const result = await generateMarketRecommendations({ title, content, countries })

    return res.json({
      recommendations: result.recommendations
    })
  } catch (error) {
    console.error('[AI] Error generating market recommendations:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/ai/extract-article
 * Body: { url }
 */
router.post('/extract-article', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'url is required'
      })
    }

    const article = await extractArticleFromUrl(url)
    return res.json(article)
  } catch (error) {
    console.error('[AI] Error extracting article:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/ai/localize-content
 * Body: { sourceTitle, sourceContent, sourceUrl, markets }
 */
router.post('/localize-content', async (req, res) => {
  try {
    const {
      sourceTitle = '',
      sourceContent = '',
      sourceUrl = '',
      markets = [],
      userId = '',
      userEmail = ''
    } = req.body || {}

    const normalizedUserId = String(userId || '').trim()
    if (!normalizedUserId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      })
    }

    const unlimitedDemo = isUnlimitedDemoAccount(userEmail)
    if (!unlimitedDemo) {
      const currentUsage = await getUserUsageCount(normalizedUserId)
      if (currentUsage >= FREE_ARTICLE_LIMIT) {
        return res.status(402).json({
          success: false,
          code: 'USAGE_LIMIT_REACHED',
          error: `Free plan limit reached (${FREE_ARTICLE_LIMIT} articles). Please upgrade your plan.`,
          usage: {
            current: currentUsage,
            limit: FREE_ARTICLE_LIMIT,
            unlimited: false
          }
        })
      }
    }

    if (!sourceTitle || !sourceContent || !Array.isArray(markets) || markets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sourceTitle, sourceContent, and non-empty markets array are required'
      })
    }

    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)

    const prompt = `You are SceneHire's senior localization editor.
Source URL: ${sourceUrl || 'N/A'}
Source title: ${sourceTitle}
Source content:\n${sourceContent.slice(0, 12000)}

Target markets: ${markets.map((m) => `${m.code} (${m.lang}, ${m.name})`).join(', ')}

Return ONLY a valid JSON array. One object per market:
- countryCode: 2-letter country code
- localizedTitle: native-feeling headline in target language (max 60 chars)
- seoTitle: SEO title in target language (50-60 chars)
- metaDescription: persuasive meta description in target language (140-160 chars)
- keywords: array of 5 SEO keywords in target language
- slug: latin-only 3-8 words, hyphen-separated
- excerpt: 1-2 sentence summary in target language
- culturalNote: specific localization adaptation detail for that country
- localizedBodyHtml: full translated/adapted article body HTML with <p>, optional <h2>/<h3>, and natural native tone

Hard requirements:
- Keep factual meaning from source
- Avoid generic filler and cliches
- Use native spelling/idioms for each market
- Output must be parseable JSON with double quotes`

    if (hasAnthropic) {
      try {
        const anthResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
            max_tokens: 6000,
            messages: [{ role: 'user', content: prompt }]
          })
        })

        const anthData = await anthResp.json().catch(() => ({}))
        if (anthResp.ok) {
          const rawText = (anthData.content || []).map((block) => block?.text || '').join('')
          const jsonText = rawText.replace(/```json|```/g, '').trim()
          const localized = JSON.parse(jsonText)
          const nextUsage = unlimitedDemo ? null : incrementUsageCount(normalizedUserId)
          return res.json({
            success: true,
            localized,
            provider: 'anthropic',
            usage: {
              current: unlimitedDemo ? 'unlimited' : nextUsage,
              limit: FREE_ARTICLE_LIMIT,
              unlimited: unlimitedDemo
            }
          })
        }

        console.warn('[AI] Anthropic localization failed, falling back to MT:', anthData?.error?.message || anthData?.message || anthResp.status)
      } catch (anthropicError) {
        console.warn('[AI] Anthropic localization error, falling back to MT:', anthropicError.message)
      }
    }

    const localized = await fallbackLocalize({ sourceTitle, sourceContent, markets })
    const nextUsage = unlimitedDemo ? null : incrementUsageCount(normalizedUserId)
    return res.json({
      success: true,
      localized,
      provider: 'fallback-translate',
      warning: 'Using machine translation fallback (Anthropic unavailable)',
      usage: {
        current: unlimitedDemo ? 'unlimited' : nextUsage,
        limit: FREE_ARTICLE_LIMIT,
        unlimited: unlimitedDemo
      }
    })
  } catch (error) {
    console.error('[AI] Error localizing content:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

export default router
