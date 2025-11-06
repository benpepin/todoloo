-- Migration: Allow users to create lists for users who have given them write permission
-- Run this in your Supabase SQL Editor

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Users can insert their own lists" ON lists;

-- Create new policy that allows:
-- 1. Users to create their own lists (auth.uid() = user_id)
-- 2. Users to create lists for users who have shared with them with write permission
CREATE POLICY "Users can insert their own lists or lists for shared users"
  ON lists FOR INSERT
  WITH CHECK (
    -- Can create own lists
    auth.uid() = user_id OR
    -- Can create lists for users who have shared with write permission
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    )
  );

-- Also update the SELECT policy to allow viewing lists of users who have shared with you
DROP POLICY IF EXISTS "Users can view their own lists" ON lists;

CREATE POLICY "Users can view their own and shared user lists"
  ON lists FOR SELECT
  USING (
    -- Own lists
    auth.uid() = user_id OR
    -- Lists belonging to users who have shared with you
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );
