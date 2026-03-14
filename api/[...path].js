import app from '../server/index.js'

export default function handler(req, res) {
  // Vercel's catch-all function can pass paths without the /api prefix (e.g.,
  // /ai/extract-article). Re-add it so Express routes mounted at /api/* match.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`
  }
  return app(req, res)
}
