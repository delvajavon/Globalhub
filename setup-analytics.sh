#!/bin/bash

# GlobalHub Search Console - Quick Setup Script

echo "GlobalHub Search Console Setup"
echo "==============================="
echo ""

if [ ! -f .env ]; then
  echo ".env file not found, creating from template..."
  cp .env.example .env
  echo "Created .env"
else
  echo ".env file exists"
fi

echo ""
echo "Checking required Search Console OAuth vars..."

missing=0
for key in GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET GOOGLE_SC_REDIRECT_URI; do
  if ! grep -q "^${key}=" .env 2>/dev/null; then
    echo "  - Missing ${key}"
    missing=1
  fi
done

if [ "$missing" -eq 1 ]; then
  echo ""
  echo "Update .env with:"
  echo "GOOGLE_OAUTH_CLIENT_ID=..."
  echo "GOOGLE_OAUTH_CLIENT_SECRET=..."
  echo "GOOGLE_SC_REDIRECT_URI=http://localhost:3001/api/analytics/search-console/oauth/callback"
else
  echo "All required OAuth variables are present in .env"
fi

echo ""
echo "Next manual steps:"
echo "1) In Google Cloud, enable Search Console API and add scope:"
echo "   https://www.googleapis.com/auth/webmasters.readonly"
echo "2) Add OAuth redirect URI:"
echo "   http://localhost:3001/api/analytics/search-console/oauth/callback"
echo "3) In Search Console, verify your real domain property"
echo ""

echo "Run app now? (y/n)"
read -r reply
if [[ "$reply" =~ ^[Yy]$ ]]; then
  ./start.sh
else
  echo "Start later with: ./start.sh"
fi
