# Complete Video Creation Pipeline - Setup Guide

## Critical: Run This First!

### Step 1: Fix RLS Policies in Supabase

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from `FIX_RLS_POLICIES.sql`
4. Click "Run"

This fixes the "row-level security policy violation" error.

## What Was Fixed

### 1. ElevenLabs Voice ID
- **Problem**: Invalid voice ID `ap2_01771851-fe5d-4e13-a843-a49b28e72ef9`
- **Solution**: Changed to standard voice ID `21m00Tcm4TlvDq8ikWAM` (Rachel voice)
- **Location**: `src/components/VideoCreationPanel.tsx` line 35

### 2. Voice-Over Generation
**Improvements:**
- Cleans script before sending (removes markdown and countdown markers)
- Uses proper ElevenLabs API model: `eleven_monolingual_v1`
- Better error handling with detailed error messages
- Validates audio blob before uploading
- Uses unique filenames to prevent caching issues
- Proper response validation

**Error Handling:**
- Checks for empty script
- Validates ElevenLabs response
- Verifies audio file is not empty
- Catches and logs storage upload errors
- Catches and logs database update errors

### 3. Caption Generation
**Improvements:**
- Validates audio URL and script before processing
- Better error messages from edge function
- Validates caption data structure
- Saves to database with error handling

**Edge Function:**
- Splits script into words
- Estimates timing (2.5 words per second)
- Creates caption phrases (5-7 words each)
- Generates word-level timing for highlighting
- Returns structured JSON with timing data

### 4. Video Rendering
**Improvements:**
- Validates captions and audio before rendering
- Supports Python backend integration
- Falls back to mock URL if backend unavailable
- Better error messages

**Edge Function:**
- Fetches video and question data
- Prepares comprehensive render specification
- Calls Python backend if configured
- Returns video URL

### 5. Python Video Renderer
Created `python-backend/enhanced_video_renderer.py`:
- Downloads audio from Supabase
- Creates colored backgrounds (5 templates)
- Adds captions with word-by-word highlighting
- Overlays question during countdown
- Shows answer reveal
- Renders with MoviePy
- Uploads to Supabase Storage

## Complete Pipeline Flow

```
1. Generate Script (Gemini AI)
   ↓
2. Save to Database
   ↓
3. Generate Voice-Over (ElevenLabs)
   - Clean script text
   - Call ElevenLabs API
   - Upload audio to Storage
   - Save audio_url to database
   ↓
4. Generate Captions (Edge Function)
   - Split script into words
   - Calculate timing
   - Create word-level data
   - Save captions_data to database
   ↓
5. Render Video (Edge Function + Python)
   - Fetch all data
   - Call Python renderer
   - Create final video
   - Upload to Storage
   - Save video_url to database
   ↓
6. Download Video
```

## How to Use

### Generate a Complete Video

1. **Click "Generate Script"**
   - Gemini creates an educational script
   - Preview appears below

2. **Click "Save to Database"**
   - Script saved to videos table
   - Question marked as used

3. **Click "Generate Voice Over"**
   - Either use main button or select from list
   - ElevenLabs generates audio
   - Audio saved to Storage and database
   - Audio player appears for preview

4. **Click "Generate Captions"**
   - Edge function processes script
   - Creates timing data
   - Saves to database
   - Status updates to "captions_generated"

5. **Click "Render Final Video"**
   - Edge function prepares render spec
   - Calls Python backend (if configured)
   - Video URL saved to database
   - Download buttons appear

6. **Download or Preview**
   - Click "Preview Video" to watch
   - Click "Download Video" to save

## API Keys

### Current Keys in Code
Located in `src/components/VideoCreationPanel.tsx`:

```typescript
GEMINI_API_KEY = 'AIzaSyDgShKEEeX9viEQ90JHAUBfwQqlu0c9rBw'
VOICE_API_KEY = 'sk_78d719766a3026b96c79d89fefeac203b978509b03404756'
VOICE_ID = '21m00Tcm4TlvDq8ikWAM'  // Rachel voice
```

### Recommended: Move to Environment Variables
For production, add to `.env`:
```
VITE_GEMINI_API_KEY=your_key
VITE_ELEVENLABS_API_KEY=your_key
VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

## Supabase Setup

### Required Storage Buckets

1. **videos** bucket (must be public):
   - Go to Storage in Supabase Dashboard
   - Create bucket named "videos"
   - Set as Public
   - This stores audio files and rendered videos

### Required Edge Functions

Deploy these functions to Supabase:

1. **generate-captions**
   - Location: `supabase/functions/generate-captions/`
   - Processes script and creates caption timing

2. **render-video**
   - Location: `supabase/functions/render-video/`
   - Orchestrates video rendering

Deploy command:
```bash
supabase functions deploy generate-captions
supabase functions deploy render-video
```

## Python Backend (Optional)

For actual video rendering, deploy the Python backend:

### Prerequisites
```bash
pip install moviepy pillow flask requests supabase-py
```

### Environment Variables
```bash
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run Backend
```bash
cd python-backend
python enhanced_video_renderer.py
```

This starts a Flask server on port 8080.

### Configure Edge Function
Set in Supabase Dashboard > Edge Functions > Environment Variables:
```
PYTHON_BACKEND_URL=http://your-backend-url:8080
```

## Troubleshooting

### Voice Generation Error: "invalid_uid"
- **Cause**: Invalid voice ID
- **Fixed**: Changed to standard Rachel voice ID
- **If still occurs**: Check ElevenLabs API key is valid

### Voice Generation Error: "quota_exceeded"
- **Cause**: ElevenLabs free tier limit reached
- **Solution**: Upgrade plan or use different API key

### Script Not Saving
- **Check**: RLS policies updated (run `FIX_RLS_POLICIES.sql`)
- **Check**: Browser console for errors
- **Check**: Database connection in Supabase Dashboard

### Audio Not Uploading
- **Check**: "videos" storage bucket exists and is public
- **Check**: Browser console for storage errors
- **Check**: File size is reasonable (< 10MB)

### Captions Not Generating
- **Check**: Edge function is deployed
- **Check**: Audio URL is valid
- **Check**: Script exists in database
- **View**: Edge function logs in Supabase Dashboard

### Video Not Rendering
- **Without Python Backend**: Mock URL is generated
- **With Python Backend**:
  - Check backend is running
  - Check PYTHON_BACKEND_URL is configured
  - Check backend logs for errors
  - Verify all prerequisites installed

## Database Schema

### videos table
```sql
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id int,
  question_id int,
  script text,                    -- Generated by Gemini
  audio_url text,                 -- Uploaded to Storage
  captions_data jsonb,            -- Array of caption objects
  video_url text,                 -- Final rendered video
  template_id int DEFAULT 1,      -- Background template (1-5)
  status text DEFAULT 'draft',    -- Workflow status
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Status Values
- `draft`: Initial state
- `script_generated`: Script created and saved
- `audio_generated`: Voice-over created
- `captions_generated`: Captions with timing created
- `video_rendered`: Final video ready

## Video Templates

5 colored backgrounds available:
1. Blue (`#1e3a8a`)
2. Purple (`#7c3aed`)
3. Green (`#059669`)
4. Red (`#dc2626`)
5. Orange (`#ea580c`)

Template is randomly assigned when saving script (1-5).

## Next Steps

1. Run RLS fix SQL
2. Ensure storage bucket exists
3. Test voice generation with fixed voice ID
4. Generate captions
5. (Optional) Deploy Python backend for real video rendering
6. Download and share your educational videos!

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check Supabase logs
3. Verify all API keys are valid
4. Ensure storage bucket is public
5. Check edge function deployment status
