import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Property, PagedPhotoResponse, CreatePropertyRequest } from '@/types/api';

// Query keys
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: () => [...propertyKeys.lists()] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  photos: (propertyId: string) => [...propertyKeys.detail(propertyId), 'photos'] as const,
};

// Fetch all properties
export function useProperties() {
  return useQuery<Property[]>({
    queryKey: propertyKeys.list(),
    queryFn: async () => {
      const response = await api.get<Property[]>('/properties');
      return response.data;
    },
    refetchOnWindowFocus: true,
  });
}

// Fetch single property
export function useProperty(propertyId: string) {
  return useQuery<Property>({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: async () => {
      const response = await api.get<Property>(`/properties/${propertyId}`);
      return response.data;
    },
    enabled: !!propertyId,
  });
}

// Fetch photos for a property with pagination support
export function usePropertyPhotos(
  propertyId: string,
  limit?: number,
  lastEvaluatedKey?: Record<string, string> | null
) {
  return useQuery<PagedPhotoResponse>({
    queryKey: [...propertyKeys.photos(propertyId), limit, lastEvaluatedKey],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (limit) params.limit = limit;
      if (lastEvaluatedKey) params.lastEvaluatedKey = JSON.stringify(lastEvaluatedKey);
      const response = await api.get<PagedPhotoResponse>(`/properties/${propertyId}/photos`, { params });
      return response.data;
    },
    enabled: !!propertyId,
  });
}

// Hook for infinite pagination of photos
export function usePropertyPhotosInfinite(propertyId: string, pageSize: number = 50) {
  return useInfiniteQuery<PagedPhotoResponse>({
    queryKey: [...propertyKeys.photos(propertyId), 'infinite'],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, any> = { limit: pageSize };
      if (pageParam) params.lastEvaluatedKey = JSON.stringify(pageParam);
      const response = await api.get<PagedPhotoResponse>(`/properties/${propertyId}/photos`, { params });
      return response.data;
    },
    enabled: !!propertyId,
    initialPageParam: null as Record<string, string> | null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore && lastPage.lastEvaluatedKey ? lastPage.lastEvaluatedKey : undefined;
    },
  });
}

// Create property mutation
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation<Property, Error, CreatePropertyRequest, { previousProperties?: Property[] }>({
    mutationFn: async (data: CreatePropertyRequest) => {
      const response = await api.post<Property>('/properties', data);
      return response.data;
    },
    onMutate: async (newProperty) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.list() });

      // Snapshot previous value
      const previousProperties = queryClient.getQueryData<Property[]>(propertyKeys.list());

      // Optimistically update cache
      const optimisticProperty: Property = {
        propertyId: `temp-${Date.now()}`,
        name: newProperty.name,
        createdAt: new Date().toISOString(),
        photoCount: 0,
      };

      queryClient.setQueryData<Property[]>(propertyKeys.list(), (old = []) => [
        optimisticProperty,
        ...old,
      ]);

      return { previousProperties };
    },
    onError: (err, newProperty, context) => {
      // Rollback on error
      if (context?.previousProperties) {
        queryClient.setQueryData(propertyKeys.list(), context.previousProperties);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: propertyKeys.list() });
    },
  });
}

// Delete property mutation
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previousProperties?: Property[] }>({
    mutationFn: async (propertyId: string) => {
      await api.delete(`/properties/${propertyId}`);
    },
    onMutate: async (propertyId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.list() });

      // Snapshot previous value
      const previousProperties = queryClient.getQueryData<Property[]>(propertyKeys.list());

      // Optimistically remove from cache
      queryClient.setQueryData<Property[]>(propertyKeys.list(), (old = []) =>
        old.filter((p) => p.propertyId !== propertyId)
      );

      return { previousProperties };
    },
    onError: (err, propertyId, context) => {
      // Rollback on error
      if (context?.previousProperties) {
        queryClient.setQueryData(propertyKeys.list(), context.previousProperties);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: propertyKeys.list() });
    },
  });
}

