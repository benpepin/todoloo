-- Migration: Add list sharing functionality
-- Run this in your Supabase SQL Editor

-- Create list_shares table
CREATE TABLE IF NOT EXISTS list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  list_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'write' CHECK (permission IN ('read', 'write')),
  UNIQUE(list_owner_id, shared_with_user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_list_shares_owner ON list_shares(list_owner_id);
CREATE INDEX IF NOT EXISTS idx_list_shares_shared_with ON list_shares(shared_with_user_id);

-- Enable Row Level Security
ALTER TABLE list_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for list_shares
-- Users can see shares where they are the owner or the shared user
CREATE POLICY "Users can view their own shares"
  ON list_shares FOR SELECT
  USING (
    auth.uid() = list_owner_id OR
    auth.uid() = shared_with_user_id
  );

-- Only list owners can create shares
CREATE POLICY "List owners can share their lists"
  ON list_shares FOR INSERT
  WITH CHECK (auth.uid() = list_owner_id);

-- Only list owners can delete shares
CREATE POLICY "List owners can remove shares"
  ON list_shares FOR DELETE
  USING (auth.uid() = list_owner_id);

-- Update RLS policies for todos table to include shared access
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own todos" ON todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;

-- Users can view todos they own OR todos that have been shared with them
CREATE POLICY "Users can view their own and shared todos"
  ON todos FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Users can insert todos for themselves OR for lists shared with them (write permission)
CREATE POLICY "Users can insert to their own and shared lists"
  ON todos FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    )
  );

-- Users can update their own todos OR shared todos (if they have write permission)
CREATE POLICY "Users can update their own and shared todos"
  ON todos FOR UPDATE
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    )
  );

-- Users can delete their own todos OR shared todos (if they have write permission)
CREATE POLICY "Users can delete their own and shared todos"
  ON todos FOR DELETE
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    )
  );

-- Similar updates for task_completions table
DROP POLICY IF EXISTS "Users can view their own completions" ON task_completions;
DROP POLICY IF EXISTS "Users can insert their own completions" ON task_completions;

CREATE POLICY "Users can view their own and shared completions"
  ON task_completions FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert to their own and shared completions"
  ON task_completions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    )
  );

-- Helper function to get user email by ID (for sharing invitations)
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Function to find user ID by email (for sharing)
CREATE OR REPLACE FUNCTION find_user_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE email = user_email LIMIT 1;
$$;
