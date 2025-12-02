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

// Analysis types
export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  category: 'damage' | 'material' | 'loose_material' | 'other';
  confidence?: number;  // Optional - Gemini doesn't provide this
  boundingBox?: BoundingBox;
  count?: number;

  // Volume estimation fields (for loose materials)
  volumeEstimate?: number;        // Estimated volume in cubic yards
  volumeUnit?: string;            // "cubic_yards"
  volumeConfidence?: 'high' | 'medium' | 'low' | 'none';
  volumeReference?: string;       // Reference object used for scale
  volumeNotes?: string;           // Explanation or notes
  userVolumeOverride?: number;    // User-confirmed volume
}

export interface AnalysisResult {
  analysisId: string;
  photoId: string;
  propertyId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  detections: Detection[];
  claudeAnalysis?: string;
  errorMessage?: string;
  lowConfidence?: boolean;  // Deprecated - kept for backwards compatibility
}

export interface PagedAnalysisResponse {
  items: AnalysisResult[];
  lastEvaluatedKey?: Record<string, string> | null;
  hasMore: boolean;
}

export interface TriggerAnalysisRequest {
  propertyId: string;
  photoIds: string[];
}

export interface ReportResponse {
  reportKey: string;
  downloadUrl: string;
  photosIncluded: number;
}

