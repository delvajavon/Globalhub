import { assertDeployPayload, normalizeResult } from './baseAdapter.js'

export async function deployArticle(input) {
  assertDeployPayload(input, 'webflow')

  const {
    apiUrl,
    apiKey,
    siteId,
    target,
    title,
    content,
    slug,
    status,
    metaTitle,
    metaDescription
  } = input

  try {
    const endpoint = await normalizeWebflowEndpoint(apiUrl, {
      apiKey,
      siteId,
      targetCollectionId: target?.collectionId
    })
    const collectionId = extractCollectionId(endpoint)
    const collectionSchema = await fetchCollectionSchema(collectionId, apiKey)
    const fieldData = buildFieldData({
      schema: collectionSchema,
      title,
      slug,
      content,
      metaTitle,
      metaDescription
    })

    const payload = {
      isArchived: false,
      isDraft: status !== 'published',
      fieldData
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const details = extractWebflowErrorDetails(body)
      throw new Error(`Webflow API error: ${response.status} - ${details || body.message || response.statusText}`)
    }

    const result = await response.json()
    const item = result?.item || result
    const siteUrl = await resolveWebflowSiteUrl({ target, apiKey })
    const publishedUrl = resolveWebflowPublishedUrl({ item, endpoint, siteUrl, slug })

    return normalizeResult({
      success: true,
      url: publishedUrl,
      platformArticleId: item?.id || item?._id,
      publishedAt: item?.createdOn || new Date().toISOString()
    }, 'webflow')
  } catch (error) {
    return normalizeResult({ success: false, error: error.message }, 'webflow')
  }
}

function resolveWebflowPublishedUrl({ item, endpoint, siteUrl, slug }) {
  const apiHost = /^https?:\/\/api\.webflow\.com\//i
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
  const itemFieldUrl = String(item?.fieldData?.url || '').trim()
  const itemUrl = String(item?.url || '').trim()
  const itemSlug = String(item?.fieldData?.slug || slug || '').trim().replace(/^\/+/, '')

  if (itemFieldUrl) {
    if (/^https?:\/\//i.test(itemFieldUrl) && !apiHost.test(itemFieldUrl)) {
      return itemFieldUrl
    }
    if (normalizedSiteUrl && itemFieldUrl.startsWith('/')) {
      return `${normalizedSiteUrl}${itemFieldUrl}`
    }
  }

  if (itemUrl && /^https?:\/\//i.test(itemUrl) && !apiHost.test(itemUrl)) {
    return itemUrl
  }

  if (normalizedSiteUrl && itemSlug) {
    return `${normalizedSiteUrl}/${itemSlug}`
  }

  // Never expose the API endpoint as a user-facing published article URL.
  if (endpoint && apiHost.test(endpoint)) {
    return null
  }

  return itemFieldUrl || itemUrl || null
}

async function resolveWebflowSiteUrl({ target, apiKey }) {
  const preferred = normalizeSiteUrl(target?.siteUrl)
  if (preferred) return preferred

  const siteId = String(target?.siteId || '').trim()
  if (!siteId || !apiKey) return ''

  try {
    const resp = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json'
      }
    })
    if (!resp.ok) return ''
    const site = await resp.json().catch(() => ({}))
    return normalizeSiteUrl(site?.previewUrl || site?.url || site?.homepageUrl || site?.defaultDomain || '')
  } catch {
    return ''
  }
}

function normalizeSiteUrl(value = '') {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^[a-z0-9.-]+$/i.test(raw)) return `https://${raw}`
  return ''
}

export async function testConnection({ apiKey }) {
  try {
    const response = await fetch('https://api.webflow.com/v2/sites', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`Webflow connection failed: ${response.status} - ${body.message || response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function normalizeWebflowEndpoint(apiUrl, { apiKey, siteId, targetCollectionId } = {}) {
  const base = String(apiUrl || '').replace(/\/+$/, '')

  if (base.includes('/items')) {
    return base
  }

  if (base.includes('/collections/')) {
    return `${base}/items`
  }

  if (targetCollectionId) {
    return `https://api.webflow.com/v2/collections/${targetCollectionId}/items`
  }

  const siteFromUrl = extractSiteIdFromApiUrl(base)
  const resolvedSiteId = siteFromUrl || siteId
  if (resolvedSiteId) {
    const collectionEndpoint = await resolveCollectionEndpointFromSite(resolvedSiteId, apiKey)
    if (collectionEndpoint) {
      return collectionEndpoint
    }
  }

  throw new Error('Webflow apiUrl must include a collection path, e.g. .../collections/{collectionId}/items')
}

function extractSiteIdFromApiUrl(apiUrl = '') {
  const match = String(apiUrl).match(/\/sites\/([^/]+)/i)
  return match?.[1] || null
}

async function resolveCollectionEndpointFromSite(siteId, apiKey) {
  if (!siteId || !apiKey) return null

  const resp = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(`Unable to resolve Webflow collection from site (${resp.status}): ${extractWebflowErrorDetails(data) || resp.statusText}`)
  }

  const collections = Array.isArray(data?.collections) ? data.collections : []
  if (collections.length === 0) return null

  const scored = collections
    .map((collection) => {
      const name = `${collection?.displayName || ''} ${collection?.name || ''} ${collection?.slug || ''}`.toLowerCase()
      const looksLikeCommerce = /(product|products|sku|catalog|inventory|store|commerce)/.test(name)
      const looksLikeEditorial = /(blog|post|posts|article|articles|news|story|stories|content)/.test(name)

      return {
        collection,
        score: (looksLikeEditorial ? 10 : 0) - (looksLikeCommerce ? 10 : 0)
      }
    })
    .sort((a, b) => b.score - a.score)

  const first = scored[0]?.collection
  if (!first?.id) return null

  return `https://api.webflow.com/v2/collections/${first.id}/items`
}

