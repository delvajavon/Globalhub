-- ============================================
-- GlobalHub Database Schema
-- ============================================

-- CMS Connections Table
-- Stores user's connected CMS platforms with credentials
CREATE TABLE IF NOT EXISTS cms_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'wordpress', 'ghost', 'webflow', etc.
  platform_name VARCHAR(255), -- Custom name user gives to this connection
  api_url TEXT NOT NULL, -- e.g., https://mysite.com/wp-json
  api_key TEXT NOT NULL, -- ENCRYPTED using AES-256-GCM (see utils/encryption.js)
  api_secret TEXT, -- For OAuth-based platforms (also encrypted)
  site_id VARCHAR(255), -- For multi-site platforms like Shopify, Webflow
  config JSONB, -- Additional platform-specific config
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, api_url)
);

-- Deployment History Table
-- Tracks all article deployments across platforms
CREATE TABLE IF NOT EXISTS deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  article_id UUID, -- Can be NULL for one-off deployments
  platform VARCHAR(50) NOT NULL,
  connection_id UUID REFERENCES cms_connections(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'publishing', 'published', 'failed'
  published_url TEXT, -- Final published URL from CMS
  platform_article_id VARCHAR(255), -- Article/post ID in the CMS platform
  error_message TEXT, -- Error details if failed
  article_data JSONB NOT NULL, -- Full article payload for reference
  metadata JSONB, -- Platform-specific response data
  
  -- Analytics tracking (populated by future integrations)
  traffic INTEGER DEFAULT 0, -- Total page views
  impressions INTEGER DEFAULT 0, -- Google Search Console impressions
  clicks INTEGER DEFAULT 0, -- Google Search Console clicks
  keyword_rank JSONB, -- { "keyword": rank } map
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  last_analytics_update TIMESTAMP WITH TIME ZONE
);

-- Articles Table (for storing generated articles before deployment)
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  source_url TEXT,
  market_code VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  localized_title TEXT NOT NULL,
  seo_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT[], -- Array of keywords
  slug TEXT NOT NULL,
  excerpt TEXT,
  cultural_note TEXT,
  word_count INTEGER,
  reading_time INTEGER,
  seo_score INTEGER,
  hreflang VARCHAR(20),
  content TEXT, -- Article body content
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'ready', 'deployed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Console Connections Table
-- Stores per-user Google OAuth tokens and selected Search Console property
CREATE TABLE IF NOT EXISTS search_console_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  oauth_tokens_encrypted TEXT NOT NULL,
  selected_site_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Console Page Metrics Cache
-- Caches per-page analytics for deployment URLs over requested date ranges
CREATE TABLE IF NOT EXISTS search_console_page_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  deployment_id UUID REFERENCES deployment_history(id) ON DELETE CASCADE,
  published_url TEXT NOT NULL,
  site_url TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  position NUMERIC(8,2) DEFAULT 0,
  countries JSONB DEFAULT '[]'::jsonb,
  queries JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deployment_id, start_date, end_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cms_connections_user_id ON cms_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_cms_connections_platform ON cms_connections(platform);
CREATE INDEX IF NOT EXISTS idx_deployment_history_user_id ON deployment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_created_at ON deployment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_search_console_connections_user_id ON search_console_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_search_console_metrics_user_id ON search_console_page_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_console_metrics_published_url ON search_console_page_metrics(published_url);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deployment_history'
      AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)';
  END IF;
END $$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- NOTE:
-- These policies are intentionally permissive to preserve current behavior,
-- because the app currently sends userId in requests and uses anon credentials.
-- Tighten these policies once auth JWT claims are enforced server-side.

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.publishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_console_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_console_page_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_public_all ON public.users;
CREATE POLICY users_public_all
ON public.users
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS articles_public_all ON public.articles;
CREATE POLICY articles_public_all
ON public.articles
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS translations_public_all ON public.translations;
CREATE POLICY translations_public_all
ON public.translations
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS publishes_public_all ON public.publishes;
CREATE POLICY publishes_public_all
ON public.publishes
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS analytics_public_all ON public.analytics;
CREATE POLICY analytics_public_all
ON public.analytics
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS cms_connections_public_all ON public.cms_connections;
CREATE POLICY cms_connections_public_all
ON public.cms_connections
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS search_console_connections_public_all ON public.search_console_connections;
CREATE POLICY search_console_connections_public_all
ON public.search_console_connections
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS search_console_page_metrics_public_all ON public.search_console_page_metrics;
CREATE POLICY search_console_page_metrics_public_all
ON public.search_console_page_metrics
FOR ALL
USING (true)
WITH CHECK (true);
