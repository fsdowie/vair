# GitHub Actions Setup Guide

GitHub Actions will automatically deploy VAIR when you push to the `main` branch.

## Required Secrets

Add these secrets to your GitHub repo: https://github.com/fsdowie/vair/settings/secrets/actions

### 1. Vercel Secrets (for Frontend Deployment)

**Get these from Vercel:**

1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Import the `vair` project from GitHub
4. Go to Project Settings → General:
   - Copy **Project ID** → Add as `VERCEL_PROJECT_ID`
5. Go to Account Settings → Tokens:
   - Create token → Add as `VERCEL_TOKEN`
6. Get your Team/Org ID:
   - Settings → General → Team ID → Add as `VERCEL_ORG_ID`

**Add to GitHub:**
```
VERCEL_TOKEN=<your-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
```

### 2. Supabase Secrets (for Edge Function Deployment)

**Already have these:**

Add to GitHub Secrets:
```
SUPABASE_ACCESS_TOKEN=YOUR_SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF=iunehbdazfzgfclkvvgd
```

## How It Works

**On every push to `main`:**
1. ✅ Build & test frontend
2. ✅ Deploy frontend to Vercel
3. ✅ Deploy Edge Functions to Supabase

**On pull requests:**
1. ✅ Build & test only (no deployment)

## Manual Deployment

You can still deploy manually:

**Frontend (Vercel):**
```bash
cd vair-app
npm run build
# Then deploy through Vercel UI
```

**Backend (Supabase):**
```bash
cd /path/to/VAIR
./deploy.sh
```

## First Deployment

After adding secrets:
1. Make a small change (e.g., update README)
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push
   ```
3. Watch the Actions tab: https://github.com/fsdowie/vair/actions
4. Your app will be live at: https://vair.vercel.app (or similar)

---

**Need help?** Check the Actions logs or ask me!
