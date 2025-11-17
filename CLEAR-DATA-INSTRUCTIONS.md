# How to Clear All Data - Quick Guide

You're seeing old data from previous sessions. Follow these steps to clear everything:

## Step 1: Clear Frontend localStorage

Open your browser console (F12) and run:

```javascript
clearAllData()
```

This will:
- Clear the upload queue from localStorage
- Call the backend cleanup endpoint to delete all DynamoDB and S3 data

## Alternative: Clear Only Frontend

If you just want to clear frontend data without touching the backend:

```javascript
clearUploadData()
```

## Step 2: Refresh the Page

After running the cleanup, refresh your browser:
- Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)
- Or just press F5

## What Gets Deleted

### Frontend:
- Upload queue (all those 3202 old failed uploads!)
- Upload status information
- Selected property ID

### Backend (if using `clearAllData()`):
- All S3 objects in the bucket
- All photos from DynamoDB
- All properties from DynamoDB

## Verify It Worked

After clearing and refreshing:
1. Go to the home page - you should see NO properties
2. Try uploading 1-5 images to a new property
3. Check that the upload count is correct (not 3202!)

## Why This Happened

The upload system was persisting old failed uploads in localStorage. The fix I just applied will:
- Auto-clean old statuses when adding new photos
- Only count current batch uploads in toast messages
- Clear completed/failed statuses after each upload

## If You Still See Issues

1. Clear your browser cache completely
2. Use incognito/private mode
3. Or manually clear localStorage:
   ```javascript
   localStorage.clear()
   ```
   Then refresh the page

---

**Note**: The cleanup utilities are automatically available in the browser console for any page of the app.

