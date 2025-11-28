'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/types/api';
import { useAnalysisByPhoto } from '@/lib/hooks/useAnalysis';
import AnalysisStatusBadge from './AnalysisStatusBadge';

interface PhotoThumbnailProps {
  photo: Photo;
  index: number;
  onClick: () => void;
}

export default function PhotoThumbnail({ photo, index, onClick }: PhotoThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Get analysis status for this photo
  const { data: analysis } = useAnalysisByPhoto(photo.photoId);

  // Construct S3 URL
  // Note: We treat null/undefined status as 'uploaded' for backwards compatibility
  const isUploaded = photo.status === 'uploaded' || photo.status === null || photo.status === undefined;
  const photoUrl = isUploaded
    ? `https://${photo.s3Bucket}.s3.us-east-1.amazonaws.com/${photo.s3Key}`
    : null;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format upload date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate filename if too long
  const truncateFilename = (filename: string, maxLength: number = 30): string => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension!.length - 4);
    return `${truncated}...${extension}`;
  };

  if (!photoUrl) {
    return (
      <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-gray-400 text-sm text-center px-2">
          {photo.status === 'pending' ? 'Uploading...' : 'Failed'}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setShowMetadata(true)}
      onMouseLeave={() => setShowMetadata(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View photo ${photo.filename}`}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Image */}
      {!hasError && (
        <Image
          src={photoUrl}
          alt={photo.filename}
          fill
          className={`object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="text-gray-400 text-sm text-center px-2">
            Failed to load
          </div>
        </div>
      )}

      {/* Analysis status badge */}
      {!isLoading && !hasError && analysis && (
        <div className="absolute top-2 right-2 z-10">
          <AnalysisStatusBadge analysis={analysis} compact />
        </div>
      )}

      {/* Metadata overlay on hover */}
      {showMetadata && !isLoading && !hasError && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-end p-3 transition-opacity duration-200">
          <div className="text-white text-xs w-full">
            <div className="font-medium truncate mb-1" title={photo.filename}>
              {truncateFilename(photo.filename)}
            </div>
            <div className="text-gray-300 text-xs">
              {formatDate(photo.uploadedAt)}
            </div>
            {photo.fileSize != null && (
              <div className="text-gray-300 text-xs">
                {formatFileSize(photo.fileSize)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

