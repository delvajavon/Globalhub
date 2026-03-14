import { assertDeployPayload, normalizeResult } from './baseAdapter.js'

export async function deployArticle(input) {
  assertDeployPayload(input, 'github')

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
    const repoApiBase = toRepoApiBase(apiUrl)
    const filePath = buildMarkdownPath(slug, title)
    const endpoint = `${repoApiBase}/contents/${encodePath(filePath)}`

    const markdown = buildMarkdownDocument({ title, content, metaTitle, metaDescription, status })
    const encoded = Buffer.from(markdown, 'utf8').toString('base64')

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: `Publish article: ${title}`,
        content: encoded
      })
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`GitHub API error: ${response.status} - ${body.message || response.statusText}`)
    }

    const result = await response.json()
    const articleUrl = result?.content?.html_url || result?.content?.download_url

    return normalizeResult({
      success: true,
      url: articleUrl,
      platformArticleId: result?.content?.sha,
      publishedAt: new Date().toISOString()
    }, 'github')
  } catch (error) {
    return normalizeResult({ success: false, error: error.message }, 'github')
  }
}

export async function testConnection({ apiKey }) {
  try {
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.github+json'
      }
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`GitHub connection failed: ${response.status} - ${body.message || response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function toRepoApiBase(apiUrl) {
  const value = String(apiUrl || '').replace(/\/+$/, '')

  if (value.includes('api.github.com/repos/')) {
    return value
  }

  const githubMatch = value.match(/github\.com\/(.+?)\/(.+?)(?:\.git)?$/)
  if (githubMatch) {
    return `https://api.github.com/repos/${githubMatch[1]}/${githubMatch[2]}`
  }

  throw new Error('GitHub apiUrl must be a repo URL (github.com/owner/repo) or API URL (api.github.com/repos/owner/repo)')
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function buildMarkdownPath(slug, title) {
  const safeSlug = String(slug || '').replace(/^\/+/, '').replace(/\/+$/, '')
  const fallback = slugify(title) || `article-${Date.now()}`
  const fileName = (safeSlug || fallback).replace(/\.md$/i, '')
  return `content/${fileName}.md`
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function buildMarkdownDocument({ title, content, metaTitle, metaDescription, status }) {
  const frontmatter = [
    '---',
    `title: "${escapeQuotes(title)}"`,
    `metaTitle: "${escapeQuotes(metaTitle)}"`,
    `metaDescription: "${escapeQuotes(metaDescription)}"`,
    `status: "${escapeQuotes(status)}"`,
    '---',
    ''
  ].join('\n')

  return `${frontmatter}${content}\n`
}

function escapeQuotes(value) {
  return String(value || '').replace(/"/g, '\\"')
}
