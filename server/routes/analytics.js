import express from 'express'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { decryptCredential, encryptCredential } from '../utils/encryption.js'
import {
  buildSearchConsoleAuthUrl,
  exchangeSearchConsoleCode,
  getSearchConsoleRedirectUri,
  listSearchConsoleProperties,
  querySearchConsole
} from '../middleware/searchConsole.js'
import { generateMarketRecommendations } from '../services/ai/marketRecommendationEngine.js'

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

const oauthStateStore = new Map()
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

function formatDbError(error, fallbackMessage = 'Database operation failed') {
  const message = error?.message || fallbackMessage
  const missingTableMatch = message.match(/(?:Could not find the table|relation)\s+'?(public\.[a-zA-Z0-9_]+)'?/i)
  if (missingTableMatch?.[1]) {
    return `Missing database table: ${missingTableMatch[1]}. Run server/database/schema.sql in your Supabase SQL editor, then retry.`
  }
  return message
}

function cleanupExpiredOAuthState() {
  const now = Date.now()
  for (const [state, data] of oauthStateStore.entries()) {
    if (now - data.createdAt > OAUTH_STATE_TTL_MS) oauthStateStore.delete(state)
  }
}

function makeOAuthState() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function parseDateToken(token, fallbackDate = new Date()) {
  if (!token) return fallbackDate
  if (token === 'today') return new Date()
  const agoMatch = String(token).match(/^(\d+)daysAgo$/)
  if (agoMatch) {
    const date = new Date()
    date.setDate(date.getDate() - Number(agoMatch[1]))
    return date
  }
  const parsed = new Date(token)
  return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed
}

