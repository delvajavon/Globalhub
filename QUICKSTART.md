# 🚀 Quick Start Guide

Your GlobalHub analytics integration is **90% ready**! Here's what to do:

## Option 1: Start with Mock Data (1 minute)

See the app running with demo data while you set up real analytics:

```bash
./start.sh
```

Then open: http://localhost:5173 and navigate to Analytics

## Option 2: Connect Real Search Console Analytics (10 minutes)

### Step 1: Configure Google OAuth + Search Console

1. **Create OAuth client in Google Cloud:**
   - Go to https://console.cloud.google.com/
   - Create/select a project
   - Enable "Google Search Console API"
   - Add redirect URI:
     `http://localhost:3001/api/analytics/search-console/oauth/callback`
   - Add scope:
     `https://www.googleapis.com/auth/webmasters.readonly`

2. **Verify your real domain in Search Console:**
   - Go to https://search.google.com/search-console
   - Add and verify your property (for example `scenehire.com`)

### Step 2: Configure Environment

Edit `.env` file:
```bash
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_SC_REDIRECT_URI=http://localhost:3001/api/analytics/search-console/oauth/callback
```

### Step 3: Start the App

```bash
./start.sh
```

Then connect from the Analytics tab with **Connect Search Console**.

## What You'll See

✅ **Search Console Analytics Dashboard** with:
- Total views & users with trend comparison
- Weekly activity chart (last 7 days)
- Country breakdown (top 10 markets)
- Language distribution
- Top performing markets by engagement

## Need Help?

- **Full Setup Guide:** [ANALYTICS_SETUP.md](ANALYTICS_SETUP.md)
- **Search Console Plan:** [SEARCH_CONSOLE_ANALYTICS_PLAN.md](SEARCH_CONSOLE_ANALYTICS_PLAN.md)
- **Test Backend:** `curl 'http://localhost:3001/api/analytics/dashboard?userId=debug-user&startDate=30daysAgo&endDate=today'`

## Files Created

✅ `.env` - Environment configuration (edit this)  
✅ `server/.env` - Backend env overrides (optional)  
✅ `start.sh` - Quick start script  
✅ `setup-analytics.sh` - Guided setup wizard  

---

**Without Search Console connection?** The app still runs, but analytics may show empty or zero values until connected.
