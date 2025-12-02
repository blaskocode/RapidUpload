import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { propertyKeys } from './useProperties';
import { analysisKeys } from './useAnalysis';

// Match the actual backend response structure
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

interface UploadResult {
  photoId: string;
  s3Key: string;
  s3Bucket: string;
}

// S3 bucket name - should match backend configuration
const S3_BUCKET = 'rapidupload-photos';

export function useUploadCameraCapture() {
  const queryClient = useQueryClient();

  return useMutation<UploadResult, Error, { file: File; propertyId: string; autoAnalyze: boolean }>({
    mutationFn: async ({ file, propertyId, autoAnalyze }) => {
      // 1. Get presigned URL
      const presignedResponse = await api.post<BatchPresignedUrlResponse>(
        '/photos/presigned-urls/batch',
        {
          propertyId,
          files: [{ filename: file.name, contentType: file.type, fileSize: file.size }]
        }
      );

      const presignedData = presignedResponse.data.urls[0];
      const { photoId, uploadUrl } = presignedData;
      const s3Key = presignedData.fields.key;

      // 2. Upload to S3 using XMLHttpRequest (same as uploadManager for consistency)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during S3 upload'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
        xhr.send(file);
      });

      // 3. Confirm upload
      await api.post('/photos/confirm-status', { photoId, propertyId, s3Key });

      // 4. Trigger analysis if enabled
      if (autoAnalyze) {
        await api.post('/analysis/trigger', { propertyId, photoIds: [photoId] });
      }

      return { photoId, s3Key, s3Bucket: S3_BUCKET };
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: propertyKeys.photos(variables.propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(variables.propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.list() });
      queryClient.invalidateQueries({ queryKey: analysisKeys.byProperty(variables.propertyId) });
    }
  });
}
