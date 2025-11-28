'use client';

import { useState } from 'react';
import { useTriggerAnalysis } from '@/lib/hooks/useAnalysis';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import type { PagedPhotoResponse } from '@/types/api';

interface AnalyzeAllButtonProps {
  propertyId: string;
  disabled?: boolean;
}

export default function AnalyzeAllButton({ propertyId, disabled }: AnalyzeAllButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const triggerAnalysis = useTriggerAnalysis();

  // Fetch all photo IDs for the property (handles pagination)
  const fetchAllPhotoIds = async (): Promise<string[]> => {
    const allPhotoIds: string[] = [];
    let lastEvaluatedKey: Record<string, string> | null = null;

    do {
      const params: Record<string, string | number> = { limit: 100 };
      if (lastEvaluatedKey) {
        params.lastEvaluatedKey = JSON.stringify(lastEvaluatedKey);
      }

      const response = await api.get<PagedPhotoResponse>(`/properties/${propertyId}/photos`, { params });
      const data = response.data;

      // Filter for valid photos (uploaded or null status)
      const validPhotos = data.items.filter(
        (photo) => photo.status === 'uploaded' || photo.status === null || photo.status === undefined
      );
      allPhotoIds.push(...validPhotos.map((p) => p.photoId));

      lastEvaluatedKey = data.lastEvaluatedKey ?? null;
    } while (lastEvaluatedKey);

    return allPhotoIds;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Fetch all photo IDs first
      const photoIds = await fetchAllPhotoIds();

      if (photoIds.length === 0) {
        toast.error('No photos to analyze');
        return;
      }

      const result = await triggerAnalysis.mutateAsync({
        propertyId,
        photoIds,
      });
      toast.success(`Analysis started for ${result.analysisIds.length} photos`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start analysis';
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Button
      variant="accent"
      onClick={handleAnalyze}
      disabled={disabled || isAnalyzing}
      isLoading={isAnalyzing}
      leftIcon={
        !isAnalyzing ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ) : undefined
      }
    >
      {isAnalyzing ? 'Analyzing...' : 'Analyze All'}
    </Button>
  );
}
