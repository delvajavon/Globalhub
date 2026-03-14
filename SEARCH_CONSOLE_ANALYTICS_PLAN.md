# SceneHire Search Console Analytics

This document describes the GA4 -> Google Search Console refactor in this codebase.

## 1. Environment Variables

Add these to your `.env` (root or `server/.env`):

```bash
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_SC_REDIRECT_URI=https://your-backend-domain/api/analytics/search-console/oauth/callback
```

Notes:
- `GOOGLE_SC_REDIRECT_URI` must match one of the OAuth redirect URIs in Google Cloud Console.
- Scope used: `https://www.googleapis.com/auth/webmasters.readonly`.

## 2. OAuth Flow

### Start OAuth

```http
GET /api/analytics/search-console/oauth/start?userId=<USER_ID>&origin=<FRONTEND_ORIGIN>
```

Response:

```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "<state-token>"
}
```

### Callback

Google redirects to:

```http
GET /api/analytics/search-console/oauth/callback?code=<code>&state=<state>
```

This endpoint stores encrypted OAuth tokens in `search_console_connections`.

### List properties

```http
GET /api/analytics/search-console/properties?userId=<USER_ID>
```

Response:

```json
{
  "success": true,
  "selectedSiteUrl": "sc-domain:example.com",
  "properties": [
    { "siteUrl": "sc-domain:example.com", "permissionLevel": "siteOwner" },
    { "siteUrl": "https://example.com/", "permissionLevel": "siteFullUser" }
  ]
}
```

### Select property

```http
POST /api/analytics/search-console/property/select
Content-Type: application/json

{
  "userId": "user_123",
  "siteUrl": "sc-domain:example.com"
}
```

## 3. Analytics Endpoints

### Sync deployment URLs (cache + deployment_history updates)

```http
POST /api/analytics/deployment-sync
Content-Type: application/json

{
  "userId": "user_123",
  "startDate": "30daysAgo",
  "endDate": "today",
  "limit": 100
}
```

This pulls Search Console metrics for each `deployment_history.published_url` and updates:
- `deployment_history.traffic` (mapped to impressions)
- `deployment_history.impressions`
- `deployment_history.clicks`
- `deployment_history.keyword_rank`
- `deployment_history.last_analytics_update`

It also caches rows in `search_console_page_metrics`.

### Dashboard summary

```http
GET /api/analytics/dashboard?userId=user_123&startDate=30daysAgo&endDate=today
```

Response includes:
- `totalViews` (impressions)
- `totalUsers` (clicks)
- `avgCtr`
- `markets` (top countries)
- `weeklyActivity`
- `topQueries`
- `pagePerformance`

### Performance by page URL

```http
GET /api/analytics/search-console/page-performance?userId=user_123&startDate=30daysAgo&endDate=today
```

Optional page filter:

```http
GET /api/analytics/search-console/page-performance?userId=user_123&pageUrl=https://example.com/es/article
```

### Top countries

```http
GET /api/analytics/search-console/countries?userId=user_123&startDate=30daysAgo&endDate=today
```

### Top queries

```http
GET /api/analytics/search-console/queries?userId=user_123&startDate=30daysAgo&endDate=today
```

### Single page metrics

```http
GET /api/analytics/page-metrics?userId=user_123&pageUrl=https://example.com/es/article&startDate=30daysAgo&endDate=today
```

## 4. Database Schema Additions

Run `server/database/schema.sql` after this refactor. The following tables were added:

- `search_console_connections`
- `search_console_page_metrics`

### `search_console_connections`
Stores encrypted OAuth tokens per user + selected Search Console property.

### `search_console_page_metrics`
Caches metrics by deployment URL/date range for fast retrieval and auditability.

## 5. Scalable Architecture Notes

- OAuth tokens are encrypted at rest using existing AES-GCM utility.
- Property selection is persisted per user in `search_console_connections.selected_site_url`.
- Dashboard APIs can serve live Search Console data while retaining DB cache for deployment-level history.
- `deployment-sync` is the batching point for per-article URL analytics.
- You can move sync to a cron/queue later without changing API contracts.
