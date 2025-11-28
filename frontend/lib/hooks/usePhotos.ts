import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { propertyKeys } from './useProperties';

// Delete a single photo
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { photoId: string; propertyId: string }>({
    mutationFn: async ({ photoId }) => {
      await api.delete(`/photos/${photoId}`);
    },
    onSuccess: (_, { propertyId }) => {
      // Invalidate property photos and property details to refresh counts
      queryClient.invalidateQueries({ queryKey: propertyKeys.photos(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.list() });
    },
  });
}

// Batch delete photos
export function useBatchDeletePhotos() {
  const queryClient = useQueryClient();

  return useMutation<
    { deletedCount: number; requestedCount: number },
    Error,
    { photoIds: string[]; propertyId: string }
  >({
    mutationFn: async ({ photoIds }) => {
      const response = await api.post<{ deletedCount: number; requestedCount: number }>(
        '/photos/delete/batch',
        { photoIds }
      );
      return response.data;
    },
    onSuccess: (_, { propertyId }) => {
      // Invalidate property photos and property details to refresh counts
      queryClient.invalidateQueries({ queryKey: propertyKeys.photos(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.list() });
    },
  });
}
