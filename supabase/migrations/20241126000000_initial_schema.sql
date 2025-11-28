-- Noiseless Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable pgvector for future semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- user_sources: Per-user source subscriptions
CREATE TABLE IF NOT EXISTS user_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL DEFAULT 'rss',
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    icon_url TEXT,
    fetch_frequency INTERVAL DEFAULT '1 hour',
    last_fetched TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    notify_always BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, url)
);

-- articles: Global article store (shared across users)
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    external_id TEXT,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    raw_content TEXT,
    extracted_content TEXT,
    summary_short TEXT,
    summary_extended TEXT,
    topics TEXT[],
    entities JSONB,
    banger_score FLOAT,
    content_hash TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_articles: Per-user article state (read, saved, votes)
CREATE TABLE IF NOT EXISTS user_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
    relevance_score FLOAT,
    is_read BOOLEAN DEFAULT false,
    is_saved BOOLEAN DEFAULT false,
    vote SMALLINT DEFAULT 0,
    time_spent_sec INTEGER,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- processing_queue: Queue for AI processing
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_url);
CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_articles_user ON user_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_article ON user_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_user ON user_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);

-- Row Level Security Policies
ALTER TABLE user_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own sources
CREATE POLICY "Users can manage own sources" ON user_sources
    FOR ALL USING (auth.uid() = user_id);

-- Users can only see/manage their own article states
CREATE POLICY "Users can manage own article states" ON user_articles
    FOR ALL USING (auth.uid() = user_id);

-- Anyone authenticated can read articles
CREATE POLICY "Authenticated users can read articles" ON articles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can insert/update articles (for Edge Functions)
CREATE POLICY "Service role can manage articles" ON articles
    FOR ALL USING (auth.role() = 'service_role');

-- Function to auto-add articles to processing queue
CREATE OR REPLACE FUNCTION add_to_processing_queue()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO processing_queue (article_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to queue new articles for AI processing
DROP TRIGGER IF EXISTS queue_new_articles ON articles;
CREATE TRIGGER queue_new_articles
    AFTER INSERT ON articles
    FOR EACH ROW
    EXECUTE FUNCTION add_to_processing_queue();
