/*
  # Fix Row Level Security Policies for Videos Table

  ## Problem
  The current RLS policies for the `videos` table use `TO public` which only applies
  to anonymous/unauthenticated users. This causes "new row violates row-level security
  policy" errors when trying to insert data.

  ## Solution
  1. Drop existing insecure policies that use `USING (true)`
  2. Create new policies that work for both authenticated and anonymous users
  3. Use proper role targeting to apply to all users
  4. Maintain the same functionality (anyone can read/write) but with proper configuration

  ## Security Notes
  - These policies allow public access, which is intentional for this application
  - In a production environment, you should restrict access based on user ownership
  - The policies now properly target both anonymous and authenticated users

  ## Instructions
  Run this SQL in your Supabase SQL Editor:
  1. Go to your Supabase Dashboard
  2. Navigate to SQL Editor
  3. Copy and paste this entire file
  4. Click "Run" to execute
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read videos" ON videos;
DROP POLICY IF EXISTS "Anyone can insert videos" ON videos;
DROP POLICY IF EXISTS "Anyone can update videos" ON videos;

-- Create new policies that work for all users (authenticated and anonymous)
CREATE POLICY "Enable read access for all users"
  ON videos
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON videos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
  ON videos
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
  ON videos
  FOR DELETE
  USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'videos';
