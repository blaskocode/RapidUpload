# RapidUpload Deployment Guide

## Overview

This guide covers deploying RapidUpload to production:
- **Frontend**: Vercel (Next.js)
- **Backend**: AWS Elastic Beanstalk (Spring Boot)
- **Infrastructure**: AWS (S3, DynamoDB, Lambda)

---

## Prerequisites

1. **AWS Account** with access to:
   - Elastic Beanstalk
   - S3 (bucket: `rapidupload-photos`)
   - DynamoDB (tables: Properties, Photos, Analysis)
   - Lambda (functions: `rapidupload-photo-analysis`, `rapidupload-report-generator`)

2. **Vercel Account** for frontend hosting

3. **AWS CLI** configured with credentials

4. **EB CLI** installed: `pip install awsebcli`

5. **Maven** installed for building the backend

---

## Backend Deployment (Elastic Beanstalk)

### Step 1: Configure AWS IAM

Create an IAM role for Elastic Beanstalk with these policies:
- `AmazonS3FullAccess`
- `AmazonDynamoDBFullAccess`
- `AWSLambda_FullAccess`

### Step 2: Create Elastic Beanstalk Environment

```bash
cd backend

# Initialize EB (first time only)
eb init rapidupload-backend --region us-east-1 --platform "Corretto 17 running on 64bit Amazon Linux 2023"

# Create environment (first time only)
eb create rapidupload-api-prod --instance-type t3.small

# Deploy
./deploy-eb.sh
```

### Step 3: Configure Environment Variables

In the Elastic Beanstalk console, set these environment variables:
- `SPRING_PROFILES_ACTIVE`: prod
- `CORS_ALLOWED_ORIGINS`: https://your-app.vercel.app
- `AWS_REGION`: us-east-1

### Step 4: Update S3 CORS

```bash
aws s3api put-bucket-cors --bucket rapidupload-photos --cors-configuration file://s3-cors-config-prod.json
```

---

## Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select the `frontend` directory as the root

### Step 2: Configure Environment Variables

In Vercel project settings, add:
- `NEXT_PUBLIC_API_URL`: https://your-eb-environment.elasticbeanstalk.com/api

### Step 3: Deploy

Vercel will automatically deploy on push to main branch.

---

## Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl https://your-eb-environment.elasticbeanstalk.com/health

# API health
curl https://your-eb-environment.elasticbeanstalk.com/api/health
```

### Test Endpoints

```bash
# List properties
curl https://your-eb-environment.elasticbeanstalk.com/api/properties
```

---

## Troubleshooting

### Backend Logs

```bash
eb logs rapidupload-api-prod
```

### Common Issues

1. **CORS errors**: Verify `CORS_ALLOWED_ORIGINS` matches your Vercel URL exactly
2. **S3 upload fails**: Check IAM role permissions and S3 CORS config
3. **Lambda not invoked**: Verify Lambda function names match configuration

---

## Updating

### Backend Update

```bash
cd backend
./deploy-eb.sh
```

### Frontend Update

Push to main branch - Vercel auto-deploys.

---

## Cost Optimization

- **Elastic Beanstalk**: t3.micro for low traffic, scale as needed
- **Vercel**: Free tier covers most demo usage
- **DynamoDB**: On-demand pricing scales with usage
- **S3**: Standard storage with lifecycle rules for old photos
