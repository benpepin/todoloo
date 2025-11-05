-- Migration: Allow users to view lists that have been shared with them
-- Run this in your Supabase SQL Editor

-- Add policy to allow viewing lists shared with you
CREATE POLICY "Users can view lists shared with them"
  ON lists FOR SELECT
  USING (
    -- Own lists
    auth.uid() = user_id OR
    -- Lists from users who have shared with you
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own lists" ON lists;

-- Note: Users can still only INSERT, UPDATE, DELETE their own lists
-- This only allows VIEWING lists from users who have shared access
