-- Fix RLS policies for checklist_items
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view checklist items for accessible todos" ON checklist_items;
DROP POLICY IF EXISTS "Users can insert checklist items for accessible todos" ON checklist_items;
DROP POLICY IF EXISTS "Users can update checklist items for accessible todos" ON checklist_items;
DROP POLICY IF EXISTS "Users can delete checklist items for accessible todos" ON checklist_items;

-- Simplified RLS Policies that handle NULL user_id cases

-- SELECT: Users can view checklist items for todos they have access to
CREATE POLICY "Users can view checklist items for accessible todos"
  ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = checklist_items.task_id
        AND (
          todos.user_id = auth.uid()
          OR todos.user_id IS NULL
          OR todos.user_id IN (
            SELECT list_owner_id
            FROM list_shares
            WHERE shared_with_user_id = auth.uid()
          )
        )
    )
  );

-- INSERT: Users can insert checklist items for todos they own or have write access to
CREATE POLICY "Users can insert checklist items for accessible todos"
  ON checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = checklist_items.task_id
        AND (
          todos.user_id = auth.uid()
          OR todos.user_id IS NULL
          OR todos.user_id IN (
            SELECT list_owner_id
            FROM list_shares
            WHERE shared_with_user_id = auth.uid()
              AND permission = 'write'
          )
        )
    )
  );

-- UPDATE: Users can update checklist items for todos they own or have write access to
CREATE POLICY "Users can update checklist items for accessible todos"
  ON checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = checklist_items.task_id
        AND (
          todos.user_id = auth.uid()
          OR todos.user_id IS NULL
          OR todos.user_id IN (
            SELECT list_owner_id
            FROM list_shares
            WHERE shared_with_user_id = auth.uid()
              AND permission = 'write'
          )
        )
    )
  );

-- DELETE: Users can delete checklist items for todos they own or have write access to
CREATE POLICY "Users can delete checklist items for accessible todos"
  ON checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM todos
      WHERE todos.id = checklist_items.task_id
        AND (
          todos.user_id = auth.uid()
          OR todos.user_id IS NULL
          OR todos.user_id IN (
            SELECT list_owner_id
            FROM list_shares
            WHERE shared_with_user_id = auth.uid()
              AND permission = 'write'
          )
        )
    )
  );
