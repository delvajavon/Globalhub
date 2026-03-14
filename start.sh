#!/bin/bash

# Quick Start - GlobalHub
# Starts app while Search Console integration is being connected

echo "🎯 Starting GlobalHub..."
echo ""
echo "Note: Connect Google Search Console to load live SEO analytics."
echo "Until then, the analytics dashboard may show empty/zero metrics."
echo "See SEARCH_CONSOLE_ANALYTICS_PLAN.md for setup details."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    (cd server && npm install)
fi

echo ""
echo "✅ Starting servers..."
echo ""
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Trap to cleanup on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start backend
(cd server && npm start) &

# Wait for backend to initialize
sleep 2

# Start frontend  
npm run dev

# Wait for all background jobs
wait
