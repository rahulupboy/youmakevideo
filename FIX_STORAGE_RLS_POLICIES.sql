/*
  # Fix Storage RLS Policies for Video Pipeline

  This SQL fixes the RLS (Row Level Security) policy issue when uploading files to storage buckets.

  ## Problem
  The error "new row violates row-level security policy" occurs because the storage.objects table
  has restrictive RLS policies that prevent unauthenticated or improperly authenticated uploads.

  ## Solution
  Create proper RLS policies that allow:
  1. Public read access (anyone can view/download)
  2. Authenticated users can upload files
  3. Service role can do everything (for edge functions)

  ## Instructions
  Run this SQL in your Supabase SQL Editor
*/

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their audio files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage audio files" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view video renders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload video renders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their video renders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their video renders" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage video renders" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage thumbnails" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view their temp files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload temp files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their temp files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their temp files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage temp files" ON storage.objects;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUDIO-FILES BUCKET POLICIES
-- =====================================================

-- Anyone can view audio files (public read)
CREATE POLICY "Anyone can view audio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-files');

-- Authenticated users can upload audio files
CREATE POLICY "Authenticated users can upload audio files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio-files');

-- Service role can do everything with audio files (for edge functions)
CREATE POLICY "Service role can manage audio files"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'audio-files');

-- Authenticated users can update audio files
CREATE POLICY "Authenticated users can update their audio files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audio-files')
  WITH CHECK (bucket_id = 'audio-files');

-- Authenticated users can delete audio files
CREATE POLICY "Authenticated users can delete their audio files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'audio-files');

-- =====================================================
-- VIDEO-RENDERS BUCKET POLICIES
-- =====================================================

-- Anyone can view video renders (public read)
CREATE POLICY "Anyone can view video renders"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-renders');

-- Authenticated users can upload video renders
CREATE POLICY "Authenticated users can upload video renders"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'video-renders');

-- Service role can do everything with video renders
CREATE POLICY "Service role can manage video renders"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'video-renders');

-- Authenticated users can update video renders
CREATE POLICY "Authenticated users can update their video renders"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'video-renders')
  WITH CHECK (bucket_id = 'video-renders');

-- Authenticated users can delete video renders
CREATE POLICY "Authenticated users can delete their video renders"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'video-renders');

-- =====================================================
-- THUMBNAILS BUCKET POLICIES
-- =====================================================

-- Anyone can view thumbnails (public read)
CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

-- Authenticated users can upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

-- Service role can do everything with thumbnails
CREATE POLICY "Service role can manage thumbnails"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'thumbnails');

-- Authenticated users can update thumbnails
CREATE POLICY "Authenticated users can update their thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'thumbnails')
  WITH CHECK (bucket_id = 'thumbnails');

-- Authenticated users can delete thumbnails
CREATE POLICY "Authenticated users can delete their thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'thumbnails');

-- =====================================================
-- TEMP-FILES BUCKET POLICIES (PRIVATE)
-- =====================================================

-- Authenticated users can view their temp files
CREATE POLICY "Authenticated users can view their temp files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'temp-files');

-- Authenticated users can upload temp files
CREATE POLICY "Authenticated users can upload temp files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'temp-files');

-- Service role can do everything with temp files
CREATE POLICY "Service role can manage temp files"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'temp-files');

-- Authenticated users can update temp files
CREATE POLICY "Authenticated users can update their temp files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'temp-files')
  WITH CHECK (bucket_id = 'temp-files');

-- Authenticated users can delete temp files
CREATE POLICY "Authenticated users can delete their temp files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'temp-files');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
