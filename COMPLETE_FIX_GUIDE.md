# Complete Video Pipeline Fix Guide

## Step 1: Fix Storage RLS Policies

### Run this SQL in Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **"+ New query"**
4. Copy and paste the contents of `FIX_STORAGE_RLS_POLICIES.sql`
5. Click **"Run"** or press `Ctrl+Enter`

This will:
- Drop any conflicting policies
- Create proper RLS policies for all storage buckets
- Allow service role to bypass RLS (for edge functions)
- Allow authenticated users to upload
- Allow anyone to read (public buckets)

---

## Step 2: Create Storage Buckets

Go to **Storage** in Supabase Dashboard and create these 4 buckets:

### Bucket 1: audio-files
```
Name: audio-files
Public: ✅ Yes (IMPORTANT)
File size limit: 50 MB
Allowed MIME types: audio/mpeg, audio/mp3, audio/wav
```

### Bucket 2: video-renders
```
Name: video-renders
Public: ✅ Yes (IMPORTANT)
File size limit: 500 MB
Allowed MIME types: video/mp4, video/quicktime, video/x-msvideo
```

### Bucket 3: thumbnails
```
Name: thumbnails
Public: ✅ Yes (IMPORTANT)
File size limit: 5 MB
Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
```

### Bucket 4: temp-files
```
Name: temp-files
Public: ❌ No (keep private)
File size limit: 100 MB
Allowed MIME types: (leave default)
```

---

## Step 3: Deploy Edge Functions

You need to deploy 3 edge functions. Use the deployment commands below:

### Deploy upload-audio function
```bash
# This function is already created at:
# supabase/functions/upload-audio/index.ts
```

To deploy, you would normally use Supabase CLI, but since you're using Bolt/MCP tools, the functions should auto-deploy or you can deploy via the Supabase Dashboard:

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **"Deploy new function"**
3. Use the code from `supabase/functions/upload-audio/index.ts`

### Deploy generate-captions function
Already exists at: `supabase/functions/generate-captions/index.ts`

### Deploy render-video function
Already exists at: `supabase/functions/render-video/index.ts`

---

## Step 4: Configure Secrets

### Missing Secret: PYTHON_BACKEND_URL

This secret is used for video rendering. You have 2 options:

#### Option A: Set up Python Backend (Recommended for Production)

1. **Deploy the Python backend** from `python-backend/` folder
2. You can deploy to:
   - **Railway**: https://railway.app
   - **Render**: https://render.com
   - **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform
   - **AWS EC2** or any VPS

3. **Deployment Steps** (using Railway as example):
   ```bash
   cd python-backend
   # Push to GitHub
   # Connect GitHub repo to Railway
   # Railway will auto-detect Dockerfile and deploy
   ```

4. **Get the deployed URL** (e.g., `https://your-app.railway.app`)

5. **Add secret to Supabase**:
   - Go to **Edge Functions** → **Settings** → **Secrets**
   - Add new secret:
     - Key: `PYTHON_BACKEND_URL`
     - Value: `https://your-python-backend-url.com`

#### Option B: Skip Python Backend (Testing Only)

The edge function will work without `PYTHON_BACKEND_URL`, but it will:
- Generate a mock video URL
- Not actually render the video
- Allow you to test the rest of the pipeline

To use this option: **Do nothing**. The code already handles missing `PYTHON_BACKEND_URL`.

---

## Step 5: Existing API Keys (Already Configured)

These are already hardcoded in your frontend code:

### Gemini AI API Key
```
Already set: AIzaSyDgShKEEeX9viEQ90JHAUBfwQqlu0c9rBw
Used for: Script generation
```

### ElevenLabs API Key
```
Already set: sk_e7983a84b66dc07658f0286b863641fe7e87d7a93aca7c15
Voice ID: 21m00Tcm4TlvDq8ikWAM
Used for: Text-to-speech audio generation
```

