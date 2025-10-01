/*
  # Fix RLS Policies for Videos Table

  RUN THIS IN YOUR SUPABASE SQL EDITOR

  1. Problem
    - Current policies only allow `public` (anonymous) access
    - Frontend users are authenticated, causing "row-level security policy" violation

  2. Solution
    - Drop existing restrictive policies
    - Create new policies that allow both `public` AND `authenticated` users
    - This enables both anonymous and logged-in users to interact with videos
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read videos" ON videos;
DROP POLICY IF EXISTS "Anyone can insert videos" ON videos;
DROP POLICY IF EXISTS "Anyone can update videos" ON videos;
DROP POLICY IF EXISTS "Anyone can delete videos" ON videos;

-- Create new policies that work for both authenticated and anonymous users
CREATE POLICY "Public and authenticated users can read videos"
  ON videos
  FOR SELECT
  USING (true);

CREATE POLICY "Public and authenticated users can insert videos"
  ON videos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public and authenticated users can update videos"
  ON videos
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public and authenticated users can delete videos"
  ON videos
  FOR DELETE
  USING (true);

-- Also update new_questions policies to ensure update works
DROP POLICY IF EXISTS "Anyone can update questions" ON new_questions;

CREATE POLICY "Public and authenticated users can update questions"
  ON new_questions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
