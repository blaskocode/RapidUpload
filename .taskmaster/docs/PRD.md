# Product Requirements Document (PRD)
# RapidPhotoUpload MVP - Property Photo Management System

**Version:** 1.0  
**Date:** November 13, 2025  
**Project Duration:** 5 days (MVP)  
**Client:** Gauntlet AI & Teamfront

---

## 1. Executive Summary

### 1.1 Project Overview
RapidPhotoUpload is a high-performance web application designed for property professionals (managers, photographers, inspectors) who need to rapidly upload large batches of photos from property sites. The system prioritizes speed, reliability, and zero photo loss while maintaining a responsive user experience during high-volume concurrent uploads.

### 1.2 MVP Goals
- Enable users to upload 1000 photos concurrently with real-time progress tracking
- Associate uploaded photos with specific properties
- Provide a simple, fast photo gallery for viewing uploaded content
- Ensure zero photo loss through robust error handling and retry mechanisms
- Deliver a responsive web experience that remains fluid during peak upload operations

### 1.3 Success Metrics
- **Upload Speed:** 1000 photos (2MB avg) uploaded within 90 seconds on standard broadband
- **UI Responsiveness:** Application remains fully interactive during uploads
- **Reliability:** 99.9% upload success rate with automatic retry for failures
- **User Experience:** Users can view uploaded photos within 2 seconds of completion

---

## 2. User Personas & Use Cases

### 2.1 Primary Persona: Property Inspector
**Profile:**
- On-site at properties throughout the day
- Takes up to 1000 photos per property visit
- Needs to upload photos quickly between appointments
- Uses laptop or tablet at property site

**Goals:**
- Upload all property photos in one batch
- Identify which property the photos belong to
- Confirm all photos uploaded successfully
- Move to next appointment quickly

**Pain Points:**
- Current solutions freeze during bulk uploads
- Unclear which photos failed to upload
- Slow upload speeds delay schedule
- Lost photos require return visits

### 2.2 Key Use Cases

**Use Case 1: Bulk Property Photo Upload**
1. User arrives at property and takes 1000 photos
2. Opens RapidPhotoUpload web app
3. Creates/selects property (e.g., "123 Main St - Kitchen Inspection")
4. Selects all photos from device
5. Initiates upload
6. Views real-time progress for each photo
7. Receives confirmation when complete
8. Identifies and retries any failed uploads

**Use Case 2: View Uploaded Photos**
1. User completes upload
2. Navigates to property album
3. Views all photos in gallery format
4. Confirms all photos present and accessible

---

## 3. Functional Requirements

### 3.1 Core Features (MVP)

#### 3.1.1 Property Management
**Priority:** P0 (Must Have)

- **Create Property:** Users can create a new property on-the-fly by entering a name/address
- **Property List:** Display list of all created properties
- **Property Selection:** Users select which property to associate with uploads
- **Simple Structure:** One property = one album for MVP

**Acceptance Criteria:**
- User can create property with name field (max 200 characters)
- Property name is required before upload can begin
- Properties are persisted and retrievable
- Property list shows most recent properties first

#### 3.1.2 Bulk Photo Upload
**Priority:** P0 (Must Have)

- **Multi-Select:** Users can select up to 1000 photos at once
- **Concurrent Upload:** System uploads 1000 photos simultaneously
- **Pre-signed URLs:** Direct browser-to-S3 upload using pre-signed URLs
- **Original Quality:** Photos uploaded at original resolution (no compression)
- **Real-time Progress:** Individual progress bar/percentage for each photo
- **Overall Progress:** Batch-level progress indicator (e.g., "47/1000 uploaded")
- **Upload Status:** Clear visual indication of: Queued, Uploading, Complete, Failed
- **Background Upload:** Users can navigate app while uploads continue

**Acceptance Criteria:**
- System handles 1000 concurrent uploads without UI freeze
- Each photo shows individual upload progress (0-100%)
- Upload completes within 90 seconds for 1000x2MB photos on standard broadband
- Failed uploads are clearly identified with error indication
- Users receive confirmation when all uploads complete

#### 3.1.3 Error Handling & Retry
**Priority:** P0 (Must Have)

