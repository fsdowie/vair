# VAIR Setup Instructions - Supabase Authentication

This guide will help you deploy the authenticated version of VAIR with Supabase Auth and Edge Functions.

## Prerequisites

1. **Supabase Account**: You already have a project at `https://iunehbdazfzgfclkvvgd.supabase.co`
2. **Supabase CLI**: Install if you haven't already
3. **Anthropic API Key**: `YOUR_ANTHROPIC_API_KEY`

## Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

## Step 2: Link Your Supabase Project

```bash
cd "/Users/federico_samyndowie/Documents/Python Shared/VAIR"

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref iunehbdazfzgfclkvvgd
```

## Step 3: Deploy the Edge Function

```bash
# Deploy the ask-referee Edge Function
supabase functions deploy ask-referee

# Set the Anthropic API key as a secret
supabase secrets set ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
```

## Step 4: Enable Email Authentication in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/iunehbdazfzgfclkvvgd
2. Navigate to **Authentication** → **Providers**
3. Make sure **Email** is enabled
4. Configure email templates if desired (optional)

## Step 5: Set up your React Application

### Option A: Use with Vite (Recommended)

```bash
# Create a new Vite React project
npm create vite@latest vair-app -- --template react

# Navigate to the project
cd vair-app

# Install dependencies
npm install
npm install @supabase/supabase-js

# Copy the authenticated component
cp "/Users/federico_samyndowie/Documents/Python Shared/VAIR/referee-ai-authenticated.jsx" src/RefereeLLM.jsx

# Update src/App.jsx to use the component:
```

Edit `src/App.jsx`:
```jsx
import RefereeLLM from './RefereeLLM'

function App() {
  return <RefereeLLM />
}

export default App
```

```bash
# Run the development server
npm run dev
```

### Option B: Use with existing React project

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Copy the component
cp "/Users/federico_samyndowie/Documents/Python Shared/VAIR/referee-ai-authenticated.jsx" src/RefereeLLM.jsx

# Import and use in your app
```

### Option C: Deploy to bolt.new or v0.dev

1. Copy the contents of `referee-ai-authenticated.jsx`
2. Paste into bolt.new or v0.dev
3. Make sure to add `@supabase/supabase-js` as a dependency

## Step 6: Test the Application

1. Start your React app
2. You should see a login/signup screen
3. Create a new account or login
4. Once authenticated, you'll see the VAIR chat interface
5. Ask a refereeing question to test!

## Troubleshooting

### Edge Function Issues

Check function logs:
```bash
supabase functions logs ask-referee
```

### Authentication Issues

- Make sure email confirmation is not required (or check your email)
- Check Supabase logs in the dashboard
- Verify the anon key is correct in `referee-ai-authenticated.jsx`

### CORS Issues

The Edge Function includes CORS headers. If you still have issues, check:
- The Supabase URL is correct
- You're using the correct project

## Security Notes

- ✅ API key is stored server-side as a Supabase secret
- ✅ Users must authenticate to use the app
- ✅ All API calls go through your Edge Function
- ⚠️ Consider adding rate limiting for production use
- ⚠️ Monitor your Anthropic API usage

## Next Steps

### Optional Enhancements

1. **Add rate limiting**: Implement per-user request limits
2. **Add usage tracking**: Log API calls to a Supabase table
3. **Email customization**: Customize auth emails in Supabase dashboard
4. **Social auth**: Add Google/GitHub OAuth providers
5. **Profile management**: Add user profile pages
6. **Conversation history**: Save chat history to Supabase database

## Files Created

- `referee-ai-authenticated.jsx` - React component with Supabase Auth
- `supabase/functions/ask-referee/index.ts` - Edge Function to proxy Anthropic API
- `SETUP.md` - This file

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Anthropic API Docs: https://docs.anthropic.com
