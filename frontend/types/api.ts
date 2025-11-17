export interface Property {
  propertyId: string;
  name: string;
  createdAt: string;
  photoCount: number;
}

export interface Photo {
  photoId: string;
  propertyId: string;
  filename: string;
  s3Key: string;
  s3Bucket: string;
  uploadedAt: string;
  fileSize: number;
  status: 'pending' | 'uploaded' | 'failed';
  contentType: string;
}

export interface PagedPhotoResponse {
  items: Photo[];
  lastEvaluatedKey?: Record<string, string> | null;
  hasMore: boolean;
}

export interface CreatePropertyRequest {
  name: string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
  error?: string;
  fieldErrors?: Record<string, string>;
}

