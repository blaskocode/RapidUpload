import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QueuedPhoto, UploadStatusInfo, UploadStatus } from '@/types/upload';

interface UploadStore {
  queue: QueuedPhoto[];
  selectedPropertyId: string | null;
  uploadStatus: Record<string, UploadStatusInfo>;
  isUploading: boolean;
  autoAnalyze: boolean;

  // Actions
  addPhotosToQueue: (files: File[], propertyId: string) => void;
  startUpload: () => void;
  cancelUpload: (photoId: string) => void;
  retryUpload: (photoId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  updateUploadStatus: (photoId: string, status: Partial<UploadStatusInfo>) => void;
  removeFromQueue: (photoId: string) => void;
  setSelectedPropertyId: (propertyId: string | null) => void;
  setIsUploading: (isUploading: boolean) => void;
  setAutoAnalyze: (value: boolean) => void;
}

// Helper to filter out old completed uploads (older than 24 hours)
const filterOldCompleted = (status: Record<string, UploadStatusInfo>) => {
  const now = Date.now();
  const filtered: Record<string, UploadStatusInfo> = {};
  
  for (const [photoId, info] of Object.entries(status)) {
    // Keep non-completed items, or completed items that might be recent
    if (info.status !== 'complete' || (info.status === 'complete' && now - (info as any).completedAt < 24 * 60 * 60 * 1000)) {
      filtered[photoId] = info;
    }
  }
  
  return filtered;
};

// Helper to restore queue from localStorage (File objects are lost, so mark uploading as failed)
const restoreQueue = (persistedState: any): QueuedPhoto[] => {
  if (!persistedState?.queue) return [];
  
  // File objects can't be restored, so we can only restore metadata
  // Items that were uploading will need to be marked as failed
  return persistedState.queue.map((item: any) => ({
    ...item,
    file: null as any, // File object is lost on restore
  }));
};

export const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      queue: [],
      selectedPropertyId: null,
      uploadStatus: {},
      isUploading: false,
      autoAnalyze: true, // Default to enabled

      addPhotosToQueue: (files: File[], propertyId: string) => {
        const newPhotos: QueuedPhoto[] = files.map((file) => ({
          photoId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          propertyId,
          filename: file.name,
          contentType: file.type || 'image/jpeg',
          fileSize: file.size,
        }));

        set((state) => {
          // Clean up old failed/completed statuses before adding new ones
          const cleanedStatus = { ...state.uploadStatus };
          const currentQueueIds = new Set(state.queue.map(p => p.photoId));
          
          for (const [photoId, status] of Object.entries(cleanedStatus)) {
            // Remove statuses for photos not in queue and that are completed/failed
            if (!currentQueueIds.has(photoId) && 
                (status.status === 'complete' || status.status === 'failed')) {
              delete cleanedStatus[photoId];
            }
          }
          
          return {
            queue: [...state.queue, ...newPhotos],
            selectedPropertyId: propertyId,
            uploadStatus: {
              ...cleanedStatus,
              ...Object.fromEntries(
                newPhotos.map((photo) => [
                  photo.photoId,
                  { progress: 0, status: 'queued' as UploadStatus },
                ])
              ),
            },
          };
        });
      },

      startUpload: () => {
        set({ isUploading: true });
      },

      cancelUpload: (photoId: string) => {
        const status = get().uploadStatus[photoId];
        if (status?.abortController) {
          status.abortController.abort();
        }

        set((state) => {
          const newStatus = { ...state.uploadStatus };
          delete newStatus[photoId];
          
          return {
            queue: state.queue.filter((p) => p.photoId !== photoId),
            uploadStatus: newStatus,
          };
        });
      },

      retryUpload: (photoId: string) => {
        set((state) => ({
          uploadStatus: {
            ...state.uploadStatus,
            [photoId]: {
              progress: 0,
              status: 'queued',
              attemptCount: (state.uploadStatus[photoId]?.attemptCount || 0) + 1,
            },
          },
        }));
      },

      clearCompleted: () => {
        set((state) => {
          const completedOrFailedIds = Object.entries(state.uploadStatus)
            .filter(([_, info]) => info.status === 'complete' || info.status === 'failed')
            .map(([id]) => id);

          const newStatus = { ...state.uploadStatus };
          completedOrFailedIds.forEach((id) => delete newStatus[id]);

          return {
            queue: state.queue.filter((p) => !completedOrFailedIds.includes(p.photoId)),
            uploadStatus: newStatus,
          };
        });
      },

      clearAll: () => {
        set({
          queue: [],
          uploadStatus: {},
          isUploading: false,
        });
      },

      updateUploadStatus: (photoId: string, updates: Partial<UploadStatusInfo>) => {
        set((state) => ({
          uploadStatus: {
            ...state.uploadStatus,
            [photoId]: {
              ...state.uploadStatus[photoId],
              ...updates,
            } as UploadStatusInfo,
          },
        }));
      },

      removeFromQueue: (photoId: string) => {
        set((state) => ({
          queue: state.queue.filter((p) => p.photoId !== photoId),
        }));
      },

      setSelectedPropertyId: (propertyId: string | null) => {
        set({ selectedPropertyId: propertyId });
      },

      setIsUploading: (isUploading: boolean) => {
        set({ isUploading });
      },

      setAutoAnalyze: (value: boolean) => {
        set({ autoAnalyze: value });
      },
    }),
    {
      name: 'upload-queue-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist metadata, not File objects (they can't be serialized)
        queue: state.queue
          .filter((p) => {
            const status = state.uploadStatus[p.photoId];
            return status?.status === 'queued' || status?.status === 'uploading';
          })
          .map((p) => ({
            photoId: p.photoId,
            propertyId: p.propertyId,
            filename: p.filename,
            contentType: p.contentType,
            fileSize: p.fileSize,
            presignedUrl: p.presignedUrl,
            s3Key: p.s3Key,
          })),
        uploadStatus: filterOldCompleted(state.uploadStatus),
        selectedPropertyId: state.selectedPropertyId,
        autoAnalyze: state.autoAnalyze,
      }),
      onRehydrateStorage: () => (state) => {
        // On restore, mark any uploading items as failed (File objects are lost)
        if (state) {
          const updatedStatus = { ...state.uploadStatus };
          const queuePhotoIds = new Set(state.queue.map(q => q.photoId));
          
          // Mark all in-progress uploads as failed since File objects can't be restored
          for (const [photoId, info] of Object.entries(updatedStatus)) {
            if (info.status === 'uploading' || info.status === 'queued') {
              updatedStatus[photoId] = {
                ...info,
                status: 'failed',
                error: 'Upload interrupted - file cannot be restored after page refresh. Please re-upload.',
                progress: 0,
              };
            }
          }
          
          // Since File objects cannot be serialized/restored, we clear the queue entirely
          // The status map preserves a record of what failed so users see the failure state
          // But we cannot resume uploads without the actual File objects
          state.queue = [];
          state.uploadStatus = updatedStatus;
          state.isUploading = false;
          
          console.log('Upload queue restored from storage. Previous uploads marked as failed due to page refresh.');
        }
      },
    }
  )
);

