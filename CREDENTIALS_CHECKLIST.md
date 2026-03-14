# Search Console Credentials Checklist

## Google Cloud (Required)

1. OAuth client created.
2. Search Console API enabled.
3. OAuth scope added:
`https://www.googleapis.com/auth/webmasters.readonly`
4. Redirect URI added exactly:
`http://localhost:3001/api/analytics/search-console/oauth/callback`
5. App in Testing mode includes your account as a Test User.

## Local environment (Required)

Add to `.env` and/or `server/.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_SC_REDIRECT_URI=http://localhost:3001/api/analytics/search-console/oauth/callback
```

## Search Console property (Required)

1. Add your real domain property (for example `scenehire.com`).
2. Complete ownership verification (DNS recommended).
3. Confirm property appears in API:

```bash
curl -s 'http://localhost:3001/api/analytics/search-console/properties?userId=debug-user'
```

## Connection flow (Required)

1. Generate auth URL:

```bash
curl -s 'http://localhost:3001/api/analytics/search-console/oauth/start?userId=debug-user&origin=http://localhost:5173'
```

2. Complete OAuth consent in browser.
3. Verify connected state:

```bash
curl -s 'http://localhost:3001/api/analytics/search-console/connection?userId=debug-user'
```

4. Select property:

```bash
curl -s -X POST 'http://localhost:3001/api/analytics/search-console/property/select' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"debug-user","siteUrl":"sc-domain:scenehire.com"}'
```

## Background sync (Recommended)

Scheduler runs by default every 12h. Optional env overrides:

```env
SEARCH_CONSOLE_SYNC_ENABLED=true
SEARCH_CONSOLE_SYNC_INTERVAL_HOURS=12
SEARCH_CONSOLE_SYNC_LIMIT=100
SEARCH_CONSOLE_SYNC_KEY=your_optional_sync_secret
```

Manual sync endpoints:
- `POST /api/analytics/deployment-sync` (single user)
- `POST /api/analytics/deployment-sync/all` (all connected users)
