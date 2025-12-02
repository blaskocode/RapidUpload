'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAnalysisByPhoto, useTriggerAnalysis, useUpdateDetectionVolume } from '@/lib/hooks/useAnalysis';
import { useDeletePhoto } from '@/lib/hooks/usePhotos';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import AnalysisResultsPanel from './AnalysisResultsPanel';
import AnalysisStatusBadge from './AnalysisStatusBadge';
import toast from 'react-hot-toast';

interface CameraPreviewProps {
  dataUrl: string;
  photoId?: string;
  s3Key?: string;
  s3Bucket?: string;
  propertyId: string;
  status: 'captured' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
  error?: string;
  autoAnalyze: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function CameraPreview({
  dataUrl,
  photoId,
  s3Key,
  s3Bucket,
  propertyId,
  status,
  error,
  autoAnalyze,
  onAccept,
  onDecline
}: CameraPreviewProps) {
  const [imageRect, setImageRect] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const { data: analysis } = useAnalysisByPhoto(photoId);
  const triggerAnalysis = useTriggerAnalysis();
  const updateVolume = useUpdateDetectionVolume();
  const deletePhoto = useDeletePhoto();

  // Determine the image source - use S3 URL if uploaded, otherwise use data URL
  const imageUrl = s3Bucket && s3Key
    ? `https://${s3Bucket}.s3.us-east-1.amazonaws.com/${s3Key}`
    : dataUrl;

  const handleAnalyze = async () => {
    if (!photoId || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      await triggerAnalysis.mutateAsync({
        propertyId,
        photoIds: [photoId],
      });
      toast.success('Analysis started');
    } catch (err) {
      toast.error('Failed to start analysis');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVolumeUpdate = async (detectionIndex: number, volume: number) => {
    if (!analysis?.analysisId) return;
    try {
      await updateVolume.mutateAsync({
        analysisId: analysis.analysisId,
        detectionIndex,
        userVolumeOverride: volume,
      });
      toast.success('Volume updated');
    } catch (err) {
      toast.error('Failed to update volume');
      console.error('Volume update error:', err);
    }
  };

  const handleDecline = async () => {
    // Delete the photo from backend if it was uploaded
    if (photoId) {
      try {
        await deletePhoto.mutateAsync({ photoId, propertyId });
      } catch (err) {
        console.error('Failed to delete photo:', err);
        // Continue with decline even if delete fails - user wants to discard
      }
    }
    onDecline();
  };

  const isUploading = status === 'captured' || status === 'uploading';
  const isAnalysisInProgress = analysis?.status === 'pending' || analysis?.status === 'processing';
  const isAnalysisComplete = analysis?.status === 'completed';
  const canAccept = status === 'uploaded' || status === 'analyzed' || status === 'failed' ||
    (photoId && !isUploading); // Can accept if photo is uploaded even if analysis fails

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <h2 className="text-white font-semibold">Review Photo</h2>
        <div className="flex items-center gap-2">
          {photoId && <AnalysisStatusBadge analysis={analysis} />}
        </div>
      </div>

      {/* Image container */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        <div className="relative max-w-full max-h-full" ref={imageContainerRef}>
          <Image
            src={imageUrl}
            alt="Captured photo"
            width={1920}
            height={1080}
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
            priority
            onLoad={(e) => {
              const img = e.currentTarget;
              const containerWidth = img.clientWidth;
              const containerHeight = img.clientHeight;
              const naturalWidth = img.naturalWidth;
              const naturalHeight = img.naturalHeight;
              const containerAspect = containerWidth / containerHeight;
              const imageAspect = naturalWidth / naturalHeight;

              let renderedWidth: number;
              let renderedHeight: number;
              let offsetX: number;
              let offsetY: number;

              if (imageAspect > containerAspect) {
                renderedWidth = containerWidth;
                renderedHeight = containerWidth / imageAspect;
                offsetX = 0;
                offsetY = (containerHeight - renderedHeight) / 2;
              } else {
                renderedHeight = containerHeight;
                renderedWidth = containerHeight * imageAspect;
                offsetX = (containerWidth - renderedWidth) / 2;
                offsetY = 0;
              }

              setImageRect({
                width: renderedWidth,
                height: renderedHeight,
                offsetX,
                offsetY
              });
            }}
          />
          {/* Bounding box overlay */}
          {isAnalysisComplete && analysis?.detections && imageRect.width > 0 && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: imageRect.offsetY,
                left: imageRect.offsetX,
                width: imageRect.width,
                height: imageRect.height
              }}
            >
              <BoundingBoxOverlay
                detections={analysis.detections}
                imageWidth={imageRect.width}
                imageHeight={imageRect.height}
              />
            </div>
          )}
        </div>

        {/* Upload/Analysis status overlay */}
        {(isUploading || isAnalysisInProgress) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">
                {isUploading ? 'Uploading...' : 'Analyzing...'}
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === 'failed' && error && (
          <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-lg">
            <p className="font-medium">Upload failed</p>
            <p className="text-sm text-white/80">{error}</p>
          </div>
        )}
      </div>

      {/* Analysis results panel */}
      {isAnalysisComplete && analysis && (
        <div className="max-h-[30vh] overflow-y-auto bg-white/10 backdrop-blur-sm mx-4 rounded-t-lg">
          <AnalysisResultsPanel
            analysis={analysis}
            onVolumeUpdate={handleVolumeUpdate}
            isUpdatingVolume={updateVolume.isPending}
          />
        </div>
      )}

      {/* Manual analyze button */}
      {photoId && !autoAnalyze && !analysis && !isUploading && (
        <div className="px-4 py-2 bg-black/80">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3 bg-[var(--color-accent)] text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze Photo
              </>
            )}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 px-4 py-4 bg-black/80 backdrop-blur-sm">
        <button
          onClick={handleDecline}
          disabled={isUploading || deletePhoto.isPending}
          className="flex-1 py-4 bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {deletePhoto.isPending ? 'Deleting...' : 'Decline'}
        </button>
        <button
          onClick={onAccept}
          disabled={!canAccept || isUploading}
          className={`flex-1 py-4 font-semibold rounded-xl transition-colors ${
            canAccept && !isUploading
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-green-500/30 text-green-400/50 cursor-not-allowed'
          }`}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
