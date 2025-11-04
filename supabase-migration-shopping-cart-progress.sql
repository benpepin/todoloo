-- Migration: Add show_shopping_cart_progress to user_settings table
-- Run this in your Supabase SQL Editor

-- Add the new column with default value true
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_shopping_cart_progress BOOLEAN NOT NULL DEFAULT true;

-- Update existing rows to have the default value
UPDATE user_settings
SET show_shopping_cart_progress = true
WHERE show_shopping_cart_progress IS NULL;
