#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:8080/api}"
DEMO_IMAGES_DIR="demo/sample-images/roof-damage"

echo "Creating demo property..."

# Create demo property
PROPERTY_RESPONSE=$(curl -s -X POST "${API_URL}/properties" \
  -H "Content-Type: application/json" \
  -d '{"name": "Demo Property - Roof Inspection"}')

PROPERTY_ID=$(echo $PROPERTY_RESPONSE | jq -r '.propertyId')
echo "Created property: $PROPERTY_ID"

echo "Uploading demo images..."

for image in $DEMO_IMAGES_DIR/*.{jpg,jpeg,png}; do
  if [ -f "$image" ]; then
    FILENAME=$(basename "$image")
    FILESIZE=$(stat -f%z "$image" 2>/dev/null || stat -c%s "$image")

    echo "Uploading $FILENAME..."

    # Get presigned URL
    PRESIGN_RESPONSE=$(curl -s -X POST "${API_URL}/photos/presigned-url" \
      -H "Content-Type: application/json" \
      -d "{\"propertyId\": \"$PROPERTY_ID\", \"filename\": \"$FILENAME\", \"contentType\": \"image/jpeg\", \"fileSize\": $FILESIZE}")

    PRESIGNED_URL=$(echo $PRESIGN_RESPONSE | jq -r '.presignedUrl')
    PHOTO_ID=$(echo $PRESIGN_RESPONSE | jq -r '.photoId')
    S3_KEY=$(echo $PRESIGN_RESPONSE | jq -r '.fields.key')

    # Upload to S3
    curl -s -X PUT "$PRESIGNED_URL" \
      -H "Content-Type: image/jpeg" \
      --data-binary "@$image"

    # Confirm upload
    curl -s -X POST "${API_URL}/photos/confirm-status" \
      -H "Content-Type: application/json" \
      -d "{\"photoId\": \"$PHOTO_ID\", \"propertyId\": \"$PROPERTY_ID\", \"s3Key\": \"$S3_KEY\"}"

    echo "Uploaded $FILENAME (photoId: $PHOTO_ID)"
  fi
done

echo ""
echo "Demo property created!"
echo "Property ID: $PROPERTY_ID"
echo ""
echo "To trigger analysis, run:"
echo "curl -X POST '${API_URL}/analysis/trigger' -H 'Content-Type: application/json' -d '{\"propertyId\": \"$PROPERTY_ID\", \"photoIds\": [LIST_OF_PHOTO_IDS]}'"
