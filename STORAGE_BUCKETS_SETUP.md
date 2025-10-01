# Storage Buckets Setup Guide

## Quick Fix for "Bucket not found" Error

The error occurred because the code was trying to upload to a `videos` bucket that doesn't exist.

## Required Buckets

You need to create **4 storage buckets** in your Supabase dashboard:

### 1. audio-files
**Purpose**: Store TTS-generated audio files
**Settings**:
- Name: `audio-files`
- Public: ✅ **Yes** (checked)
- File size limit: **50 MB**
- Allowed MIME types: `audio/mpeg`, `audio/mp3`, `audio/wav`

### 2. video-renders
**Purpose**: Store final rendered videos
**Settings**:
- Name: `video-renders`
- Public: ✅ **Yes** (checked)
- File size limit: **500 MB**
- Allowed MIME types: `video/mp4`, `video/quicktime`, `video/x-msvideo`

### 3. thumbnails
**Purpose**: Store video thumbnail images
**Settings**:
- Name: `thumbnails`
- Public: ✅ **Yes** (checked)
- File size limit: **5 MB**
- Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### 4. temp-files
**Purpose**: Temporary storage for processing
**Settings**:
- Name: `temp-files`
- Public: ❌ **No** (unchecked - keep private)
- File size limit: **100 MB**
- Allowed MIME types: Leave default or add: `audio/mpeg`, `video/mp4`, `image/jpeg`, `image/png`, `application/json`

---

## How to Create Buckets Manually

1. Open your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Fill in the settings for each bucket as listed above
5. Click **"Create bucket"**
6. Repeat for all 4 buckets

---

## New Features Added

### ✅ Audio Preview & Download
- Audio player with controls appears after generation
- Download button to save audio file locally
- View script button to see the full script content

### ✅ Caption Preview
- View generated captions with timestamps
- Shows timing information (start → end)
- Scrollable preview of all caption segments

### ✅ Video Preview & Download
- Embedded video player for immediate preview
- Open in new tab button
- Download button for final video

### ✅ Content Selection
- Toggle script view on/off
- Toggle caption view on/off
- Clean, organized interface

---

## Code Changes Made

1. **Fixed bucket name**: Changed from `videos` to `audio-files`
2. **Added icons**: Import Download and Play icons from lucide-react
3. **Added state management**:
   - `selectedContent` - track which content is selected
   - `showScriptPreview` - toggle script visibility
   - `showCaptionPreview` - toggle caption visibility
4. **Added helper functions**:
   - `downloadAudio()` - download audio files
   - `formatTime()` - format timestamps for captions
5. **Enhanced UI components**:
   - Audio section with preview, download, and script view
   - Caption section with timestamp display
   - Video section with embedded player

---

## Testing

1. Create all 4 buckets in Supabase
2. Click "Generate Audio" button
3. Audio should upload successfully to `audio-files` bucket
4. Audio player and buttons should appear
5. Test download, script view, and caption view features
6. All buttons are now clickable and functional

---

## Troubleshooting

**Error: "Bucket not found"**
- Make sure you created all 4 buckets with exact names listed above
- Check that buckets are marked as **Public** (except temp-files)
- Verify bucket names match exactly (case-sensitive)

**Error: "Permission denied"**
- Check that RLS policies are enabled on storage.objects
- Verify you're authenticated when uploading files

**Audio not playing**
- Check that `audio-files` bucket is marked as **Public**
- Verify the audio file was uploaded successfully in Storage tab
