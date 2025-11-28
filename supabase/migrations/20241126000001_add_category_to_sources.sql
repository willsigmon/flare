-- Add category column to user_sources for organizing feeds
ALTER TABLE user_sources ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category queries
CREATE INDEX IF NOT EXISTS idx_user_sources_category ON user_sources(user_id, category);
