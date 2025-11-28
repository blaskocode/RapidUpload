#!/bin/bash

# RapidUpload Backend Deployment Script for AWS Elastic Beanstalk
# Usage: ./deploy-eb.sh [environment-name]

set -e

ENVIRONMENT=${1:-rapidupload-api-prod}
APPLICATION_NAME="rapidupload-backend"
REGION="us-east-1"

echo "=========================================="
echo "RapidUpload Backend Deployment"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "Error: AWS EB CLI is not installed."
    echo "Install with: pip install awsebcli"
    exit 1
fi

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "Error: Maven is not installed."
    exit 1
fi

# Build the application
echo "Building application..."
mvn clean package -DskipTests

# Check if build was successful
if [ ! -f "target/backend-0.0.1-SNAPSHOT.jar" ]; then
    echo "Error: Build failed. JAR file not found."
    exit 1
fi

echo "Build successful!"

# Initialize EB if not already done
if [ ! -d ".elasticbeanstalk" ]; then
    echo "Initializing Elastic Beanstalk..."
    eb init $APPLICATION_NAME --region $REGION --platform "Corretto 17 running on 64bit Amazon Linux 2023"
fi

# Deploy
echo "Deploying to $ENVIRONMENT..."
eb deploy $ENVIRONMENT --staged

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "To check status: eb status $ENVIRONMENT"
echo "To view logs: eb logs $ENVIRONMENT"
echo "To open app: eb open $ENVIRONMENT"
