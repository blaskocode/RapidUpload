'use client';

import { useMemo } from 'react';

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

    // Estimate remaining bytes (rough estimate: assume average file size)
    // This is a simplified calculation - in a real app, you'd track actual remaining bytes
    const remainingFiles = totalCount - completedCount - failedCount;
    if (remainingFiles <= 0) return null;

    // Estimate: assume average file size based on completed uploads
    // For simplicity, we'll use a rough estimate
    const estimatedBytesPerFile = avgUploadSpeed > 0 ? (avgUploadSpeed * 10) : 1024 * 1024; // Rough estimate
    const remainingBytes = remainingFiles * estimatedBytesPerFile;
    const estimatedSeconds = remainingBytes / avgUploadSpeed;

    return formatTimeRemaining(estimatedSeconds);
  }, [inProgressCount, avgUploadSpeed, totalCount, completedCount, failedCount]);

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No uploads in queue</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upload Progress</h3>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-600">
              <span className="font-medium text-green-600">{completedCount}</span>
              {' / '}
              <span className="font-medium text-gray-900">{totalCount}</span>
              {' uploaded'}
            </span>
            {failedCount > 0 && (
              <span className="text-red-600 font-medium">{failedCount} failed</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inProgressCount > 0 && (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Pause
                </button>
              )}
            </>
          )}
          {completedCount > 0 && onClearCompleted && (
            <button
              onClick={onClearCompleted}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
          <span>{progress}% complete</span>
          {avgUploadSpeed > 0 && (
            <span className="text-gray-500">{formatSpeed(avgUploadSpeed)}</span>
          )}
        </div>
      </div>

      {timeRemaining && (
        <p className="text-sm text-gray-600">{timeRemaining}</p>
      )}
    </div>
  );
}

