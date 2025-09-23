#!/bin/bash

# Quick Start Script for Smart Finance Hub
echo "🚀 Quick Starting Smart Finance Hub..."

# Kill any existing processes on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "🔄 Stopping existing server..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start the review console server in background
echo "🌐 Starting review console server..."
nohup node automation/review-console/server.js > automation/logs/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo $SERVER_PID > automation/logs/server.pid

    # Open browser
    if command -v open > /dev/null 2>&1; then
        open http://localhost:3000
        echo "🌐 Browser opened"
    fi

    echo ""
    echo "🎉 Smart Finance Hub is running!"
    echo "📊 Dashboard: http://localhost:3000"
    echo "🛑 Stop with: kill $SERVER_PID"
    echo ""
else
    echo "❌ Failed to start server"
    exit 1
fi