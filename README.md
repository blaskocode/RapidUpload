# RapidPhotoUpload

A high-performance web application for property professionals to rapidly upload, manage, and analyze large batches of property photos.

## Prerequisites

- **Java 17** - Required for the Spring Boot backend
- **Node.js 18+** - Required for the Next.js frontend
- **AWS Account** - For S3 and DynamoDB
- **Maven** - Included via Maven Wrapper (mvnw)

## Features

### Property Management
- **Create Properties**: Create new properties with name/address
- **Property List**: View all properties with photo counts and thumbnails
- **Delete Properties**: Remove properties with cascading deletion of all photos, S3 objects, and analysis data
- **Photo Counts**: Automatic tracking of photo counts per property

### Bulk Photo Upload
- **Multi-Select Upload**: Select up to 1000 photos at once
- **Concurrent Uploads**: Parallel uploads (up to 20 simultaneous) using pre-signed S3 URLs
- **Real-time Progress**: Individual and batch-level progress tracking
- **Background Uploads**: Navigate the app while uploads continue
- **Automatic Retry**: Failed uploads automatically retry with exponential backoff

### Photo Gallery
- **Grid Gallery**: Responsive photo grid with lazy loading thumbnails
- **Infinite Scroll**: Load photos progressively as you scroll (50 per page)
- **Full-Size Lightbox**: Click to view full-resolution photos with keyboard navigation
- **Bounding Box Overlay**: Visual display of AI-detected objects in photos

### Photo Deletion
- **Individual Delete**: Delete single photos with hover action or from lightbox
- **Bulk Delete**: Selection mode for mass deletion of multiple photos
- **Select All/Deselect All**: Quick selection controls in selection mode
- **Failed Image Handling**: Delete photos that failed to load directly from error state

### AI Photo Analysis
- **Analyze All**: Batch analyze all photos in a property with one click
- **Analysis Status Badges**: Visual indicators for analyzed/pending/failed states
- **Analysis Results Panel**: View detected objects, confidence scores, and details
- **Bounding Boxes**: Visual overlay showing detected object locations

### Report Generation
- **PDF Reports**: Generate property inspection reports with photos and analysis
- **Excel Reports**: Export data to spreadsheet format

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
├── backend/                   # Spring Boot backend
│   └── src/main/java/com/rapidupload/backend/
│       ├── controllers/       # REST API endpoints
│       │   ├── PropertyController.java
│       │   └── PhotoController.java
│       ├── services/          # Business logic
│       │   ├── PropertyService.java
│       │   ├── PhotoService.java
│       │   └── S3Service.java
│       ├── repositories/      # DynamoDB data access
│       │   ├── PropertyRepository.java
│       │   ├── PhotoRepository.java
│       │   └── AnalysisRepository.java
│       └── config/
│           └── WebConfig.java # CORS configuration
├── frontend/                  # Next.js frontend application
│   ├── app/                   # App Router pages
│   │   ├── page.tsx           # Home/property list page
│   │   ├── upload/            # Upload page
│   │   └── properties/        # Property detail and gallery pages
│   ├── components/            # React components
│   │   ├── PhotoGallery.tsx   # Main gallery with selection mode
│   │   ├── PhotoThumbnail.tsx # Individual photo thumbnail
│   │   ├── PhotoLightbox.tsx  # Full-size photo viewer
│   │   ├── PropertyList.tsx   # Property listing component
│   │   ├── PropertyForm.tsx   # Create property form
│   │   ├── UploadQueue.tsx    # Upload progress display
│   │   └── ...
│   └── lib/
│       ├── api.ts             # API client configuration
│       └── hooks/             # React Query hooks
│           ├── useProperties.ts
│           └── usePhotos.ts
└── .taskmaster/               # Task management docs
```

## API Endpoints

### Properties
```
GET    /api/properties                        # List all properties
POST   /api/properties                        # Create new property
GET    /api/properties/{id}                   # Get property details
DELETE /api/properties/{id}                   # Delete property (cascading)
GET    /api/properties/{id}/photos            # Get photos for property (paginated)
POST   /api/properties/recalculate-photo-counts  # Recalculate all photo counts
```

### Photos
```
POST   /api/photos/presigned-url    # Generate pre-signed S3 URL for upload
POST   /api/photos/confirm          # Confirm successful upload
GET    /api/photos/{id}             # Get photo metadata
DELETE /api/photos/{id}             # Delete single photo
POST   /api/photos/delete/batch     # Batch delete photos
POST   /api/photos/{id}/analyze     # Analyze single photo
POST   /api/photos/analyze/batch    # Batch analyze photos
```

### Reports
```
GET    /api/reports/property/{id}/pdf    # Generate PDF report
GET    /api/reports/property/{id}/excel  # Generate Excel report
```

## Key Implementation Details

### Batch Operations
Property and photo deletion uses optimized batch operations for performance:
- **S3**: Batch delete up to 1000 objects per request using `DeleteObjectsRequest`
- **DynamoDB**: Batch write/delete up to 25 items per request using `BatchWriteItemEnhancedRequest`

### Photo Count Management
- Photo counts are tracked on the property record
- Counts include photos with `null` or `uploaded` status
- Recalculation endpoint available if counts get out of sync: `POST /api/properties/recalculate-photo-counts`

### Selection Mode (Bulk Photo Delete)
1. Click "Select" button to enter selection mode
2. Click photos to select/deselect, or use "Select All"/"Deselect All"
3. Click "Delete Selected (N)" to remove selected photos
4. Confirm in modal to execute deletion

### Failed Image Handling
- Failed-to-load images display an error state with "Failed to load" message
- Delete button appears directly on failed images
- No need to enter selection mode to delete failed images

### CORS Configuration
The backend includes a `CorsFilter` bean that allows:
- Origins: `http://localhost:3000`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: All headers allowed
- Credentials: Supported

## Design System

The application uses CSS custom properties for consistent theming:

```css
--color-primary: #3B82F6;
--color-primary-hover: #2563EB;
--color-error: #EF4444;
--color-error-hover: #DC2626;
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-bg-primary: #FFFFFF;
--color-bg-secondary: #F8FAFC;
--color-bg-tertiary: #F1F5F9;
--color-text-primary: #1E293B;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
--color-border: #E2E8F0;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
```

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

### DELETE requests fail with CORS error
- The `CorsFilter` bean in `WebConfig.java` handles DELETE preflight requests
- Ensure the backend has been restarted after CORS configuration changes

### Property shows 0 photos but has photos
- Run the recalculate endpoint: `POST /api/properties/recalculate-photo-counts`
- This recounts photos with `null` or `uploaded` status

### Photo deletion is slow
- Batch operations are used for performance
- S3 deletes up to 1000 objects per batch request
- DynamoDB deletes up to 25 items per batch

## Development Notes

The backend will automatically create DynamoDB tables on first startup:
- `Properties` - Property metadata
- `Photos` - Photo metadata
- `Analysis` - AI analysis results

## License

Proprietary - Gauntlet AI & Teamfront
