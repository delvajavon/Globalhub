import { createClient } from '@supabase/supabase-js'
import { decryptCredential } from '../utils/encryption.js'
import { getAdapter } from '../services/cms/baseAdapter.js'

/**
 * Background worker for processing CMS deployments
 * Runs deployments asynchronously and updates deployment_history
 */

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

/**
 * Process a single deployment job
 * @param {string} deploymentId - UUID of deployment_history record
 */
export async function processDeployment(deploymentId) {
  console.log(`[DeployWorker] Processing deployment: ${deploymentId}`)

  try {
    // Fetch deployment record
    const { data: deployment, error: fetchError } = await supabase
      .from('deployment_history')
      .select('*, connection:cms_connections(*)')
      .eq('id', deploymentId)
      .single()

    if (fetchError || !deployment) {
      console.error(`[DeployWorker] Failed to fetch deployment ${deploymentId}:`, fetchError)
      return { success: false, error: 'Deployment not found' }
    }

    // Check if already processed
    if (deployment.status !== 'pending') {
      console.log(`[DeployWorker] Deployment ${deploymentId} already processed (${deployment.status})`)
      return { success: true, status: deployment.status }
    }

    // Update status to 'publishing'
    await updateDeploymentStatus(deploymentId, 'publishing')

    // Get CMS adapter dynamically
    let adapter
    try {
      adapter = await getAdapter(deployment.platform)
    } catch (adapterError) {
      const error = adapterError.message || `No adapter found for platform: ${deployment.platform}`
      console.error(`[DeployWorker] ${error}`)
      await updateDeploymentStatus(deploymentId, 'failed', { error })
      return { success: false, error }
    }

    // Validate connection
    if (!deployment.connection) {
      const error = 'CMS connection not found or deleted'
      console.error(`[DeployWorker] ${error}`)
      await updateDeploymentStatus(deploymentId, 'failed', { error })
      return { success: false, error }
    }

    // Decrypt API credentials
    let decryptedConnection
    try {
      decryptedConnection = {
        ...deployment.connection,
        api_key: decryptCredential(deployment.connection.api_key)
      }
      
      // Decrypt api_secret if present
      if (deployment.connection.api_secret) {
        decryptedConnection.api_secret = decryptCredential(deployment.connection.api_secret)
      }
      
      console.log(`[DeployWorker] Credentials decrypted for ${deployment.platform}`)
    } catch (decryptError) {
      const error = 'Failed to decrypt CMS credentials'
      console.error(`[DeployWorker] ${error}:`, decryptError)
      await updateDeploymentStatus(deploymentId, 'failed', { error })
      return { success: false, error }
    }

    // Execute deployment via shared adapter interface
    console.log(`[DeployWorker] Calling ${deployment.platform} adapter...`)
    const deployInput = buildDeployInput(deployment.article_data, decryptedConnection)
    const result = await adapter.deployArticle(deployInput)

    if (result.success) {
      // Success: Update with published status
      await updateDeploymentStatus(deploymentId, 'published', {
        publishedUrl: result.url,
        platformArticleId: result.platformArticleId,
        publishedAt: result.publishedAt,
        metadata: {
          deployInput: {
            title: deployInput.title,
            slug: deployInput.slug,
            status: deployInput.status
          }
        }
      })

      console.log(`[DeployWorker] ✓ ${deployment.platform} deployment succeeded: ${result.url}`)
      return { success: true, deploymentId, result }
    } else {
      // Failure: Update with error
      await updateDeploymentStatus(deploymentId, 'failed', {
        error: result.error || 'Unknown deployment error'
      })

      console.error(`[DeployWorker] ✗ ${deployment.platform} deployment failed:`, result.error)
      return { success: false, deploymentId, error: result.error }
    }

  } catch (error) {
    console.error(`[DeployWorker] Unexpected error processing deployment ${deploymentId}:`, error)
    
    // Try to update status to failed
    try {
      await updateDeploymentStatus(deploymentId, 'failed', {
        error: error.message || 'Unexpected deployment error'
      })
    } catch (updateError) {
      console.error(`[DeployWorker] Failed to update deployment status:`, updateError)
    }

    return { success: false, error: error.message }
  }
}

/**
 * Update deployment status in database
 * @param {string} deploymentId - UUID of deployment record
 * @param {string} status - New status: 'pending', 'publishing', 'published', 'failed'
 * @param {object} data - Additional data to update
 */
