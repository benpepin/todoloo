-- Migration: Add checklist items functionality
-- Run this in your Supabase SQL Editor

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  task_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_checklist_items_task_id ON checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_order ON checklist_items(task_id, order_index);

-- Enable Row Level Security
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_items
-- Users can view checklist items for todos they own or have access to (via shared lists)
CREATE POLICY "Users can view checklist items for accessible todos"
  ON checklist_items FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM todos
      WHERE user_id = auth.uid() OR
      user_id IN (
        SELECT list_owner_id
        FROM list_shares
        WHERE shared_with_user_id = auth.uid()
      )
    )
  );

-- Users can insert checklist items for todos they own or have write access to
CREATE POLICY "Users can insert checklist items for accessible todos"
  ON checklist_items FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM todos
      WHERE user_id = auth.uid() OR
      user_id IN (
        SELECT list_owner_id
        FROM list_shares
        WHERE shared_with_user_id = auth.uid()
          AND permission = 'write'
      )
    )
  );

-- Users can update checklist items for todos they own or have write access to
CREATE POLICY "Users can update checklist items for accessible todos"
  ON checklist_items FOR UPDATE
  USING (
    task_id IN (
      SELECT id FROM todos
      WHERE user_id = auth.uid() OR
      user_id IN (
        SELECT list_owner_id
        FROM list_shares
        WHERE shared_with_user_id = auth.uid()
          AND permission = 'write'
      )
    )
  );

-- Users can delete checklist items for todos they own or have write access to
CREATE POLICY "Users can delete checklist items for accessible todos"
  ON checklist_items FOR DELETE
  USING (
    task_id IN (
      SELECT id FROM todos
      WHERE user_id = auth.uid() OR
      user_id IN (
        SELECT list_owner_id
        FROM list_shares
        WHERE shared_with_user_id = auth.uid()
          AND permission = 'write'
      )
    )
  );
