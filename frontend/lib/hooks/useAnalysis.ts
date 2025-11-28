import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../api';
import type { AnalysisResult, PagedAnalysisResponse, TriggerAnalysisRequest, ReportResponse } from '@/types/api';

export const analysisKeys = {
  all: ['analysis'] as const,
  byPhoto: (photoId: string) => [...analysisKeys.all, 'photo', photoId] as const,
  byProperty: (propertyId: string) => [...analysisKeys.all, 'property', propertyId] as const,
};

export function useAnalysisByPhoto(photoId: string | undefined) {
  return useQuery<AnalysisResult | null>({
    queryKey: analysisKeys.byPhoto(photoId || ''),
    queryFn: async () => {
      if (!photoId) return null;
      try {
        const response = await api.get<AnalysisResult>(`/analysis/photo/${photoId}`);
        return response.data;
      } catch (error: unknown) {
        // Check for 404 status to return null (no analysis yet)
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!photoId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll while analysis is in progress
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 2000; // Poll every 2 seconds
      }
      return false;
    },
  });
}

export function useAnalysisByProperty(propertyId: string, pageSize: number = 50) {
  return useInfiniteQuery<PagedAnalysisResponse>({
    queryKey: [...analysisKeys.byProperty(propertyId), 'infinite'],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = { limit: pageSize };
      if (pageParam && typeof pageParam === 'string') params.lastEvaluatedKey = pageParam;
      const response = await api.get<PagedAnalysisResponse>(
        `/analysis/property/${propertyId}`,
        { params }
      );
      return response.data;
    },
    enabled: !!propertyId,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore && lastPage.lastEvaluatedKey
        ? lastPage.lastEvaluatedKey.AnalysisID
        : undefined;
    },
  });
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<{ analysisIds: string[] }, Error, TriggerAnalysisRequest>({
    mutationFn: async (request) => {
      const response = await api.post<{ message: string; analysisIds: string[] }>(
        '/analysis/trigger',
        request
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate analysis queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: analysisKeys.byProperty(variables.propertyId),
      });
      // Also invalidate individual photo queries
      variables.photoIds.forEach((photoId) => {
        queryClient.invalidateQueries({
          queryKey: analysisKeys.byPhoto(photoId),
        });
      });
    },
  });
}

export function useGenerateReport() {
  return useMutation<ReportResponse, Error, { propertyId: string; photoIds?: string[] }>({
    mutationFn: async ({ propertyId, photoIds }) => {
      const response = await api.post<ReportResponse>(
        `/reports/generate/${propertyId}`,
        photoIds || []
      );
      return response.data;
    },
  });
}
