'use client';

import { use, useState, useMemo } from 'react';
import { useProperty, usePropertyPhotosInfinite } from '@/lib/hooks/useProperties';
import { useAnalysisByProperty } from '@/lib/hooks/useAnalysis';
import { useRouter } from 'next/navigation';
import PhotoGallery from '@/components/PhotoGallery';
import PhotoLightbox from '@/components/PhotoLightbox';
import AnalyzeAllButton from '@/components/AnalyzeAllButton';
import GenerateReportButton from '@/components/GenerateReportButton';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading property...</div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Properties
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <div className="flex gap-6 text-gray-600">
                <span>Created: {date}</span>
                <span className="font-medium">{property.photoCount} photos</span>
              </div>
            </div>
            <button
              onClick={handleUploadClick}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Photos
            </button>
          </div>

          {/* Analysis Actions */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
            <AnalyzeAllButton
              propertyId={id}
              photoIds={allPhotos.map(p => p.photoId)}
              disabled={allPhotos.length === 0}
            />
            <GenerateReportButton
              propertyId={id}
              photoIds={analyzedPhotoIds}
              disabled={analyzedPhotoIds.length === 0}
            />
            {analyzedPhotoIds.length > 0 && (
              <span className="self-center text-sm text-gray-500">
                {analyzedPhotoIds.length} photo{analyzedPhotoIds.length !== 1 ? 's' : ''} analyzed
              </span>
            )}
          </div>
        </div>

        <PhotoGallery propertyId={id} onPhotoClick={handlePhotoClick} />

        {/* Lightbox for viewing photos */}
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

