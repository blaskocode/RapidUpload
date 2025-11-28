'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import type { Photo } from '@/types/api';
import { useAnalysisByPhoto, useTriggerAnalysis } from '@/lib/hooks/useAnalysis';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import AnalysisResultsPanel from './AnalysisResultsPanel';
import AnalysisStatusBadge from './AnalysisStatusBadge';
import toast from 'react-hot-toast';

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
}

export default function PhotoLightbox({
  photos,
  initialIndex,
  isOpen,
  onClose,
  propertyId,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageRect, setImageRect] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const triggerAnalysis = useTriggerAnalysis();

  // Update current index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsImageLoading(true);
  }, [initialIndex]);

  // Reset loading state and dimensions when photo changes
  useEffect(() => {
    setIsImageLoading(true);
    setImageRect({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  }, [currentIndex]);

  // Get analysis for current photo
  const { data: analysis } = useAnalysisByPhoto(photos[currentIndex]?.photoId);

  // Keyboard event handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, photos.length]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleAnalyze = async () => {
    if (!propertyId || isAnalyzing) return;
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;

    setIsAnalyzing(true);
    try {
      await triggerAnalysis.mutateAsync({
        propertyId,
        photoIds: [currentPhoto.photoId],
      });
      toast.success('Analysis started');
    } catch (error) {
      toast.error('Failed to start analysis');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  // Note: We treat null/undefined status as 'uploaded' for backwards compatibility
  const isUploaded = currentPhoto.status === 'uploaded' || currentPhoto.status === null || currentPhoto.status === undefined;
  const photoUrl = isUploaded
    ? `https://${currentPhoto.s3Bucket}.s3.us-east-1.amazonaws.com/${currentPhoto.s3Key}`
    : null;

  if (!photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text-primary)]/95 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/90 hover:text-white transition-colors p-2.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm"
        aria-label="Close lightbox"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Previous button */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/90 hover:text-white transition-all p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm hover:scale-110"
          aria-label="Previous photo"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Next button */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/90 hover:text-white transition-all p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm hover:scale-110"
          aria-label="Next photo"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div className="relative max-w-full max-h-full">
          <div className="relative inline-block" ref={imageContainerRef}>
            <Image
              src={photoUrl}
              alt={currentPhoto.filename}
              width={1920}
              height={1080}
              className={`max-w-full max-h-[90vh] object-contain transition-opacity duration-300 rounded-[var(--radius-lg)] ${
                isImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              priority
              onLoad={(e) => {
                setIsImageLoading(false);
                // Get the actual rendered dimensions of the image
                // With object-contain, the image is scaled to fit within the container while maintaining aspect ratio
                // The container dimensions are from the width/height props (1920x1080)
                // We need to figure out where the actual image content is within that container
                const img = e.currentTarget;

                // Container dimensions (from width/height props, constrained by max-width/max-height)
                const containerWidth = img.clientWidth;
                const containerHeight = img.clientHeight;

                // Natural image dimensions
                const naturalWidth = img.naturalWidth;
                const naturalHeight = img.naturalHeight;

                // Calculate the aspect ratios
                const containerAspect = containerWidth / containerHeight;
                const imageAspect = naturalWidth / naturalHeight;

                let renderedWidth: number;
                let renderedHeight: number;
                let offsetX: number;
                let offsetY: number;

                if (imageAspect > containerAspect) {
                  // Image is wider than container - width is the constraint
                  renderedWidth = containerWidth;
                  renderedHeight = containerWidth / imageAspect;
                  offsetX = 0;
                  offsetY = (containerHeight - renderedHeight) / 2;
                } else {
                  // Image is taller than container - height is the constraint
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
              onError={() => setIsImageLoading(false)}
            />
            {/* Bounding box overlay for analysis - positioned to match actual rendered image */}
            {analysis?.status === 'completed' && analysis.detections && imageRect.width > 0 && (
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
        </div>
      </div>

      {/* Photo counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Photo info */}
      <div className="absolute bottom-4 right-4 text-white text-sm bg-white/10 backdrop-blur-sm px-4 py-3 rounded-[var(--radius-lg)] max-w-xs">
        <div className="font-semibold truncate">{currentPhoto.filename}</div>
        <div className="text-xs text-white/70 mt-1">
          {new Date(currentPhoto.uploadedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <AnalysisStatusBadge analysis={analysis} />
          {/* Analyze button - show if no analysis or failed */}
          {propertyId && (!analysis || analysis.status === 'failed') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyze();
              }}
              disabled={isAnalyzing}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                isAnalyzing
                  ? 'bg-[var(--color-primary)]/80 cursor-not-allowed'
                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Analysis results panel - collapsible */}
      {analysis && analysis.status === 'completed' && (
        <div className="absolute top-4 left-16 z-20">
          {/* Toggle button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAnalysisPanelOpen(!isAnalysisPanelOpen);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-[var(--radius-md)] transition-all mb-2"
            aria-label={isAnalysisPanelOpen ? 'Hide analysis results' : 'Show analysis results'}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isAnalysisPanelOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isAnalysisPanelOpen ? 'Hide Analysis' : 'Show Analysis'}
          </button>

          {/* Panel content */}
          {isAnalysisPanelOpen && (
            <div className="max-w-sm max-h-[55vh] overflow-y-auto rounded-[var(--radius-lg)]">
              <AnalysisResultsPanel analysis={analysis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

