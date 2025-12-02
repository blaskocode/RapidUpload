'use client';

import { use, useState, useMemo } from 'react';
import { useProperty, usePropertyPhotosInfinite } from '@/lib/hooks/useProperties';
import { useAnalysisByProperty } from '@/lib/hooks/useAnalysis';
import { useRouter } from 'next/navigation';
import PhotoGallery from '@/components/PhotoGallery';
import PhotoLightbox from '@/components/PhotoLightbox';
import AnalyzeAllButton from '@/components/AnalyzeAllButton';
import GenerateReportButton from '@/components/GenerateReportButton';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { Photo } from '@/types/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: property, isLoading: propertyLoading, error: propertyError } = useProperty(id);
  const { data: photosData } = usePropertyPhotosInfinite(id, 50);
  const { data: analysisData } = useAnalysisByProperty(id);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Flatten all pages into a single array for lightbox (only uploaded photos)
  // Note: We treat null/undefined status as 'uploaded' for backwards compatibility
  const allPhotos = useMemo(() => {
    const all = photosData?.pages.flatMap((page) => page.items) ?? [];
    return all.filter(photo =>
      photo.status === 'uploaded' || photo.status === null || photo.status === undefined
    );
  }, [photosData]);

  // Get photo IDs with completed analysis for report generation
  const analyzedPhotoIds = useMemo(() => {
    if (!analysisData?.pages) return [];
    const allAnalysis = analysisData.pages.flatMap((page) => page.items);
    return allAnalysis
      .filter((a) => a.status === 'completed')
      .map((a) => a.photoId);
  }, [analysisData]);

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
          <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
          Loading property...
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <Card variant="default" padding="lg" className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-[var(--color-error-light)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--color-error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[var(--color-error)] text-lg font-semibold mb-4">Property not found</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Back to Properties
          </Button>
        </Card>
      </div>
    );
  }

  const date = new Date(property.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleUploadClick = () => {
    // Set the property in the store and navigate to upload page
    router.push(`/upload?propertyId=${id}`);
  };

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhotoIndex(index);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedPhotoIndex(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </button>

        <Card variant="default" padding="lg" className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">{property.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {date}
                </span>
                <Badge variant="default">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {property.photoCount} photos
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/camera?propertyId=${id}`)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Camera
              </Button>
              <Button
                variant="primary"
                onClick={handleUploadClick}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Upload Photos
              </Button>
            </div>
          </div>

          {/* Analysis Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-[var(--color-border)]">
            <AnalyzeAllButton
              propertyId={id}
            />
            <GenerateReportButton
              propertyId={id}
              photoIds={analyzedPhotoIds}
              disabled={analyzedPhotoIds.length === 0}
            />
            {analyzedPhotoIds.length > 0 && (
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {analyzedPhotoIds.length} photo{analyzedPhotoIds.length !== 1 ? 's' : ''} analyzed
              </span>
            )}
          </div>
        </Card>

        <PhotoGallery propertyId={id} onPhotoClick={handlePhotoClick} />

        {/* Lightbox for viewing photos */}
        {isLightboxOpen && selectedPhotoIndex !== null && (
          <PhotoLightbox
            photos={allPhotos}
            initialIndex={selectedPhotoIndex}
            isOpen={isLightboxOpen}
            onClose={handleCloseLightbox}
            propertyId={id}
          />
        )}
      </div>
    </div>
  );
}

