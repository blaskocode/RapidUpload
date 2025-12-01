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

  return (
    <Badge variant={config.variant} size="sm" dot={config.dot}>
      {config.label}
    </Badge>
  );
}
