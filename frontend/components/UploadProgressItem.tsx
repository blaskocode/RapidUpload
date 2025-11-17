'use client';

import { memo } from 'react';
import type { UploadStatus } from '@/types/upload';

interface UploadProgressItemProps {
  photoId: string;
  filename: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  onRetry?: (photoId: string) => void;
  onCancel?: (photoId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFilename(filename: string, maxLength: number = 40): string {
  if (filename.length <= maxLength) return filename;
  const extension = filename.substring(filename.lastIndexOf('.'));
  const name = filename.substring(0, filename.lastIndexOf('.'));
  const truncated = name.substring(0, maxLength - extension.length - 3);
  return `${truncated}...${extension}`;
}

const UploadProgressItem = memo(function UploadProgressItem({
  photoId,
  filename,
  size,
  progress,
  status,
  error,
  onRetry,
  onCancel,
}: UploadProgressItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'queued':
        return 'bg-gray-100 text-gray-600';
      case 'uploading':
        return 'bg-blue-100 text-blue-600 animate-pulse';
      case 'complete':
        return 'bg-green-100 text-green-600';
      case 'failed':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'complete':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="capitalize">{status}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
              {truncateFilename(filename)}
            </p>
            <p className="text-xs text-gray-500">{formatFileSize(size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'uploading' && onCancel && (
            <button
              onClick={() => onCancel(photoId)}
              className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
              aria-label="Cancel upload"
            >
              Cancel
            </button>
          )}
          {status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(photoId)}
              className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              aria-label="Retry upload"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {status === 'uploading' && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
        </div>
      )}

      {status === 'failed' && error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <p className="font-medium">Error:</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
});

export default UploadProgressItem;