async function updateDeploymentStatus(deploymentId, status, data = {}) {
  const updates = {
    status,
    ...data
  }

  // Add published_at timestamp for published status (default to current time if not provided)
  if (status === 'published') {
    if (Object.prototype.hasOwnProperty.call(data, 'publishedAt')) {
      updates.published_at = data.publishedAt || new Date().toISOString()
      delete updates.publishedAt
    } else if (!updates.published_at) {
      updates.published_at = new Date().toISOString()
    }
  }

  // Rename keys to match database schema
  if (Object.prototype.hasOwnProperty.call(data, 'publishedUrl')) {
    updates.published_url = data.publishedUrl
    delete updates.publishedUrl
  }
  if (Object.prototype.hasOwnProperty.call(data, 'platformArticleId')) {
    updates.platform_article_id = data.platformArticleId
    delete updates.platformArticleId
  }
  if (Object.prototype.hasOwnProperty.call(data, 'error')) {
    updates.error_message = data.error
    delete updates.error
  }

  const { error } = await supabase
    .from('deployment_history')
    .update(updates)
    .eq('id', deploymentId)

  if (error) {
    console.error(`[DeployWorker] Failed to update status for ${deploymentId}:`, error)
    throw error
  }

  console.log(`[DeployWorker] Status updated: ${deploymentId} → ${status}`)
}

function buildDeployInput(article, connection) {
  const title = article.localizedTitle || article.seoTitle || article.title || 'Untitled Article'
  const deployStatus = normalizeDeployStatus(connection?.config?.status)

  return {
    apiUrl: connection.api_url,
    apiKey: connection.api_key,
    siteId: connection.site_id,
    target: connection.config?.target || null,
    title,
    content: article.localizedBodyHtml || article.localizedBody || article.content || article.body || article.excerpt || `<p>${title}</p>`,
    slug: normalizeSlug(article.slug, title),
    // Default to immediate publish since the UI action is "Publish".
    // Users can still force drafts by setting connection.config.status to 'draft'.
    status: deployStatus,
    metaTitle: article.seoTitle || title,
    metaDescription: article.metaDescription || article.excerpt || ''
  }
}

function normalizeDeployStatus(rawStatus) {
  const normalized = String(rawStatus || '').trim().toLowerCase()

  if (normalized === 'draft') {
    return 'draft'
  }

  if (normalized === 'published' || normalized === 'publish') {
    return 'published'
  }

  // Safe default: the action is explicit publish from the deploy modal.
  return 'published'
}

function normalizeSlug(slug, fallbackTitle) {
  const source = String(slug || '').replace(/^\/+/, '').replace(/\/+$/, '')
  if (source) {
    return source
  }

  return String(fallbackTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Process multiple deployments in parallel
 * @param {string[]} deploymentIds - Array of deployment IDs
 */
export async function processDeployments(deploymentIds) {
  console.log(`[DeployWorker] Processing ${deploymentIds.length} deployments in parallel...`)
  
  const results = await Promise.allSettled(
    deploymentIds.map(id => processDeployment(id))
  )

  const summary = {
    total: results.length,
    succeeded: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
    failed: results.filter(r => r.status === 'rejected' || !r.value.success).length
  }

  console.log(`[DeployWorker] Batch complete: ${summary.succeeded}/${summary.total} succeeded`)
  
  return {
    success: summary.failed === 0,
    summary,
    results: results.map((r, i) => ({
      deploymentId: deploymentIds[i],
      status: r.status,
      result: r.status === 'fulfilled' ? r.value : { error: r.reason }
    }))
  }
}

/**
 * Poll for pending deployments and process them
 * (For future use with a cron job or scheduled task)
 */
export async function processPendingDeployments() {
  console.log('[DeployWorker] Checking for pending deployments...')

  try {
    const { data: pendingDeployments, error } = await supabase
      .from('deployment_history')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Process 10 at a time

    if (error) {
      console.error('[DeployWorker] Failed to fetch pending deployments:', error)
      return { success: false, error: error.message }
    }

    if (!pendingDeployments || pendingDeployments.length === 0) {
      console.log('[DeployWorker] No pending deployments found')
      return { success: true, processed: 0 }
    }

    console.log(`[DeployWorker] Found ${pendingDeployments.length} pending deployments`)
    
    const deploymentIds = pendingDeployments.map(d => d.id)
    const result = await processDeployments(deploymentIds)

    return {
      success: true,
      processed: result.summary.total,
      succeeded: result.summary.succeeded,
      failed: result.summary.failed
    }

  } catch (error) {
    console.error('[DeployWorker] Error processing pending deployments:', error)
    return { success: false, error: error.message }
  }
}
