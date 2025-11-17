#!/bin/bash
# Automated test runner and fixer script
# This script runs tests and attempts to fix common issues

set -e

cd "$(dirname "$0")"

echo "🔍 Running E2E tests and fixing errors..."
echo ""

# Check if backend is running
if ! curl -s http://localhost:8080/api/properties > /dev/null 2>&1; then
    echo "❌ Backend is not running on port 8080"
    echo "   Please start the backend first: cd backend && ./start.sh"
    exit 1
fi

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  Frontend is not running on port 3000"
    echo "   Playwright will start it automatically, but you may want to start it manually"
fi

# Run tests with detailed output
echo "🧪 Running Playwright tests..."
npm run test:e2e -- --reporter=list --workers=1 2>&1 | tee test-output.log

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    exit 0
else
    echo ""
    echo "❌ Some tests failed. Check test-output.log for details."
    echo "   Review the error messages above to identify issues."
    exit 1
fi