function normalizeSlug(slug, title) {
  const source = String(slug || '').replace(/^\/+/, '').replace(/\/+$/, '') || title
  return source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function extractCollectionId(endpoint) {
  const match = String(endpoint).match(/\/collections\/([^/]+)\/items/i)
  if (!match?.[1]) {
    throw new Error('Unable to determine Webflow collection id from apiUrl')
  }
  return match[1]
}

async function fetchCollectionSchema(collectionId, apiKey) {
  const resp = await fetch(`https://api.webflow.com/v2/collections/${collectionId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  })

  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(`Failed to load Webflow collection schema (${resp.status}): ${extractWebflowErrorDetails(data) || resp.statusText}`)
  }

  return data
}

function buildFieldData({ schema, title, slug, content, metaTitle, metaDescription }) {
  const normalizedSlug = normalizeSlug(slug, title)
  const schemaFields = Array.isArray(schema?.fields) ? schema.fields : []
  const knownSlugs = new Set(schemaFields.map((f) => f.slug))

  const fieldData = {
    name: title,
    slug: normalizedSlug
  }

  const textByPriority = [
    { value: content, slugs: ['post-body', 'body', 'content', 'rich-text', 'article-body'] },
    { value: metaDescription, slugs: ['summary', 'excerpt', 'description', 'meta-description'] },
    { value: metaTitle, slugs: ['meta-title', 'seo-title'] }
  ]

  textByPriority.forEach(({ value, slugs }) => {
    if (!value) return
    const targetSlug = slugs.find((candidate) => knownSlugs.has(candidate))
    if (targetSlug) {
      fieldData[targetSlug] = value
    }
  })

  // If no canonical body slug exists, heuristically map content to the best text/rich text field.
  if (content && !hasAnyField(fieldData, ['post-body', 'body', 'content', 'rich-text', 'article-body'])) {
    const inferredBodyField = pickBodyField(schemaFields)
    if (inferredBodyField?.slug) {
      fieldData[inferredBodyField.slug] = content
    }
  }

  if (metaDescription && !hasAnyField(fieldData, ['summary', 'excerpt', 'description', 'meta-description'])) {
    const inferredSummaryField = pickSummaryField(schemaFields)
    if (inferredSummaryField?.slug) {
      fieldData[inferredSummaryField.slug] = metaDescription
    }
  }

  const requiredFields = schemaFields
    .filter((f) => f.isRequired)
    .map((f) => f.slug)
    .filter((slugName) => !['name', 'slug', '_archived', '_draft'].includes(slugName))

  const missingRequired = requiredFields.filter((slugName) => {
    const value = fieldData[slugName]
    return value === undefined || value === null || String(value).trim() === ''
  })

  if (missingRequired.length > 0) {
    throw new Error(
      `Webflow collection requires additional fields before publishing: ${missingRequired.join(', ')}. ` +
      'Add defaults in your collection or map these fields in the deploy adapter.'
    )
  }

  return fieldData
}

function hasAnyField(fieldData, slugs) {
  return slugs.some((slugName) => {
    const value = fieldData[slugName]
    return value !== undefined && value !== null && String(value).trim() !== ''
  })
}

function pickBodyField(fields = []) {
  const candidates = fields.filter((f) => !['name', 'slug', '_archived', '_draft'].includes(f.slug))

  const byName = candidates.find((f) => {
    const label = `${f.displayName || ''} ${f.slug || ''}`.toLowerCase()
    return /(post\s*body|body|article\s*body|content|story|details)/.test(label)
  })
  if (byName) return byName

  const byRichTextType = candidates.find((f) => {
    const type = `${f.type || ''}`.toLowerCase()
    return /(rich|markdown|html|multi)/.test(type)
  })
  if (byRichTextType) return byRichTextType

  const byLongTextType = candidates.find((f) => {
    const type = `${f.type || ''}`.toLowerCase()
    return /(plain|text|textarea)/.test(type)
  })
  return byLongTextType || null
}

function pickSummaryField(fields = []) {
  const candidates = fields.filter((f) => !['name', 'slug', '_archived', '_draft'].includes(f.slug))

  const byName = candidates.find((f) => {
    const label = `${f.displayName || ''} ${f.slug || ''}`.toLowerCase()
    return /(summary|excerpt|description|meta\s*description|dek)/.test(label)
  })
  if (byName) return byName

  return null
}

function extractWebflowErrorDetails(body) {
  if (!body || typeof body !== 'object') return ''
  if (typeof body.message === 'string' && body.message.trim()) return body.message
  if (Array.isArray(body.details) && body.details.length) {
    return body.details.map((d) => d?.message || d?.param || JSON.stringify(d)).join('; ')
  }
  if (body.errors && typeof body.errors === 'object') {
    return Object.entries(body.errors)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join('; ')
  }
  return ''
}
