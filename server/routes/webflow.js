import express from 'express'

const router = express.Router()

router.get('/callback', async (req, res) => {
  const { code, state } = req.query
  const clientId = (process.env.WEBFLOW_CLIENT_ID || '').trim()
  const clientSecret = (process.env.WEBFLOW_CLIENT_SECRET || '').trim()

  // If state is present, this callback came from the deploy OAuth popup flow.
  // Forward to the existing deploy callback handler that validates state and stores tokens.
  if (state) {
    const params = new URLSearchParams()
    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)))
      } else if (value !== undefined && value !== null) {
        params.set(key, String(value))
      }
    })
    return res.redirect(`/api/deploy/oauth/webflow/callback?${params.toString()}`)
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing OAuth authorization code' })
  }

  if (!clientId || !clientSecret) {
    console.error('Webflow OAuth is not configured: missing WEBFLOW_CLIENT_ID or WEBFLOW_CLIENT_SECRET')
    return res.status(500).json({
      error: 'Webflow OAuth not configured on server',
      details: 'Set WEBFLOW_CLIENT_ID and WEBFLOW_CLIENT_SECRET in backend environment'
    })
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'http://localhost:3001/api/webflow/callback',
      grant_type: 'authorization_code',
      code: String(code)
    })

    const tokenResponse = await fetch('https://api.webflow.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: params.toString()
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Webflow OAuth token exchange failed:', tokenData)
      return res.status(502).json({
        error: 'Failed to exchange OAuth code for access token',
        providerError: tokenData.error || tokenData.message || 'unknown_error',
        providerDetails: tokenData.error_description || tokenData.description || null
      })
    }

    console.log('Webflow access_token:', tokenData.access_token)

    // TODO: Save tokenData.access_token (and related account/site info) to database.

    return res.redirect('http://localhost:5173/integrations?connected=webflow')
  } catch (error) {
    console.error('Webflow OAuth callback error:', error)
    return res.status(500).json({ error: 'Internal server error during Webflow OAuth callback' })
  }
})

export default router
