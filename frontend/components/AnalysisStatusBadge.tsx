'use client';

import { AnalysisResult } from '@/types/api';
import Badge from '@/components/ui/Badge';

interface AnalysisStatusBadgeProps {
  analysis: AnalysisResult | null | undefined;
  compact?: boolean;
}

export default function AnalysisStatusBadge({ analysis, compact = false }: AnalysisStatusBadgeProps) {
  if (!analysis) {
    return compact ? null : (
      <span className="text-xs text-[var(--color-text-muted)]">Not analyzed</span>
    );
  }

  const statusConfig = {
    pending: { variant: 'warning' as const, label: 'Pending', dot: true },
    processing: { variant: 'info' as const, label: 'Analyzing...', dot: true },
    completed: { variant: 'success' as const, label: 'Analyzed', dot: false },
    failed: { variant: 'error' as const, label: 'Failed', dot: false },
  };

  const config = statusConfig[analysis.status] || statusConfig.pending;

  // Show warning for low confidence results
  const showWarning = analysis.lowConfidence && analysis.status === 'completed';

  return (
    <Badge variant={showWarning ? 'warning' : config.variant} size="sm" dot={config.dot}>
      {config.label}
      {showWarning && (
        <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20" aria-label="Contains low confidence detections">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
    </Badge>
  );
}
