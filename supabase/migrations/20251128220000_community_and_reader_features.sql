-- =============================================
-- FLARE COMMUNITY & READER FEATURES MIGRATION
-- =============================================

-- 1. Aggregate vote counts for community visibility
CREATE TABLE IF NOT EXISTS article_flare_scores (
  article_id TEXT PRIMARY KEY,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  score INTEGER GENERATED ALWAYS AS (upvotes - downvotes) STORED,
  voter_count INTEGER DEFAULT 0,
  first_vote_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting by score
CREATE INDEX IF NOT EXISTS idx_flare_scores_score ON article_flare_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_flare_scores_updated ON article_flare_scores(updated_at DESC);

-- 2. User achievements/badges
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON user_achievements(achievement_type);

-- 3. User streaks for gamification
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_type TEXT DEFAULT 'daily_vote',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reader preferences per user
CREATE TABLE IF NOT EXISTS user_reader_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  font_family TEXT DEFAULT 'system-ui',
  font_size INTEGER DEFAULT 18 CHECK (font_size >= 12 AND font_size <= 32),
  line_height FLOAT DEFAULT 1.6 CHECK (line_height >= 1.0 AND line_height <= 3.0),
  max_width INTEGER DEFAULT 680 CHECK (max_width >= 400 AND max_width <= 1200),
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'sepia', 'oled', 'auto')),
  background_color TEXT,
  text_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Function to update flare_scores on vote changes
CREATE OR REPLACE FUNCTION update_flare_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO article_flare_scores (article_id, upvotes, downvotes, voter_count, first_vote_at, updated_at)
    VALUES (
      NEW.article_id,
      CASE WHEN NEW.vote = 1 THEN 1 ELSE 0 END,
      CASE WHEN NEW.vote = -1 THEN 1 ELSE 0 END,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (article_id) DO UPDATE SET
      upvotes = article_flare_scores.upvotes + CASE WHEN NEW.vote = 1 THEN 1 ELSE 0 END,
      downvotes = article_flare_scores.downvotes + CASE WHEN NEW.vote = -1 THEN 1 ELSE 0 END,
      voter_count = article_flare_scores.voter_count + 1,
      updated_at = NOW();
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    UPDATE article_flare_scores SET
      upvotes = upvotes
        + CASE WHEN NEW.vote = 1 THEN 1 ELSE 0 END
        - CASE WHEN OLD.vote = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes
        + CASE WHEN NEW.vote = -1 THEN 1 ELSE 0 END
        - CASE WHEN OLD.vote = -1 THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE article_id = NEW.article_id;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE article_flare_scores SET
      upvotes = upvotes - CASE WHEN OLD.vote = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes - CASE WHEN OLD.vote = -1 THEN 1 ELSE 0 END,
      voter_count = GREATEST(voter_count - 1, 0),
      updated_at = NOW()
    WHERE article_id = OLD.article_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-update flare scores
DROP TRIGGER IF EXISTS trg_update_flare_score ON web_article_votes;
CREATE TRIGGER trg_update_flare_score
  AFTER INSERT OR UPDATE OR DELETE ON web_article_votes
  FOR EACH ROW EXECUTE FUNCTION update_flare_score();

-- 7. Function to update user streaks
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_date DATE;
  current_date_val DATE := CURRENT_DATE;
BEGIN
  -- Get or create streak record
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
  VALUES (NEW.user_id, 0, 0, NULL, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_activity_date INTO last_date FROM user_streaks WHERE user_id = NEW.user_id;

  IF last_date IS NULL OR last_date < current_date_val - 1 THEN
    -- Streak broken or first activity, start fresh
    UPDATE user_streaks SET
      current_streak = 1,
      last_activity_date = current_date_val,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF last_date = current_date_val - 1 THEN
    -- Continue streak
    UPDATE user_streaks SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_activity_date = current_date_val,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  -- If last_date = current_date_val, do nothing (already voted today)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger for streak updates on votes
DROP TRIGGER IF EXISTS trg_update_streak ON web_article_votes;
CREATE TRIGGER trg_update_streak
  AFTER INSERT ON web_article_votes
  FOR EACH ROW EXECUTE FUNCTION update_user_streak();

-- 9. RLS Policies
ALTER TABLE article_flare_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reader_settings ENABLE ROW LEVEL SECURITY;

-- Flare scores are publicly readable
CREATE POLICY "Flare scores are publicly readable"
  ON article_flare_scores FOR SELECT
  USING (true);

-- Achievements: users can read all, but only system can insert
CREATE POLICY "Users can view all achievements"
  ON user_achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR ALL
  USING (auth.uid() = user_id);

-- Streaks: users can read their own
CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all streaks for leaderboard"
  ON user_streaks FOR SELECT
  USING (true);

-- Reader settings: users manage their own
CREATE POLICY "Users can manage own reader settings"
  ON user_reader_settings FOR ALL
  USING (auth.uid() = user_id);

-- 10. Helper function to get flare score with user vote
CREATE OR REPLACE FUNCTION get_flare_score_with_user_vote(p_article_id TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  article_id TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  score INTEGER,
  voter_count INTEGER,
  user_vote INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.article_id,
    fs.upvotes,
    fs.downvotes,
    fs.score,
    fs.voter_count,
    COALESCE(wav.vote, 0)::INTEGER as user_vote
  FROM article_flare_scores fs
  LEFT JOIN web_article_votes wav
    ON wav.article_id = fs.article_id
    AND wav.user_id = p_user_id
  WHERE fs.article_id = p_article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
