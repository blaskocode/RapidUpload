# Data Cleanup Guide

This guide explains how to clear all data from RapidUpload, including:
- S3 bucket objects
- DynamoDB tables (Properties and Photos)
- Frontend localStorage

## ⚠️ Warning

**All cleanup operations are irreversible!** Make sure you have backups if needed.

## Methods

### Method 1: Backend API Endpoint

Call the cleanup endpoint directly:

```bash
curl -X DELETE http://localhost:8080/api/admin/cleanup
```

Or use the provided script:

```bash
./scripts/cleanup-all.sh
```

### Method 2: Frontend Browser Console

The cleanup utilities are automatically available in the browser console:

```javascript
// Clear only upload queue from localStorage
clearUploadData()

// Clear all localStorage
clearAllLocalStorage()

// Clear backend data (DynamoDB + S3)
await clearBackendData()

// Clear everything (frontend + backend)
await clearAllData()
```

### Method 3: Import in Code

```typescript
import { 
  clearUploadData, 
  clearAllLocalStorage, 
  clearBackendData, 
  clearAllData 
} from '@/lib/cleanup'

// Clear frontend only
clearUploadData()

// Clear backend only
await clearBackendData()

// Clear everything
await clearAllData()
```

## What Gets Deleted

### Backend (`/api/admin/cleanup`)
- ✅ All objects in the S3 bucket (`rapidupload-photos`)
- ✅ All items in the `Photos` DynamoDB table
- ✅ All items in the `Properties` DynamoDB table

### Frontend (`clearUploadData()`)
- ✅ Upload queue state from localStorage
- ✅ Upload status information
- ✅ Selected property ID

## Response Format

The backend cleanup endpoint returns:

```json
{
  "success": true,
  "message": "Successfully deleted 150 S3 objects, 100 photos, and 10 properties",
  "s3ObjectsDeleted": 150,
  "photosDeleted": 100,
  "propertiesDeleted": 10
}
```

## Troubleshooting

### Backend cleanup fails

1. Check that the backend server is running
2. Verify AWS credentials are configured correctly
3. Ensure you have permissions to delete from S3 and DynamoDB
4. Check backend logs for detailed error messages

### Frontend cleanup fails

1. Open browser DevTools console to see error messages
2. Check that localStorage is not disabled
3. Try clearing manually: `localStorage.clear()`

## Security Note

The cleanup endpoint (`/api/admin/cleanup`) should ideally be protected with authentication in production. Currently, it's open to prevent accidental deletions, but consider adding:

- API key authentication
- Admin role verification
- IP whitelisting
- Rate limiting

