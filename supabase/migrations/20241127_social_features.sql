-- Flare Social Features Database Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- USER PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 160),
  location TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================
-- USER FOLLOWS (social graph)
-- ============================================
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Can't follow yourself
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- ============================================
-- USER PREFERENCES (algorithm settings)
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  platform_scores JSONB DEFAULT '{}',
  category_scores JSONB DEFAULT '{}',
  recency_weight FLOAT DEFAULT 0.5 CHECK (recency_weight >= 0 AND recency_weight <= 1),
  virality_weight FLOAT DEFAULT 0.5 CHECK (virality_weight >= 0 AND virality_weight <= 1),
  exploration_enabled BOOLEAN DEFAULT TRUE,
  exploration_percentage INT DEFAULT 20 CHECK (exploration_percentage >= 0 AND exploration_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- USER ARTICLES (votes, saves, interactions)
-- ============================================
CREATE TABLE IF NOT EXISTS user_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id TEXT NOT NULL, -- External article ID from aggregator
  vote INT DEFAULT 0 CHECK (vote >= -1 AND vote <= 1), -- -1 = downvote, 0 = none, 1 = upvote
  is_saved BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  time_spent_seconds INT DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0 CHECK (scroll_depth >= 0 AND scroll_depth <= 1),
  click_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_user_articles_user_id ON user_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_article_id ON user_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_vote ON user_articles(vote) WHERE vote != 0;

-- ============================================
-- ARTICLES (cached article metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY, -- External ID from source
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  platform TEXT NOT NULL,
  category TEXT,
  author TEXT,
  score INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_articles_platform ON articles(platform);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

-- ============================================
-- COMMENTS (threaded discussions)
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id TEXT REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- NULL for top-level comments
  content TEXT NOT NULL CHECK (char_length(content) <= 10000),
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- ============================================
-- COMMENT VOTES
-- ============================================
CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  vote INT NOT NULL CHECK (vote = -1 OR vote = 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);

-- ============================================
-- ACTIVITY EVENTS (notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Actor
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Who gets notified
  event_type TEXT NOT NULL, -- 'follow', 'upvote', 'mention', 'comment', 'reply'
  article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_target ON activity_events(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_unread ON activity_events(target_user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- User Profiles: Anyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Follows: Anyone can see follows, only owner can manage
CREATE POLICY "Follows are viewable by everyone" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);

-- User Preferences: Only owner can access
CREATE POLICY "Users can access own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- User Articles: Only owner can access
CREATE POLICY "Users can access own article interactions" ON user_articles FOR ALL USING (auth.uid() = user_id);

-- Articles: Anyone can read
CREATE POLICY "Articles are viewable by everyone" ON articles FOR SELECT USING (true);
CREATE POLICY "Service role can manage articles" ON articles FOR ALL USING (true);

-- Comments: Anyone can read, only owner can manage
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment Votes: Only owner can access
CREATE POLICY "Users can manage own comment votes" ON comment_votes FOR ALL USING (auth.uid() = user_id);

-- Activity Events: Only target user can read
CREATE POLICY "Users can read own activity" ON activity_events FOR SELECT USING (auth.uid() = target_user_id);
CREATE POLICY "Service role can manage activity" ON activity_events FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1));

  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes - 1 WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET downvotes = downvotes - 1 WHERE id = OLD.comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes - 1 WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET downvotes = downvotes - 1 WHERE id = OLD.comment_id;
    END IF;
    IF NEW.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_vote ON comment_votes;
CREATE TRIGGER on_comment_vote
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION update_comment_votes();

-- Function to get top contributors
CREATE OR REPLACE FUNCTION get_top_contributors(start_date TIMESTAMPTZ, limit_count INT)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(ua.vote) DESC) as rank,
    up.user_id,
    up.username,
    up.display_name,
    up.avatar_url,
    COALESCE(SUM(ua.vote), 0)::BIGINT as score
  FROM user_profiles up
  LEFT JOIN user_articles ua ON ua.user_id = up.user_id
    AND (start_date IS NULL OR ua.created_at >= start_date)
  GROUP BY up.user_id, up.username, up.display_name, up.avatar_url
  HAVING COALESCE(SUM(ua.vote), 0) > 0
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL DATA / SEEDS (Optional)
-- ============================================

-- You can add initial categories, platforms, etc. here if needed
