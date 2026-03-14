/**
 * WordPress CMS Adapter
 * Interface: deployArticle({ apiUrl, apiKey, title, content, slug, status, metaTitle, metaDescription })
 */

import { assertDeployPayload, normalizeResult } from './baseAdapter.js'

export async function deployArticle(input) {
  assertDeployPayload(input, 'wordpress')

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
    console.log(`[WordPress] Deploying "${title}" to ${apiUrl}`)

    const endpoint = getPostsEndpoint(apiUrl)

    const wordpressPayload = {
      title,
      content,
      excerpt: metaDescription,
      slug: normalizeSlug(slug),
      status: status === 'published' ? 'publish' : 'draft',
      meta: {
        _yoast_wpseo_title: metaTitle,
        _yoast_wpseo_metadesc: metaDescription
      }
    }

    const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(wordpressPayload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `WordPress API error: ${response.status} - ${errorData.message || response.statusText}`
      )
    }

    const result = await response.json()

    console.log(`[WordPress] ✓ Published successfully: ${result.link}`)

    return normalizeResult({
      success: true,
      url: result.link,
      platformArticleId: String(result.id),
      publishedAt: result.date || result.modified || new Date().toISOString()
    }, 'wordpress')

  } catch (error) {
    console.error(`[WordPress] Deployment failed:`, error.message)

    return normalizeResult({
      success: false,
      error: error.message
    }, 'wordpress')
  }
}

export async function testConnection({ apiUrl, apiKey }) {
  try {
    const endpoint = getUsersMeEndpoint(apiUrl)
    const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`WordPress connection failed: ${response.status} - ${errorData.message || response.statusText}`)
    }

    return { success: true }

  } catch (error) {
    return { success: false, error: error.message }
  }
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function normalizeSlug(slug) {
  return String(slug || '')
    .replace(/^\/[^/]+\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

function getPostsEndpoint(apiUrl) {
  const base = stripTrailingSlash(apiUrl)

  if (base.includes('/wp-json/wp/v2')) {
    return `${base}/posts`
  }
  if (base.includes('/wp-json')) {
    return `${base}/wp/v2/posts`
  }
  return `${base}/wp-json/wp/v2/posts`
}

function getUsersMeEndpoint(apiUrl) {
  const base = stripTrailingSlash(apiUrl)

  if (base.includes('/wp-json/wp/v2')) {
    return `${base}/users/me`
  }
  if (base.includes('/wp-json')) {
    return `${base}/wp/v2/users/me`
  }
  return `${base}/wp-json/wp/v2/users/me`
}
