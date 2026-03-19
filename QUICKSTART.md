# VAIR Quick Start Guide

## What Was Created

✅ **referee-ai-authenticated.jsx** - Your updated React component with:
- Email/password authentication using Supabase
- Protected app (login required)
- Secure API calls through Edge Function
- Beautiful referee-themed UI

✅ **Supabase Edge Function** - Server-side proxy that:
- Validates user authentication
- Calls Anthropic API with your API key (server-side, secure)
- Returns responses to authenticated users

✅ **Deployment Script** - Automated setup for Supabase

## Quick Deploy (3 Steps)

### 1. Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

### 2. Deploy Everything

```bash
cd "/Users/federico_samyndowie/Documents/Python Shared/VAIR"
./deploy.sh
```

This script will:
- Login to Supabase (if needed)
- Link your project
- Deploy the Edge Function
- Set your API key as a secret

### 3. Run the React App

**Option A: Create new Vite app (recommended)**

```bash
# Create new project
npm create vite@latest vair-app -- --template react
cd vair-app

# Install dependencies
npm install @supabase/supabase-js

# Copy the component
cp "../referee-ai-authenticated.jsx" src/RefereeLLM.jsx

# Update src/App.jsx
cat > src/App.jsx << 'EOF'
import RefereeLLM from './RefereeLLM'

function App() {
  return <RefereeLLM />
}

export default App
EOF

# Run it
npm run dev
```

**Option B: Use existing React project**

```bash
npm install @supabase/supabase-js
# Then import RefereeLLM component into your app
```

## Test It Out

1. Open your browser to `http://localhost:5173`
2. Click "Sign Up" and create an account
3. Login with your email/password
4. Start asking refereeing questions!

## Example Questions

Try these:
- "A player in an offside position doesn't touch the ball — is it still offside?"
- "Can a goalkeeper score directly from a goal kick?"
- "A substitute enters the field without permission and prevents a goal. What's the ruling?"

## Architecture

```
User Browser
    ↓ (login via Supabase Auth)
    ↓
React App (referee-ai-authenticated.jsx)
    ↓ (authenticated request)
    ↓
Supabase Edge Function (ask-referee)
    ↓ (validates auth + calls with API key)
    ↓
Anthropic Claude API
    ↓ (response with IFAB Laws)
    ↓
User sees answer!
```

## Security Features

✅ API key stored server-side (never exposed to browser)
✅ User authentication required
✅ Validated on every request
✅ CORS headers configured
✅ JWT verification enabled

## Monitoring

Check Edge Function logs:
```bash
supabase functions logs ask-referee --follow
```

## Troubleshooting

**"Missing authorization header"**
- Clear browser cache and login again
- Check that Supabase URL and anon key are correct

**Edge Function not found**
- Run `./deploy.sh` again
- Check deployment: `supabase functions list`

**Can't login**
- Check email confirmation settings in Supabase dashboard
- Look at Auth logs in Supabase dashboard

## Next Steps

See `SETUP.md` for:
- Detailed setup instructions
- Optional enhancements (rate limiting, usage tracking, etc.)
- Production deployment tips
- Adding conversation history

## Support

- 📖 Full setup guide: `SETUP.md`
- 🔧 Supabase Docs: https://supabase.com/docs
- 🤖 Anthropic Docs: https://docs.anthropic.com

---

**You're ready to go! Run `./deploy.sh` to get started.** 🟢⚽
