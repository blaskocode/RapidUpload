'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/types/api';
import { useAnalysisByPhoto, useTriggerAnalysis } from '@/lib/hooks/useAnalysis';
import { useDeletePhoto } from '@/lib/hooks/usePhotos';
import AnalysisStatusBadge from './AnalysisStatusBadge';
import toast from 'react-hot-toast';

interface PhotoThumbnailProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  propertyId?: string;
}

export default function PhotoThumbnail({
  photo,
  index,
  onClick,
  isSelectionMode = false,
  isSelected = false,
  propertyId,
}: PhotoThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get analysis status for this photo
  const { data: analysis } = useAnalysisByPhoto(photo.photoId);
  const deletePhoto = useDeletePhoto();
  const triggerAnalysis = useTriggerAnalysis();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!propertyId || isDeleting) return;

    if (!confirm('Are you sure you want to delete this photo?')) return;

    setIsDeleting(true);
    try {
      await deletePhoto.mutateAsync({ photoId: photo.photoId, propertyId });
      toast.success('Photo deleted');
    } catch (error) {
      toast.error('Failed to delete photo');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!propertyId || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      await triggerAnalysis.mutateAsync({
        propertyId,
        photoIds: [photo.photoId],
      });
      toast.success('Analysis started');
    } catch (error) {
      toast.error('Failed to start analysis');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Check if photo can be analyzed (not already analyzing or completed)
  const canAnalyze = !analysis || analysis.status === 'failed';
  const isAnalyzingStatus = analysis?.status === 'pending' || analysis?.status === 'processing';

  // Construct S3 URL
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate filename
  const truncateFilename = (filename: string, maxLength: number = 25): string => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension!.length - 4);
    return `${truncated}...${extension}`;
  };

  if (!photoUrl) {
    return (
      <div className="relative aspect-square bg-[var(--color-bg-tertiary)] rounded-[var(--radius-lg)] overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
          {photo.status === 'pending' ? (
            <>
              <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">Failed</span>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleContainerClick = () => {
    // Don't open lightbox for failed images (unless in selection mode)
    if (hasError && !isSelectionMode) {
      return;
    }
    onClick();
  };

  return (
    <div
      className={`relative aspect-square bg-[var(--color-bg-tertiary)] rounded-[var(--radius-lg)] overflow-hidden group ${
        isSelected ? 'ring-2 ring-[var(--color-primary)] ring-offset-2' : ''
      } ${isDeleting ? 'opacity-50 pointer-events-none' : ''} ${
        hasError && !isSelectionMode ? 'cursor-default' : 'cursor-pointer'
      }`}
      onClick={handleContainerClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleContainerClick();
        }
      }}
      aria-label={isSelectionMode ? `Select photo ${photo.filename}` : `View photo ${photo.filename}`}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-[var(--color-bg-tertiary)] animate-pulse" />
      )}

      {/* Image */}
      {!hasError && (
        <Image
          src={photoUrl}
          alt={photo.filename}
          fill
          className={`object-cover transition-all duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${isHovered && !isSelectionMode ? 'scale-105' : 'scale-100'}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-tertiary)] gap-2 z-10">
          <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-[var(--color-text-muted)]">Failed to load</span>
          {/* Delete button for failed images */}
          {!isSelectionMode && propertyId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDelete(e);
              }}
              className="mt-2 px-3 py-1.5 bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] text-white text-xs font-medium rounded-[var(--radius-md)] transition-colors flex items-center gap-1.5 z-20 relative"
              title="Delete photo"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}

      {/* Selection checkbox */}
      {isSelectionMode && (
        <div className="absolute top-2 left-2 z-20">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : 'bg-white/80 border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}>
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Analysis status badge */}
      {!isLoading && !hasError && analysis && !isSelectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <AnalysisStatusBadge analysis={analysis} compact />
        </div>
      )}

      {/* Action buttons (shown on hover when not in selection mode) */}
      {!isSelectionMode && isHovered && !isLoading && !hasError && propertyId && (
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          {/* Analyze button - only show if can analyze */}
          {(canAnalyze || isAnalyzingStatus) && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isAnalyzingStatus}
              className={`p-1.5 text-white rounded-full transition-colors ${
                isAnalyzing || isAnalyzingStatus
                  ? 'bg-[var(--color-primary)]/80 cursor-not-allowed'
                  : 'bg-black/60 hover:bg-[var(--color-primary)]'
              }`}
              title={isAnalyzingStatus ? 'Analysis in progress' : 'Analyze photo'}
            >
              {isAnalyzing || isAnalyzingStatus ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
            </button>
          )}
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 bg-black/60 hover:bg-[var(--color-error)] text-white rounded-full transition-colors"
            title="Delete photo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Hover overlay with metadata */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-200 ${
        isHovered && !isLoading && !hasError && !isSelectionMode ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-white text-xs font-medium truncate mb-1" title={photo.filename}>
            {truncateFilename(photo.filename)}
          </div>
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <span>{formatDate(photo.uploadedAt)}</span>
            {photo.fileSize != null && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/50" />
                <span>{formatFileSize(photo.fileSize)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selection overlay */}
      {isSelectionMode && isSelected && (
        <div className="absolute inset-0 bg-[var(--color-primary)]/20 pointer-events-none" />
      )}

      {/* Focus ring */}
      <div className="absolute inset-0 rounded-[var(--radius-lg)] ring-2 ring-[var(--color-primary)] ring-offset-2 opacity-0 group-focus-visible:opacity-100 pointer-events-none" />
    </div>
  );
}
