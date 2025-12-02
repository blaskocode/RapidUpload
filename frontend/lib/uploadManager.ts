import api from '@/lib/api';
import { Semaphore } from './concurrencyLimiter';
import { useUploadStore } from '@/stores/uploadStore';
import type { QueuedPhoto } from '@/types/upload';
import toast from 'react-hot-toast';

const MAX_QUEUE_SIZE = 10000;
const DEFAULT_CONCURRENCY = 100; // Increased for massive parallel S3 uploads
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const BATCH_SIZE = 1000; // Request presigned URLs in batches
// Note: Batch confirmation removed - photos are now confirmed immediately after S3 upload

interface PresignedUrlResponse {
  photoId: string;
  uploadUrl: string;
  expiresIn: number;
  fields: {
    key: string;
  };
}

interface BatchPresignedUrlResponse {
  urls: PresignedUrlResponse[];
  totalRequested: number;
  totalGenerated: number;
}

interface ConfirmUploadRequest {
  photoId: string;
  propertyId: string;
  s3Key: string;
}

/**
 * Custom error types for better error handling
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class S3Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'S3Error';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Exponential backoff retry utility
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Don't retry on validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Upload file to S3 using XMLHttpRequest for progress tracking
 */
function uploadToS3(
  presignedUrl: string,
  file: File,
  photoId: string,
  onProgress: (progress: number) => void,
  abortController?: AbortController
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    // Track upload progress with debouncing (update every 5% to reduce state updates)
    let lastReportedProgress = 0;
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        // Only update if progress increased by at least 5% or reached 100%
        if (progress >= 100 || progress - lastReportedProgress >= 5) {
          lastReportedProgress = progress;
          onProgress(progress);
        }
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new S3Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new NetworkError('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Start upload
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    xhr.send(file);
  });
}

/**
 * Request batch presigned URLs from backend
 */
async function getBatchPresignedUrls(
  propertyId: string,
  files: Array<{ filename: string; contentType: string; fileSize: number }>
): Promise<PresignedUrlResponse[]> {
  try {
    const response = await api.post<BatchPresignedUrlResponse>('/photos/presigned-urls/batch', {
      propertyId,
      files,
    });

    if (!response.data.urls || response.data.urls.length === 0) {
      throw new ValidationError('Invalid batch presigned URL response');
    }

    return response.data.urls;
  } catch (error: any) {
    if (error?.status === 400) {
      throw new ValidationError(error?.message || 'Invalid request');
    }
    throw new NetworkError(error?.message || 'Failed to get batch presigned URLs');
  }
}

/**
 * Confirm uploads in batch with backend
 */
async function confirmBatchUpload(requests: ConfirmUploadRequest[]): Promise<Map<string, boolean>> {
  try {
    // Validate requests before sending
    const invalidRequests = requests.filter(req => {
      // Check if photoId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!req.photoId || !uuidRegex.test(req.photoId)) {
        console.error('Invalid photoId:', req.photoId);
        return true;
      }
      // Check if s3Key matches expected pattern
      if (!req.s3Key || !req.s3Key.match(/^properties\/[^/]+\/[^/]+-.*/)) {
        console.error('Invalid s3Key:', req.s3Key);
        return true;
      }
      return false;
    });
    
    if (invalidRequests.length > 0) {
      console.error(`Found ${invalidRequests.length} invalid confirmation requests:`, invalidRequests);
      throw new ValidationError(`Invalid confirmation requests: ${invalidRequests.length} requests have invalid format`);
    }
    
    // Log request details for debugging
    console.log(`Sending batch confirmation: ${requests.length} requests`);
    if (requests.length > 0) {
      console.log('Sample request:', {
        photoId: requests[0].photoId,
        propertyId: requests[0].propertyId,
        s3Key: requests[0].s3Key,
      });
    }
    
    const response = await api.post('/photos/confirm/batch', {
      confirmations: requests,
    });
    
    const results = new Map<string, boolean>();
    response.data.successful?.forEach((s: any) => {
      results.set(s.photoId, true);
    });
    response.data.failed?.forEach((f: any) => {
      results.set(f.photoId, false);
    });
    
    return results;
  } catch (error: any) {
    // Log detailed error information
    console.error('Batch confirmation error:', {
      status: error?.status || error?.response?.status,
      message: error?.message,
      responseData: error?.response?.data,
      requestData: requests.slice(0, 3), // Log first 3 requests for debugging
    });
    
    if (error?.response?.data) {
      const responseData = error.response.data;
      console.error('Backend error response:', JSON.stringify(responseData, null, 2));
      
      // Extract validation errors if present
      if (responseData.fieldErrors) {
        console.error('Validation field errors:', responseData.fieldErrors);
        const fieldErrors = Object.entries(responseData.fieldErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
        throw new ValidationError(`Validation failed: ${fieldErrors}`);
      }
      
      if (responseData.message) {
        throw new ValidationError(responseData.message);
      }
    }
    
    if (error?.status === 400 || error?.status === 404 || error?.response?.status === 400) {
      const errorMessage = error?.response?.data?.message 
        || error?.response?.data?.error 
        || error?.message 
        || 'Invalid confirmation request';
      throw new ValidationError(errorMessage);
    }
    throw new NetworkError(error?.message || 'Failed to confirm batch upload');
  }
}

