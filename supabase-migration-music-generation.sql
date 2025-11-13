-- Migration: Add music generation functionality
-- Run this in your Supabase SQL Editor

-- Add music-related columns to todos table
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS music_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS music_url TEXT,
  ADD COLUMN IF NOT EXISTS music_generation_status TEXT DEFAULT 'idle';

-- Add comment to document the music_generation_status values
COMMENT ON COLUMN todos.music_generation_status IS 'Status of music generation: idle, generating, ready, or error';
COMMENT ON COLUMN todos.music_enabled IS 'Whether the user wants AI-generated music for this task';
COMMENT ON COLUMN todos.music_url IS 'URL to the generated music file (blob URL or storage URL)';
