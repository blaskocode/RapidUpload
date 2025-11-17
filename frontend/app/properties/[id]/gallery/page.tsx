'use client';

import { use, useState, useMemo } from 'react';
import { useProperty, usePropertyPhotosInfinite } from '@/lib/hooks/useProperties';
import { useRouter } from 'next/navigation';
import PhotoGallery from '@/components/PhotoGallery';
import PhotoLightbox from '@/components/PhotoLightbox';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading gallery...</div>
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Property not found</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/properties/${id}`)}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Property
          </button>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {property.name} - Photo Gallery
            </h1>
            <div className="flex gap-6 text-gray-600">
              <span className="font-medium">{property.photoCount} photos</span>
            </div>
          </div>
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
          />
        )}
      </div>
    </div>
  );
}

