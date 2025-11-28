-- Flare Web MVP Schema Addition
-- Adds tables needed for web app voting and preferences
-- Compatible with existing iOS schema (20241126000000_initial_schema.sql)

-- ============================================
-- USER PREFERENCES (learning algorithm settings)
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_scores JSONB DEFAULT '{}',      -- {"reddit": 0.2, "hackernews": -0.1}
  category_scores JSONB DEFAULT '{}',      -- {"technology": 0.3, "politics": -0.2}
  total_interactions INTEGER DEFAULT 0,
  recency_weight FLOAT DEFAULT 0.5 CHECK (recency_weight >= 0 AND recency_weight <= 1),
  virality_weight FLOAT DEFAULT 0.5 CHECK (virality_weight >= 0 AND virality_weight <= 1),
  exploration_enabled BOOLEAN DEFAULT TRUE,
  exploration_percentage INTEGER DEFAULT 20 CHECK (exploration_percentage >= 0 AND exploration_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- WEB ARTICLE VOTES (for trending/external articles)
-- Uses TEXT article_id to support external IDs like Reddit "t3_abc123"
-- Separate from iOS user_articles to avoid schema conflicts
-- ============================================
CREATE TABLE IF NOT EXISTS web_article_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id TEXT NOT NULL,                 -- External article ID (Reddit post ID, HN story ID, etc.)
  platform TEXT,                            -- "reddit", "hackernews", "youtube", etc.
  category TEXT,                            -- Article category for learning
  vote INTEGER DEFAULT 0 CHECK (vote >= -1 AND vote <= 1), -- -1=down, 0=none, 1=up
  title TEXT,                               -- Cached title for display
  url TEXT,                                 -- Cached URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_web_article_votes_user ON web_article_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_web_article_votes_article ON web_article_votes(article_id);
CREATE INDEX IF NOT EXISTS idx_web_article_votes_platform ON web_article_votes(platform);

-- ============================================
-- ACTIVITY EVENTS (for analytics and future notifications)
-- target_user_id is nullable for self-events like votes
-- ============================================
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for self-events
  event_type TEXT NOT NULL,                 -- 'upvote', 'downvote', 'unvote', 'save', 'share'
  article_id TEXT,                          -- External article ID
  metadata JSONB DEFAULT '{}',              -- Additional event data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user ON activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type);

-- ============================================
-- USER PROFILES (extends auth.users for display)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 160),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_article_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User Preferences: Only owner can access
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Web Article Votes: Only owner can access
CREATE POLICY "Users manage own votes" ON web_article_votes
  FOR ALL USING (auth.uid() = user_id);

-- Activity Events: Users can insert their own, read their own
CREATE POLICY "Users manage own activity" ON activity_events
  FOR ALL USING (auth.uid() = user_id);

-- User Profiles: Anyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE USER PREFERENCES & PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user_web()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user profile
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created_web ON auth.users;
CREATE TRIGGER on_auth_user_created_web
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_web();
