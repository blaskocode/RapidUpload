'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useProperties } from '@/lib/hooks/useProperties';
import { useUploadStore } from '@/stores/uploadStore';
import { uploadManager } from '@/lib/uploadManager';
import FileUploadButton from '@/components/FileUploadButton';
import BatchProgress from '@/components/BatchProgress';
import UploadQueue from '@/components/UploadQueue';
import Card from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { usePropertyStore } from '@/stores/propertyStore';
import SuccessModal from '@/components/SuccessModal';
import { useSearchParams } from 'next/navigation';

function UploadPageContent() {
  const searchParams = useSearchParams();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const selectedPropertyId = usePropertyStore((state) => state.selectedPropertyId);
  const setSelectedPropertyId = usePropertyStore((state) => state.setSelectedProperty);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'failed' | 'completed'>('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [completedUploadCount, setCompletedUploadCount] = useState(0);

  // Set property from URL parameter on mount (URL param takes precedence over localStorage)
  useEffect(() => {
    const propertyIdFromUrl = searchParams.get('propertyId');
    if (propertyIdFromUrl) {
      setSelectedPropertyId(propertyIdFromUrl);
    }
  }, [searchParams, setSelectedPropertyId]);

  const queue = useUploadStore((state) => state.queue);
  const uploadStatus = useUploadStore((state) => state.uploadStatus);
  const isUploading = useUploadStore((state) => state.isUploading);
  const autoAnalyze = useUploadStore((state) => state.autoAnalyze);
  const setAutoAnalyze = useUploadStore((state) => state.setAutoAnalyze);
  const addPhotosToQueue = useUploadStore((state) => state.addPhotosToQueue);
  const clearCompleted = useUploadStore((state) => state.clearCompleted);
  const clearAll = useUploadStore((state) => state.clearAll);
  const cancelUpload = useUploadStore((state) => state.cancelUpload);
  const retryUpload = useUploadStore((state) => state.retryUpload);

  // Clear any previous uploads when the page mounts
  useEffect(() => {
    clearAll();
  }, [clearAll]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCount = queue.length;
    let completedCount = 0;
    let failedCount = 0;
    let inProgressCount = 0;

    for (const photo of queue) {
      const status = uploadStatus[photo.photoId]?.status;
      if (status === 'complete') completedCount++;
      else if (status === 'failed') failedCount++;
      else if (status === 'uploading' || status === 'queued') inProgressCount++;
    }

    return { totalCount, completedCount, failedCount, inProgressCount };
  }, [queue, uploadStatus]);

  const handleFilesSelected = (files: File[]) => {
    if (!selectedPropertyId) {
      toast.error('Please select a property first');
      return;
    }

    addPhotosToQueue(files, selectedPropertyId);
  };

  const handleStartUpload = async () => {
    if (!selectedPropertyId) {
      toast.error('Please select a property first');
      return;
    }

    if (queue.length === 0) {
      toast.error('No files in queue');
      return;
    }

    setUploadStartTime(Date.now());
    useUploadStore.getState().startUpload();
    await uploadManager.processQueue();
  };

  const handleRetry = (photoId: string) => {
    retryUpload(photoId);
    uploadManager.retryUpload(photoId);
  };

  const handleCancel = (photoId: string) => {
    uploadManager.cancelUpload(photoId);
    cancelUpload(photoId);
  };

  const handleClearCompleted = () => {
    if (stats.completedCount >= 100) {
      if (!confirm(`Clear ${stats.completedCount} completed uploads?`)) {
        return;
      }
    }
    clearCompleted();
  };

  // Auto-start upload when files are added and property is selected
  useEffect(() => {
    if (queue.length > 0 && selectedPropertyId && !isUploading) {
      // Small delay to allow UI to update
      const timer = setTimeout(() => {
        handleStartUpload();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [queue.length, selectedPropertyId]); // Only depend on length and property

  // Show success modal when all uploads complete
  useEffect(() => {
    if (
      stats.totalCount > 0 &&
      stats.completedCount === stats.totalCount &&
      stats.inProgressCount === 0 &&
      !isUploading &&
      !showSuccessModal
    ) {
      // Capture the count at the moment uploads complete
      setCompletedUploadCount(stats.completedCount);
      setShowSuccessModal(true);
    }
  }, [stats.totalCount, stats.completedCount, stats.inProgressCount, isUploading, showSuccessModal]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Upload Photos</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Add photos to document your job site</p>
        </div>

        <div className="space-y-6">
          {/* Property Selector */}
          <Card variant="default" padding="lg">
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Select Property
            </label>
            {propertiesLoading ? (
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <div className="w-4 h-4 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
                Loading properties...
              </div>
            ) : (
              <div className="relative w-full max-w-md">
                <select
                  value={selectedPropertyId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedPropertyId(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2.5 pr-10 border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-medium appearance-none cursor-pointer transition-all duration-200 hover:border-[var(--color-primary)]/50"
                >
                  <option value="">Select a property...</option>
                  {properties?.map((property) => (
                    <option key={property.propertyId} value={property.propertyId}>
                      {property.name} ({property.photoCount} photos)
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </Card>

          {/* Auto-Analyze Toggle */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Auto-analyze uploads</span>
                  <p className="text-xs text-[var(--color-text-muted)]">Automatically detect damage and materials after upload</p>
                </div>
              </div>
              <button
                onClick={() => setAutoAnalyze(!autoAnalyze)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoAnalyze ? 'bg-[var(--color-accent)]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoAnalyze ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </Card>

          {/* File Upload Button */}
          <FileUploadButton
            onFilesSelected={handleFilesSelected}
            disabled={!selectedPropertyId || propertiesLoading}
          />

          {/* Batch Progress */}
          {stats.totalCount > 0 && (
            <BatchProgress
              totalCount={stats.totalCount}
              completedCount={stats.completedCount}
              failedCount={stats.failedCount}
              inProgressCount={stats.inProgressCount}
              onClearCompleted={handleClearCompleted}
            />
          )}

          {/* Filter Tabs */}
          {stats.totalCount > 0 && (
            <div className="flex gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] rounded-t-[var(--radius-lg)] px-2">
              {(['all', 'in-progress', 'failed', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 relative ${
                    filter === f
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                  {filter === f && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Upload Queue - Only render if there are items */}
          {queue.length > 0 && (
            <UploadQueue
              queue={queue}
              onRetry={handleRetry}
              onCancel={handleCancel}
              filter={filter}
            />
          )}
        </div>

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          propertyId={selectedPropertyId}
          totalUploaded={completedUploadCount}
          timeElapsed={uploadStartTime ? (Date.now() - uploadStartTime) / 1000 : undefined}
        />
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
          <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
          Loading upload page...
        </div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}

