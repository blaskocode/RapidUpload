#!/bin/bash
set -e

# Configuration
STACK_NAME="rapidupload-photo-analysis"
REGION="us-east-1"
S3_BUCKET="rapidupload-lambda-deployments"  # Create this bucket first

# Check for required environment variable
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set"
    echo "Usage: OPENAI_API_KEY=sk-xxx ./deploy.sh"
    exit 1
fi

echo "Building and deploying Lambda..."

# Create deployment bucket if it doesn't exist
aws s3 mb s3://${S3_BUCKET} --region ${REGION} 2>/dev/null || true

# Package
sam build

# Deploy
sam deploy \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --s3-bucket ${S3_BUCKET} \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides "OpenAIApiKey=${OPENAI_API_KEY}"

echo "Deployment complete!"
