# Search Console Analytics Setup

This project now uses Google Search Console (GSC), not Google Analytics Data API.

## 1. Configure environment variables

Set these in `.env` and/or `server/.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_SC_REDIRECT_URI=http://localhost:3001/api/analytics/search-console/oauth/callback
```

Optional scheduler settings:

```env
SEARCH_CONSOLE_SYNC_ENABLED=true
SEARCH_CONSOLE_SYNC_INTERVAL_HOURS=12
SEARCH_CONSOLE_SYNC_LIMIT=100
SEARCH_CONSOLE_SYNC_START_DATE=30daysAgo
SEARCH_CONSOLE_SYNC_END_DATE=today
SEARCH_CONSOLE_SYNC_KEY=your_optional_sync_secret
```

## 2. Google Cloud OAuth configuration

1. Enable Search Console API in Google Cloud.
2. Add OAuth scope:
`https://www.googleapis.com/auth/webmasters.readonly`
3. Add redirect URI exactly:
`http://localhost:3001/api/analytics/search-console/oauth/callback`
4. If app is in Testing mode, add your account as a Test User.

## 3. Add and verify your Search Console property

Use your real domain (for example `scenehire.com`), not `localhost`.

1. Add property in Search Console.
2. Verify ownership (DNS recommended for domain property).
3. Wait briefly for property visibility in API.

## 4. Run the OAuth connect flow

Generate auth URL:

```bash
curl -s 'http://localhost:3001/api/analytics/search-console/oauth/start?userId=debug-user&origin=http://localhost:5173'
```

Open `authUrl`, complete consent, then verify:

```bash
curl -s 'http://localhost:3001/api/analytics/search-console/connection?userId=debug-user'
curl -s 'http://localhost:3001/api/analytics/search-console/properties?userId=debug-user'
```

Select the returned property (example):

```bash
curl -s -X POST 'http://localhost:3001/api/analytics/search-console/property/select' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"debug-user","siteUrl":"sc-domain:scenehire.com"}'
```

## 5. Sync and verify analytics

Manual sync:

```bash
curl -s -X POST 'http://localhost:3001/api/analytics/deployment-sync' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"debug-user","startDate":"30daysAgo","endDate":"today","limit":100}'
```

All users sync:

```bash
curl -s -X POST 'http://localhost:3001/api/analytics/deployment-sync/all' \
  -H 'Content-Type: application/json' \
  -d '{"startDate":"30daysAgo","endDate":"today","limit":100}'
```

Dashboard check:

```bash
curl -s 'http://localhost:3001/api/analytics/dashboard?userId=debug-user&startDate=30daysAgo&endDate=today'
```

Expected when connected:
- `dataSource: "search-console"`
- non-empty metrics once Search Console has data for your property/date range.
