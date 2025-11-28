'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { usePropertyPhotosInfinite } from '@/lib/hooks/useProperties';
import { useBatchDeletePhotos } from '@/lib/hooks/usePhotos';
import { useTriggerAnalysis } from '@/lib/hooks/useAnalysis';
import PhotoThumbnail from './PhotoThumbnail';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState, { EmptyStateIcons } from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';
import type { Photo } from '@/types/api';

interface PhotoGalleryProps {
  propertyId: string;
  onPhotoClick: (photo: Photo, index: number) => void;
}

export default function PhotoGallery({ propertyId, onPhotoClick }: PhotoGalleryProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const batchDeletePhotos = useBatchDeletePhotos();
  const triggerAnalysis = useTriggerAnalysis();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = usePropertyPhotosInfinite(propertyId, 50);

  // Flatten all pages into a single array and filter to only show uploaded photos
  const photos = useMemo(() => {
    const allPhotos = data?.pages.flatMap((page) => page.items) ?? [];
    const uploadedPhotos = allPhotos.filter(photo =>
      photo.status === 'uploaded' || photo.status === null || photo.status === undefined
    );
    return uploadedPhotos;
  }, [data]);

  // Exit selection mode when photos change
  useEffect(() => {
    if (isSelectionMode) {
      // Remove any selected IDs that no longer exist
      const validIds = new Set(photos.map(p => p.photoId));
      setSelectedPhotoIds(prev => {
        const newSet = new Set<string>();
        prev.forEach(id => {
          if (validIds.has(id)) newSet.add(id);
        });
        return newSet;
      });
    }
  }, [photos, isSelectionMode]);

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedPhotoIds(new Set());
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPhotoIds(new Set(photos.map(p => p.photoId)));
  };

  const deselectAll = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotoIds.size === 0) return;

    setIsDeleting(true);
    try {
      const result = await batchDeletePhotos.mutateAsync({
        photoIds: Array.from(selectedPhotoIds),
        propertyId,
      });
      toast.success(`Deleted ${result.deletedCount} photos`);
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to delete photos');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedPhotoIds.size === 0) return;

    setIsAnalyzing(true);
    try {
      await triggerAnalysis.mutateAsync({
        propertyId,
        photoIds: Array.from(selectedPhotoIds),
      });
      toast.success(`Analysis started for ${selectedPhotoIds.size} photos`);
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      toast.error('Failed to start analysis');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePhotoClick = (photo: Photo, index: number) => {
    if (isSelectionMode) {
      togglePhotoSelection(photo.photoId);
    } else {
      onPhotoClick(photo, index);
    }
  };

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: '400px',
        threshold: 0.1,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, photos.length, data?.pages.length]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-[var(--color-bg-tertiary)] rounded-[var(--radius-lg)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="default" className="border-[var(--color-error)] bg-[var(--color-error-light)]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 text-[var(--color-error)]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[var(--color-error)]">Error loading photos</p>
            <p className="text-sm mt-1 text-red-700">{error.message}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card variant="default" padding="none">
        <EmptyState
          icon={EmptyStateIcons.photo}
          title="No photos yet"
          description="Upload photos to document this job site and start AI analysis."
        />
      </Card>
    );
  }

  return (
    <div className="w-full">
      {/* Selection toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <Button
            variant={isSelectionMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={toggleSelectionMode}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          >
            {isSelectionMode ? 'Cancel' : 'Select'}
          </Button>

          {isSelectionMode && (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </>
          )}
        </div>

        {isSelectionMode && selectedPhotoIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {selectedPhotoIds.size} selected
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAnalyzeSelected}
              disabled={isAnalyzing}
              isLoading={isAnalyzing}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Selected'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isDeleting || isAnalyzing}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.photoId}
            photo={photo}
            index={index}
            onClick={() => handlePhotoClick(photo, index)}
            isSelectionMode={isSelectionMode}
            isSelected={selectedPhotoIds.has(photo.photoId)}
            propertyId={propertyId}
          />
        ))}
      </div>

      {/* Infinite scroll trigger and manual load button */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex flex-col items-center justify-center gap-4 py-8 mt-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading more photos...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
              >
                Load More Photos
              </Button>
              <p className="text-sm text-[var(--color-text-muted)]">
                Showing {photos.length} photos
              </p>
            </div>
          )}
        </div>
      )}

      {/* Photo count footer when all loaded */}
      {!hasNextPage && photos.length > 0 && (
        <div className="text-center py-6 text-sm text-[var(--color-text-muted)]">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'} total
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Photos"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)]">
            Are you sure you want to delete <span className="font-semibold text-[var(--color-text-primary)]">{selectedPhotoIds.size} photos</span>?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            This will permanently delete the selected photos and any associated analysis data. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedPhotoIds.size} Photos`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
