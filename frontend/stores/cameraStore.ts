import { create } from 'zustand';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  file: File;
  photoId?: string;
  s3Key?: string;
  s3Bucket?: string;
  status: 'captured' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
  analysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface CameraStore {
  propertyId: string | null;
  autoAnalyze: boolean;
  currentCapture: CapturedPhoto | null;
  acceptedPhotoIds: string[];

  setPropertyId: (propertyId: string) => void;
  setAutoAnalyze: (value: boolean) => void;
  setCurrentCapture: (capture: CapturedPhoto | null) => void;
  updateCaptureStatus: (status: CapturedPhoto['status'], photoId?: string, s3Key?: string, s3Bucket?: string) => void;
  updateAnalysisStatus: (status: CapturedPhoto['analysisStatus']) => void;
  setCaptureError: (error: string) => void;
  acceptCapture: () => void;
  declineCapture: () => void;
  clearSession: () => void;
}

export const useCameraStore = create<CameraStore>((set, get) => ({
  propertyId: null,
  autoAnalyze: true,
  currentCapture: null,
  acceptedPhotoIds: [],

  setPropertyId: (propertyId) => set({ propertyId }),

  setAutoAnalyze: (value) => set({ autoAnalyze: value }),

  setCurrentCapture: (capture) => set({ currentCapture: capture }),

  updateCaptureStatus: (status, photoId, s3Key, s3Bucket) => set((state) => ({
    currentCapture: state.currentCapture
      ? {
          ...state.currentCapture,
          status,
          photoId: photoId ?? state.currentCapture.photoId,
          s3Key: s3Key ?? state.currentCapture.s3Key,
          s3Bucket: s3Bucket ?? state.currentCapture.s3Bucket
        }
      : null
  })),

  updateAnalysisStatus: (analysisStatus) => set((state) => ({
    currentCapture: state.currentCapture
      ? { ...state.currentCapture, analysisStatus }
      : null
  })),

  setCaptureError: (error) => set((state) => ({
    currentCapture: state.currentCapture
      ? { ...state.currentCapture, status: 'failed', error }
      : null
  })),

  acceptCapture: () => set((state) => {
    const photoId = state.currentCapture?.photoId;
    if (photoId) {
      return {
        acceptedPhotoIds: [...state.acceptedPhotoIds, photoId],
        currentCapture: null
      };
    }
    return { currentCapture: null };
  }),

  declineCapture: () => set({ currentCapture: null }),

  clearSession: () => set({
    currentCapture: null,
    acceptedPhotoIds: []
  })
}));
