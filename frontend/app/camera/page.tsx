'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCameraStore } from '@/stores/cameraStore';
import { useUploadCameraCapture } from '@/lib/hooks/useUploadCameraCapture';
import { useProperty } from '@/lib/hooks/useProperties';
import CameraCapture from '@/components/CameraCapture';
import CameraPreview from '@/components/CameraPreview';
import toast from 'react-hot-toast';

function CameraPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const propertyId = useCameraStore((state) => state.propertyId);
  const setPropertyId = useCameraStore((state) => state.setPropertyId);
  const autoAnalyze = useCameraStore((state) => state.autoAnalyze);
  const setAutoAnalyze = useCameraStore((state) => state.setAutoAnalyze);
  const currentCapture = useCameraStore((state) => state.currentCapture);
  const setCurrentCapture = useCameraStore((state) => state.setCurrentCapture);
  const updateCaptureStatus = useCameraStore((state) => state.updateCaptureStatus);
  const setCaptureError = useCameraStore((state) => state.setCaptureError);
  const acceptCapture = useCameraStore((state) => state.acceptCapture);
  const declineCapture = useCameraStore((state) => state.declineCapture);
  const clearSession = useCameraStore((state) => state.clearSession);
  const acceptedPhotoIds = useCameraStore((state) => state.acceptedPhotoIds);

  const uploadCapture = useUploadCameraCapture();
  const { data: property } = useProperty(propertyId || '');

  // Set property from URL parameter
  useEffect(() => {
    const propertyIdFromUrl = searchParams.get('propertyId');
    if (propertyIdFromUrl) {
      setPropertyId(propertyIdFromUrl);
    }
  }, [searchParams, setPropertyId]);

  // Redirect if no property selected
  useEffect(() => {
    const propertyIdFromUrl = searchParams.get('propertyId');
    if (!propertyIdFromUrl && !propertyId) {
      toast.error('Please select a property first');
      router.push('/');
    }
  }, [propertyId, searchParams, router]);

  const handleCapture = async (dataUrl: string, file: File) => {
    const captureId = crypto.randomUUID();

    // Set captured state
    setCurrentCapture({
      id: captureId,
      dataUrl,
      file,
      status: 'captured'
    });

    // Immediately start upload
    if (propertyId) {
      updateCaptureStatus('uploading');

      try {
        const result = await uploadCapture.mutateAsync({
          file,
          propertyId,
          autoAnalyze
        });

        updateCaptureStatus('uploaded', result.photoId, result.s3Key, result.s3Bucket);

        if (autoAnalyze) {
          updateCaptureStatus('analyzing', result.photoId, result.s3Key, result.s3Bucket);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setCaptureError(message);
        toast.error(message);
      }
    }
  };

  const handleAccept = () => {
    acceptCapture();
    toast.success('Photo saved');
  };

  const handleDecline = () => {
    declineCapture();
    toast.success('Photo discarded');
  };

  const handleClose = () => {
    clearSession();
    if (propertyId) {
      router.push(`/properties/${propertyId}`);
    } else {
      router.push('/');
    }
  };

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header with property name, auto-analyze toggle, and close button */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close camera"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <p className="text-white font-medium text-sm truncate max-w-[150px] sm:max-w-none">
              {property?.name || 'Loading...'}
            </p>
            {acceptedPhotoIds.length > 0 && (
              <p className="text-white/60 text-xs">
                {acceptedPhotoIds.length} photo{acceptedPhotoIds.length !== 1 ? 's' : ''} captured
              </p>
            )}
          </div>
        </div>

        {/* Auto-analyze toggle */}
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs hidden sm:block">Auto-analyze</span>
          <button
            onClick={() => setAutoAnalyze(!autoAnalyze)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoAnalyze ? 'bg-[var(--color-accent)]' : 'bg-gray-600'
            }`}
            aria-label={autoAnalyze ? 'Disable auto-analyze' : 'Enable auto-analyze'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoAnalyze ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {currentCapture ? (
          <CameraPreview
            dataUrl={currentCapture.dataUrl}
            photoId={currentCapture.photoId}
            s3Key={currentCapture.s3Key}
            s3Bucket={currentCapture.s3Bucket}
            propertyId={propertyId}
            status={currentCapture.status}
            error={currentCapture.error}
            autoAnalyze={autoAnalyze}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        ) : (
          <CameraCapture onCapture={handleCapture} />
        )}
      </div>
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading camera...
        </div>
      </div>
    }>
      <CameraPageContent />
    </Suspense>
  );
}