/**
 * Upload a single photo to S3 with retry logic
 * Assumes presigned URL is already obtained
 */
async function uploadPhoto(
  photo: QueuedPhoto,
  semaphore: Semaphore,
  updateStatus: (photoId: string, updates: any) => void
): Promise<void> {
  const release = await semaphore.acquire();
  const abortController = new AbortController();

  try {
    // Validate that file exists
    if (!photo.file || !(photo.file instanceof File)) {
      throw new ValidationError('File object is missing');
    }

    // Validate presigned URL exists
    if (!photo.presignedUrl || !photo.s3Key) {
      throw new ValidationError('Presigned URL not available');
    }

    // Update status to uploading
    updateStatus(photo.photoId, {
      status: 'uploading',
      progress: 0,
      abortController,
    });

    // Upload to S3 with progress tracking
    let s3UploadSucceeded = false;
    try {
      await retryWithBackoff(
        () =>
          uploadToS3(
            photo.presignedUrl!,
            photo.file,
            photo.photoId,
            (progress) => {
              updateStatus(photo.photoId, { progress });
            },
            abortController
          ),
        MAX_RETRIES,
        BASE_DELAY_MS
      );
      s3UploadSucceeded = true;
    } catch (error: any) {
      // S3 upload failed - mark as failed and re-throw
      const errorMessage = error?.message || 'S3 upload failed';
      updateStatus(photo.photoId, {
        status: 'failed',
        error: errorMessage,
      });
      throw error;
    }

    // Immediately confirm upload status (no PhotoCount increment - avoids transaction conflicts)
    // Only retry confirmation, not S3 upload (which already succeeded)
    if (s3UploadSucceeded) {
      try {
        await retryWithBackoff(
          async () => {
            await api.post('/photos/confirm-status', {
              photoId: photo.photoId,
              propertyId: photo.propertyId,
              s3Key: photo.s3Key!,
            });
          },
          MAX_RETRIES,
          BASE_DELAY_MS
        );
        
        // Mark as complete after successful confirmation
        updateStatus(photo.photoId, {
          status: 'complete',
          progress: 100,
        });
      } catch (error: any) {
        // Confirmation failed, but S3 upload succeeded - mark as uploaded but not confirmed
        console.error(`Failed to confirm upload for ${photo.photoId}:`, error);
        updateStatus(photo.photoId, {
          status: 'uploaded', // S3 upload succeeded but confirmation failed
          progress: 100,
          error: 'Confirmation failed - photo uploaded to S3 but not confirmed',
        });
        // Don't throw - S3 upload succeeded, just confirmation failed
        // This will be handled by retry mechanism or manual retry
      }
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Upload failed';
    updateStatus(photo.photoId, {
      status: 'failed',
      error: errorMessage,
    });
    throw error;
  } finally {
    release();
  }
}

/**
 * Upload Manager class
 */
export class UploadManager {
  private semaphore: Semaphore;
  private isProcessing: boolean = false;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(maxConcurrency: number = DEFAULT_CONCURRENCY) {
    this.semaphore = new Semaphore(maxConcurrency);
  }

  /**
   * Process the upload queue with batch presigned URLs and parallel uploads
   */
  async processQueue(): Promise<void> {
    const store = useUploadStore.getState();

    if (this.isProcessing) {
      return;
    }

    if (store.queue.length === 0) {
      store.setIsUploading(false);
      return;
    }

    this.isProcessing = true;
    store.setIsUploading(true);

    try {
      // Filter to only queued items
      const queuedPhotos = store.queue.filter(
        (photo) => store.uploadStatus[photo.photoId]?.status === 'queued'
      );

      if (queuedPhotos.length === 0) {
        store.setIsUploading(false);
        this.isProcessing = false;
        return;
      }

      // Track photo IDs for this batch to properly count results
      const batchPhotoIds = new Set(queuedPhotos.map(p => p.photoId));

      // Limit queue size
      if (queuedPhotos.length > MAX_QUEUE_SIZE) {
        throw new Error(`Queue size exceeds maximum of ${MAX_QUEUE_SIZE}`);
      }

      // Step 1: Get ALL presigned URLs in batch
      const propertyId = queuedPhotos[0].propertyId;
      const fileMetadata = queuedPhotos.map(photo => ({
        filename: photo.filename,
        contentType: photo.contentType,
        fileSize: photo.fileSize,
      }));

      const presignedUrls = await getBatchPresignedUrls(propertyId, fileMetadata);

      // Update photos with presigned URL data
      const updatedQueue = [...store.queue];
      queuedPhotos.forEach((photo, index) => {
        const presignedData = presignedUrls[index];
        const photoIndex = updatedQueue.findIndex(p => p.photoId === photo.photoId);
        if (photoIndex !== -1 && presignedData) {
          updatedQueue[photoIndex] = {
            ...updatedQueue[photoIndex],
            photoId: presignedData.photoId,
            presignedUrl: presignedData.uploadUrl,
            s3Key: presignedData.fields.key,
          };
          
          // Update status with new photoId
          const oldStatus = store.uploadStatus[photo.photoId];
          if (oldStatus) {
            const newStatus = { ...store.uploadStatus };
            delete newStatus[photo.photoId];
            newStatus[presignedData.photoId] = oldStatus;
            useUploadStore.setState({ uploadStatus: newStatus });
          }
          
          // Update local reference
          photo.photoId = presignedData.photoId;
          photo.presignedUrl = presignedData.uploadUrl;
          photo.s3Key = presignedData.fields.key;
        }
      });
      useUploadStore.setState({ queue: updatedQueue });

      // Step 2: Upload all files to S3 in parallel (100 concurrent)
      const uploadPromises = queuedPhotos.map((photo) =>
        uploadPhoto(photo, this.semaphore, (photoId, updates) => {
          const controller = updates.abortController;
          if (controller) {
            this.abortControllers.set(photoId, controller);
          }
          useUploadStore.getState().updateUploadStatus(photoId, updates);
        }).catch((error) => {
          console.error(`S3 upload failed for ${photo.photoId}:`, error);
          return { photoId: photo.photoId, error };
        })
      );

      const uploadResults = await Promise.allSettled(uploadPromises);
      
      // Photos are now confirmed immediately after S3 upload (in uploadPhoto function)
      // Get successfully completed photos (use fresh store state)
      const currentStore = useUploadStore.getState();
      const completedPhotos = queuedPhotos.filter((photo, index) => {
        const result = uploadResults[index];
        const status = currentStore.uploadStatus[photo.photoId]?.status;
        return result.status === 'fulfilled' && status === 'complete';
      });

      // Retry confirmations for photos that are still uploading after S3 upload completed
      // (This handles the case where S3 succeeded but confirmation failed)
      const stillUploading = queuedPhotos.filter((photo, index) => {
        const result = uploadResults[index];
        const status = currentStore.uploadStatus[photo.photoId]?.status;
        return result.status === 'fulfilled' && status === 'uploading';
      });

      if (stillUploading.length > 0) {
        console.log(`Retrying confirmation for ${stillUploading.length} photos`);
        // Retry confirmations in parallel
        const retryPromises = stillUploading.map(async (photo) => {
          try {
            await api.post('/photos/confirm-status', {
              photoId: photo.photoId,
              propertyId: photo.propertyId,
              s3Key: photo.s3Key!,
            });
            useUploadStore.getState().updateUploadStatus(photo.photoId, {
              status: 'complete',
              progress: 100,
            });
          } catch (error: unknown) {
            console.error(`Retry confirmation failed for ${photo.photoId}:`, error);
            useUploadStore.getState().updateUploadStatus(photo.photoId, {
              status: 'failed',
            });
          }
        });
        await Promise.allSettled(retryPromises);
      }

      // Recalculate PhotoCount after all uploads and retries complete
      const finalStore = useUploadStore.getState();
      const finalCompleted = queuedPhotos.filter((photo) => {
        const status = finalStore.uploadStatus[photo.photoId]?.status;
        return status === 'complete';
      });

      if (finalCompleted.length > 0 && propertyId) {
        try {
          await api.post(`/properties/${propertyId}/recalculate-count`);
          console.log(`Recalculated photo count for property ${propertyId} (${finalCompleted.length} photos)`);
        } catch (error: any) {
          console.error('Failed to recalculate photo count:', error);
          // Don't fail the entire upload if count recalculation fails
        }

        // Auto-analyze if enabled
        const { autoAnalyze } = useUploadStore.getState();
        if (autoAnalyze) {
          try {
            const photoIds = finalCompleted.map(p => p.photoId);
            await api.post('/analysis/trigger', {
              propertyId,
              photoIds,
            });
            console.log(`Auto-triggered analysis for ${photoIds.length} photos`);
          } catch (error: any) {
            console.error('Failed to auto-trigger analysis:', error);
            // Don't fail upload if analysis trigger fails
          }
        }
      }

      // Show results - ONLY count photos from THIS batch
      const resultsStore = useUploadStore.getState();
      const completedCount = Array.from(batchPhotoIds).filter(
        id => resultsStore.uploadStatus[id]?.status === 'complete'
      ).length;
      const failedCount = Array.from(batchPhotoIds).filter(
        id => resultsStore.uploadStatus[id]?.status === 'failed'
      ).length;
      
      if (completedCount > 0) {
        toast.success(`${completedCount} photo(s) uploaded and confirmed successfully`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} upload(s) failed`);
      }
      
      // Clean up old completed/failed statuses asynchronously (don't block hot path)
      setTimeout(() => {
        const cleanupStore = useUploadStore.getState();
        const updatedStatus = { ...cleanupStore.uploadStatus };
        let cleanedCount = 0;
        
        for (const [photoId, status] of Object.entries(updatedStatus)) {
          // Remove old completed or failed items not in current batch
          if (!batchPhotoIds.has(photoId) && (status.status === 'complete' || status.status === 'failed')) {
            delete updatedStatus[photoId];
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          useUploadStore.setState({ uploadStatus: updatedStatus });
        }
      }, 0);

    } catch (error: any) {
      console.error('Queue processing error:', error);
      toast.error(error?.message || 'Upload processing failed');
    } finally {
      this.isProcessing = false;
      const remaining = useUploadStore.getState().queue.filter(
        (photo) => {
          const status = useUploadStore.getState().uploadStatus[photo.photoId]?.status;
          return status === 'queued' || status === 'uploading';
        }
      );

      if (remaining.length === 0) {
        useUploadStore.getState().setIsUploading(false);
      }
    }
  }

  /**
   * Cancel an upload
   */
  cancelUpload(photoId: string): void {
    const controller = this.abortControllers.get(photoId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(photoId);
    }
    useUploadStore.getState().cancelUpload(photoId);
  }

  /**
   * Retry a failed upload
   */
  retryUpload(photoId: string): void {
    useUploadStore.getState().retryUpload(photoId);
    this.processQueue();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Abort all in-flight uploads
    for (const [photoId, controller] of this.abortControllers.entries()) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.isProcessing = false;
  }
}

// Export singleton instance
export const uploadManager = new UploadManager(DEFAULT_CONCURRENCY);

