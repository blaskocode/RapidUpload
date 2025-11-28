'use client';

import { useEffect, useRef, useMemo } from 'react';
import { usePropertyPhotosInfinite } from '@/lib/hooks/useProperties';
import PhotoThumbnail from './PhotoThumbnail';
import type { Photo } from '@/types/api';

interface PhotoGalleryProps {
  propertyId: string;
  onPhotoClick: (photo: Photo, index: number) => void;
}

export default function PhotoGallery({ propertyId, onPhotoClick }: PhotoGalleryProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = usePropertyPhotosInfinite(propertyId, 50);

  // Flatten all pages into a single array and filter to only show uploaded photos
  // Note: We treat null/undefined status as 'uploaded' for backwards compatibility
  // with photos added before status tracking was implemented
  const photos = useMemo(() => {
    const allPhotos = data?.pages.flatMap((page) => page.items) ?? [];
    const uploadedPhotos = allPhotos.filter(photo =>
      photo.status === 'uploaded' || photo.status === null || photo.status === undefined
    );
    
    // Debug logging to help diagnose issues
    if (allPhotos.length > 0 && uploadedPhotos.length !== allPhotos.length) {
      const statusCounts = allPhotos.reduce((acc, photo) => {
        acc[photo.status] = (acc[photo.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`PhotoGallery: ${uploadedPhotos.length}/${allPhotos.length} photos have 'uploaded' status. Status breakdown:`, statusCounts);
    }
    
    return uploadedPhotos;
  }, [data]);

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Debug logging
    console.log('PhotoGallery pagination state:', {
      hasNextPage,
      isFetchingNextPage,
      photosLoaded: photos.length,
      pagesLoaded: data?.pages.length || 0,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('IntersectionObserver: Loading next page...');
          fetchNextPage();
        }
      },
      {
        rootMargin: '400px', // Start loading 400px before reaching the bottom
        threshold: 0.1, // Trigger when 10% of the element is visible
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-12 text-center">
        <p className="text-red-600 text-lg mb-2">Error loading photos</p>
        <p className="text-gray-500 text-sm">{error.message}</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-600 text-lg mb-2">No photos yet</p>
        <p className="text-gray-500 text-sm">Upload photos to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.photoId}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
          />
        ))}
      </div>

      {/* Intersection observer target and manual load more button */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="h-32 flex flex-col items-center justify-center gap-4 py-8">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm">Loading more photos...</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  console.log('Manual load more clicked');
                  fetchNextPage();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Load More Photos
              </button>
              <p className="text-sm text-gray-500">
                Showing {photos.length} photos
                {data?.pages && data.pages.length > 0 && (
                  <span> (loaded {data.pages.reduce((sum, page) => sum + page.items.length, 0)} total from backend)</span>
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

