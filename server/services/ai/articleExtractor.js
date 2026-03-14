function stripTags(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

async function fetchTextWithTimeout(url, { accept = 'text/html,application/xhtml+xml', timeoutMs = 15000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: accept,
        'User-Agent': 'Mozilla/5.0 (compatible; SceneHireBot/1.0; +https://www.scenehire.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status})`)
    }

    return await response.text()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Timed out while fetching URL')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function toJinaMirrorUrl(rawUrl = '') {
  const normalized = String(rawUrl).replace(/^https?:\/\//i, '')
  return `https://r.jina.ai/http://${normalized}`
}

function extractTitle(html = '', fallbackUrl = '') {
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)
  if (ogTitleMatch?.[1]) {
    return decodeHtmlEntities(ogTitleMatch[1].trim())
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim())
  }

  try {
    return new URL(fallbackUrl).hostname
  } catch {
    return 'Untitled Article'
  }
}

export async function extractArticleFromUrl(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are supported')
  }

  let title = ''
  let content = ''

  // 1) Try direct fetch first.
  try {
    const html = await fetchTextWithTimeout(parsed.toString())
    title = extractTitle(html, parsed.toString())
    content = decodeHtmlEntities(stripTags(html)).slice(0, 25000)
  } catch {
    // Fall back below.
  }

  // 2) Fallback: text mirror helps with sites that block bots or heavy JS pages.
  if (!content || content.length < 120) {
    const mirrorText = await fetchTextWithTimeout(toJinaMirrorUrl(parsed.toString()), {
      accept: 'text/plain,text/markdown,*/*',
      timeoutMs: 20000
    })

    const cleanedMirrorText = decodeHtmlEntities(stripTags(mirrorText)).slice(0, 25000)
    const firstLine = String(mirrorText).split('\n').map((line) => line.trim()).find(Boolean)

    title = title || firstLine || extractTitle('', parsed.toString())
    content = cleanedMirrorText
  }

  if (!content || content.length < 120) {
    throw new Error('Unable to extract enough article text from URL')
  }

  return {
    title,
    content
  }
}
