# RapidUpload

A property photo management application with efficient bulk upload capabilities.

## Prerequisites

- **Java 17** - Required for the Spring Boot backend
- **Node.js 18+** - Required for the Next.js frontend
- **AWS Account** - For S3 and DynamoDB
- **Maven** - Included via Maven Wrapper (mvnw)

## Setup Instructions

### 1. Install Java 17

If you haven't already, install Java 17:

```bash
brew install openjdk@17
```

Add to your `~/.zshrc` (or `~/.bash_profile`):
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

### 2. Configure AWS Credentials

The backend needs AWS credentials to access S3 and DynamoDB. Set them up using one of these methods:

**Option A: AWS CLI (Recommended)**
```bash
aws configure
```

**Option B: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

**Option C: ~/.aws/credentials file**
```ini
[default]
aws_access_key_id = your-access-key
aws_secret_access_key = your-secret-key
region = us-east-1
```

### 3. Create S3 Bucket

The S3 bucket `rapidupload-photos` has already been created. If you need to recreate it:

```bash
aws s3 mb s3://rapidupload-photos --region us-east-1
aws s3api put-bucket-cors --bucket rapidupload-photos --cors-configuration file://backend/s3-cors-config.json
```

### 4. Start the Backend

```bash
cd backend
./start.sh
# OR manually:
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
./mvnw spring-boot:run
```

The backend will start on `http://localhost:8080`

**Note:** First startup may take 1-2 minutes as Maven downloads dependencies.

### 5. Start the Frontend

In a separate terminal:

```bash
cd frontend
npm install  # If you haven't already
npm run dev
```

The frontend will start on `http://localhost:3000`

## Project Structure

```
RapidUpload/
├── backend/          # Spring Boot API
│   ├── src/
│   └── pom.xml
├── frontend/         # Next.js application
│   ├── app/
│   ├── components/
│   └── lib/
└── .taskmaster/    # Task management
```

## Features

- ✅ Property management (create, list, view)
- ✅ Bulk photo upload with progress tracking
- ✅ Concurrent uploads (up to 20 simultaneous)
- ✅ Automatic retry with exponential backoff
- ✅ Real-time progress tracking
- ✅ Photo gallery with lazy loading
- ✅ S3 integration with presigned URLs
- ✅ DynamoDB for metadata storage

## Troubleshooting

### Backend won't start
- Check Java version: `java -version` (should be 17)
- Verify AWS credentials are configured
- Check port 8080 is not in use: `lsof -ti:8080`

### Frontend can't connect to backend
- Ensure backend is running on port 8080
- Check CORS configuration in `backend/src/main/java/.../WebConfig.java`

### Upload fails
- Verify S3 bucket exists: `aws s3 ls | grep rapidupload-photos`
- Check AWS credentials have S3 and DynamoDB permissions
- Verify CORS is configured on the S3 bucket

## Development

The backend will automatically create DynamoDB tables (`Properties` and `Photos`) on first startup if they don't exist.


