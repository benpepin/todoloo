-- Migration: Add creator tracking for tasks
-- Run this in your Supabase SQL Editor

-- Add created_by_user_id column to todos table
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups when filtering by creator
CREATE INDEX IF NOT EXISTS idx_todos_created_by ON todos(created_by_user_id);

-- Backfill existing tasks: set created_by_user_id to user_id for existing tasks
-- This assumes existing tasks were created by their owners
UPDATE todos
SET created_by_user_id = user_id
WHERE created_by_user_id IS NULL;

-- Helper function to get user's display name (using email as fallback)
-- This returns the email address since we don't have a separate display_name field
CREATE OR REPLACE FUNCTION get_user_display_name(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'name',
    email,
    'Unknown User'
  ) FROM auth.users WHERE id = user_id;
$$;
