export type UploadStatus = 'queued' | 'uploading' | 'complete' | 'failed';

export interface UploadStatusInfo {
  progress: number;
  status: UploadStatus;
  error?: string;
  attemptCount?: number;
  abortController?: AbortController;
}

export interface QueuedPhoto {
  photoId: string;
  file: File;
  propertyId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  presignedUrl?: string;
  s3Key?: string;
}

