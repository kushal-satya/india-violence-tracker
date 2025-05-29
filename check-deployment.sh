#!/bin/bash
# Deployment status checker for India Violence Tracker

echo "🚀 India Violence Tracker - Deployment Status"
echo "============================================="
echo ""

# Repository info
REPO_URL="https://github.com/kushal-satya/india-violence-tracker"
PAGES_URL="https://kushal-satya.github.io/india-violence-tracker"

echo "📦 Repository: $REPO_URL"
echo "🌐 GitHub Pages URL: $PAGES_URL"
echo ""

# Check if site is accessible
echo "🔍 Checking if site is live..."
if curl -s --head "$PAGES_URL" | head -n 1 | grep -q "200 OK"; then
    echo "✅ Site is live and accessible!"
else
    echo "⏳ Site is not yet accessible. Deployment may still be in progress."
fi

echo ""
echo "📋 Next Steps:"
echo "1. Visit GitHub Actions: $REPO_URL/actions"
echo "2. Monitor deployment progress"
echo "3. Once complete, visit: $PAGES_URL"
echo "4. Set up Google Sheets data source"
echo "5. Configure RSS feeds and LLM integration"
echo ""
echo "🔧 For setup instructions, see README.md"