- **Automatic Retry:** Failed uploads automatically retry up to 3 times
- **Manual Retry:** Users can manually retry failed uploads
- **Failure Display:** Clear identification of which specific photos failed
- **Error Messages:** User-friendly error messages for common failures
- **Zero Loss:** No photos lost during network interruptions or errors

**Acceptance Criteria:**
- Failed photos automatically retry 3 times with exponential backoff
- Users see "Retry" button for failed photos after auto-retry exhausted
- Failed photos remain in queue until successfully uploaded or manually removed
- Network interruptions don't result in data loss
- User receives summary: "995 succeeded, 5 failed - click to retry"

#### 3.1.4 Photo Gallery & Viewing
**Priority:** P0 (Must Have)

- **Album View:** Photos organized by property
- **Grid Gallery:** Responsive photo grid (3-4 columns on desktop)
- **Thumbnail Display:** Fast-loading thumbnails with lazy loading
- **Full-Size View:** Click to view full-resolution photo
- **Photo Count:** Display total photo count per property
- **Recent First:** Photos sorted by upload date (newest first)

**Acceptance Criteria:**
- Gallery loads within 2 seconds
- Thumbnails load progressively as user scrolls
- Full-size photo opens in modal/lightbox
- Gallery remains responsive with 1000 photos
- Photo metadata includes: filename, upload date, file size

#### 3.1.5 Upload Queue Management
**Priority:** P0 (Must Have)

- **Queue Visibility:** Display all photos in upload queue
- **Cancellation:** Users can cancel individual or all uploads in progress
- **Remove from Queue:** Remove photos before upload starts
- **Queue Persistence:** Queue survives page refresh (stored in localStorage)

**Acceptance Criteria:**
- Queue shows all pending, uploading, complete, and failed photos
- Cancel button stops upload and removes from queue
- Queue state persists across page refreshes
- Users can clear completed uploads from queue view

### 3.2 Implemented Post-MVP Features

The following features have been implemented beyond the original MVP scope:

#### Property Deletion (IMPLEMENTED)
- **Delete Property**: Users can delete a property and all associated data
- **Cascading Deletion**: Automatically deletes all photos, S3 objects, and analysis data
- **Batch Operations**: Optimized with batch S3 and DynamoDB operations for performance
- **Confirmation Modal**: Users must confirm deletion to prevent accidents

#### Photo Deletion (IMPLEMENTED)
- **Individual Photo Delete**: Delete single photos from hover action or lightbox
- **Bulk Photo Delete**: Selection mode for mass deletion of multiple photos
- **Select All/Deselect All**: Quick selection controls in selection mode
- **Failed Image Deletion**: Delete photos that failed to load directly from error state

#### AI Photo Analysis (IMPLEMENTED)
- **Analyze All Button**: Batch analyze all photos in a property with one click
- **Analysis Status Badges**: Visual indicators for analyzed/pending/failed states
- **Analysis Results Panel**: View detected objects, confidence scores, and details
- **Bounding Box Overlay**: Visual display of AI-detected object locations

#### Report Generation (IMPLEMENTED)
- **PDF Reports**: Generate property inspection reports with photos and analysis
- **Excel Reports**: Export data to spreadsheet format

### 3.3 Deferred Features (Future Phases)

#### Phase 2 (Not Yet Implemented):
- User authentication & authorization
- Bulk photo download (single or multiple)
- Photo metadata editing (captions, notes, room types)
- Search & filter functionality
- PostgreSQL database migration
- Mobile app (React Native)
- Photo sharing/collaboration features
- Advanced property management (multiple albums per property)

---

## 4. Technical Architecture

### 4.1 Technology Stack

#### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand or React Context
- **Data Fetching:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **File Upload:** Native File API with concurrent upload queue

#### Backend
- **Framework:** Spring Boot 3.x (Java 17+)
- **API Style:** REST
- **AWS SDK:** AWS SDK for Java v2
- **CORS:** Configured for Next.js frontend

#### Storage & Data
- **Object Storage:** AWS S3 (photos)
- **Metadata Storage:** AWS DynamoDB (property & photo metadata)
- **Caching:** Optional CloudFront for photo delivery (Phase 2)

