import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { decryptCredential, encryptCredential } from '../utils/encryption.js'
import { processDeployment } from '../jobs/deployWorker.js'
import { getSupportedPlatforms, isPlatformSupported, testAdapterConnection } from '../services/cms/baseAdapter.js'

const router = express.Router()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const oauthStateStore = new Map()
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

const OAUTH_PLATFORMS = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: 'repo read:user user:email',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    requiresShop: false
  },
  webflow: {
    authUrl: 'https://webflow.com/oauth/authorize',
    tokenUrl: 'https://webflow.com/oauth/access_token',
    scopes: 'cms:read cms:write sites:read',
    clientId: process.env.WEBFLOW_CLIENT_ID,
    clientSecret: process.env.WEBFLOW_CLIENT_SECRET,
    requiresShop: false
  },
  shopify: {
    authUrl: null,
    tokenUrl: null,
    scopes: process.env.SHOPIFY_OAUTH_SCOPES || 'write_content,read_content,read_products',
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    requiresShop: true
  }
}

function isOAuthConfigured(platform) {
  const provider = OAUTH_PLATFORMS[platform]
  if (!provider) return false
  return Boolean(provider.clientId && provider.clientSecret)
}

function cleanupExpiredOAuthState() {
  const now = Date.now()
  for (const [state, data] of oauthStateStore.entries()) {
    if (now - data.createdAt > OAUTH_STATE_TTL_MS) {
      oauthStateStore.delete(state)
    }
  }
}

function makeOAuthState() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getBackendBaseUrl(req) {
  return process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`
}

function buildCallbackUrl(req, platform) {
  if (platform === 'webflow') {
    return `${getBackendBaseUrl(req)}/api/webflow/callback`
  }
  if (platform === 'github') {
    return `${getBackendBaseUrl(req)}/api/github/callback`
  }
  return `${getBackendBaseUrl(req)}/api/deploy/oauth/${platform}/callback`
}

function getGithubRedirectUri(req) {
  const configured = (process.env.GITHUB_REDIRECT_URI || '').trim()
  return configured || null
}

function formatDbError(error, fallbackMessage = 'Database operation failed') {
  const message = error?.message || fallbackMessage
  const missingTableMatch = message.match(/(?:Could not find the table|relation)\s+'?(public\.[a-zA-Z0-9_]+)'?/i)

  if (missingTableMatch?.[1]) {
    return `Missing database table: ${missingTableMatch[1]}. Run server/database/schema.sql in your Supabase SQL editor, then retry.`
  }

  return message
}

function sanitizeShopDomain(rawShop = '') {
  const cleaned = rawShop.trim().toLowerCase().replace(/^https?:\/\//, '')
  const host = cleaned.split('/')[0]
  if (!host) return null
  if (!host.endsWith('.myshopify.com')) return null
  return host
}

function oauthPopupResponse({ success, platform, message, origin }) {
  const safeOrigin = origin || '*'
  const payload = {
    type: 'scenehire:oauth-complete',
    success,
    platform,
    message
  }
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c')

  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 20px;">
    <h3>${success ? 'OAuth connected' : 'OAuth failed'}</h3>
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

async function fetchOAuthIdentity(platform, token, shopDomain) {
  if (platform === 'github') {
    const userResp = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    })
    const userData = userResp.ok ? await userResp.json() : {}
    return {
      platformName: `GitHub (${userData.login || 'Account'})`,
      apiUrl: 'https://api.github.com',
      siteId: userData.id ? String(userData.id) : null
    }
  }

  if (platform === 'webflow') {
    const siteResp = await fetch('https://api.webflow.com/v2/sites', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    })
    const siteData = siteResp.ok ? await siteResp.json() : {}
    const firstSite = siteData.sites?.[0]
    return {
      platformName: `Webflow (${firstSite?.displayName || 'Account'})`,
      apiUrl: 'https://api.webflow.com/v2',
      siteId: firstSite?.id || null
    }
  }

  if (platform === 'shopify') {
    const shopResp = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': token,
        Accept: 'application/json'
      }
    })
    const shopData = shopResp.ok ? await shopResp.json() : {}
    const shopName = shopData.shop?.name || shopDomain
    return {
      platformName: `Shopify (${shopName})`,
      apiUrl: `https://${shopDomain}/admin/api/2024-10`,
      siteId: shopData.shop?.id ? String(shopData.shop.id) : shopDomain
    }
  }

  return {
    platformName: platform,
    apiUrl: '',
    siteId: null
  }
}

