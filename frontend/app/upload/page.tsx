'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useProperties } from '@/lib/hooks/useProperties';
import { useUploadStore } from '@/stores/uploadStore';
import { uploadManager } from '@/lib/uploadManager';
import FileUploadButton from '@/components/FileUploadButton';
import BatchProgress from '@/components/BatchProgress';
import UploadQueue from '@/components/UploadQueue';
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
  const addPhotosToQueue = useUploadStore((state) => state.addPhotosToQueue);
  const clearCompleted = useUploadStore((state) => state.clearCompleted);
  const cancelUpload = useUploadStore((state) => state.cancelUpload);
  const retryUpload = useUploadStore((state) => state.retryUpload);

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
      setShowSuccessModal(true);
    }
  }, [stats.totalCount, stats.completedCount, stats.inProgressCount, isUploading, showSuccessModal]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Photos</h1>

        <div className="space-y-6">
          {/* Property Selector */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Property
            </label>
            {propertiesLoading ? (
              <div className="text-gray-500">Loading properties...</div>
            ) : (
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedPropertyId(e.target.value);
                  }
                }}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="">Select a property...</option>
                {properties?.map((property) => (
                  <option key={property.propertyId} value={property.propertyId}>
                    {property.name} ({property.photoCount} photos)
                  </option>
                ))}
              </select>
            )}
          </div>

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
            <div className="flex gap-2 border-b border-gray-200">
              {(['all', 'in-progress', 'failed', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filter === f
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
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
          totalUploaded={stats.completedCount}
          timeElapsed={uploadStartTime ? (Date.now() - uploadStartTime) / 1000 : undefined}
        />
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading upload page...</div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}

