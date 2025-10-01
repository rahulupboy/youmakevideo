# Quick Fix Checklist - Get Your Video Pipeline Working in 15 Minutes

## The Problem
❌ "Storage upload failed: new row violates row-level security policy"
❌ "Bucket not found"
❌ "Missing secrets: PYTHON_BACKEND_URL"

## The Solution (3 Steps)

### Step 1: Fix Database Permissions (5 minutes)

1. Open Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **"+ New query"**
4. Open `FIX_STORAGE_RLS_POLICIES.sql` file
5. Copy all content
6. Paste into SQL Editor
7. Click **"Run"** button
8. Wait for "Success" message

✅ **Result**: Storage permissions fixed

---

### Step 2: Create Storage Buckets (5 minutes)

1. In Supabase Dashboard, click **Storage** (left sidebar)
2. Click **"New bucket"** button

**Create Bucket 1:**
- Name: `audio-files`
- Public: ✅ **YES** (check this box!)
- File size limit: 50000000 (50MB)
- Click **"Create bucket"**

**Create Bucket 2:**
- Name: `video-renders`
- Public: ✅ **YES**
- File size limit: 500000000 (500MB)
- Click **"Create bucket"**

**Create Bucket 3:**
- Name: `thumbnails`
- Public: ✅ **YES**
- File size limit: 5000000 (5MB)
- Click **"Create bucket"**

**Create Bucket 4:**
- Name: `temp-files`
- Public: ❌ **NO** (keep private)
- File size limit: 100000000 (100MB)
- Click **"Create bucket"**

✅ **Result**: All storage buckets created

---

### Step 3: Deploy Edge Function (5 minutes)

**Option A: Using Supabase Dashboard**

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **"Deploy new function"**
3. Name: `upload-audio`
4. Copy code from `supabase/functions/upload-audio/index.ts`
5. Paste into editor
6. Click **"Deploy"**

**Option B: Using Command (if you have Supabase CLI)**

```bash
# Make sure you're in project directory
supabase functions deploy upload-audio
```

✅ **Result**: Edge function deployed

---

## Verification

### Test It Works

1. Open your app
2. Click **"Generate Audio"** button
3. Watch for:
   - ✅ Audio uploads successfully
   - ✅ Audio player appears
   - ✅ No error messages

### Expected Result

```
✅ Script generated
✅ Audio generated
✅ Audio player with controls
✅ Download button appears
✅ Script preview works
✅ Captions generate
✅ Video rendering starts
```

---

## What About Python Backend?

**Good news**: You don't need it right now!

The pipeline works without `PYTHON_BACKEND_URL`:
- ✅ Script generation: **Works**
- ✅ Audio generation: **Works**
- ✅ Caption generation: **Works**
- ⚠️ Video rendering: **Returns mock URL** (no actual video file yet)

You'll see this warning message:
```
⚠️ PYTHON_BACKEND_URL not configured. Please set up Python
backend for actual video rendering. Mock URL generated for testing.
```

**This is normal** - you can test everything except final video rendering.

### When You Want Real Videos

See `SECRETS_SETUP_GUIDE.md` section 4 for:
- Deploying Python backend to Railway ($5/month)
- Configuring the PYTHON_BACKEND_URL secret

---

## Common Issues

### Issue 1: Still Getting RLS Error
**Fix**: Make sure you ran the SQL file completely. Check for "Success" message.

### Issue 2: "Bucket not found"
**Fix**: Double-check bucket names are exact:
- `audio-files` (not `audio_files` or `audiofiles`)
- `video-renders` (not `video_renders`)
- etc.

### Issue 3: Edge Function Error
**Fix**:
1. Check function is deployed in Edge Functions tab
2. Verify function name is exactly `upload-audio`
3. Check function logs for errors

### Issue 4: Audio Upload Works But No Sound
**Fix**: Make sure `audio-files` bucket is marked as **Public** (not Private)

---

## Checklist Summary

Before you start:
- [ ] Have Supabase account
- [ ] Have project open in Supabase Dashboard
- [ ] Have this project code

Step 1 (Database):
- [ ] Opened SQL Editor
- [ ] Ran FIX_STORAGE_RLS_POLICIES.sql
- [ ] Saw "Success" message

Step 2 (Storage):
- [ ] Created `audio-files` bucket (Public)
- [ ] Created `video-renders` bucket (Public)
- [ ] Created `thumbnails` bucket (Public)
- [ ] Created `temp-files` bucket (Private)
- [ ] All 4 buckets show in Storage tab

Step 3 (Edge Function):
- [ ] Deployed `upload-audio` function
- [ ] Function shows in Edge Functions tab

Verification:
- [ ] Tested "Generate Audio" button
- [ ] Audio uploaded successfully
- [ ] No error messages
- [ ] Audio plays in browser

---

## Time to Complete

- **Step 1** (SQL): 2-3 minutes
- **Step 2** (Buckets): 3-5 minutes
- **Step 3** (Edge Function): 3-5 minutes
- **Testing**: 2-3 minutes

**Total**: ~15 minutes

---

## What You Get

After these 3 steps:
1. ✅ Full script generation working
2. ✅ Audio generation and upload working
3. ✅ Audio preview and download working
4. ✅ Caption generation working
5. ✅ Caption preview working
6. ✅ Video specification working
7. ⚠️ Video rendering (mock URL - real videos need Python backend)

---

## Need More Help?

- **Full Guide**: Read `COMPLETE_FIX_GUIDE.md`
- **Secrets Info**: Read `SECRETS_SETUP_GUIDE.md`
- **Python Backend**: Read `SECRETS_SETUP_GUIDE.md` section 4
- **Architecture**: Read `IMPLEMENTATION_COMPLETE.md`

---

## Ready to Start?

✅ Step 1 → Fix database permissions
✅ Step 2 → Create storage buckets
✅ Step 3 → Deploy edge function
✅ Test → Generate audio and verify

**Let's go!** 🚀
