import { supabase } from './supabaseClient'

interface LocalizedArticle {
  language: string
  country: string
  translated_title: string
  translated_content: string
  seo_score?: number
  slug: string
}

interface PublishArticleParams {
  userId: string
  originalUrl: string
  title: string
  content: string
  wordCount?: number
  localizedArticles: LocalizedArticle[]
  cmsPlatform: string
  publishedUrl?: string
}

export const publishArticle = async (params: PublishArticleParams) => {
  try {
    // 1. Save the original article
    const { data: articleData, error: articleError } = await supabase
      .from('articles')
      .insert({
        user_id: params.userId,
        original_url: params.originalUrl,
        title: params.title,
        content: params.content,
        word_count: params.wordCount || 0,
      })
      .select()
      .single()

    if (articleError) throw articleError

    const articleId = articleData.id

    // 2. Save localized articles and publish them
    const translationPromises = params.localizedArticles.map(async (localized) => {
      // Insert into translations table
      const { data: translationData, error: translationError } = await supabase
        .from('translations')
        .insert({
          article_id: articleId,
          language: localized.language,
          country: localized.country,
          translated_title: localized.translated_title,
          translated_content: localized.translated_content,
          seo_score: localized.seo_score || 0,
          slug: localized.slug,
        })
        .select()
        .single()

      if (translationError) throw translationError

      const translationId = translationData.id

      // 3. Store the CMS publish record
      const { data: publishData, error: publishError } = await supabase
        .from('publishes')
        .insert({
          translation_id: translationId,
          cms_platform: params.cmsPlatform,
          published_url: params.publishedUrl || null,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (publishError) throw publishError

      return { translationId, publishData }
    })

    const publishResults = await Promise.all(translationPromises)

    return {
      success: true,
      articleId,
      publishedCount: publishResults.length,
      publishResults,
    }
  } catch (error) {
    console.error('Error publishing article:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
