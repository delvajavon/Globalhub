import { assertDeployPayload, normalizeResult } from './baseAdapter.js'

export async function deployArticle(input) {
  assertDeployPayload(input, 'shopify')

  const {
    apiUrl,
    apiKey,
    title,
    content,
    slug,
    status,
    metaTitle,
    metaDescription
  } = input

  try {
    const { endpoint, storefrontBase } = buildShopifyEndpoints(apiUrl)

    const payload = {
      article: {
        title,
        body_html: content,
        handle: normalizeSlug(slug, title),
        summary_html: `<p>${metaDescription}</p>`,
        published: status === 'published',
        metafields: [
          {
            namespace: 'seo',
            key: 'title',
            type: 'single_line_text_field',
            value: metaTitle
          },
          {
            namespace: 'seo',
            key: 'description',
            type: 'single_line_text_field',
            value: metaDescription
          }
        ]
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`Shopify API error: ${response.status} - ${JSON.stringify(body.errors || body) || response.statusText}`)
    }

    const result = await response.json()
    const articleObj = result?.article

    return normalizeResult({
      success: true,
      url: `${storefrontBase}/blogs/news/${articleObj.handle}`,
      platformArticleId: String(articleObj.id),
      publishedAt: articleObj.published_at || articleObj.created_at || new Date().toISOString()
    }, 'shopify')
  } catch (error) {
    return normalizeResult({ success: false, error: error.message }, 'shopify')
  }
}

export async function testConnection({ apiUrl, apiKey }) {
  try {
    const baseUrl = normalizeShopBaseUrl(apiUrl)
    const endpoint = `${baseUrl}/admin/api/2024-01/shop.json`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`Shopify connection failed: ${response.status} - ${JSON.stringify(body.errors || body) || response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function buildShopifyEndpoints(apiUrl) {
  const raw = String(apiUrl || '').replace(/\/+$/, '')

  let storefrontBase = raw
  if (raw.includes('/admin/api/')) {
    storefrontBase = raw.split('/admin/api/')[0]
  }

  const blogIdMatch = raw.match(/\/blogs\/(\d+)/)
  if (!blogIdMatch) {
    throw new Error('Shopify apiUrl must include blog id, e.g. https://store.myshopify.com/admin/api/2024-10/blogs/{blogId}')
  }

  const blogId = blogIdMatch[1]
  const adminBase = raw.includes('/admin/api/')
    ? raw.split('/blogs/')[0]
    : `${raw}/admin/api/2024-10`

  return {
    storefrontBase,
    endpoint: `${adminBase}/blogs/${blogId}/articles.json`
  }
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

function normalizeShopBaseUrl(apiUrl) {
  const raw = String(apiUrl || '').replace(/\/+$/, '')
  if (!raw.includes('/admin/')) {
    return raw
  }
  return raw.split('/admin/')[0]
}
