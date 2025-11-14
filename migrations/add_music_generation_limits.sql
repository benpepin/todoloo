-- Add daily music generation tracking columns to user_settings table
-- Run this migration in your Supabase SQL Editor

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS music_generations_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_music_generation_date TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.music_generations_today IS 'Number of music generations today (resets daily)';
COMMENT ON COLUMN user_settings.last_music_generation_date IS 'Last date music was generated (used to reset daily count)';
