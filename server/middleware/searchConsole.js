import { google } from 'googleapis'

const SEARCH_CONSOLE_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly'
]

function createOAuthClient(redirectUri) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getSearchConsoleRedirectUri(req) {
  const configured = (process.env.GOOGLE_SC_REDIRECT_URI || '').trim()
  if (configured) return configured
  return `${req.protocol}://${req.get('host')}/api/analytics/search-console/oauth/callback`
}

export function buildSearchConsoleAuthUrl({ state, redirectUri }) {
  const oauth2Client = createOAuthClient(redirectUri)
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SEARCH_CONSOLE_SCOPES,
    state,
    include_granted_scopes: true
  })
}

export async function exchangeSearchConsoleCode({ code, redirectUri }) {
  const oauth2Client = createOAuthClient(redirectUri)
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)
  return { tokens }
}

async function getAccessTokenFromTokens(tokens) {
  const oauth2Client = createOAuthClient(process.env.GOOGLE_SC_REDIRECT_URI || 'http://localhost')
  oauth2Client.setCredentials(tokens)
  const response = await oauth2Client.getAccessToken()
  const accessToken = typeof response === 'string' ? response : response?.token

  if (!accessToken) {
    throw new Error('Unable to acquire Google access token for Search Console')
  }

  return {
    accessToken,
    refreshedTokens: oauth2Client.credentials || tokens
  }
}

async function callSearchConsoleApi({ method = 'GET', endpoint, accessToken, body }) {
  const response = await fetch(`https://searchconsole.googleapis.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const apiMessage = payload?.error?.message || payload?.message || `Search Console API error (${response.status})`
    throw new Error(apiMessage)
  }

  return payload
}

export function toSearchConsoleSitePath(siteUrl) {
  return encodeURIComponent(siteUrl)
}

export async function listSearchConsoleProperties(tokens) {
  const { accessToken, refreshedTokens } = await getAccessTokenFromTokens(tokens)

  const payload = await callSearchConsoleApi({
    endpoint: '/webmasters/v3/sites',
    accessToken
  })

  const properties = (payload.siteEntry || []).map((site) => ({
    siteUrl: site.siteUrl,
    permissionLevel: site.permissionLevel
  }))

  return {
    properties,
    refreshedTokens
  }
}

export async function querySearchConsole({ tokens, siteUrl, requestBody }) {
  const { accessToken, refreshedTokens } = await getAccessTokenFromTokens(tokens)

  const payload = await callSearchConsoleApi({
    method: 'POST',
    endpoint: `/webmasters/v3/sites/${toSearchConsoleSitePath(siteUrl)}/searchAnalytics/query`,
    accessToken,
    body: requestBody
  })

  return {
    payload,
    refreshedTokens
  }
}
