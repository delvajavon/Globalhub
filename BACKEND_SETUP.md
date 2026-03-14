# 🚀 GlobalHub Backend Setup Guide

## Architecture

Your GlobalHub application now has:

```
Frontend (Vite + React)  → Backend (Express) → Google Search Console API
   localhost:5173               localhost:3001
```

## Installation & Setup

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install
```

### 2. Google Search Console Setup

You need to set up **Google OAuth credentials** and a verified Search Console property:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Search Console API**
4. Configure OAuth consent and add scope:
  `https://www.googleapis.com/auth/webmasters.readonly`
5. Add redirect URI:
  `http://localhost:3001/api/analytics/search-console/oauth/callback`
6. Verify your real domain property in Search Console

### 3. Environment Variables

Both frontend and backend share `.env`:

> **Pro tip:** the backend route file (`analytics.js`) explicitly calls `dotenv.config()` at the top so the variables are available even when the module is imported early during startup.


```env
# Supabase (frontend and backend shared)
VITE_SUPABASE_URL=https://zkybiaeiwlnwfiipgpbo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_EUtsXR3JJxRUZY3epO7qHw_4MyMlqN0

> **Backend note:** copies of the same values will live in `server/.env` without the `VITE_` prefix.

# Backend
BACKEND_PORT=3001
VITE_BACKEND_URL=http://localhost:3001

# Google Search Console OAuth
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_SC_REDIRECT_URI=http://localhost:3001/api/analytics/search-console/oauth/callback
```

### 4. Run Development Servers

**Option A: Run Both Frontend & Backend Together**

```bash
npm run dev:all
```

This will:
- Start Vite frontend on `http://localhost:5173`
- Start Express backend on `http://localhost:3001`

**Option B: Run Separately**

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run dev:backend
```

## 📡 Backend API Endpoints

### 1. Get Page Views
```
GET /api/analytics/pageviews
```

### 2. Get Country Traffic
```
GET /api/analytics/country-traffic
```

### 3. Get Page Metrics
```
GET /api/analytics/page-metrics?pageUrl=/article-slug
```

### 4. Save Analytics to Supabase
```
POST /api/analytics/save-analytics

{
  "translationId": "uuid",
  "pageUrl": "https://example.com/article",
  "country": "US",
  "language": "en"
}
```

## 🔧 Using Analytics in Your React App

### Trigger Deployment Sync (per user)

```jsx
await fetch('http://localhost:3001/api/analytics/deployment-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'debug-user', startDate: '30daysAgo', endDate: 'today' })
})
```

### Fetch Dashboard Metrics

```jsx
const dashboard = await fetch('http://localhost:3001/api/analytics/dashboard?userId=debug-user&startDate=30daysAgo&endDate=today')
```

## 📊 Example Dashboard Component

Check `src/AnalyticsDashboard.jsx` for a working example that:
- Fetches page metrics
- Fetches country traffic
- Saves analytics to Supabase

## ✅ Testing the Setup

1. Start the backend: `npm run dev:backend`
2. In another terminal, check health: `curl http://localhost:3001/health`
3. Should return: `{"status":"Backend server is running"}`

## 📁 Project Structure

```
globalhubapp2/
├── src/
│   ├── main.jsx
│   ├── vite-env.d.ts
│   └── AnalyticsDashboard.jsx
├── lib/
│   ├── supabaseClient.ts
│   ├── publishArticle.ts
│   └── supabaseClient.ts
├── server/
│   ├── index.js              (Express server)
│   ├── package.json
│   ├── middleware/
│   │   └── searchConsole.js
│   └── routes/
│       └── analytics.js
├── SEARCH_CONSOLE_ANALYTICS_PLAN.md
├── .env
├── .gitignore
├── package.json
└── vite.config.js
```

## 🔒 Security Notes

- ✅ Service account credentials are **NOT** exposed to the frontend
- ✅ All Google API calls are **server-side only**
- ✅ Frontend only calls your Express backend
- ✅ `.env` files are in `.gitignore` (never commit credentials)

## 🚨 Troubleshooting

**Backend won't start?**
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>
```

**Search Console not loading?**
- Confirm OAuth credentials and redirect URI in `.env`
- Confirm user completed OAuth consent
- Confirm `selectedSiteUrl` is set for the user

**CORS errors?**
- Backend has CORS enabled for all origins (dev only)
- In production, update CORS settings in `server/index.js`

## 📝 Next Steps

1. Improve deployment-level SEO summaries per article
2. Add advanced filtering by property/page/query
3. Create a production-ready dashboard UI
4. Add caching for frequently accessed analytics

Enjoy building GlobalHub! 🌍
