'use client';

import { use, useState, useMemo } from 'react';
import { useProperty, usePropertyPhotosInfinite } from '@/lib/hooks/useProperties';
import { useRouter } from 'next/navigation';
import PhotoGallery from '@/components/PhotoGallery';
import PhotoLightbox from '@/components/PhotoLightbox';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { Photo } from '@/types/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GalleryPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: property, isLoading: propertyLoading, error: propertyError } = useProperty(id);
  const { data: photosData } = usePropertyPhotosInfinite(id, 50);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Flatten all pages into a single array for lightbox
  const allPhotos = useMemo(() => {
    return photosData?.pages.flatMap((page) => page.items) ?? [];
  }, [photosData]);

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhotoIndex(index);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedPhotoIndex(null);
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
          <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
          Loading gallery...
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

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/properties/${id}`)}
            className="mb-4 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Property
          </button>
          <Card variant="default" padding="lg">
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">
              {property.name} - Photo Gallery
            </h1>
            <Badge variant="default">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {property.photoCount} photos
            </Badge>
          </Card>
        </div>

        {/* Photo Gallery */}
        <PhotoGallery propertyId={id} onPhotoClick={handlePhotoClick} />

        {/* Lightbox */}
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

