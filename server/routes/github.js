import express from 'express'

const router = express.Router()

router.get('/callback', async (req, res) => {
  const params = new URLSearchParams()
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)))
    } else if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  })

  return res.redirect(`/api/deploy/oauth/github/callback?${params.toString()}`)
})

export default router