#### Infrastructure
- **Cloud Provider:** AWS
- **Compute:** AWS Elastic Beanstalk or ECS (backend)
- **Frontend Hosting:** Vercel or AWS Amplify
- **CDN:** CloudFront (optional for MVP)

### 4.2 Key Architectural Decisions

#### 4.2.1 Pre-signed URL Upload Strategy
**Decision:** Use S3 pre-signed URLs for direct browser-to-S3 upload

**Rationale:**
- Eliminates backend bottleneck (no proxying large files)
- Maximizes upload speed through parallel S3 connections
- Reduces backend infrastructure costs
- Leverages S3's built-in reliability and speed

**Flow:**
1. Frontend requests pre-signed URL from backend (includes property ID, filename)
2. Backend generates pre-signed URL (valid for 15 minutes)
3. Frontend uploads directly to S3 using PUT request
4. Frontend notifies backend of successful upload
5. Backend stores metadata in DynamoDB

#### 4.2.2 DynamoDB for MVP Metadata
**Decision:** Use DynamoDB instead of PostgreSQL for MVP

**Rationale:**
- Faster to implement (no schema migrations)
- Serverless, auto-scaling
- Simple key-value structure sufficient for MVP
- Cost-effective for low volume
- Easy migration path to RDS PostgreSQL in Phase 2

**Data Model:**
- **Properties Table:** PropertyID (PK), Name, CreatedAt, PhotoCount
- **Photos Table:** PhotoID (PK), PropertyID (GSI), Filename, S3Key, UploadedAt, FileSize, Status

#### 4.2.3 Concurrent Upload Architecture
**Decision:** Client-side concurrent upload queue with configurable concurrency limit

**Implementation:**
- Frontend manages upload queue (Zustand store)
- Configurable concurrent upload limit (default: 10-20, up to 1000)
- Promise-based upload with retry logic
- Upload progress tracked per photo using XMLHttpRequest progress events

### 4.3 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Upload Queue Manager (Zustand)                          │  │
│  │  - Concurrent upload orchestration                       │  │
│  │  - Progress tracking per photo                           │  │
│  │  - Retry logic (exponential backoff)                     │  │
│  │  - State: queued → uploading → complete/failed           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Property    │  │  Upload      │  │  Gallery           │   │
│  │  Management  │  │  Interface   │  │  Viewer            │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                        │                            │
                        │ REST API                   │ REST API
                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Spring Boot)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  REST Controllers                                         │  │
│  │  - Generate pre-signed S3 URLs                           │  │
│  │  - Store photo metadata                                  │  │
│  │  - Retrieve property/photo data                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services Layer                                           │  │
│  │  - PropertyService                                        │  │
│  │  - PhotoService                                           │  │
│  │  - S3Service (pre-signed URL generation)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        │                            │
                        │ AWS SDK                    │ AWS SDK
                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AWS INFRASTRUCTURE                         │
│  ┌──────────────────┐         ┌──────────────────────────┐     │
│  │   Amazon S3      │         │     DynamoDB             │     │
│  │                  │         │                          │     │
│  │  - Photo storage │         │  - Properties table      │     │
│  │  - Direct upload │         │  - Photos table          │     │
│  │  - Pre-signed    │         │  - Metadata storage      │     │
│  │    URL access    │         │                          │     │
│  └──────────────────┘         └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Data Models

#### DynamoDB Tables

**Properties Table:**
```
{
  "PropertyID": "uuid",          // Partition Key
  "Name": "string",              // Property name/address
  "CreatedAt": "timestamp",      // ISO 8601
  "PhotoCount": "number"         // Total photos uploaded
}
```

**Photos Table:**
```
{
  "PhotoID": "uuid",             // Partition Key
  "PropertyID": "string",        // GSI Partition Key
  "Filename": "string",          // Original filename
  "S3Key": "string",             // S3 object key
  "S3Bucket": "string",          // S3 bucket name
  "UploadedAt": "timestamp",     // ISO 8601
  "FileSize": "number",          // Bytes
  "Status": "string",            // "uploaded" | "failed"
  "ContentType": "string"        // MIME type
}
```

### 4.5 API Endpoints

#### Property Endpoints
```
POST   /api/properties                           Create new property
GET    /api/properties                           List all properties
GET    /api/properties/{id}                      Get property details
DELETE /api/properties/{id}                      Delete property (cascading)
GET    /api/properties/{id}/photos               Get photos for property (paginated)
POST   /api/properties/recalculate-photo-counts  Recalculate all photo counts
```

