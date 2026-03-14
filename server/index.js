import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// load environment variables as early as possible
dotenv.config()
// Also load project-root .env for setups that keep shared config at workspace root.
dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

// DEBUG: verify env variables are loaded
console.log('SUPABASE_URL=', process.env.SUPABASE_URL)
console.log('SUPABASE_ANON_KEY=', process.env.SUPABASE_ANON_KEY ? '[redacted]' : undefined)
console.log('GOOGLE_OAUTH_CLIENT_ID=', process.env.GOOGLE_OAUTH_CLIENT_ID ? '[set]' : '[missing]')
console.log('GOOGLE_SC_REDIRECT_URI=', process.env.GOOGLE_SC_REDIRECT_URI || '[missing]')

import analyticsRoutes, { runScheduledDeploymentSync } from './routes/analytics.js'
import deployRoutes from './routes/deploy.js'
import aiRoutes from './routes/ai.js'
import webflowRoutes from './routes/webflow.js'
import githubRoutes from './routes/github.js'

const app = express()
const PORT = process.env.BACKEND_PORT || 3001

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://scenehire.com',
  'https://www.scenehire.com'
]

const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins

let syncInProgress = false

async function runScheduledSyncTick() {
  if (syncInProgress) return
  syncInProgress = true
  try {
    const syncResult = await runScheduledDeploymentSync({
      startDate: process.env.SEARCH_CONSOLE_SYNC_START_DATE || '30daysAgo',
      endDate: process.env.SEARCH_CONSOLE_SYNC_END_DATE || 'today',
      limit: Number(process.env.SEARCH_CONSOLE_SYNC_LIMIT || 100)
    })
    console.log('[Analytics Sync] Completed:', JSON.stringify({
      users: syncResult.users,
      syncedUsers: syncResult.syncedUsers,
      failedUsers: syncResult.failedUsers
    }))
  } catch (error) {
    console.error('[Analytics Sync] Failed:', error.message)
  } finally {
    syncInProgress = false
  }
}

// Middleware
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests and same-origin requests without Origin header.
    if (!origin) return callback(null, true)
    if (corsAllowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('CORS origin not allowed'))
  }
}))
app.use(express.json())

// Routes
app.use('/api/analytics', analyticsRoutes)
app.use('/api/deploy', deployRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/webflow', webflowRoutes)
app.use('/api/github', githubRoutes)

// Compatibility route for GitHub OAuth apps configured with /api/auth/github/callback.
app.get('/api/auth/github/callback', (req, res) => {
  const params = new URLSearchParams()
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)))
    } else if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  })

  return res.redirect(`/api/github/callback?${params.toString()}`)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server is running' })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)

  const syncEnabled = process.env.SEARCH_CONSOLE_SYNC_ENABLED !== 'false'
  if (syncEnabled) {
    const hours = Math.max(1, Number(process.env.SEARCH_CONSOLE_SYNC_INTERVAL_HOURS || 12))
    const intervalMs = hours * 60 * 60 * 1000
    console.log(`[Analytics Sync] Scheduler enabled (every ${hours}h)`)

    // Run once shortly after startup to warm cache, then continue on interval.
    setTimeout(() => {
      runScheduledSyncTick().catch(() => null)
    }, 15000)

    setInterval(() => {
      runScheduledSyncTick().catch(() => null)
    }, intervalMs)
  }
})
