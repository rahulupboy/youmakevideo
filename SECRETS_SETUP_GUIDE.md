# Secrets Setup Guide

## Overview

This guide explains all the API keys and secrets used in your video creation pipeline and how to obtain/configure them.

---

## 1. Supabase Credentials (Already Configured ✅)

These are already set in your `.env` file:

```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Where to find**:
- Supabase Dashboard → Settings → API
- Copy the Project URL and `anon` public key

---

## 2. Gemini AI API Key (Already in Code ✅)

Currently hardcoded in `VideoCreationPanel.tsx`:

```typescript
const GEMINI_API_KEY = 'AIzaSyDgShKEEeX9viEQ90JHAUBfwQqlu0c9rBw';
```

**Purpose**: Generate educational video scripts

**How to get your own**:
1. Go to https://makersuite.google.com/app/apikey
2. Click "Get API Key"
3. Create a new API key in your Google Cloud project
4. Copy the key

**Cost**: Free tier available (60 requests/minute)

**Recommended**: Move to environment variable:
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
```

Then add to `.env`:
```env
VITE_GEMINI_API_KEY=your_key_here
```

---

## 3. ElevenLabs API Key (Already in Code ✅)

Currently hardcoded in `VideoCreationPanel.tsx`:

```typescript
const VOICE_API_KEY = 'sk_78d719766a3026b96c79d89fefeac203b978509b03404756';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
```

**Purpose**: Text-to-speech audio generation

**How to get your own**:
1. Go to https://elevenlabs.io/
2. Sign up for an account
3. Go to Profile → API Keys
4. Click "Generate New Key"
5. Copy the API key

**Voice ID**: The voice ID `21m00Tcm4TlvDq8ikWAM` is "Rachel" - a popular voice
- To use different voices, go to Voice Library → Copy Voice ID

**Cost**:
- Free tier: 10,000 characters/month
- Creator: $5/month for 30,000 characters
- Pro: $22/month for 100,000 characters

**Recommended**: Move to environment variable:
```typescript
const VOICE_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
```

Then add to `.env`:
```env
VITE_ELEVENLABS_API_KEY=your_key_here
VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

---

## 4. PYTHON_BACKEND_URL (Missing - Optional ⚠️)

**Purpose**: URL of the Python video rendering service

**Status**: Not configured (edge function will work without it, but won't render actual videos)

**How to set up**:

### Option A: Deploy Python Backend to Railway

1. **Create Railway account**: https://railway.app/
2. **Install Railway CLI** (optional):
   ```bash
   npm i -g @railway/cli
   ```
3. **Deploy**:
   ```bash
   cd python-backend
   railway login
   railway init
   railway up
   ```
4. **Get deployed URL**: Railway will provide a URL like `https://your-app.railway.app`

### Option B: Deploy to Render.com

1. **Create Render account**: https://render.com/
2. **Create New Web Service**
3. **Connect GitHub repo** or upload files
4. **Select**: Docker as build environment
5. **Deploy** - Render will give you a URL

### Option C: Deploy to DigitalOcean App Platform

1. **Create DigitalOcean account**: https://www.digitalocean.com/
2. **Go to App Platform**
3. **Create App** → Upload Dockerfile from `python-backend/`
4. **Deploy** - Get URL from dashboard

### Option D: Use Your Own Server

If you have a VPS or dedicated server:

```bash
cd python-backend
docker build -t video-renderer .
docker run -p 8000:8000 video-renderer
```

Your URL: `http://your-server-ip:8000`

### Add Secret to Supabase

Once deployed:

1. Go to **Supabase Dashboard**
2. Click **Edge Functions** in sidebar
3. Go to **Settings** tab
4. Click **Secrets** section
5. Click **"Add secret"**
6. Set:
   - **Key**: `PYTHON_BACKEND_URL`
   - **Value**: `https://your-deployed-url.com` (no trailing slash)
7. Click **Save**

**Cost**:
- Railway: $5/month (includes 500 hours)
- Render: Free tier available, then $7/month
- DigitalOcean: $5/month minimum
- Own server: Varies

---

## 5. Supabase Service Role Key (Auto-Available ✅)

This is automatically available in Edge Functions as an environment variable.

**Purpose**: Used by edge functions to bypass RLS policies

**Where it's used**:
- `upload-audio` function - for uploading files
- `render-video` function - for database access

