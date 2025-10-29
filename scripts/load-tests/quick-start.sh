#!/bin/bash
#
# Quick Start Guide for Load Testing
# Run this script to perform baseline performance tests
#

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Performance Load Testing - Quick Start                      ║"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo ""

# Check if server is running
if ! curl -s http://127.0.0.1:5000/health > /dev/null 2>&1; then
  echo "❌ ERROR: Server is not running on port 5000"
  echo ""
  echo "Please start the server first:"
  echo "  npm run dev"
  echo ""
  exit 1
fi

echo "✅ Server is running"
echo ""

# Check for auth token
if [ -z "$TEST_AUTH_TOKEN" ]; then
  echo "❌ ERROR: TEST_AUTH_TOKEN environment variable not set"
  echo ""
  echo "To get a token:"
  echo "  1. Open http://127.0.0.1:3000 in your browser"
  echo "  2. Login to your account"
  echo "  3. Open DevTools Console"
  echo "  4. Run: localStorage.getItem('accessToken')"
  echo "  5. Copy the token and run:"
  echo "     export TEST_AUTH_TOKEN=\"your_token_here\""
  echo ""
  exit 1
fi

echo "✅ Auth token is set"
echo ""
echo "Starting load tests..."
echo ""

# Run analytics tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Analytics Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node scripts/load-tests/test-analytics.cjs

echo ""
echo "Waiting 5 seconds before next test..."
sleep 5

# Run leaderboard tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Leaderboard Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node scripts/load-tests/test-leaderboard.cjs

echo ""
echo "Waiting 5 seconds before next test..."
sleep 5

# Run timeline tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Timeline Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node scripts/load-tests/test-timeline.cjs

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Load Testing Complete                                     ║"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo ""
echo "Next steps:"
echo "  1. Review the results above"
echo "  2. Check Grafana metrics at http://localhost:3001"
echo "  3. Compare with baseline metrics"
echo "  4. Document any performance regressions"
echo ""
