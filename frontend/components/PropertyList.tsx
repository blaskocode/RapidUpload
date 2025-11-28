'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useProperties, usePropertyPhotos, useDeleteProperty } from '@/lib/hooks/useProperties';
import { useRouter } from 'next/navigation';
import type { Property } from '@/types/api';
import Card from '@/components/ui/Card';
import EmptyState, { EmptyStateIcons } from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

function PropertyThumbnail({ propertyId, photoCount }: { propertyId: string; photoCount: number }) {
  const [imageError, setImageError] = useState(false);
  // Always fetch first photo - photoCount may be inaccurate due to legacy data
  const { data: photosData, isLoading } = usePropertyPhotos(propertyId, 1);

  const firstPhoto = photosData?.items?.[0];
  const hasValidPhoto = firstPhoto && (firstPhoto.status === 'uploaded' || firstPhoto.status === null) && !imageError;
  // Use actual photo count from response if available, fallback to prop
  const actualPhotoCount = photosData?.items?.length ? Math.max(photoCount, 1) : photoCount;

  if (isLoading) {
    return (
      <div className="h-40 bg-[var(--color-bg-tertiary)] animate-pulse" />
    );
  }

  // Show empty state only if we confirmed no photos exist (not just photoCount === 0)
  if (!hasValidPhoto && (!photosData?.items || photosData.items.length === 0)) {
    return (
      <div className="h-40 bg-gradient-to-br from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-[var(--color-text-muted)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs">Add photos</span>
        </div>
      </div>
    );
  }

  if (!hasValidPhoto) {
    return (
      <div className="h-40 bg-gradient-to-br from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">{actualPhotoCount} photos</span>
        </div>
      </div>
    );
  }

  const photoUrl = `https://${firstPhoto.s3Bucket}.s3.us-east-1.amazonaws.com/${firstPhoto.s3Key}`;

  return (
    <div className="h-40 relative overflow-hidden bg-[var(--color-bg-tertiary)]">
      <Image
        src={photoUrl}
        alt={firstPhoto.filename}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        onError={() => setImageError(true)}
      />
      {/* Photo count badge */}
      <div className="absolute bottom-2 right-2 bg-[var(--color-text-primary)]/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-[var(--radius-sm)] flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {photoCount}
      </div>
    </div>
  );
}

function PropertyCard({ property, onDelete }: { property: Property; onDelete: (property: Property) => void }) {
  const router = useRouter();
  const date = new Date(property.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/upload?propertyId=${property.propertyId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(property);
  };

  return (
    <Card
      variant="interactive"
      padding="none"
      onClick={() => router.push(`/properties/${property.propertyId}`)}
      className="overflow-hidden group"
    >
      {/* Photo thumbnail */}
      <PropertyThumbnail propertyId={property.propertyId} photoCount={property.photoCount} />

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
              {property.name}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{date}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleUploadClick}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-[var(--radius-md)] transition-all"
              title="Upload photos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-[var(--radius-md)] transition-all"
              title="Delete project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      <div className="h-40 bg-[var(--color-bg-tertiary)] animate-pulse" />
      <div className="p-4">
        <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-1/3 animate-pulse" />
      </div>
    </Card>
  );
}

export default function PropertyList() {
  const { data: properties, isLoading, error } = useProperties();
  const deleteProperty = useDeleteProperty();
  const router = useRouter();
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProperty.mutateAsync(propertyToDelete.propertyId);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Failed to delete property:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setPropertyToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <LoadingSkeleton key={i} />
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
            <p className="font-medium text-[var(--color-error)]">Error loading projects</p>
            <p className="text-sm mt-1 text-red-700">
              {(error as Error)?.message || 'Failed to fetch projects. Please try again.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <Card variant="default" padding="none">
        <EmptyState
          icon={EmptyStateIcons.folder}
          title="No projects yet"
          description="Create your first project to start documenting job sites with photos."
          action={
            <Button
              variant="primary"
              onClick={() => {
                // Trigger the create property modal
                const event = new CustomEvent('openPropertyForm');
                window.dispatchEvent(event);
              }}
            >
              Create Project
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {properties.map((property) => (
          <PropertyCard key={property.propertyId} property={property} onDelete={handleDeleteClick} />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!propertyToDelete}
        onClose={handleCancelDelete}
        title="Delete Project"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)]">
            Are you sure you want to delete <span className="font-semibold text-[var(--color-text-primary)]">{propertyToDelete?.name}</span>?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            This will permanently delete the project, all {propertyToDelete?.photoCount || 0} photos, and any analysis data. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
