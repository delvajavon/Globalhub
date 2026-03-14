# Production Launch Runbook - scenehire.com

This runbook moves GlobalHub from localhost to production on:
- Frontend: `https://www.scenehire.com`
- Backend API: `https://api.scenehire.com`

## 1. Recommended hosting

- Frontend: Vercel (uses `vercel.json` in repo root for SPA rewrites)
- Backend: Render (uses `render.yaml` in repo root)

## 2. DNS setup

Create these records in your DNS provider:
- `www.scenehire.com` -> Vercel target (CNAME provided by Vercel)
- `scenehire.com` -> redirect to `www.scenehire.com` (apex handling per DNS provider/Vercel)
- `api.scenehire.com` -> Render backend URL (CNAME to Render service host)

## 3. Frontend env vars (Vercel)

Set in Vercel project environment variables:

```env
VITE_BACKEND_URL=https://api.scenehire.com
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_UNLIMITED_DEMO_EMAILS=delvajavon@gmail.com
```

Build command: `npm run build`
Output directory: `dist`

## 4. Backend env vars (Render)

Set in Render service environment variables:

```env
BACKEND_PORT=3001
BACKEND_PUBLIC_URL=https://api.scenehire.com
CORS_ALLOWED_ORIGINS=https://scenehire.com,https://www.scenehire.com

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_SC_REDIRECT_URI=https://api.scenehire.com/api/analytics/search-console/oauth/callback

WEBFLOW_CLIENT_ID=your_webflow_client_id
WEBFLOW_CLIENT_SECRET=your_webflow_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_OAUTH_SCOPES=write_content,read_content,read_products

ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

FREE_ARTICLE_LIMIT=5
UNLIMITED_DEMO_EMAILS=delvajavon@gmail.com
```

## 5. Clerk production settings

In Clerk dashboard:
- Add production frontend URL: `https://www.scenehire.com`
- Add redirect URLs for sign-in/sign-up callbacks on `www.scenehire.com`
- Ensure only desired social providers are enabled (GitHub removed in UI already)

## 6. Google Cloud OAuth updates

Update OAuth clients to include production callback URLs:
- Search Console redirect URI:
  - `https://api.scenehire.com/api/analytics/search-console/oauth/callback`
- Any CMS OAuth redirect URIs should target backend callbacks on `api.scenehire.com`.

## 7. Webflow/GitHub/Shopify OAuth updates

In each provider app settings, add production callback URLs:
- Webflow callback: `https://api.scenehire.com/api/webflow/callback`
- GitHub callback: `https://api.scenehire.com/api/github/callback`
- Shopify callback: `https://api.scenehire.com/api/deploy/oauth/shopify/callback`

## 8. Post-deploy smoke checks

Run these after both apps are live:

```bash
curl -sS https://api.scenehire.com/health
curl -sS "https://api.scenehire.com/api/deploy/oauth/status"
```

Then in browser:
- Open `https://www.scenehire.com`
- Sign in via Clerk
- Run one Globalize flow
- Verify CMS OAuth connect starts and callback returns
- Verify Search Console connect starts and callback returns

## 9. Security checklist before launch

- Rotate any credentials previously stored in local `.env` files.
- Ensure secrets are only stored in hosting provider environment variables.
- Confirm no credentials are committed to git history.

## 10. Cutover plan

1. Deploy backend first (`api.scenehire.com` healthy).
2. Update OAuth redirect URIs in provider dashboards.
3. Deploy frontend with `VITE_BACKEND_URL=https://api.scenehire.com`.
4. Update DNS for `www.scenehire.com`.
5. Run smoke checks.