#### Photo Endpoints
```
POST   /api/photos/presigned-url    Generate pre-signed S3 URL
POST   /api/photos/confirm          Confirm successful upload
GET    /api/photos/{id}             Get photo metadata
DELETE /api/photos/{id}             Delete single photo
POST   /api/photos/delete/batch     Batch delete photos
POST   /api/photos/{id}/analyze     Analyze single photo
POST   /api/photos/analyze/batch    Batch analyze photos
```

#### Report Endpoints
```
GET    /api/reports/property/{id}/pdf    Generate PDF report
GET    /api/reports/property/{id}/excel  Generate Excel report
```

**Request/Response Examples:**

**Generate Pre-signed URL:**
```json
POST /api/photos/presigned-url
{
  "propertyId": "uuid",
  "filename": "kitchen_01.jpg",
  "contentType": "image/jpeg",
  "fileSize": 2048000
}

Response:
{
  "photoId": "uuid",
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "expiresIn": 900,
  "fields": {
    "key": "properties/{propertyId}/{photoId}.jpg"
  }
}
```

**Confirm Upload:**
```json
POST /api/photos/confirm
{
  "photoId": "uuid",
  "propertyId": "uuid",
  "s3Key": "properties/{propertyId}/{photoId}.jpg"
}

Response:
{
  "success": true,
  "photoUrl": "https://cdn.example.com/..."
}
```

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Upload Concurrency:** Support 1000 concurrent uploads
- **Upload Speed:** 1000 photos (2GB total) in ≤90 seconds
- **UI Responsiveness:** 60 FPS during uploads, no blocking operations
- **Gallery Load:** Initial gallery load ≤2 seconds
- **API Response:** REST endpoints respond in ≤200ms (p95)

### 5.2 Reliability
- **Upload Success:** 99.9% success rate with retry logic
- **Data Integrity:** Zero photo loss during upload process
- **Auto-Retry:** Failed uploads automatically retry 3 times
- **Error Recovery:** Graceful handling of network interruptions

### 5.3 Scalability
- **Concurrent Users:** Support 10-20 concurrent users (MVP)
- **Storage:** Unlimited photo storage (S3)
- **Photos per Property:** Support 1000+ photos per property

### 5.4 Security (Deferred to Phase 2)
- **MVP:** No authentication (open access)
- **Phase 2:** JWT-based authentication
- **S3 Security:** Pre-signed URLs expire in 15 minutes
- **CORS:** Restrict API access to known frontend domains

### 5.5 Browser Support
- **Primary:** Chrome 90+, Safari 14+, Edge 90+
- **Mobile Web:** iOS Safari, Chrome Mobile (future enhancement)
- **Features:** File API, Promises, Async/Await, ES6+

---

## 6. User Experience Requirements

### 6.1 Upload Flow
1. **Landing Page:** Clear CTA: "Upload Property Photos"
2. **Property Selection:** Modal or inline form to create/select property
3. **File Selection:** Native file picker with multi-select enabled
4. **Upload Queue:** Visual queue showing all selected photos with status
5. **Progress Indication:** Individual and batch-level progress
6. **Completion:** Success message with option to view gallery or upload more
7. **Error Handling:** Clear error messages with retry options

### 6.2 UI/UX Principles
- **Clarity:** Always show current upload status
- **Feedback:** Real-time progress for all operations
- **Forgiveness:** Easy retry for failed uploads
- **Speed:** Minimize clicks to complete core tasks
- **Responsiveness:** Fluid animations, no jank during uploads
- **Accessibility:** Keyboard navigation, ARIA labels (Phase 2)

### 6.3 Mobile-Responsive Design (MVP: Desktop-First)
- **Desktop:** Optimized for 1920x1080 and 1366x768
- **Tablet:** Functional on iPad (768px+)
- **Mobile:** Basic functionality on mobile web (future native app)

---

## 7. Testing Requirements

