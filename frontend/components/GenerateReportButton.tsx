'use client';

import { useState } from 'react';
import { useGenerateReport } from '@/lib/hooks/useAnalysis';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

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
    <Button
      variant="primary"
      onClick={handleGenerate}
      disabled={disabled || isGenerating}
      isLoading={isGenerating}
      leftIcon={
        !isGenerating ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ) : undefined
      }
    >
      {isGenerating ? 'Generating...' : 'Generate Report'}
    </Button>
  );
}