**Security Note**: In production, these should be moved to environment variables or edge function secrets.

---

## Step 6: Test the Complete Pipeline

### Test Sequence

1. **Generate Script**
   - Click "1. Generate Script"
   - Wait for Gemini AI to generate script
   - Script preview should appear
   - Click "Save to Database"

2. **Generate Voice Over**
   - Click "2. Generate Voice Over"
   - ElevenLabs will generate audio
   - Audio will upload to `audio-files` bucket via edge function
   - Audio player should appear with download button

3. **Generate Captions**
   - Click "3. Generate Captions"
   - Edge function will generate caption timing
   - Caption preview button should appear
   - Click to view captions with timestamps

4. **Render Final Video**
   - Click "4. Render Final Video"
   - If Python backend is configured: Real video renders
   - If not configured: Mock URL generated
   - Video player appears (if real video exists)

---

## Troubleshooting

### Error: "Storage upload failed: new row violates row-level security policy"

**Cause**: RLS policies not set up correctly or buckets don't exist

**Fix**:
1. Run the SQL from `FIX_STORAGE_RLS_POLICIES.sql`
2. Verify all 4 buckets exist
3. Verify buckets are marked as **Public** (except temp-files)
4. Check that the `upload-audio` edge function is deployed

### Error: "Bucket not found"

**Cause**: Storage bucket doesn't exist

**Fix**: Create the missing bucket in Supabase Dashboard → Storage

### Error: "Failed to generate voice-over"

**Cause**: ElevenLabs API error or quota exceeded

**Fix**:
1. Check ElevenLabs API key is valid
2. Check your ElevenLabs account has available credits
3. Check console for detailed error message

### Error: "Caption generation failed"

**Cause**: Edge function not deployed or video data incomplete

**Fix**:
1. Ensure `generate-captions` edge function is deployed
2. Verify video record has both `audio_url` and `script`
3. Check edge function logs in Supabase Dashboard

### Error: "Video rendering failed"

**Cause**: Python backend not configured or edge function error

**Fix**:
1. Deploy Python backend and configure `PYTHON_BACKEND_URL` secret
2. OR accept mock video URL for testing
3. Check edge function logs for details

---

## Architecture Overview

```
Frontend (React)
    ↓
1. Generate Script → Gemini AI API → Save to DB
    ↓
2. Generate Audio → ElevenLabs API → upload-audio Edge Function → audio-files bucket
    ↓
3. Generate Captions → generate-captions Edge Function → Save to DB
    ↓
4. Render Video → render-video Edge Function → Python Backend → video-renders bucket
    ↓
Final Video Ready!
```

---

## Security Best Practices

1. **Move API keys to environment variables**:
   ```typescript
   // Instead of hardcoding:
   const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
   const VOICE_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
   ```

2. **Add rate limiting** to edge functions

3. **Implement user authentication** for uploads

4. **Add file size validation** before upload

5. **Set up CORS properly** for production domain

---

## Next Steps After Fix

1. ✅ Test complete pipeline end-to-end
2. ✅ Deploy Python backend for real video rendering
3. ✅ Move API keys to environment variables
4. ✅ Add error recovery and retry logic
5. ✅ Implement progress indicators for long operations
6. ✅ Add video quality presets
7. ✅ Implement batch video generation

---

## Quick Reference: File Changes Made

1. **Frontend**: `src/components/VideoCreationPanel.tsx`
   - Changed audio upload to use edge function
   - Added base64 encoding for audio
   - Better error handling

2. **New Edge Function**: `supabase/functions/upload-audio/index.ts`
   - Handles audio uploads with service role
   - Bypasses RLS policies
   - Returns public URL

3. **SQL Fix**: `FIX_STORAGE_RLS_POLICIES.sql`
   - Comprehensive RLS policies for all buckets
   - Service role permissions
   - Public read access

4. **Documentation**: This file
   - Complete setup guide
   - Troubleshooting tips
   - Architecture overview
