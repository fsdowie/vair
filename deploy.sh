#!/bin/bash

# VAIR Deployment Script
# This script deploys the Supabase Edge Function with your API keys

set -e  # Exit on error

echo "🟢 VAIR Deployment Script"
echo "========================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Install it with: brew install supabase/tap/supabase"
    echo "Or: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "Running: supabase login"
    supabase login
fi

echo "✅ Logged in to Supabase"
echo ""

# Link project if not already linked
echo "Linking to Supabase project..."
if [ ! -f .supabase/config.toml ]; then
    echo "Linking project: iunehbdazfzgfclkvvgd"
    supabase link --project-ref iunehbdazfzgfclkvvgd
else
    echo "✅ Project already linked"
fi

echo ""

# Deploy Edge Function
echo "📦 Deploying Edge Function: ask-referee"
supabase functions deploy ask-referee

echo ""

# Set API key secret
echo "🔐 Setting Anthropic API key as secret..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY environment variable not set"
    echo "Set it with: export ANTHROPIC_API_KEY=your-api-key"
    echo "Or run: supabase secrets set ANTHROPIC_API_KEY=your-key"
else
    supabase secrets set ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up your React app (see SETUP.md)"
echo "2. Test the application"
echo "3. Check function logs: supabase functions logs ask-referee"
echo ""
echo "🎉 Your VAIR app is ready to use!"
