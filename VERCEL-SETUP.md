# Vercel Setup Instructions

## Important: Root Directory Configuration

Since the app is in a subdirectory (`vair-app/`), you MUST configure this in Vercel:

### Option 1: Vercel UI (Recommended)

1. Go to https://vercel.com
2. Import your GitHub repo: `fsdowie/vair`
3. **CRITICAL:** In "Configure Project":
   - **Root Directory:** `vair-app`
   - **Framework Preset:** Vite (auto-detected)
   - Build Command: `npm run build` ✅
   - Output Directory: `dist` ✅
4. Click "Deploy"

### Option 2: GitHub Actions (Automatic)

The GitHub Actions workflow is configured to deploy from `./vair-app` automatically.

**Required secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

## Common Issues

❌ **"vercel.json schema validation failed"**
- Cause: Invalid root-level vercel.json
- Fix: Only use vercel.json in `vair-app/` directory ✅

❌ **"No package.json found"**
- Cause: Root Directory not set to `vair-app`
- Fix: Set Root Directory in Vercel project settings ✅

## Files

- `vair-app/vercel.json` ✅ (correct location)
- `vercel.json` ❌ (removed - was causing errors)
