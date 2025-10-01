/*
  # Optional Database Improvements for Videos System

  This file contains optional but recommended improvements to enhance
  data integrity, performance, and maintainability.

  You can run this AFTER fixing the RLS policies.

  ## What this does:
  1. Adds foreign key constraints for data integrity
  2. Adds performance indexes for common queries
  3. Creates automatic timestamp update trigger
  4. Adds helpful constraints and defaults

  ## Instructions:
  1. First run FIX_VIDEOS_RLS_POLICY.sql
  2. Then run this file in Supabase SQL Editor
*/

-- =============================================================================
-- 1. Add Foreign Key Constraints
-- =============================================================================

-- Add foreign key from videos to courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_videos_course'
    AND table_name = 'videos'
  ) THEN
    ALTER TABLE videos
    ADD CONSTRAINT fk_videos_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from videos to new_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_videos_question'
    AND table_name = 'videos'
  ) THEN
    ALTER TABLE videos
    ADD CONSTRAINT fk_videos_question
    FOREIGN KEY (question_id) REFERENCES new_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- 2. Add Performance Indexes
-- =============================================================================

-- Index for filtering videos by course
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);

-- Index for filtering videos by question
CREATE INDEX IF NOT EXISTS idx_videos_question_id ON videos(question_id);

-- Index for filtering videos by status
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Index for sorting videos by creation date (descending)
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Composite index for common query pattern: course + status
CREATE INDEX IF NOT EXISTS idx_videos_course_status ON videos(course_id, status);

-- =============================================================================
-- 3. Automatic Timestamp Updates
-- =============================================================================

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for videos table
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. Add Check Constraints for Data Validation
-- =============================================================================

-- Ensure status is one of the valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'videos_status_check'
    AND table_name = 'videos'
  ) THEN
    ALTER TABLE videos
    ADD CONSTRAINT videos_status_check
    CHECK (status IN ('draft', 'script_generated', 'audio_generated', 'captions_generated', 'video_rendered'));
  END IF;
END $$;

-- Ensure template_id is between 1 and 6
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'videos_template_id_check'
    AND table_name = 'videos'
  ) THEN
    ALTER TABLE videos
    ADD CONSTRAINT videos_template_id_check
    CHECK (template_id >= 1 AND template_id <= 6);
  END IF;
END $$;

-- =============================================================================
-- 5. Verify All Changes
-- =============================================================================

-- Show all constraints on videos table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'videos'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Show all indexes on videos table
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'videos'
ORDER BY indexname;

-- Show all triggers on videos table
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'videos';
