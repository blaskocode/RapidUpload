'use client';

import { AnalysisResult } from '@/types/api';

interface AnalysisStatusBadgeProps {
  analysis: AnalysisResult | null | undefined;
  compact?: boolean;
}

export default function AnalysisStatusBadge({ analysis, compact = false }: AnalysisStatusBadgeProps) {
  if (!analysis) {
    return compact ? null : (
      <span className="text-xs text-gray-400">Not analyzed</span>
    );
  }

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing...' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Analyzed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
  };

  const config = statusConfig[analysis.status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
      {analysis.lowConfidence && analysis.status === 'completed' && (
        <span className="ml-1" title="Contains low confidence detections">!!!</span>
      )}
    </span>
  );
}
