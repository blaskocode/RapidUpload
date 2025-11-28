'use client';

import { useState } from 'react';
import { useTriggerAnalysis } from '@/lib/hooks/useAnalysis';
import toast from 'react-hot-toast';

interface AnalyzeAllButtonProps {
  propertyId: string;
  photoIds: string[];
  disabled?: boolean;
}

export default function AnalyzeAllButton({ propertyId, photoIds, disabled }: AnalyzeAllButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const triggerAnalysis = useTriggerAnalysis();

  const handleAnalyze = async () => {
    if (photoIds.length === 0) {
      toast.error('No photos to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
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
    <button
      onClick={handleAnalyze}
      disabled={disabled || isAnalyzing || photoIds.length === 0}
      className={`
        inline-flex items-center px-4 py-2 rounded-lg font-medium
        ${isAnalyzing || disabled
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      `}
    >
      {isAnalyzing ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Analyze All ({photoIds.length})
        </>
      )}
    </button>
  );
}
