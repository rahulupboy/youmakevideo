# Issues and Fixes

## Critical Issue: RLS Policy Error

### Problem
Error: "new row violates row-level security policy for table 'videos'"

### Root Cause
The RLS policies in `supabase/migrations/20251001045043_create_videos_table.sql` use `TO public` which only applies to anonymous users. When the Supabase client tries to insert data, it's authenticated and doesn't match the policy.

### Solution
Run the SQL file `FIX_VIDEOS_RLS_POLICY.sql` in your Supabase SQL Editor. This will:
1. Drop the old policies that use `TO public`
2. Create new policies without the `TO` clause, which applies to all roles
3. Maintain the same functionality but work correctly

## Other Potential Issues Found

### 1. Hardcoded API Keys in Frontend Code

**Location:** `src/components/VideoCreationPanel.tsx` (lines 32-34)

```typescript
const GEMINI_API_KEY = 'AIzaSyDgShKEEeX9viEQ90JHAUBfwQqlu0c9rBw';
const VOICE_API_KEY = 'sk_78d719766a3026b96c79d89fefeac203b978509b03404756';
const VOICE_ID = 'ap2_01771851-fe5d-4e13-a843-a49b28e72ef9';
```

**Risk:** High Security Risk
- API keys are exposed in client-side code
- Anyone can view source and steal your keys
- Keys will be committed to version control

**Recommended Fix:**
Move these API calls to Supabase Edge Functions where keys can be stored securely as environment variables.

### 2. Storage Bucket Not Verified

**Location:** `src/components/VideoCreationPanel.tsx` (line 161)

```typescript
const { error: uploadError } = await supabase.storage
  .from('videos')
  .upload(audioFileName, audioBlob, {
    contentType: 'audio/mpeg',
    upsert: true
  });
```

**Issue:** The code assumes a storage bucket named `videos` exists.

**Fix Required:**
1. Go to Supabase Dashboard → Storage
2. Create a bucket named `videos`
3. Make it public if you want the URLs to be accessible
4. Add proper RLS policies for the bucket

### 3. Missing Foreign Key Constraints

**Location:** `supabase/migrations/20251001045043_create_videos_table.sql`

```sql
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id int,        -- No foreign key constraint
  question_id int,      -- No foreign key constraint
  ...
);
```

**Issue:** No foreign key constraints on `course_id` and `question_id`.

**Potential Problems:**
- Could insert videos with invalid course_id or question_id
- No cascade delete behavior
- Data integrity not enforced at database level

**Recommended Fix:**
Add foreign key constraints in a new migration:

```sql
ALTER TABLE videos
ADD CONSTRAINT fk_videos_course
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE videos
ADD CONSTRAINT fk_videos_question
FOREIGN KEY (question_id) REFERENCES new_questions(id) ON DELETE CASCADE;
```

### 4. Edge Function Missing Error Handling

**Location:** `supabase/functions/render-video/index.ts` (line 36)

```typescript
const { data: video, error: fetchError } = await supabase
  .from('videos')
  .select('*')
  .eq('id', video_id)
  .single();  // Will throw if no rows found
```

**Issue:** Using `.single()` instead of `.maybeSingle()`.

**Problem:**
- `.single()` throws an error if no rows are found
- `.maybeSingle()` returns `null` for data, which is safer

**Fix:** Replace `.single()` with `.maybeSingle()` and check for null:

```typescript
const { data: video, error: fetchError } = await supabase
  .from('videos')
  .select('*')
  .eq('id', video_id)
  .maybeSingle();

if (!video) {
  throw new Error('Video record not found');
}
```

### 5. Missing Try-Catch in Edge Functions

**Location:** Both edge functions have proper try-catch, but could be improved.

**Current:** Only catches at the top level
**Better:** Add specific error messages for different failure types

### 6. Missing Indexes for Performance

**Current State:** Some indexes exist in the second migration
**Missing:** Indexes on the `videos` table for common queries

**Recommended Additional Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_question_id ON videos(question_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
```

### 7. Timestamp Update Not Automatic

**Location:** `videos` table has `updated_at` field

**Issue:** The `updated_at` field needs to be manually set in updates.

**Better Solution:** Create a trigger to automatically update it:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Summary of Fixes Needed

### Immediate (Critical)
1. ✅ Run `FIX_VIDEOS_RLS_POLICY.sql` in Supabase SQL Editor

### High Priority (Security)
2. Move API keys to environment variables or Edge Functions
3. Create Supabase storage bucket named `videos` with proper policies

### Medium Priority (Data Integrity)
4. Add foreign key constraints to videos table
5. Add missing indexes for performance
6. Create auto-update trigger for `updated_at`

### Low Priority (Code Quality)
7. Replace `.single()` with `.maybeSingle()` in edge functions
8. Add more specific error handling

## How to Apply Fixes

### Fix 1: RLS Policies (CRITICAL - DO THIS FIRST)
1. Go to your Supabase Dashboard
2. Click on "SQL Editor"
3. Copy the entire contents of `FIX_VIDEOS_RLS_POLICY.sql`
4. Paste and click "Run"
5. Verify success message

### Fix 2: Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `videos`
4. Set as Public
5. Save

### Fix 3: Move API Keys to Edge Functions
This requires creating new edge functions for Gemini and ElevenLabs API calls. Let me know if you need help with this.

### Fix 4: Add Foreign Keys (Optional but Recommended)
Create a new migration file with the foreign key constraints shown above.

## Testing After Fixes

1. Try clicking "Generate Script" button
2. Click "Save to Database"
3. Verify no RLS error appears
4. Check the videos table in Supabase to confirm data was inserted

The main RLS fix should resolve your immediate error. The other issues are important for production but won't block basic functionality.