function toDateString(dateLike) {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function buildDateRange(startDate, endDate) {
  const start = parseDateToken(startDate, parseDateToken('30daysAgo'))
  const end = parseDateToken(endDate, new Date())
  return { startDate: toDateString(start), endDate: toDateString(end) }
}

function oauthPopupResponse({ success, message, origin }) {
  const safeOrigin = origin || '*'
  const payload = {
    type: 'scenehire:search-console-oauth-complete',
    success,
    message
  }
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c')

  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 20px;">
    <h3>${success ? 'Google Search Console connected' : 'Google Search Console connection failed'}</h3>
    <p>${message}</p>
    <script>
      (function () {
        var payload = ${serialized};
        if (window.opener) {
          window.opener.postMessage(payload, ${JSON.stringify(safeOrigin)});
        }
        window.close();
      })();
    </script>
  </body>
</html>`
}

function buildPageFilter(pageUrl) {
  return {
    dimensionFilterGroups: [{
      groupType: 'and',
      filters: [{
        dimension: 'page',
        operator: 'equals',
        expression: pageUrl
      }]
    }]
  }
}

function normalizeNumericMetric(value, decimals = 0) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return 0
  if (decimals <= 0) return Math.round(n)
  return Number(n.toFixed(decimals))
}

function dayNameFromDate(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function toLanguageCode(value = '') {
  return String(value || 'unknown').toLowerCase()
}

const LANGUAGE_NAME_TO_CODE = {
  english: 'en',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  portuguese: 'pt',
  japanese: 'ja',
  chinese: 'zh',
  korean: 'ko',
  hindi: 'hi',
  arabic: 'ar',
  italian: 'it',
  russian: 'ru'
}

function getArticleLanguageCode(articleData = {}) {
  const direct = toLanguageCode(
    articleData?.language ||
    articleData?.lang ||
    articleData?.languageCode ||
    articleData?.locale ||
    articleData?.market?.lc ||
    articleData?.market?.lang
  )

  // If we got a language name like "french", normalize it to ISO-like short code.
  const normalized = LANGUAGE_NAME_TO_CODE[direct] || direct
  if (normalized && normalized !== 'unknown') return normalized

  const hreflang = String(articleData?.hreflang || '').trim().toLowerCase()
  if (hreflang.includes('-')) {
    return hreflang.split('-')[0]
  }

  return 'unknown'
}

function getArticleCountry(articleData = {}) {
  const rawCode = String(
    articleData?.market?.code ||
    articleData?.countryCode ||
    articleData?.country_code ||
    ''
  ).trim().toUpperCase()

  const rawName = String(
    articleData?.market?.name ||
    articleData?.country ||
    articleData?.countryName ||
    ''
  ).trim()

  if (rawCode && rawCode.length === 2) {
    return {
      countryCode: rawCode,
      country: COUNTRY_NAME_BY_ALPHA2[rawCode] || rawName || rawCode
    }
  }

  if (rawName) {
    const normalized = normalizeCountryKey(rawName)
    return {
      countryCode: normalized.countryCode,
      country: normalized.country
    }
  }

  return { countryCode: 'UN', country: 'Unknown' }
}

function buildFallbackSuggestedExpansions({ deployments = [], preferredLanguageCodes = null, limit = 3 }) {
  const publishedCountryCodes = new Set()
  const publishedLanguageCodes = new Set()

  for (const row of deployments || []) {
    const country = getArticleCountry(row.article_data)
    const lang = getArticleLanguageCode(row.article_data)
    if (country.countryCode && country.countryCode !== 'UN') publishedCountryCodes.add(country.countryCode)
    if (lang && lang !== 'unknown') publishedLanguageCodes.add(lang)
  }

  const activeLanguageCodes = preferredLanguageCodes && preferredLanguageCodes.size > 0
    ? preferredLanguageCodes
    : publishedLanguageCodes

  const candidates = Object.entries(PRIMARY_LANGUAGE_BY_COUNTRY)
    .filter(([countryCode, lang]) => !publishedCountryCodes.has(countryCode) && activeLanguageCodes.has(lang))
    .map(([countryCode, lang]) => ({
      countryCode,
      country: COUNTRY_NAME_BY_ALPHA2[countryCode] || countryCode,
      languageCode: lang,
      languageAvailable: true,
      demand: 'moderate',
      competition: 'unknown',
      impressions: 0,
      clicks: 0,
      avgPosition: 0,
      articleCoverage: 0,
      score: 1,
      rationale: 'Published content indicates this language is active; this market is a logical next expansion.'
    }))

  return candidates.slice(0, limit)
}

const COUNTRY_CODE_BY_ALPHA3 = {
  usa: 'US', gbr: 'GB', can: 'CA', mex: 'MX', bra: 'BR', arg: 'AR', col: 'CO', chl: 'CL', per: 'PE',
  fra: 'FR', deu: 'DE', esp: 'ES', ita: 'IT', nld: 'NL', bel: 'BE', swe: 'SE', nor: 'NO', fin: 'FI',
  dnk: 'DK', pol: 'PL', che: 'CH', aut: 'AT', irl: 'IE', prt: 'PT', cze: 'CZ', hun: 'HU', rou: 'RO',
  ukr: 'UA', rus: 'RU', tur: 'TR', ind: 'IN', pak: 'PK', bgd: 'BD', lka: 'LK', npl: 'NP',
  chn: 'CN', jpn: 'JP', kor: 'KR', twn: 'TW', hkg: 'HK', sgp: 'SG', mys: 'MY', idn: 'ID',
  tha: 'TH', vnm: 'VN', phl: 'PH', sau: 'SA', are: 'AE', qatar: 'QA', kwt: 'KW', omn: 'OM',
  egy: 'EG', mar: 'MA', zaf: 'ZA', nga: 'NG', ken: 'KE', aus: 'AU', nzl: 'NZ'
}

const COUNTRY_NAME_BY_ALPHA2 = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina',
  CO: 'Colombia', CL: 'Chile', PE: 'Peru', FR: 'France', DE: 'Germany', ES: 'Spain', IT: 'Italy',
  NL: 'Netherlands', BE: 'Belgium', SE: 'Sweden', NO: 'Norway', FI: 'Finland', DK: 'Denmark',
  PL: 'Poland', CH: 'Switzerland', AT: 'Austria', IE: 'Ireland', PT: 'Portugal', CZ: 'Czechia',
  HU: 'Hungary', RO: 'Romania', UA: 'Ukraine', RU: 'Russia', TR: 'Turkey', IN: 'India',
  PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal', CN: 'China', JP: 'Japan',
  KR: 'South Korea', TW: 'Taiwan', HK: 'Hong Kong', SG: 'Singapore', MY: 'Malaysia', ID: 'Indonesia',
  TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines', SA: 'Saudi Arabia', AE: 'United Arab Emirates',
  QA: 'Qatar', KW: 'Kuwait', OM: 'Oman', EG: 'Egypt', MA: 'Morocco', ZA: 'South Africa',
  NG: 'Nigeria', KE: 'Kenya', AU: 'Australia', NZ: 'New Zealand'
}

const PRIMARY_LANGUAGE_BY_COUNTRY = {
  US: 'en', GB: 'en', CA: 'en', MX: 'es', BR: 'pt', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', ES: 'es', IT: 'it', NL: 'nl', BE: 'fr', SE: 'sv', NO: 'no', FI: 'fi',
  DK: 'da', PL: 'pl', CH: 'de', AT: 'de', IE: 'en', PT: 'pt', CZ: 'cs', HU: 'hu', RO: 'ro',
  UA: 'uk', RU: 'ru', TR: 'tr', IN: 'hi', PK: 'ur', BD: 'bn', LK: 'si', NP: 'ne', CN: 'zh',
  JP: 'ja', KR: 'ko', TW: 'zh', HK: 'zh', SG: 'en', MY: 'ms', ID: 'id', TH: 'th', VN: 'vi',
  PH: 'en', SA: 'ar', AE: 'ar', QA: 'ar', KW: 'ar', OM: 'ar', EG: 'ar', MA: 'ar', ZA: 'en',
  NG: 'en', KE: 'en', AU: 'en', NZ: 'en'
}

const TARGET_EXPANSION_COUNTRY_CODES = ['FR', 'DE', 'ES', 'MX', 'BR', 'JP', 'CN', 'KR', 'IN', 'SA', 'IT', 'RU']

function normalizeCountryKey(raw = '') {
  const token = String(raw || '').trim()
  if (!token) return { countryCode: 'UN', country: 'Unknown' }

  let alpha2 = token.toUpperCase()
  if (alpha2.length === 3) {
    alpha2 = COUNTRY_CODE_BY_ALPHA3[alpha2.toLowerCase()] || alpha2.slice(0, 2)
  }

  if (alpha2.length !== 2) {
    return { countryCode: 'UN', country: token }
  }

  return {
    countryCode: alpha2,
    country: COUNTRY_NAME_BY_ALPHA2[alpha2] || alpha2
  }
}

function getCompetitionLabel(avgPosition) {
  const position = Number(avgPosition || 0)
  if (!Number.isFinite(position) || position <= 0) return 'unknown'
  if (position <= 10) return 'high'
  if (position <= 20) return 'medium'
  return 'low'
}

function getDemandLabel(impressions) {
  const value = Number(impressions || 0)
  if (value >= 5000) return 'high'
  if (value >= 1500) return 'medium'
  return 'moderate'
}

function buildCountryRows(rows = []) {
  return (rows || []).map((row) => {
    const normalized = normalizeCountryKey(row.keys?.[0] || 'unknown')
    return {
      countryCode: normalized.countryCode,
      country: normalized.country,
      users: normalizeNumericMetric(row.clicks),
      views: normalizeNumericMetric(row.impressions),
      ctr: normalizeNumericMetric(row.ctr * 100, 2),
      position: normalizeNumericMetric(row.position, 2)
    }
  })
}

function buildEmergingOpportunities({ recentRows = [], previousRows = [], limit = 5 }) {
  const previousMap = new Map(
    previousRows.map((row) => [row.countryCode, Number(row.views || 0)])
  )

  return recentRows
    .map((row) => {
      const previousImpressions = previousMap.get(row.countryCode) || 0
      const growthPct = previousImpressions > 0
        ? ((row.views - previousImpressions) / previousImpressions) * 100
        : (row.views > 0 ? 100 : 0)

      return {
        countryCode: row.countryCode,
        country: row.country,
        impressions: row.views,
        previousImpressions,
        growthPct: normalizeNumericMetric(growthPct, 2),
        avgPosition: row.position,
        competition: getCompetitionLabel(row.position),
        signal: growthPct >= 40 && row.position >= 15
          ? 'Google is testing your content here, but ranking is still weak.'
          : 'Rising interest with room to improve rankings.'
      }
    })
    .filter((row) => row.impressions >= 100 && row.growthPct >= 25 && row.avgPosition >= 15)
    .sort((a, b) => (b.growthPct * 0.7 + b.impressions * 0.01) - (a.growthPct * 0.7 + a.impressions * 0.01))
    .slice(0, limit)
}

function buildSuggestedExpansions({ allMarketRows = [], articleCountryRows = [], publishedLanguageCodes = new Set(), limit = 3 }) {
  const articleCountrySet = new Set(articleCountryRows.map((row) => row.countryCode))
  const articleMap = new Map(articleCountryRows.map((row) => [row.countryCode, row]))

  return allMarketRows
    .map((market) => {
      const languageCode = PRIMARY_LANGUAGE_BY_COUNTRY[market.countryCode] || 'unknown'
      const languageAvailable = publishedLanguageCodes.has(languageCode)
      const articleCoverage = articleMap.get(market.countryCode)?.views || 0
      const demandBoost = market.views * (languageAvailable ? 1 : 1.2)
      const articleGapBoost = articleCoverage > 0 ? 0.85 : 1.15
      const positionBoost = market.position > 10 ? 1.1 : 0.95
      const score = demandBoost * articleGapBoost * positionBoost

      return {
        countryCode: market.countryCode,
        country: market.country,
        demand: getDemandLabel(market.views),
        competition: getCompetitionLabel(market.position),
        languageCode,
        languageAvailable,
        impressions: market.views,
        clicks: market.users,
        avgPosition: market.position,
        articleCoverage,
        score: normalizeNumericMetric(score, 2),
        rationale: languageAvailable
          ? 'Strong demand in Search Console and language support is already available.'
          : 'Strong demand in Search Console with a language gap you can fill for faster growth.'
      }
    })
    .filter((row) => row.impressions >= 300)
    .sort((a, b) => b.score - a.score)
    .filter((row) => !articleCountrySet.has(row.countryCode) || row.competition !== 'high')
    .slice(0, limit)
}

function buildSuggestedExpansionsFromPotential({ seoPotentialByMarket = {}, excludeCountryCodes = new Set(), limit = 3 }) {
  const entries = Object.entries(seoPotentialByMarket || {})
    .map(([countryCodeRaw, value]) => {
      const countryCode = String(countryCodeRaw || '').trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(countryCode)) return null

      const score = normalizeNumericMetric(value?.score, 2)
      const level = String(value?.level || '').trim().toLowerCase()
      const priority = level === 'highest' ? 3 : level === 'medium' ? 2 : level === 'low' ? 1 : 0
      return {
        countryCode,
        country: COUNTRY_NAME_BY_ALPHA2[countryCode] || countryCode,
        demand: score >= 80 ? 'high' : score >= 65 ? 'medium' : 'moderate',
        competition: level === 'highest' ? 'medium' : level === 'medium' ? 'low' : 'unknown',
        languageCode: PRIMARY_LANGUAGE_BY_COUNTRY[countryCode] || 'unknown',
        languageAvailable: true,
        impressions: 0,
        clicks: 0,
        avgPosition: 0,
        articleCoverage: 0,
        score,
        level,
        priority,
        rationale: 'Based on Globalize SEO ranking potential for this article.'
      }
    })
    .filter(Boolean)
    .filter((row) => !excludeCountryCodes.has(row.countryCode))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return b.score - a.score
    })

  const highestOnly = entries.filter((row) => row.priority === 3)
  const ranked = highestOnly.length > 0 ? highestOnly : entries

  return ranked.slice(0, limit)
}

function buildPotentialMapFromRecommendations(recommendations = []) {
  return (recommendations || []).reduce((acc, row) => {
    const code = String(row?.country || '').trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(code)) return acc

    acc[code] = {
      level: String(row?.level || ''),
      score: normalizeNumericMetric(row?.score, 2)
    }
    return acc
  }, {})
}

function normalizeHost(host = '') {
  return String(host || '').trim().toLowerCase().replace(/^www\./, '')
}

function getHostFromUrl(urlString = '') {
  try {
    return normalizeHost(new URL(urlString).hostname)
  } catch {
    return ''
  }
}

function siteUrlMatchesPageUrl(siteUrl, pageUrl) {
  if (!siteUrl || !pageUrl) return false

  if (String(siteUrl).startsWith('sc-domain:')) {
    const domain = normalizeHost(String(siteUrl).replace('sc-domain:', ''))
    const host = getHostFromUrl(pageUrl)
    if (!domain || !host) return false
    return host === domain || host.endsWith(`.${domain}`)
  }

  try {
    const selected = new URL(siteUrl)
    const page = new URL(pageUrl)
    return page.href.startsWith(selected.href)
  } catch {
    return false
  }
}

async function getSearchConsoleConnection(userId) {
  const { data, error } = await supabase
    .from('search_console_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(formatDbError(error, 'Failed to fetch Search Console connection'))
  return data?.[0] || null
}

function decodeTokens(connection) {
  if (!connection?.oauth_tokens_encrypted) {
    throw new Error('Search Console OAuth tokens are missing. Reconnect Google Search Console.')
  }
  const decrypted = decryptCredential(connection.oauth_tokens_encrypted)
  return JSON.parse(decrypted)
}

async function updateConnectionTokens(connectionId, tokens) {
  const encrypted = encryptCredential(JSON.stringify(tokens))
  const { error } = await supabase
    .from('search_console_connections')
    .update({ oauth_tokens_encrypted: encrypted, updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (error) throw new Error(formatDbError(error, 'Failed to refresh Search Console OAuth tokens'))
}

async function upsertSearchConsoleCache(payload) {
  const { error } = await supabase
    .from('search_console_page_metrics')
    .upsert({
      ...payload,
      fetched_at: new Date().toISOString()
    }, { onConflict: 'deployment_id,start_date,end_date' })

  if (error) throw new Error(formatDbError(error, 'Failed to cache Search Console metrics'))
}

async function queryWithConnection({ connection, siteUrl, requestBody }) {
  const tokens = decodeTokens(connection)
  const { payload, refreshedTokens } = await querySearchConsole({ tokens, siteUrl, requestBody })

  if (JSON.stringify(refreshedTokens || {}) !== JSON.stringify(tokens || {})) {
    await updateConnectionTokens(connection.id, refreshedTokens)
  }

  return payload
}

async function syncDeploymentAnalyticsForUser({ userId, startDate = '30daysAgo', endDate = 'today', limit = 100 }) {
  const connection = await getSearchConsoleConnection(userId)
  if (!connection) throw new Error('Google Search Console is not connected for this user')
  if (!connection.selected_site_url) throw new Error('No Search Console property selected. Select a property first.')

  const { data: deployments, error } = await supabase
    .from('deployment_history')
    .select('id, published_url, status')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('published_url', 'is', null)
    .limit(limit)

  if (error) throw new Error(formatDbError(error, 'Failed to fetch deployments for analytics sync'))

  if (!deployments?.length) return { scanned: 0, updated: 0, failed: 0, items: [] }

  const range = buildDateRange(startDate, endDate)
  const items = []
  let updated = 0
  let failed = 0

  for (const deployment of deployments) {
    try {
      const pageUrl = deployment.published_url

      const pagePayload = await queryWithConnection({
        connection,
        siteUrl: connection.selected_site_url,
        requestBody: {
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions: ['page'],
          rowLimit: 1,
          ...buildPageFilter(pageUrl)
        }
      })

      const pageRow = pagePayload?.rows?.[0] || {}
      const clicks = normalizeNumericMetric(pageRow.clicks)
      const impressions = normalizeNumericMetric(pageRow.impressions)
      const ctr = normalizeNumericMetric(pageRow.ctr, 4)
      const position = normalizeNumericMetric(pageRow.position, 2)

      const countriesPayload = await queryWithConnection({
        connection,
        siteUrl: connection.selected_site_url,
        requestBody: {
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions: ['country'],
          rowLimit: 10,
          ...buildPageFilter(pageUrl)
        }
      })

      const queriesPayload = await queryWithConnection({
        connection,
        siteUrl: connection.selected_site_url,
        requestBody: {
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions: ['query'],
          rowLimit: 25,
          ...buildPageFilter(pageUrl)
        }
      })

      const countries = (countriesPayload?.rows || []).map((row) => ({
        country: row.keys?.[0] || 'unknown',
        clicks: normalizeNumericMetric(row.clicks),
        impressions: normalizeNumericMetric(row.impressions),
        ctr: normalizeNumericMetric(row.ctr, 4),
        position: normalizeNumericMetric(row.position, 2)
      }))

      const queries = (queriesPayload?.rows || []).map((row) => ({
        query: row.keys?.[0] || 'unknown',
        clicks: normalizeNumericMetric(row.clicks),
        impressions: normalizeNumericMetric(row.impressions),
        ctr: normalizeNumericMetric(row.ctr, 4),
        position: normalizeNumericMetric(row.position, 2)
      }))

      const keywordRank = {}
      for (const row of queries) keywordRank[row.query] = row.position

      const { error: updateError } = await supabase
        .from('deployment_history')
        .update({
          traffic: impressions,
          clicks,
          impressions,
          keyword_rank: keywordRank,
          last_analytics_update: new Date().toISOString()
        })
        .eq('id', deployment.id)

      if (updateError) throw new Error(formatDbError(updateError, 'Failed to update deployment analytics'))

      await upsertSearchConsoleCache({
        user_id: userId,
        deployment_id: deployment.id,
        published_url: pageUrl,
        site_url: connection.selected_site_url,
        start_date: range.startDate,
        end_date: range.endDate,
        clicks,
        impressions,
        ctr,
        position,
        countries,
        queries
      })

      updated += 1
      items.push({ deploymentId: deployment.id, pageUrl, clicks, impressions, ctr, position, status: 'updated' })
    } catch (syncError) {
      failed += 1
      items.push({ deploymentId: deployment.id, pageUrl: deployment.published_url, status: 'failed', error: syncError.message })
    }
  }

  return { scanned: deployments.length, updated, failed, items }
}

export async function runScheduledDeploymentSync({ startDate = '30daysAgo', endDate = 'today', limit = 100 } = {}) {
  const { data: connections, error } = await supabase
    .from('search_console_connections')
    .select('user_id, selected_site_url')
    .eq('is_active', true)
    .not('selected_site_url', 'is', null)

  if (error) throw new Error(formatDbError(error, 'Failed to fetch Search Console connections for scheduled sync'))

  const users = [...new Set((connections || []).map((row) => row.user_id).filter(Boolean))]
  if (!users.length) return { users: 0, syncedUsers: 0, failedUsers: 0, results: [] }

  const results = []
  let syncedUsers = 0
  let failedUsers = 0

  for (const userId of users) {
    try {
      const result = await syncDeploymentAnalyticsForUser({ userId, startDate, endDate, limit })
      results.push({ userId, success: true, ...result })
      syncedUsers += 1
    } catch (syncError) {
      results.push({ userId, success: false, error: syncError.message })
      failedUsers += 1
    }
  }

  return { users: users.length, syncedUsers, failedUsers, results }
}

router.get('/search-console/oauth/start', async (req, res) => {
  try {
    const { userId, origin } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    cleanupExpiredOAuthState()
    const state = makeOAuthState()
    oauthStateStore.set(state, { userId, origin: origin || null, createdAt: Date.now() })

    const redirectUri = getSearchConsoleRedirectUri(req)
    const authUrl = buildSearchConsoleAuthUrl({ state, redirectUri })

    res.json({ success: true, authUrl, state })
  } catch (error) {
    console.error('[Analytics] Search Console OAuth start failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/search-console/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query

    if (!state || !oauthStateStore.has(state)) {
      return res.status(400).send(oauthPopupResponse({ success: false, message: 'Invalid or expired OAuth state', origin: '*' }))
    }

    const stateData = oauthStateStore.get(state)
    oauthStateStore.delete(state)

    if (oauthError) {
      return res.status(400).send(oauthPopupResponse({ success: false, message: `Google OAuth error: ${oauthError}`, origin: stateData.origin }))
    }

    if (!code) {
      return res.status(400).send(oauthPopupResponse({ success: false, message: 'Authorization code missing from callback', origin: stateData.origin }))
    }

    const redirectUri = getSearchConsoleRedirectUri(req)
    const { tokens } = await exchangeSearchConsoleCode({ code, redirectUri })
    const encryptedTokens = encryptCredential(JSON.stringify(tokens))

    const { properties } = await listSearchConsoleProperties(tokens)
    const selectedSiteUrl = properties?.[0]?.siteUrl || null

    const { error } = await supabase
      .from('search_console_connections')
      .upsert({
        user_id: stateData.userId,
        oauth_tokens_encrypted: encryptedTokens,
        selected_site_url: selectedSiteUrl,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) throw new Error(formatDbError(error, 'Failed to store Search Console OAuth connection'))

    const message = selectedSiteUrl
      ? `Google Search Console connected. Default property selected: ${selectedSiteUrl}`
      : 'Google Search Console connected. No properties available for this account.'

    res.send(oauthPopupResponse({ success: true, message, origin: stateData.origin }))
  } catch (error) {
    console.error('[Analytics] Search Console OAuth callback failed:', error)
    res.status(500).send(oauthPopupResponse({ success: false, message: error.message, origin: '*' }))
  }
})

router.get('/search-console/connection', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection) return res.json({ success: true, connected: false })

    res.json({
      success: true,
      connected: true,
      selectedSiteUrl: connection.selected_site_url,
      updatedAt: connection.updated_at,
      createdAt: connection.created_at
    })
  } catch (error) {
    console.error('[Analytics] Error fetching Search Console connection:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/search-console/properties', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection) return res.status(404).json({ success: false, error: 'Search Console not connected for this user' })

    const tokens = decodeTokens(connection)
    const { properties, refreshedTokens } = await listSearchConsoleProperties(tokens)

    if (JSON.stringify(refreshedTokens || {}) !== JSON.stringify(tokens || {})) {
      await updateConnectionTokens(connection.id, refreshedTokens)
    }

    res.json({ success: true, selectedSiteUrl: connection.selected_site_url, properties })
  } catch (error) {
    console.error('[Analytics] Error listing Search Console properties:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/search-console/property/select', async (req, res) => {
  try {
    const { userId, siteUrl } = req.body || {}
    if (!userId || !siteUrl) return res.status(400).json({ success: false, error: 'userId and siteUrl are required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection) return res.status(404).json({ success: false, error: 'Search Console not connected for this user' })

    const tokens = decodeTokens(connection)
    const { properties, refreshedTokens } = await listSearchConsoleProperties(tokens)

    if (!properties.find((p) => p.siteUrl === siteUrl)) {
      return res.status(400).json({ success: false, error: 'Selected property is not accessible for this user' })
    }

    const { data: deployments, error: deploymentError } = await supabase
      .from('deployment_history')
      .select('published_url')
      .eq('user_id', userId)
      .eq('status', 'published')
      .not('published_url', 'is', null)
      .limit(25)

    if (deploymentError) throw new Error(formatDbError(deploymentError, 'Failed to validate selected property against deployment URLs'))

    const deploymentUrls = (deployments || []).map((d) => d.published_url).filter(Boolean)
    const matchedUrls = deploymentUrls.filter((url) => siteUrlMatchesPageUrl(siteUrl, url))

    if (deploymentUrls.length > 0 && matchedUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Selected Search Console property does not match your deployed domain (example URL: ${deploymentUrls[0]}). Select the property for that domain first.`
      })
    }

    const { error } = await supabase
      .from('search_console_connections')
      .update({ selected_site_url: siteUrl, updated_at: new Date().toISOString() })
      .eq('id', connection.id)

    if (error) throw new Error(formatDbError(error, 'Failed to update selected Search Console property'))

    if (JSON.stringify(refreshedTokens || {}) !== JSON.stringify(tokens || {})) {
      await updateConnectionTokens(connection.id, refreshedTokens)
    }

    res.json({
      success: true,
      selectedSiteUrl: siteUrl,
      propertyValidation: {
        checkedUrls: deploymentUrls.length,
        matchedUrls: matchedUrls.length
      }
    })
  } catch (error) {
    console.error('[Analytics] Error selecting Search Console property:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/deployment-sync/all', async (req, res) => {
  try {
    const requiredKey = process.env.SEARCH_CONSOLE_SYNC_KEY || ''
    const suppliedKey = req.headers['x-cron-key']
    if (requiredKey && suppliedKey !== requiredKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized sync key' })
    }

    const { startDate = '30daysAgo', endDate = 'today', limit = 100 } = req.body || {}
    const result = await runScheduledDeploymentSync({ startDate, endDate, limit })
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('[Analytics] Error running scheduled deployment sync:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/deployment-sync', async (req, res) => {
  try {
    const { userId, startDate = '30daysAgo', endDate = 'today', limit = 100 } = req.body || {}
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const result = await syncDeploymentAnalyticsForUser({ userId, startDate, endDate, limit })
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('[Analytics] Error syncing deployment analytics:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/dashboard', async (req, res) => {
  try {
    const { userId = null, startDate = '30daysAgo', endDate = 'today' } = req.query
    const range = buildDateRange(startDate, endDate)

    let totalClicks = 0
    let totalImpressions = 0
    let markets = []
    let weeklyActivity = []
    let topQueries = []
    let pagePerformance = []
    let recentPublishedArticles = []
    let topMarkets = []
    let emergingOpportunities = []
    let suggestedExpansions = []
    let focusArticle = null
    let dataSource = 'search-console'
    let deploymentRows = []
    let latestPublishedArticle = null

    if (userId) {
      const { data: publishedDeployments, error: publishedDeploymentsError } = await supabase
        .from('deployment_history')
        .select('id, article_data, created_at')
        .eq('user_id', userId)
        .eq('status', 'published')

      if (publishedDeploymentsError) {
        throw new Error(formatDbError(publishedDeploymentsError, 'Failed to fetch published deployments'))
      }

      deploymentRows = publishedDeployments || []
      latestPublishedArticle = [...deploymentRows]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null

      if (latestPublishedArticle?.id) {
        focusArticle = {
          deploymentId: latestPublishedArticle.id,
          title: latestPublishedArticle?.article_data?.localizedTitle || latestPublishedArticle?.article_data?.title || latestPublishedArticle?.article_data?.seoTitle || 'Latest scanned article'
        }
      }

      if (latestPublishedArticle?.article_data?.seoPotentialByMarket) {
        const latestCountry = getArticleCountry(latestPublishedArticle.article_data)
        suggestedExpansions = buildSuggestedExpansionsFromPotential({
          seoPotentialByMarket: latestPublishedArticle.article_data.seoPotentialByMarket,
          excludeCountryCodes: new Set(latestCountry.countryCode ? [latestCountry.countryCode] : []),
          limit: 3
        })

        if (suggestedExpansions.length > 0) {
          dataSource = 'globalize-seo-potential'
        }
      }

      const connection = await getSearchConsoleConnection(userId)
      if (connection?.selected_site_url) {
        try {
          const [summaryPayload, countriesPayload, weeklyPayload, queriesPayload, pagesPayload] = await Promise.all([
            queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody: { startDate: range.startDate, endDate: range.endDate, rowLimit: 1 } }),
            queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody: { startDate: range.startDate, endDate: range.endDate, dimensions: ['country'], rowLimit: 10 } }),
            queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody: { startDate: range.startDate, endDate: range.endDate, dimensions: ['date'], rowLimit: 4000 } }),
            queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody: { startDate: range.startDate, endDate: range.endDate, dimensions: ['query'], rowLimit: 15 } }),
            queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody: { startDate: range.startDate, endDate: range.endDate, dimensions: ['page'], rowLimit: 25 } })
          ])

          const summaryRow = summaryPayload?.rows?.[0] || {}
          totalClicks = normalizeNumericMetric(summaryRow.clicks)
          totalImpressions = normalizeNumericMetric(summaryRow.impressions)

          markets = buildCountryRows(countriesPayload?.rows || [])
          topMarkets = [...markets].sort((a, b) => b.views - a.views).slice(0, 6)

          weeklyActivity = (weeklyPayload?.rows || []).map((row) => {
            const date = row.keys?.[0]
            return {
              date,
              day: dayNameFromDate(date) || 'N/A',
              users: normalizeNumericMetric(row.clicks),
              views: normalizeNumericMetric(row.impressions)
            }
          })

          topQueries = (queriesPayload?.rows || []).map((row) => ({
            query: row.keys?.[0] || 'unknown',
            clicks: normalizeNumericMetric(row.clicks),
            impressions: normalizeNumericMetric(row.impressions),
            ctr: normalizeNumericMetric(row.ctr * 100, 2),
            position: normalizeNumericMetric(row.position, 2)
          }))

          pagePerformance = (pagesPayload?.rows || []).map((row) => ({
            pageUrl: row.keys?.[0] || '',
            clicks: normalizeNumericMetric(row.clicks),
            impressions: normalizeNumericMetric(row.impressions),
            ctr: normalizeNumericMetric(row.ctr * 100, 2),
            position: normalizeNumericMetric(row.position, 2)
          }))

          const end = parseDateToken(range.endDate, new Date())
          const recentWindowDays = 14
          const recentStart = new Date(end)
          recentStart.setDate(recentStart.getDate() - (recentWindowDays - 1))
          const previousEnd = new Date(recentStart)
          previousEnd.setDate(previousEnd.getDate() - 1)
          const previousStart = new Date(previousEnd)
          previousStart.setDate(previousStart.getDate() - (recentWindowDays - 1))

          const [recentCountryPayload, previousCountryPayload] = await Promise.all([
            queryWithConnection({
              connection,
              siteUrl: connection.selected_site_url,
              requestBody: {
                startDate: toDateString(recentStart),
                endDate: toDateString(end),
                dimensions: ['country'],
                rowLimit: 50
              }
            }),
            queryWithConnection({
              connection,
              siteUrl: connection.selected_site_url,
              requestBody: {
                startDate: toDateString(previousStart),
                endDate: toDateString(previousEnd),
                dimensions: ['country'],
                rowLimit: 50
              }
            })
          ])

          emergingOpportunities = buildEmergingOpportunities({
            recentRows: buildCountryRows(recentCountryPayload?.rows || []),
            previousRows: buildCountryRows(previousCountryPayload?.rows || []),
            limit: 5
          })

          const { data: latestArticleMetric } = await supabase
            .from('search_console_page_metrics')
            .select('deployment_id, countries, fetched_at')
            .eq('user_id', userId)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const articleCountryRows = (Array.isArray(latestArticleMetric?.countries) ? latestArticleMetric.countries : [])
            .map((row) => {
              const normalized = normalizeCountryKey(row.country || 'unknown')
              return {
                countryCode: normalized.countryCode,
                country: normalized.country,
                users: normalizeNumericMetric(row.clicks),
                views: normalizeNumericMetric(row.impressions),
                ctr: normalizeNumericMetric(Number(row.ctr || 0) * 100, 2),
                position: normalizeNumericMetric(row.position, 2)
              }
            })

          const publishedLanguageCodes = new Set(
            (deploymentRows || []).map((row) => getArticleLanguageCode(row.article_data)).filter((code) => code && code !== 'unknown')
          )

          if (latestPublishedArticle?.article_data) {
            const latestCountry = getArticleCountry(latestPublishedArticle.article_data)
            if (latestCountry.countryCode && latestCountry.countryCode !== 'UN') {
              const exists = articleCountryRows.some((row) => row.countryCode === latestCountry.countryCode)
              if (!exists) {
                articleCountryRows.push({
                  countryCode: latestCountry.countryCode,
                  country: latestCountry.country,
                  users: 0,
                  views: 0,
                  ctr: 0,
                  position: 0
                })
              }
            }
          }

          if (suggestedExpansions.length === 0) {
            suggestedExpansions = buildSuggestedExpansions({
              allMarketRows: topMarkets.length ? topMarkets : markets,
              articleCountryRows,
              publishedLanguageCodes,
              limit: 3
            })
          }

          if (latestPublishedArticle?.article_data?.seoPotentialByMarket) {
            const latestCountry = getArticleCountry(latestPublishedArticle.article_data)
            const potentialSuggested = buildSuggestedExpansionsFromPotential({
              seoPotentialByMarket: latestPublishedArticle.article_data.seoPotentialByMarket,
              excludeCountryCodes: new Set(latestCountry.countryCode ? [latestCountry.countryCode] : []),
              limit: 3
            })
            if (potentialSuggested.length > 0) {
              suggestedExpansions = potentialSuggested
              dataSource = 'globalize-seo-potential'
            }
          }

          if (suggestedExpansions.length === 0 && (deploymentRows || []).length > 0) {
            const latestLanguage = latestPublishedArticle ? getArticleLanguageCode(latestPublishedArticle.article_data) : 'unknown'
            const preferredLanguageCodes = new Set(latestLanguage && latestLanguage !== 'unknown' ? [latestLanguage] : [])
            suggestedExpansions = buildFallbackSuggestedExpansions({
              deployments: deploymentRows,
              preferredLanguageCodes,
              limit: 3
            })
          }
        } catch (searchConsoleError) {
          console.warn('[Analytics] Search Console dashboard query failed, using fallback data:', searchConsoleError.message)
          if (suggestedExpansions.length === 0) {
            dataSource = 'search-console-error'
          }
        }
      } else if (suggestedExpansions.length === 0) {
        dataSource = 'search-console-not-connected'
      }

      if (suggestedExpansions.length === 0 && (deploymentRows || []).length > 0) {
        // If stored SEO potential is missing, derive market potential from latest article text.
        if (latestPublishedArticle?.article_data) {
          try {
            const articleData = latestPublishedArticle.article_data || {}
            const title = String(articleData.localizedTitle || articleData.title || articleData.seoTitle || '').trim()
            const contentRaw = String(articleData.content || articleData.excerpt || articleData.metaDescription || '').trim()
            const content = contentRaw || title

            if (title && content) {
              const recommendationResult = await generateMarketRecommendations({
                title,
                content,
                countries: TARGET_EXPANSION_COUNTRY_CODES
              })

              const derivedPotentialMap = buildPotentialMapFromRecommendations(recommendationResult?.recommendations || [])
              const latestCountry = getArticleCountry(articleData)
              const derivedSuggested = buildSuggestedExpansionsFromPotential({
                seoPotentialByMarket: derivedPotentialMap,
                excludeCountryCodes: new Set(latestCountry.countryCode ? [latestCountry.countryCode] : []),
                limit: 3
              })

              if (derivedSuggested.length > 0) {
                suggestedExpansions = derivedSuggested
                dataSource = 'globalize-seo-potential-derived'
              }
            }
          } catch (deriveError) {
            console.warn('[Analytics] Failed to derive SEO potential from latest article:', deriveError.message)
          }
        }

        const latestLanguage = latestPublishedArticle ? getArticleLanguageCode(latestPublishedArticle.article_data) : 'unknown'
        const preferredLanguageCodes = new Set(latestLanguage && latestLanguage !== 'unknown' ? [latestLanguage] : [])
        if (suggestedExpansions.length === 0) {
          suggestedExpansions = buildFallbackSuggestedExpansions({
            deployments: deploymentRows,
            preferredLanguageCodes,
            limit: 3
          })
        }
      }

      if (suggestedExpansions.length > 0 && dataSource === 'search-console') {
        dataSource = 'globalize-seo-potential'
      }
    } else {
      dataSource = 'search-console-user-missing'
    }

    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0
    const topMarket = markets[0] || { country: 'N/A', ctr: 0 }

    const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekMap = new Map(weeklyActivity.map((entry) => [entry.day, entry]))
    const normalizedWeek = weekDayNames.map((day) => ({ day, users: weekMap.get(day)?.users || 0, views: weekMap.get(day)?.views || 0 }))

    const { data: deployments, error: deploymentError } = userId
      ? await supabase
        .from('deployment_history')
        .select('article_data, traffic, clicks, impressions, created_at, published_url')
        .eq('user_id', userId)
        .eq('status', 'published')
      : { data: [], error: null }

    if (deploymentError) throw new Error(formatDbError(deploymentError, 'Failed to fetch deployment language metrics'))

    const byLanguage = new Map()
    for (const item of deployments || []) {
      const langCode = getArticleLanguageCode(item.article_data)
      if (!byLanguage.has(langCode)) {
        byLanguage.set(langCode, { code: langCode, users: 0, views: 0, clicks: 0, impressions: 0, ctr: 0 })
      }
      const bucket = byLanguage.get(langCode)
      bucket.users += Number(item.clicks || 0)
      bucket.views += Number(item.impressions || item.traffic || 0)
      bucket.clicks += Number(item.clicks || 0)
      bucket.impressions += Number(item.impressions || 0)
    }

    const languages = [...byLanguage.values()]
      .map((l) => ({ ...l, ctr: l.impressions > 0 ? Number(((l.clicks / l.impressions) * 100).toFixed(2)) : 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    recentPublishedArticles = [...(deployments || [])]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 3)
      .map((item) => {
        const articleData = item.article_data || {}
        const articleCountry = getArticleCountry(articleData)
        return {
          title: articleData.localizedTitle || articleData.seoTitle || articleData.title || 'Untitled Article',
          pageUrl: item.published_url || articleData.publishedUrl || articleData.slug || '',
          translatedCountry: articleCountry.country,
          translatedCountryCode: articleCountry.countryCode,
          languageCode: getArticleLanguageCode(articleData),
          clicks: normalizeNumericMetric(item.clicks),
          impressions: normalizeNumericMetric(item.impressions || item.traffic)
        }
      })

    res.json({
      success: true,
      data: {
        totalViews: totalImpressions,
        totalUsers: totalClicks,
        avgCtr,
        topMarket: { country: topMarket.country, ctr: topMarket.ctr },
        trends: { views: 0, users: 0, ctr: 0, topMarketCtr: 0 },
        markets,
        topMarkets,
        emergingOpportunities,
        suggestedExpansions,
        focusArticle,
        weeklyActivity: normalizedWeek,
        languages,
        recentPublishedArticles,
        topQueries,
        pagePerformance,
        dataSource,
        metricLabels: { totalViews: 'Impressions', totalUsers: 'Clicks' }
      }
    })
  } catch (error) {
    console.error('[Analytics] Error in /dashboard endpoint:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/search-console/page-performance', async (req, res) => {
  try {
    const { userId, startDate = '30daysAgo', endDate = 'today', pageUrl, limit = 25 } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection?.selected_site_url) return res.status(400).json({ success: false, error: 'Search Console property is not connected/selected' })

    const range = buildDateRange(startDate, endDate)
    const requestBody = {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ['page'],
      rowLimit: Math.min(Math.max(Number(limit) || 25, 1), 100)
    }

    if (pageUrl) Object.assign(requestBody, buildPageFilter(pageUrl))

    const payload = await queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody })

    const rows = (payload?.rows || []).map((row) => ({
      pageUrl: row.keys?.[0] || '',
      clicks: normalizeNumericMetric(row.clicks),
      impressions: normalizeNumericMetric(row.impressions),
      ctr: normalizeNumericMetric(row.ctr * 100, 2),
      position: normalizeNumericMetric(row.position, 2)
    }))

    res.json({ success: true, rows })
  } catch (error) {
    console.error('[Analytics] Error fetching Search Console page performance:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/search-console/countries', async (req, res) => {
  try {
    const { userId, startDate = '30daysAgo', endDate = 'today', pageUrl, limit = 20 } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection?.selected_site_url) return res.status(400).json({ success: false, error: 'Search Console property is not connected/selected' })

    const range = buildDateRange(startDate, endDate)
    const requestBody = {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ['country'],
      rowLimit: Math.min(Math.max(Number(limit) || 20, 1), 100)
    }

    if (pageUrl) Object.assign(requestBody, buildPageFilter(pageUrl))

    const payload = await queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody })

    const rows = (payload?.rows || []).map((row) => ({
      country: row.keys?.[0] || 'unknown',
      clicks: normalizeNumericMetric(row.clicks),
      impressions: normalizeNumericMetric(row.impressions),
      ctr: normalizeNumericMetric(row.ctr * 100, 2),
      position: normalizeNumericMetric(row.position, 2)
    }))

    res.json({ success: true, rows })
  } catch (error) {
    console.error('[Analytics] Error fetching Search Console countries:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/search-console/queries', async (req, res) => {
  try {
    const { userId, startDate = '30daysAgo', endDate = 'today', pageUrl, limit = 25 } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection?.selected_site_url) return res.status(400).json({ success: false, error: 'Search Console property is not connected/selected' })

    const range = buildDateRange(startDate, endDate)
    const requestBody = {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ['query'],
      rowLimit: Math.min(Math.max(Number(limit) || 25, 1), 250)
    }

    if (pageUrl) Object.assign(requestBody, buildPageFilter(pageUrl))

    const payload = await queryWithConnection({ connection, siteUrl: connection.selected_site_url, requestBody })

    const rows = (payload?.rows || []).map((row) => ({
      query: row.keys?.[0] || 'unknown',
      clicks: normalizeNumericMetric(row.clicks),
      impressions: normalizeNumericMetric(row.impressions),
      ctr: normalizeNumericMetric(row.ctr * 100, 2),
      position: normalizeNumericMetric(row.position, 2)
    }))

    res.json({ success: true, rows })
  } catch (error) {
    console.error('[Analytics] Error fetching Search Console queries:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/page-metrics', async (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'This endpoint has been retired. Use /api/analytics/deployment-page-metrics for page-level Search Console metrics.'
  })
})

router.get('/pageviews', async (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'This endpoint has been retired. Use /api/analytics/dashboard for Search Console summary metrics.'
  })
})

