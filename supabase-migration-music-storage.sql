-- Migration: Create storage bucket for music files
-- Run this in your Supabase SQL Editor

-- Create the music storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload any music files
CREATE POLICY "Authenticated users can upload music files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'music');

-- Allow public read access to music files
CREATE POLICY "Music files are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'music');

-- Allow authenticated users to update music files
CREATE POLICY "Authenticated users can update music files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'music');

-- Allow authenticated users to delete music files
CREATE POLICY "Authenticated users can delete music files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'music');