async function storeOAuthConnection({ userId, platform, accessToken, refreshToken, metadata }) {
  const encryptedApiKey = encryptCredential(accessToken)
  const encryptedApiSecret = refreshToken ? encryptCredential(refreshToken) : null

  const { data, error } = await supabase
    .from('cms_connections')
    .upsert([{
      user_id: userId,
      platform,
      platform_name: metadata.platformName,
      api_url: metadata.apiUrl,
      api_key: encryptedApiKey,
      api_secret: encryptedApiSecret,
      site_id: metadata.siteId,
      config: {
        auth_type: 'oauth',
        connected_at: new Date().toISOString()
      },
      is_active: true
    }], { onConflict: 'user_id,platform,api_url' })
    .select('id, platform, platform_name, api_url, site_id, is_active, created_at')

  if (error) {
    throw new Error(formatDbError(error, 'Failed to store OAuth connection'))
  }

  return data?.[0]
}

function parseShopDomainFromApiUrl(apiUrl = '') {
  try {
    const normalized = String(apiUrl || '').replace(/\/admin\/api\/.+$/i, '')
    return new URL(normalized).hostname
  } catch {
    return null
  }
}

function normalizeWebflowSiteUrl(site = {}) {
  const candidate = site.previewUrl || site.url || site.homepageUrl || site.defaultDomain || ''
  if (candidate) {
    const normalized = String(candidate).trim()
    if (/^https?:\/\//i.test(normalized)) return normalized
    if (/^[a-z0-9.-]+$/i.test(normalized)) return `https://${normalized}`
  }

  const shortName = String(site.shortName || '').trim()
  if (shortName) return `https://${shortName}.webflow.io`

  return ''
}

async function getLatestOAuthConnection(userId, platform) {
  const { data, error } = await supabase
    .from('cms_connections')
    .select('id, user_id, platform, platform_name, api_url, api_key, site_id, config, is_active, created_at')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(formatDbError(error, 'Failed to fetch OAuth connection'))
  }

  return data?.[0] || null
}