router.get('/country-traffic', async (req, res) => {
  try {
    const { userId, startDate = '30daysAgo', endDate = 'today', limit = 20 } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })

    const connection = await getSearchConsoleConnection(userId)
    if (!connection?.selected_site_url) return res.status(400).json({ success: false, error: 'Search Console property is not connected/selected' })

    const range = buildDateRange(startDate, endDate)
    const payload = await queryWithConnection({
      connection,
      siteUrl: connection.selected_site_url,
      requestBody: {
        startDate: range.startDate,
        endDate: range.endDate,
        dimensions: ['country'],
        rowLimit: Math.min(Math.max(Number(limit) || 20, 1), 100)
      }
    })

    const rows = payload?.rows || []

    res.json({
      success: true,
      data: rows.map((row) => ({
        country: row.keys?.[0] || 'unknown',
        clicks: normalizeNumericMetric(row.clicks),
        impressions: normalizeNumericMetric(row.impressions),
        ctr: normalizeNumericMetric(row.ctr * 100, 2),
        position: normalizeNumericMetric(row.position, 2)
      }))
    })
  } catch (error) {
    console.error('[Analytics] Error in /country-traffic endpoint:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/saved', async (req, res) => {
  try {
    const { translationId } = req.query
    let query = supabase.from('analytics').select('*')
    if (translationId) query = query.eq('translation_id', translationId)

    const { data, error } = await query
    if (error) return res.status(500).json({ success: false, error: error.message })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/deployment-summary', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const { data: deployments, error } = await supabase
      .from('deployment_history')
      .select('status, traffic, impressions, clicks, published_at')
      .eq('user_id', userId)

    if (error) throw new Error(formatDbError(error, 'Failed to fetch deployment summary'))

    const summary = {
      totalDeployments: deployments.length,
      successfulDeployments: deployments.filter((d) => d.status === 'published').length,
      failedDeployments: deployments.filter((d) => d.status === 'failed').length,
      totalViews: deployments.reduce((sum, d) => sum + Number(d.traffic || 0), 0),
      totalImpressions: deployments.reduce((sum, d) => sum + Number(d.impressions || 0), 0),
      totalClicks: deployments.reduce((sum, d) => sum + Number(d.clicks || 0), 0)
    }

    summary.avgCTR = summary.totalImpressions > 0 ? Number(((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)) : 0

    res.json({ success: true, summary })
  } catch (error) {
    console.error('[Analytics] Error fetching deployment summary:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/deployment-weekly', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: deployments, error } = await supabase
      .from('deployment_history')
      .select('published_at, traffic, clicks')
      .eq('user_id', userId)
      .gte('published_at', sevenDaysAgo.toISOString())
      .order('published_at', { ascending: true })

    if (error) throw new Error(formatDbError(error, 'Failed to fetch weekly deployment analytics'))

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklyData = {}
    dayNames.forEach((day) => {
      weeklyData[day] = { views: 0, clicks: 0 }
    })

    for (const deployment of deployments) {
      if (!deployment.published_at) continue
      const day = dayNames[new Date(deployment.published_at).getDay()]
      weeklyData[day].views += Number(deployment.traffic || 0)
      weeklyData[day].clicks += Number(deployment.clicks || 0)
    }

    res.json({ success: true, weeklyActivity: weeklyData })
  } catch (error) {
    console.error('[Analytics] Error fetching weekly deployment data:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/deployment-by-platform', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const { data: deployments, error } = await supabase
      .from('deployment_history')
      .select('platform, status, traffic, impressions, clicks')
      .eq('user_id', userId)

    if (error) throw new Error(formatDbError(error, 'Failed to fetch deployment platform analytics'))

    const platformStats = {}

    for (const deployment of deployments) {
      if (!platformStats[deployment.platform]) {
        platformStats[deployment.platform] = {
          platform: deployment.platform,
          deployments: 0,
          successful: 0,
          traffic: 0,
          impressions: 0,
          clicks: 0,
          ctr: 0
        }
      }

      const bucket = platformStats[deployment.platform]
      bucket.deployments += 1
      if (deployment.status === 'published') bucket.successful += 1
      bucket.traffic += Number(deployment.traffic || 0)
      bucket.impressions += Number(deployment.impressions || 0)
      bucket.clicks += Number(deployment.clicks || 0)
    }

    for (const platform of Object.keys(platformStats)) {
      const stats = platformStats[platform]
      stats.ctr = stats.impressions > 0 ? Number(((stats.clicks / stats.impressions) * 100).toFixed(2)) : 0
    }

    res.json({ success: true, platforms: Object.values(platformStats) })
  } catch (error) {
    console.error('[Analytics] Error fetching platform analytics:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/deployment-top-performing', async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const { data: deployments, error } = await supabase
      .from('deployment_history')
      .select('platform, article_data, traffic, clicks, impressions, published_url, published_at')
      .eq('user_id', userId)
      .eq('status', 'published')
      .order('traffic', { ascending: false })
      .limit(parseInt(limit, 10))

    if (error) throw new Error(formatDbError(error, 'Failed to fetch top performing deployments'))

    const topPerforming = deployments.map((deployment) => ({
      platform: deployment.platform,
      title: deployment.article_data?.title || 'Untitled',
      url: deployment.published_url,
      views: Number(deployment.traffic || 0),
      clicks: Number(deployment.clicks || 0),
      impressions: Number(deployment.impressions || 0),
      ctr: deployment.impressions > 0 ? Number(((deployment.clicks / deployment.impressions) * 100).toFixed(2)) : 0,
      publishedAt: deployment.published_at
    }))

    res.json({ success: true, topPerforming })
  } catch (error) {
    console.error('[Analytics] Error fetching top performing deployments:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/deployment-page-metrics', async (req, res) => {
  try {
    const { userId, startDate = '30daysAgo', endDate = 'today', limit = 20 } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const range = buildDateRange(startDate, endDate)
    const rowLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

    let metricsQuery = supabase
      .from('search_console_page_metrics')
      .select('deployment_id, published_url, clicks, impressions, ctr, position, countries, fetched_at, start_date, end_date')
      .eq('user_id', userId)
      .eq('start_date', range.startDate)
      .eq('end_date', range.endDate)
      .order('fetched_at', { ascending: false })
      .limit(400)

    let { data: metricsRows, error: metricsError } = await metricsQuery
    if (metricsError) throw new Error(formatDbError(metricsError, 'Failed to fetch cached page-level metrics'))

    if (!metricsRows?.length) {
      const fallback = await supabase
        .from('search_console_page_metrics')
        .select('deployment_id, published_url, clicks, impressions, ctr, position, countries, fetched_at, start_date, end_date')
        .eq('user_id', userId)
        .order('fetched_at', { ascending: false })
        .limit(400)

      metricsRows = fallback.data || []
      metricsError = fallback.error
      if (metricsError) throw new Error(formatDbError(metricsError, 'Failed to fetch fallback page-level metrics'))
    }

    const latestByDeployment = new Map()
    for (const row of metricsRows || []) {
      const key = row.deployment_id || row.published_url
      if (!key || latestByDeployment.has(key)) continue
      latestByDeployment.set(key, row)
    }

    const dedupedRows = [...latestByDeployment.values()]
    const deploymentIds = dedupedRows.map((row) => row.deployment_id).filter(Boolean)

    const titleByDeploymentId = new Map()
    if (deploymentIds.length) {
      const { data: deployments, error: deploymentError } = await supabase
        .from('deployment_history')
        .select('id, article_data, published_url')
        .in('id', deploymentIds)

      if (deploymentError) throw new Error(formatDbError(deploymentError, 'Failed to fetch deployment titles for page metrics'))

      for (const deployment of deployments || []) {
        const title = deployment.article_data?.title || deployment.published_url || 'Untitled article'
        titleByDeploymentId.set(deployment.id, title)
      }
    }

    const rows = dedupedRows
      .map((row) => {
        const countries = Array.isArray(row.countries) ? row.countries : []
        const topCountries = countries
          .map((c) => ({ country: c.country || 'unknown', clicks: normalizeNumericMetric(c.clicks) }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 3)

        return {
          deploymentId: row.deployment_id,
          pageUrl: row.published_url,
          title: titleByDeploymentId.get(row.deployment_id) || row.published_url || 'Untitled article',
          clicks: normalizeNumericMetric(row.clicks),
          impressions: normalizeNumericMetric(row.impressions),
          ctr: normalizeNumericMetric(Number(row.ctr) * 100, 2),
          position: normalizeNumericMetric(row.position, 2),
          topCountries,
          fetchedAt: row.fetched_at,
          startDate: row.start_date,
          endDate: row.end_date
        }
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, rowLimit)

    res.json({ success: true, rows })
  } catch (error) {
    console.error('[Analytics] Error fetching deployment page-level metrics:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