### 7.1 Integration Tests (Mandatory)
- **End-to-End Upload:** Simulate 1000-photo upload from frontend through to S3
- **Retry Logic:** Test automatic and manual retry mechanisms
- **Error Scenarios:** Network failures, S3 errors, invalid files
- **Concurrent Uploads:** Validate 1000 simultaneous uploads complete successfully

### 7.2 Unit Tests
- **Backend Services:** Test pre-signed URL generation, metadata storage
- **Frontend Components:** Test upload queue manager, progress tracking
- **Error Handling:** Test retry logic, error state management

### 7.3 Performance Tests
- **Load Test:** Simulate 10 users uploading 1000 photos each
- **Stress Test:** Push system to 2000+ concurrent uploads
- **Network Simulation:** Test on throttled connections (3G, 4G)

### 7.4 Manual Testing Checklist
- [ ] Create property and upload 1000 photos
- [ ] Verify all photos appear in gallery
- [ ] Test upload cancellation mid-upload
- [ ] Simulate network failure and verify retry
- [ ] Test browser refresh during upload (queue persistence)
- [ ] Verify UI remains responsive during peak upload
- [ ] Test on multiple browsers (Chrome, Safari, Edge)

---

## 8. Project Constraints & Assumptions

### 8.1 Constraints
- **Timeline:** 5 days for MVP delivery
- **Authentication:** Deferred to Phase 2
- **Mobile App:** Deferred to Phase 2 (web-responsive acceptable)
- **Advanced Features:** AI tagging, bulk download deferred

### 8.2 Assumptions
- Users have reliable internet (standard broadband: 25+ Mbps upload)
- Average photo size: 2MB (range: 1-5MB)
- Users upload from laptops/tablets on-site
- AWS infrastructure already provisioned
- Single region deployment (US-East-1 or similar)

### 8.3 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| S3 upload failures | High | Automatic retry with exponential backoff |
| Browser memory issues (1000+ photos) | Medium | Progressive queue processing, cleanup after upload |
| Network interruptions | High | Queue persistence in localStorage, resume capability |
| Concurrent upload browser limits | Medium | Configurable concurrency (start at 10-20, scale to 1000) |
| DynamoDB read/write capacity | Low | On-demand pricing mode, auto-scaling |

---

## 9. Success Criteria & Acceptance

### 9.1 MVP Completion Criteria
- [ ] Users can create properties on-the-fly
- [ ] Users can upload 1000 photos concurrently (within 90 seconds)
- [ ] Real-time progress tracking for all uploads
- [ ] Failed uploads automatically retry (3x) with manual retry option
- [ ] Photos appear in gallery within 2 seconds of upload completion
- [ ] UI remains fully responsive during uploads
- [ ] Integration tests pass for complete upload flow
- [ ] Deployed to staging environment with demo data

### 9.2 Demo Requirements
- **Video/Live Demo:** Demonstrate bulk upload of 1000 photos
- **Show:** Real-time progress, error retry, gallery view
- **Metrics:** Display upload speed and success rate

---

## 10. Future Enhancements (Phase 2+)

### Phase 2: Authentication & Enhanced Features
- User authentication (JWT-based)
- PostgreSQL migration for relational data
- AI-powered auto-tagging
- Bulk photo download
- Photo metadata editing
- Search & filter functionality

### Phase 3: Mobile & Collaboration
- React Native mobile app (iOS/Android)
- Photo sharing & collaboration
- Multiple albums per property
- Advanced property management
- Real-time collaboration features

### Phase 4: Enterprise Features
- Multi-user organizations
- Role-based access control
- Audit logs
- API for third-party integrations
- Advanced analytics & reporting

---

## 11. Appendix

### 11.1 Glossary
- **Property:** A physical location (address) where photos are taken
- **Album:** Collection of photos associated with a single property
- **Pre-signed URL:** Temporary URL for direct S3 upload without AWS credentials
- **Concurrent Upload:** Multiple photos uploading simultaneously

### 11.2 References
- AWS S3 Pre-signed URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- Next.js Documentation: https://nextjs.org/docs
- React Query: https://tanstack.com/query/latest
- DynamoDB Best Practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html

---

**Document Status:** Updated (Post-MVP Implementation)
**Last Updated:** November 28, 2025
**Approval Required From:** Gauntlet AI, Teamfront
**Next Steps:** Review implemented features → Plan Phase 2 authentication