**Access in edge functions**:
```typescript
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

**Where to find** (if you need it):
- Supabase Dashboard → Settings → API
- Copy the `service_role` key (keep this secret!)

**Security**: NEVER expose this key in frontend code!

---

## Quick Setup Checklist

### Immediate (No setup needed)
- ✅ Supabase URL & Anon Key
- ✅ Gemini AI Key
- ✅ ElevenLabs Key
- ✅ Service Role Key (in edge functions)

### Recommended (For security)
- ⚠️ Move Gemini key to `.env`
- ⚠️ Move ElevenLabs key to `.env`

### Optional (For full video rendering)
- ⚠️ Deploy Python backend
- ⚠️ Configure PYTHON_BACKEND_URL secret

---

## Environment Variables Summary

### Frontend `.env` (Current)
```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Frontend `.env` (Recommended)
```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_GEMINI_API_KEY=your_gemini_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### Supabase Edge Functions Secrets
```
SUPABASE_URL (auto-provided)
SUPABASE_SERVICE_ROLE_KEY (auto-provided)
PYTHON_BACKEND_URL (needs manual setup)
```

---

## Testing Without Python Backend

The pipeline will work WITHOUT `PYTHON_BACKEND_URL`:

1. ✅ Script generation works
2. ✅ Audio generation works
3. ✅ Caption generation works
4. ⚠️ Video rendering returns mock URL (no actual video file)

You'll see a warning message:
```
⚠️ PYTHON_BACKEND_URL not configured. Please set up Python backend
for actual video rendering. Mock URL generated for testing.
```

This is normal and allows you to test the pipeline without the video rendering infrastructure.

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Add `.env` to `.gitignore` ✅ (already done)
   - Use environment variables for all keys

2. **Rotate keys regularly**
   - Especially if you suspect a key is compromised
   - Generate new keys every 3-6 months

3. **Use different keys for dev/prod**
   - Development: Use test API keys
   - Production: Use production API keys with higher limits

4. **Monitor usage**
   - Check Gemini AI usage in Google Cloud Console
   - Check ElevenLabs usage in dashboard
   - Set up billing alerts

5. **Restrict API keys**
   - Add HTTP referrer restrictions in Google Cloud
   - Add IP restrictions where possible
   - Use the minimum required permissions

---

## Cost Estimation (Monthly)

### Minimal Setup (Current)
- Supabase: Free
- Gemini AI: Free tier (60 req/min)
- ElevenLabs: Free tier (10k chars/month)
- **Total: $0/month**

### With Python Backend
- Supabase: Free
- Gemini AI: Free tier
- ElevenLabs: $5/month (Creator plan)
- Python Backend (Railway): $5/month
- **Total: $10/month**

### Production Scale
- Supabase: $25/month (Pro plan)
- Gemini AI: $0.50/1M chars (~$5/month)
- ElevenLabs: $22/month (Pro plan)
- Python Backend (Dedicated): $20/month
- **Total: ~$72/month**

---

## Troubleshooting Secrets

### Issue: "Missing secrets" warning in browser

**Cause**: The warning is about `PYTHON_BACKEND_URL` which is optional

**Fix**: Either deploy Python backend and configure the secret, or ignore the warning (pipeline will still work)

### Issue: Gemini AI returns 403 error

**Cause**: Invalid API key or quota exceeded

**Fix**:
1. Check key is correct
2. Check quota in Google Cloud Console
3. Enable "Generative Language API" in Google Cloud

### Issue: ElevenLabs returns 401 error

**Cause**: Invalid API key

**Fix**:
1. Check key is correct
2. Check account has available characters
3. Try regenerating the API key

### Issue: Storage upload fails

**Cause**: RLS policies not set or bucket doesn't exist

**Fix**: Follow `COMPLETE_FIX_GUIDE.md` steps 1 and 2

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Gemini AI Docs**: https://ai.google.dev/docs
- **ElevenLabs Docs**: https://elevenlabs.io/docs
- **Railway Docs**: https://docs.railway.app/
- **Render Docs**: https://render.com/docs

---

## Next Steps

1. ✅ Follow `COMPLETE_FIX_GUIDE.md` to fix storage issues
2. ✅ Test the pipeline with current setup (works without Python backend)
3. ⚠️ Deploy Python backend when ready for actual video rendering
4. ⚠️ Move API keys to environment variables for better security
