/**
 * Ghost CMS Adapter
 * Interface: deployArticle({ apiUrl, apiKey, title, content, slug, status, metaTitle, metaDescription })
 */

import jwt from 'jsonwebtoken'
import { assertDeployPayload, normalizeResult } from './baseAdapter.js'

export async function deployArticle(input) {
  assertDeployPayload(input, 'ghost')

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
    console.log(`[Ghost] Deploying "${title}" to ${apiUrl}`)

    const endpoint = `${stripTrailingSlash(apiUrl)}/ghost/api/admin/posts/`

    const token = generateGhostToken(apiKey)

    const ghostPayload = {
      posts: [{
        title,
        html: content,
        custom_excerpt: metaDescription,
        slug: normalizeSlug(slug),
        meta_title: metaTitle,
        meta_description: metaDescription,
        status: status === 'published' ? 'published' : 'draft'
      }]
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Ghost ${token}`,
      },
      body: JSON.stringify(ghostPayload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Ghost API error: ${response.status} - ${errorData.errors?.[0]?.message || response.statusText}`
      )
    }

    const result = await response.json()
    const post = result.posts[0]

    console.log(`[Ghost] ✓ Published successfully: ${post.url}`)

    return normalizeResult({
      success: true,
      url: post.url,
      platformArticleId: post.id,
      publishedAt: post.published_at || post.updated_at || new Date().toISOString()
    }, 'ghost')

  } catch (error) {
    console.error(`[Ghost] Deployment failed:`, error.message)

    return normalizeResult({
      success: false,
      error: error.message
    }, 'ghost')
  }
}

/**
 * Generate JWT token for Ghost Admin API
 * @param {String} apiKey - Ghost Admin API key in format "id:secret"
 * @returns {String} - JWT token
 */
function generateGhostToken(apiKey) {
  // Split the API key into id and secret
  const [id, secret] = apiKey.split(':')

  // Create the token (standard JWT claims)
  const token = jwt.sign(
    {}, // Empty payload
    Buffer.from(secret, 'hex'), // Secret as buffer
    {
      keyid: id,
      algorithm: 'HS256',
      expiresIn: '5m', // Token expires in 5 minutes
      audience: '/admin/'
    }
  )

  return token
}

export async function testConnection({ apiUrl, apiKey }) {
  try {
    const endpoint = `${stripTrailingSlash(apiUrl)}/ghost/api/admin/site/`
    const token = generateGhostToken(apiKey)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Ghost ${token}`
      }
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(`Ghost connection failed: ${response.status} - ${data.errors?.[0]?.message || response.statusText}`)
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
