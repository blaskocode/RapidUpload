#!/bin/bash

# Script to clear all data from RapidUpload
# This will delete:
# - All S3 objects in the bucket
# - All photos from DynamoDB
# - All properties from DynamoDB
# - All localStorage data (if run from browser)

set -e

echo "🧹 RapidUpload Data Cleanup Script"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data!"
echo "   - All S3 objects"
echo "   - All DynamoDB photos"
echo "   - All DynamoDB properties"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🔄 Starting cleanup..."

# Get API URL from environment or use default
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8080/api}"

# Call the cleanup endpoint
echo "📡 Calling backend cleanup endpoint..."
response=$(curl -s -X DELETE "$API_URL/admin/cleanup" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")

# Extract status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract body (all but last line)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Backend cleanup successful!"
    echo "$body" | jq '.'
else
    echo "❌ Backend cleanup failed (HTTP $http_code)"
    echo "$body"
    exit 1
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: To clear frontend localStorage, open your browser console and run:"
echo "   clearUploadData()"
echo ""
echo "Or import and use the cleanup utility:"
echo "   import { clearAllData } from '@/lib/cleanup'"
echo "   await clearAllData()"

