-- Migration: Add lists table for multiple personal lists
-- Run this in your Supabase SQL Editor

-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, name)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_order ON lists(user_id, "order");

-- Enable Row Level Security
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lists
-- Users can view their own lists and lists shared with them
CREATE POLICY "Users can view their own lists"
  ON lists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own lists
CREATE POLICY "Users can insert their own lists"
  ON lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lists
CREATE POLICY "Users can update their own lists"
  ON lists FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own lists
CREATE POLICY "Users can delete their own lists"
  ON lists FOR DELETE
  USING (auth.uid() = user_id);

-- Add list_id column to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE;

-- Create index for todos.list_id
CREATE INDEX IF NOT EXISTS idx_todos_list_id ON todos(list_id);

-- Update trigger for lists updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration function: Create default "Today" list for existing users and migrate their todos
-- This function should be run once after the migration
CREATE OR REPLACE FUNCTION migrate_existing_todos_to_lists()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  default_list_id UUID;
BEGIN
  -- For each user who has todos but no lists
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM todos
    WHERE user_id IS NOT NULL
      AND user_id NOT IN (SELECT user_id FROM lists)
  LOOP
    -- Create a default "Today" list for this user
    INSERT INTO lists (user_id, name, "order")
    VALUES (user_record.user_id, 'Today', 0)
    RETURNING id INTO default_list_id;

    -- Update all their todos to belong to this list
    UPDATE todos
    SET list_id = default_list_id
    WHERE user_id = user_record.user_id
      AND list_id IS NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_existing_todos_to_lists();

-- Update RLS policies for todos to include list-based access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own and shared todos" ON todos;
DROP POLICY IF EXISTS "Users can insert to their own and shared lists" ON todos;
DROP POLICY IF EXISTS "Users can update their own and shared todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own and shared todos" ON todos;

-- Users can view todos in their own lists OR in lists shared with them
CREATE POLICY "Users can view their own and shared todos"
  ON todos FOR SELECT
  USING (
    -- Own todos (by user_id for backwards compatibility)
    user_id = auth.uid() OR
    -- Todos in their own lists
    list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()) OR
    -- Todos in lists shared with them
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Users can insert todos to their own lists OR lists shared with them (write permission)
CREATE POLICY "Users can insert to their own and shared lists"
  ON todos FOR INSERT
  WITH CHECK (
    -- Into their own lists
    list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()) OR
    -- Into shared lists (for backwards compatibility with user_id based sharing)
    (user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    ))
  );

-- Users can update todos in their own lists OR shared lists (write permission)
CREATE POLICY "Users can update their own and shared todos"
  ON todos FOR UPDATE
  USING (
    -- Own todos in own lists
    list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()) OR
    -- Shared list todos (for backwards compatibility)
    (user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    ))
  );

-- Users can delete todos in their own lists OR shared lists (write permission)
CREATE POLICY "Users can delete their own and shared todos"
  ON todos FOR DELETE
  USING (
    -- Own todos in own lists
    list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()) OR
    -- Shared list todos (for backwards compatibility)
    (user_id = auth.uid() OR
    user_id IN (
      SELECT list_owner_id
      FROM list_shares
      WHERE shared_with_user_id = auth.uid()
        AND permission = 'write'
    ))
  );
