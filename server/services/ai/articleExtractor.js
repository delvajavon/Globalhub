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

  const response = await fetch(parsed.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 GlobalHub/1.0',
      Accept: 'text/html,application/xhtml+xml'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`)
  }

  const html = await response.text()
  const title = extractTitle(html, parsed.toString())
  const content = decodeHtmlEntities(stripTags(html)).slice(0, 25000)

  if (!content || content.length < 120) {
    throw new Error('Unable to extract enough article text from URL')
  }

  return {
    title,
    content
  }
}
