'use client';

import { useState } from 'react';
import { useGenerateReport } from '@/lib/hooks/useAnalysis';
import toast from 'react-hot-toast';

interface GenerateReportButtonProps {
  propertyId: string;
  photoIds?: string[];
  disabled?: boolean;
}

export default function GenerateReportButton({ propertyId, photoIds, disabled }: GenerateReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateReport = useGenerateReport();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReport.mutateAsync({
        propertyId,
        photoIds,
      });

      toast.success(`Report generated with ${result.photosIncluded} photos`);

      // Open download URL in new tab
      window.open(result.downloadUrl, '_blank');

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate report';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={disabled || isGenerating}
      className={`
        inline-flex items-center px-4 py-2 rounded-lg font-medium
        ${isGenerating || disabled
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white'
        }
      `}
    >
      {isGenerating ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate PDF Report
        </>
      )}
    </button>
  );
}
