'use client';

import { useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface BatchProgressProps {
  totalCount: number;
  completedCount: number;
  failedCount: number;
  inProgressCount: number;
  avgUploadSpeed?: number; // bytes per second
  onClearCompleted?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return 'Less than a minute';
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) {
    return 'About 1 minute remaining';
  }
  return `About ${minutes} minutes remaining`;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
}

export default function BatchProgress({
  totalCount,
  completedCount,
  failedCount,
  inProgressCount,
  avgUploadSpeed = 0,
  onClearCompleted,
  onPause,
  onResume,
  isPaused = false,
}: BatchProgressProps) {
  const progress = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  }, [totalCount, completedCount]);

  const timeRemaining = useMemo(() => {
    if (inProgressCount === 0 || avgUploadSpeed === 0 || totalCount === 0) {
      return null;
    }

    const remainingFiles = totalCount - completedCount - failedCount;
    if (remainingFiles <= 0) return null;

    const estimatedBytesPerFile = avgUploadSpeed > 0 ? (avgUploadSpeed * 10) : 1024 * 1024;
    const remainingBytes = remainingFiles * estimatedBytesPerFile;
    const estimatedSeconds = remainingBytes / avgUploadSpeed;

    return formatTimeRemaining(estimatedSeconds);
  }, [inProgressCount, avgUploadSpeed, totalCount, completedCount, failedCount]);

  if (totalCount === 0) {
    return (
      <Card variant="default" padding="lg">
        <p className="text-[var(--color-text-muted)] text-center">No uploads in queue</p>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Upload Progress</h3>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              <span className="text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-success)]">{completedCount}</span>
                {' / '}
                <span className="font-medium text-[var(--color-text-primary)]">{totalCount}</span>
              </span>
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-error)]" />
                <span className="font-medium text-[var(--color-error)]">{failedCount} failed</span>
              </span>
            )}
            {inProgressCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                <span className="text-[var(--color-text-secondary)]">{inProgressCount} uploading</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inProgressCount > 0 && (
            <>
              {isPaused ? (
                <Button variant="primary" size="sm" onClick={onResume}>
                  Resume
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={onPause}>
                  Pause
                </Button>
              )}
            </>
          )}
          {completedCount > 0 && onClearCompleted && (
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>
              Clear Completed
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="w-full bg-[var(--color-bg-tertiary)] rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="text-[var(--color-text-secondary)] font-medium">{progress}% complete</span>
          {avgUploadSpeed > 0 && (
            <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {formatSpeed(avgUploadSpeed)}
            </span>
          )}
        </div>
      </div>

      {timeRemaining && (
        <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeRemaining}
        </p>
      )}
    </Card>
  );
}