async function fetchOAuthResources({ platform, accessToken, connection }) {
  if (platform === 'webflow') {
    const siteResp = await fetch('https://api.webflow.com/v2/sites', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })
    const siteData = siteResp.ok ? await siteResp.json() : {}
    const sites = siteData.sites || []

    const options = []
    for (const site of sites.slice(0, 10)) {
      const collectionsResp = await fetch(`https://api.webflow.com/v2/sites/${site.id}/collections`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      })
      const collectionsData = collectionsResp.ok ? await collectionsResp.json() : {}
      const collections = collectionsData.collections || []

      for (const collection of collections) {
        options.push({
          id: `${site.id}:${collection.id}`,
          label: `${site.displayName || 'Site'} / ${collection.displayName || collection.name || 'Collection'}`,
          siteId: site.id,
          siteName: site.displayName || 'Site',
          siteUrl: normalizeWebflowSiteUrl(site),
          collectionId: collection.id,
          collectionName: collection.displayName || collection.name || 'Collection',
          type: 'collection'
        })
      }
    }

    return {
      platform,
      kind: 'collection',
      scanSummary: `Found ${options.length} Webflow collection(s)`,
      options
    }
  }

  if (platform === 'shopify') {
    const shopDomain = parseShopDomainFromApiUrl(connection?.api_url)
    if (!shopDomain) {
      throw new Error('Unable to determine Shopify shop domain for this connection')
    }

    const blogsResp = await fetch(`https://${shopDomain}/admin/api/2024-10/blogs.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        Accept: 'application/json'
      }
    })
    const blogsData = blogsResp.ok ? await blogsResp.json() : {}
    const blogs = blogsData.blogs || []

    return {
      platform,
      kind: 'blog',
      scanSummary: `Found ${blogs.length} Shopify blog(s)`,
      options: blogs.map((blog) => ({
        id: String(blog.id),
        label: blog.title || `Blog ${blog.id}`,
        blogId: String(blog.id),
        blogTitle: blog.title || `Blog ${blog.id}`,
        shopDomain,
        type: 'blog'
      }))
    }
  }

  if (platform === 'github') {
    const reposResp = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json'
      }
    })
    const repos = reposResp.ok ? await reposResp.json() : []

    return {
      platform,
      kind: 'repository',
      scanSummary: `Found ${repos.length} GitHub repo(s)`,
      options: repos.map((repo) => ({
        id: repo.full_name,
        label: repo.full_name,
        fullName: repo.full_name,
        owner: repo.owner?.login,
        repo: repo.name,
        defaultBranch: repo.default_branch || 'main',
        contentPath: 'content/posts',
        type: 'repository'
      }))
    }
  }

  throw new Error(`Unsupported OAuth platform for resource scanning: ${platform}`)
}

async function exchangeOAuthCode({ platform, code, req, shopDomain }) {
  const provider = OAUTH_PLATFORMS[platform]
  const redirectUri = buildCallbackUrl(req, platform)

  if (platform === 'github') {
    const redirectUri = getGithubRedirectUri(req)
    const body = {
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code
    }
    if (redirectUri) {
      body.redirect_uri = redirectUri
    }

    const resp = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    })
    const data = await resp.json()
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || 'GitHub token exchange failed')
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token || null }
  }

  if (platform === 'webflow') {
    const body = new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
    const resp = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    const data = await resp.json()
    if (!resp.ok || !data.access_token) {
      throw new Error(data.message || 'Webflow token exchange failed')
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token || null }
  }

  if (platform === 'shopify') {
    const resp = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code
      })
    })
    const data = await resp.json()
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Shopify token exchange failed')
    }
    return { accessToken: data.access_token, refreshToken: null }
  }

  throw new Error('Unsupported OAuth platform')
}

router.get('/oauth/:platform/start', async (req, res) => {
  try {
    cleanupExpiredOAuthState()
    const { platform } = req.params
    const { userId, origin, shop } = req.query

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' })
    }

    const provider = OAUTH_PLATFORMS[platform]
    if (!provider) {
      return res.status(400).json({ success: false, error: `Unsupported OAuth platform: ${platform}` })
    }

    if (!provider.clientId || !provider.clientSecret) {
      return res.status(500).json({
        success: false,
        error: `OAuth is not configured for ${platform}. Missing client credentials.`
      })
    }

    const shopDomain = provider.requiresShop
      ? sanitizeShopDomain(shop || process.env.SHOPIFY_DEFAULT_SHOP_DOMAIN || '')
      : null
    if (provider.requiresShop && !shopDomain) {
      return res.status(400).json({
        success: false,
        error: 'Shopify OAuth requires a valid *.myshopify.com shop domain (or set SHOPIFY_DEFAULT_SHOP_DOMAIN on server)',
        requiresShopDomain: true
      })
    }

    const state = makeOAuthState()
    oauthStateStore.set(state, {
      userId,
      platform,
      createdAt: Date.now(),
      origin: origin || '',
      shopDomain
    })

    const redirectUri = buildCallbackUrl(req, platform)
    let authorizationUrl = ''

    if (platform === 'shopify') {
      const params = new URLSearchParams({
        client_id: provider.clientId,
        scope: provider.scopes,
        redirect_uri: redirectUri,
        state
      })
      authorizationUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`
    } else {
      const params = new URLSearchParams({
        client_id: provider.clientId,
        response_type: 'code',
        state,
        scope: provider.scopes
      })
      if (platform !== 'github') {
        params.set('redirect_uri', redirectUri)
      } else {
        const githubRedirectUri = getGithubRedirectUri(req)
        if (githubRedirectUri) {
          params.set('redirect_uri', githubRedirectUri)
        }
      }
      authorizationUrl = `${provider.authUrl}?${params.toString()}`
    }

    return res.json({ success: true, authorizationUrl })
  } catch (error) {
    console.error('[Deploy OAuth] Start error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/oauth/status', (req, res) => {
  return res.json({
    success: true,
    platforms: Object.keys(OAUTH_PLATFORMS).reduce((acc, platform) => {
      acc[platform] = {
        configured: isOAuthConfigured(platform)
      }
      return acc
    }, {})
  })
})

router.get('/oauth/:platform/callback', async (req, res) => {
  const { platform } = req.params
  const { code, state } = req.query

  try {
    cleanupExpiredOAuthState()

    if (!code || !state) {
      return res.status(400).send(oauthPopupResponse({
        success: false,
        platform,
        message: 'Missing OAuth code/state',
        origin: '*'
      }))
    }

    const stateData = oauthStateStore.get(state)
    if (!stateData || stateData.platform !== platform) {
      return res.status(400).send(oauthPopupResponse({
        success: false,
        platform,
        message: 'Invalid or expired OAuth state',
        origin: '*'
      }))
    }

    oauthStateStore.delete(state)
    const { userId, origin, shopDomain } = stateData
    const tokens = await exchangeOAuthCode({
      platform,
      code,
      req,
      shopDomain
    })

    const identity = await fetchOAuthIdentity(platform, tokens.accessToken, shopDomain)
    await storeOAuthConnection({
      userId,
      platform,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      metadata: identity
    })

    return res.send(oauthPopupResponse({
      success: true,
      platform,
      message: `${platform} OAuth connected successfully`,
      origin
    }))
  } catch (error) {
    console.error('[Deploy OAuth] Callback error:', error)
    const origin = oauthStateStore.get(state)?.origin || '*'
    oauthStateStore.delete(state)
    return res.status(500).send(oauthPopupResponse({
      success: false,
      platform,
      message: error.message,
      origin
    }))
  }
})

router.get('/oauth/:platform/resources', async (req, res) => {
  try {
    const { platform } = req.params
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' })
    }

    if (!OAUTH_PLATFORMS[platform]) {
      return res.status(400).json({ success: false, error: `Unsupported OAuth platform: ${platform}` })
    }

    const connection = await getLatestOAuthConnection(userId, platform)
    if (!connection) {
      return res.status(404).json({ success: false, error: `No active ${platform} OAuth connection found` })
    }

    const accessToken = decryptCredential(connection.api_key)
    const resources = await fetchOAuthResources({ platform, accessToken, connection })

    return res.json({ success: true, ...resources })
  } catch (error) {
    console.error('[Deploy OAuth] Resource scan error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/oauth/:platform/select-target', async (req, res) => {
  try {
    const { platform } = req.params
    const { userId, target } = req.body || {}

    if (!userId || !target) {
      return res.status(400).json({ success: false, error: 'userId and target are required' })
    }

    if (!OAUTH_PLATFORMS[platform]) {
      return res.status(400).json({ success: false, error: `Unsupported OAuth platform: ${platform}` })
    }

    const connection = await getLatestOAuthConnection(userId, platform)
    if (!connection) {
      return res.status(404).json({ success: false, error: `No active ${platform} OAuth connection found` })
    }

    let apiUrl = connection.api_url
    let siteId = connection.site_id
    let platformName = connection.platform_name
    const nextConfig = {
      ...(connection.config || {}),
      auth_type: 'oauth',
      target
    }

    if (platform === 'webflow') {
      apiUrl = `https://api.webflow.com/v2/collections/${target.collectionId}/items`
      siteId = target.siteId || connection.site_id
      platformName = `Webflow (${target.collectionName || 'Collection'})`
    }

    if (platform === 'shopify') {
      apiUrl = `https://${target.shopDomain}/admin/api/2024-10/blogs/${target.blogId}`
      siteId = String(target.blogId)
      platformName = `Shopify (${target.blogTitle || 'Blog'})`
    }

    if (platform === 'github') {
      apiUrl = `https://api.github.com/repos/${target.owner}/${target.repo}`
      siteId = target.fullName
      platformName = `GitHub (${target.fullName})`
    }

    const { data, error } = await supabase
      .from('cms_connections')
      .update({
        api_url: apiUrl,
        site_id: siteId,
        platform_name: platformName,
        config: nextConfig
      })
      .eq('id', connection.id)
      .eq('user_id', userId)
      .select('id, platform, platform_name, api_url, site_id, config, is_active, created_at')

    if (error) {
      throw new Error(formatDbError(error, 'Failed to save OAuth target selection'))
    }

    return res.json({ success: true, connection: data?.[0] || null })
  } catch (error) {
    console.error('[Deploy OAuth] Select target error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/deploy
 * Creates deployment jobs and processes them asynchronously
 * Body: { article, selectedPlatforms, userId }
 */
router.post('/', async (req, res) => {
  try {
    const { article, selectedPlatforms, userId } = req.body

    if (!article || !selectedPlatforms || selectedPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Article and at least one platform required'
      })
    }

    const unsupportedPlatforms = selectedPlatforms.filter(p => !isPlatformSupported(p))
    if (unsupportedPlatforms.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform(s): ${unsupportedPlatforms.join(', ')}`,
        supportedPlatforms: getSupportedPlatforms()
      })
    }

    console.log(`[Deploy] Creating deployment jobs for ${selectedPlatforms.length} platform(s)`)

    // Fetch CMS connections for the user
    const { data: connections, error: fetchError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('platform', selectedPlatforms)

    if (fetchError) {
      console.error('[Deploy] Error fetching connections:', fetchError)
      return res.status(500).json({
        success: false,
        error: formatDbError(fetchError, 'Failed to fetch CMS connections')
      })
    }

    if (!connections || connections.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active CMS connections found for selected platforms'
      })
    }

    // Create deployment_history records with status 'pending'
    const deploymentRecords = connections.map(connection => ({
      user_id: userId,
      platform: connection.platform,
      connection_id: connection.id,
      status: 'pending',
      article_data: article,
      metadata: {
        platform_name: connection.platform_name,
        requested_at: new Date().toISOString()
      }
    }))

    const { data: createdDeployments, error: insertError } = await supabase
      .from('deployment_history')
      .insert(deploymentRecords)
      .select('id, platform, status, created_at')

    if (insertError) {
      console.error('[Deploy] Error creating deployment records:', insertError)
      return res.status(500).json({
        success: false,
        error: formatDbError(insertError, 'Failed to create deployment jobs')
      })
    }

    console.log(`[Deploy] Created ${createdDeployments.length} deployment job(s)`)

    // Trigger background processing (fire and forget)
    // Process each deployment asynchronously without blocking the response
    createdDeployments.forEach(deployment => {
      processDeployment(deployment.id)
        .then(result => {
          console.log(`[Deploy] Background job completed for ${deployment.id}:`, result.success ? '✓' : '✗')
        })
        .catch(error => {
          console.error(`[Deploy] Background job failed for ${deployment.id}:`, error)
        })
    })

    // Return immediately with deployment IDs
    res.json({
      success: true,
      message: 'Deployment jobs created and processing',
      deployments: createdDeployments.map(d => ({
        id: d.id,
        platform: d.platform,
        status: d.status,
        createdAt: d.created_at
      })),
      summary: {
        total: createdDeployments.length,
        status: 'processing'
      }
    })

  } catch (error) {
    console.error('[Deploy] Error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/deploy/status/:deploymentId
 * Check the status of a specific deployment
 * Returns deployment progress for each platform
 */
router.get('/status/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params

    const { data, error } = await supabase
      .from('deployment_history')
      .select('id, platform, status, published_url, platform_article_id, error_message, created_at, published_at, metadata')
      .eq('id', deploymentId)
      .single()

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      })
    }

    // Map status to match expected values (published -> success)
    const mappedStatus = data.status === 'published' ? 'success' : data.status

    res.json({
      deploymentId: data.id,
      platforms: [
        {
          platform: data.platform,
          status: mappedStatus,
          publishedUrl: data.published_url,
          error: data.error_message
        }
      ]
    })

  } catch (error) {
    console.error('[Deploy] Error fetching deployment status:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/deploy/history
 * Get deployment history for a user
 */
router.get('/history', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required'
      })
    }

    const { data, error } = await supabase
      .from('deployment_history')
      .select('id, platform, status, published_url, platform_article_id, created_at, published_at, article_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('[Deploy] Error fetching history:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch deployment history'
      })
    }

    res.json({
      success: true,
      deployments: data || []
    })

  } catch (error) {
    console.error('[Deploy] Error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/deploy/connections
 * Fetch user's connected CMS platforms
 */
router.get('/connections', async (req, res) => {
  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required'
      })
    }

    const { data, error } = await supabase
      .from('cms_connections')
      .select('id, platform, platform_name, api_url, site_id, is_active, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Deploy] Error fetching connections:', error)
      return res.status(500).json({
        success: false,
        error: formatDbError(error, 'Failed to fetch connections')
      })
    }

    res.json({
      success: true,
      connections: data || []
    })

  } catch (error) {
    console.error('[Deploy] Error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/deploy/test-connection
 * Test a CMS connection without saving it
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { platform, apiUrl, apiKey } = req.body

    if (!platform || !apiUrl || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'platform, apiUrl, and apiKey are required'
      })
    }

    if (!isPlatformSupported(platform)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}`,
        supportedPlatforms: getSupportedPlatforms()
      })
    }

    const testResult = await testAdapterConnection(platform, { apiUrl, apiKey })
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error
      })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('[Deploy] Error testing connection:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/deploy/connection
 * Add a new CMS connection with encrypted credentials
 */
router.post('/connection', async (req, res) => {
  try {
    const { userId, platform, platformName, apiUrl, apiKey, apiSecret, siteId, config } = req.body

    if (!userId || !platform || !apiUrl || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'userId, platform, apiUrl, and apiKey are required'
      })
    }

    if (!isPlatformSupported(platform)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}`,
        supportedPlatforms: getSupportedPlatforms()
      })
    }

    // Validate credentials before saving
    const connectionTest = await testAdapterConnection(platform, { apiUrl, apiKey })
    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        error: connectionTest.error || 'Connection test failed'
      })
    }

    console.log(`[Deploy] Creating new ${platform} connection for user ${userId}`)

    // Encrypt API credentials before storing
    let encryptedApiKey
    let encryptedApiSecret = null

    try {
      encryptedApiKey = encryptCredential(apiKey)
      
      if (apiSecret) {
        encryptedApiSecret = encryptCredential(apiSecret)
      }
      
      console.log('[Deploy] ✓ Credentials encrypted')
    } catch (encryptError) {
      console.error('[Deploy] Encryption failed:', encryptError)
      return res.status(500).json({
        success: false,
        error: 'Failed to encrypt credentials'
      })
    }

    // Save to database with encrypted credentials
    const { data, error } = await supabase
      .from('cms_connections')
      .upsert([{
        user_id: userId,
        platform,
        platform_name: platformName || platform,
        api_url: apiUrl,
        api_key: encryptedApiKey,
        api_secret: encryptedApiSecret,
        site_id: siteId || null,
        config: config || {},
        is_active: true
      }], { onConflict: 'user_id,platform,api_url' })
      .select('id, platform, platform_name, api_url, site_id, is_active, created_at')

    if (error) {
      console.error('[Deploy] Error creating connection:', error)
      return res.status(500).json({
        success: false,
        error: formatDbError(error, 'Failed to create connection')
      })
    }

    console.log(`[Deploy] ✓ New ${platform} connection created (credentials encrypted)`)

    // Return connection without encrypted credentials
    res.json({
      success: true,
      connection: data[0]
    })

  } catch (error) {
    console.error('[Deploy] Error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/deploy/connection/:id
 * Soft-disconnect a CMS connection (sets is_active=false)
 */
router.delete('/connection/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.query

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: 'connection id and userId are required'
      })
    }

    const { data, error } = await supabase
      .from('cms_connections')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .select('id')

    if (error) {
      return res.status(500).json({
        success: false,
        error: formatDbError(error, 'Failed to disconnect connection')
      })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found or already disconnected'
      })
    }

    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
