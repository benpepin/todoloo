-- Migration: Allow shared users to edit and delete lists
-- Run this in your Supabase SQL Editor

-- Drop existing policies for lists
DROP POLICY IF EXISTS "Users can update their own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON lists;

-- Users can update their own lists OR lists of users who shared with them
CREATE POLICY "Users can update their own and shared lists"
  ON lists FOR UPDATE
  USING (
    -- Own lists
    auth.uid() = user_id OR
    -- Lists from users who shared with them
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Users can delete their own lists OR lists of users who shared with them
CREATE POLICY "Users can delete their own and shared lists"
  ON lists FOR DELETE
  USING (
    -- Own lists
    auth.uid() = user_id OR
    -- Lists from users who shared with them
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );
