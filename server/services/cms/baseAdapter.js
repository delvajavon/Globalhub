const adapterLoaders = {
  wordpress: () => import('./wordpress.js'),
  ghost: () => import('./ghost.js'),
  github: () => import('./github.js'),
  webflow: () => import('./webflow.js'),
  shopify: () => import('./shopify.js')
}

export function getSupportedPlatforms() {
  return Object.keys(adapterLoaders)
}

export function isPlatformSupported(platform) {
  return Boolean(adapterLoaders[platform])
}

export async function getAdapter(platform) {
  const loadAdapter = adapterLoaders[platform]
  if (!loadAdapter) {
    throw new Error(`No adapter found for platform: ${platform}`)
  }

  const module = await loadAdapter()
  if (typeof module.deployArticle !== 'function') {
    throw new Error(`Adapter ${platform} does not export deployArticle()`)
  }

  return module
}

export async function testAdapterConnection(platform, credentials) {
  const adapter = await getAdapter(platform)

  if (typeof adapter.testConnection !== 'function') {
    return { success: true }
  }

  const result = await adapter.testConnection(credentials)
  if (!result || typeof result !== 'object') {
    return { success: false, error: `[${platform}] testConnection returned invalid result` }
  }

  if (result.success) {
    return { success: true }
  }

  return {
    success: false,
    error: result.error || `[${platform}] Connection test failed`
  }
}

export function assertDeployPayload(payload, platform) {
  const required = ['apiUrl', 'apiKey', 'title', 'content', 'slug', 'status', 'metaTitle', 'metaDescription']
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null) {
      throw new Error(`[${platform}] Missing required field: ${key}`)
    }
  }
}

export function normalizeResult(result, platform) {
  if (!result || typeof result !== 'object') {
    return { success: false, error: `[${platform}] Adapter returned invalid result` }
  }

  if (!result.success) {
    return {
      success: false,
      error: result.error || `[${platform}] Deployment failed`
    }
  }

  return {
    success: true,
    url: result.url,
    platformArticleId: result.platformArticleId
  }
}
