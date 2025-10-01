# Video Creation Pipeline - Setup and Fix Guide

## Critical Step: Fix RLS Policies First

Before your application will work, you MUST run the SQL fix in your Supabase database.

### Step 1: Run RLS Policy Fix

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file `FIX_RLS_POLICIES.sql` from this project
4. Copy all the SQL content
5. Paste it into the SQL Editor
6. Click "Run" to execute

This fixes the "new row violates row-level security policy" error by allowing both authenticated and anonymous users to access the videos table.

## What Was Fixed

### 1. RLS Policy Issues
- **Problem**: The videos table policies only allowed `public` (anonymous) access, but your frontend uses authenticated sessions
- **Solution**: Updated policies to allow both `public` and `authenticated` users
- **Files**: `FIX_RLS_POLICIES.sql`

### 2. Script Saving Issues
- **Problem**: Scripts weren't being saved properly due to RLS violations
- **Solution**:
  - Fixed RLS policies (see above)
  - Added better error handling with console logs
  - Added error messages in the UI
  - Scripts now save correctly with the "Save to Database" button

### 3. Voice-Over Generation
- **Problem**: Button was unclickable for scripts without audio
- **Solution**:
  - Added automatic loading of videos that have scripts but no audio
  - Added a selection UI to pick any script and generate voice-over
  - Voice-over button now works for current question AND any saved script
  - Audio files are saved to Supabase Storage in the "videos" bucket
  - Audio URLs are saved to the database

### 4. Complete Pipeline
All buttons now work in sequence:
1. Generate Script (Gemini AI)
2. Save to Database
3. Generate Voice-Over (ElevenLabs TTS) - works for any saved script
4. Generate Captions (via Edge Function)
5. Render Final Video (via Edge Function)
6. Download Video

## How to Use the Fixed Application

### Generate a New Video

1. **Generate Script**: Click "1. Generate Script"
   - Gemini AI creates an educational video script
   - Preview appears below the button

2. **Save to Database**: Click "Save to Database"
   - Script is saved to the videos table
   - Question is marked as "used_in_video"

3. **Generate Voice-Over**:
   - Option A: Use the main button for the current question's script
   - Option B: Select from the list of available scripts below
   - Audio is generated using ElevenLabs TTS
   - Saved to Supabase Storage and database

4. **Generate Captions**: Click "3. Generate Captions"
   - Calls the generate-captions edge function
   - Creates timing and highlighting data

5. **Render Video**: Click "4. Render Final Video"
   - Calls the render-video edge function
   - Creates the final video with template

6. **Download**: Use "Preview Video" or "Download Video" buttons

### Select Any Script for Voice-Over

When you click on Step 2 (Generate Voice Over), you'll see:
- A list of all scripts that don't have audio yet
- Each script shows a preview (first 100 characters)
- Click "Generate Audio" on any script to create its voice-over
- The audio will be saved to both Storage and the database

## Storage Requirements

Your Supabase project needs a storage bucket named "videos":

1. Go to Supabase Dashboard > Storage
2. Create a bucket named "videos" if it doesn't exist
3. Set the bucket to "Public" so files can be accessed via URL

## Edge Functions

Make sure your edge functions are deployed:

1. `generate-captions`: Processes audio and creates caption timing
2. `render-video`: Renders the final video with captions

These are already in the `supabase/functions/` directory.

## Environment Variables

Your `.env` file should have:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## API Keys in Code

Currently hardcoded in `VideoCreationPanel.tsx`:
- Gemini API Key
- ElevenLabs API Key
- ElevenLabs Voice ID

Consider moving these to environment variables for production.

## Troubleshooting

### Script Not Saving
1. Check browser console for errors
2. Verify RLS policies are updated (run `FIX_RLS_POLICIES.sql`)
3. Check that the videos table exists in your database

### Voice-Over Button Not Working
1. Ensure a script is saved first
2. Check that the "videos" storage bucket exists
3. Verify ElevenLabs API key is valid
4. Check browser console for detailed error messages

### Captions/Video Not Generating
1. Ensure edge functions are deployed
2. Check edge function logs in Supabase Dashboard
3. Verify previous steps completed successfully

## Database Schema

The videos table structure:
- `id` (uuid): Primary key
- `course_id` (int): Reference to course
- `question_id` (int): Reference to question
- `script` (text): Generated script from Gemini
- `audio_url` (text): URL to audio file in storage
- `captions_data` (jsonb): Caption timing and text
- `video_url` (text): URL to final rendered video
- `template_id` (int): Template used (1-6)
- `status` (text): Workflow status
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

## Next Steps

After running the RLS fix:
1. Refresh your application
2. Try generating a new script
3. Save it to database
4. Generate voice-over
5. Continue through the pipeline

All buttons should now be clickable at the appropriate stages!
