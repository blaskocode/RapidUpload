'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

interface CameraCaptureProps {
  onCapture: (dataUrl: string, file: File) => void;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoConstraints = {
    facingMode: 'environment', // Rear-facing camera
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  };

  const handleCapture = useCallback(() => {
    if (webcamRef.current && !disabled) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Convert base64 data URL to File object
        const timestamp = Date.now();
        const filename = `camera-capture-${timestamp}.jpg`;

        // Convert base64 to blob
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], filename, { type: 'image/jpeg' });
            onCapture(imageSrc, file);
          });
      }
    }
  }, [onCapture, disabled]);

  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
    setCameraError(null);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    setIsCameraReady(false);
    const message = typeof error === 'string' ? error : error.message;
    setCameraError(`Camera access denied: ${message}`);
  }, []);

  // Reset camera ready state when component mounts
  useEffect(() => {
    setIsCameraReady(false);
    setCameraError(null);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
      {/* Camera feed */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white text-lg font-medium mb-2">Camera Access Required</p>
            <p className="text-white/70 text-sm max-w-sm">{cameraError}</p>
            <p className="text-white/50 text-xs mt-4">Please allow camera access in your browser settings and refresh the page.</p>
          </div>
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              videoConstraints={videoConstraints}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-full object-contain"
            />
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white">Initializing camera...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Capture button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleCapture}
          disabled={!isCameraReady || disabled || !!cameraError}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
            isCameraReady && !disabled && !cameraError
              ? 'bg-white/20 hover:bg-white/30 active:scale-95'
              : 'bg-white/10 opacity-50 cursor-not-allowed'
          }`}
          aria-label="Capture photo"
        >
          <div className={`w-14 h-14 rounded-full transition-colors ${
            isCameraReady && !disabled && !cameraError ? 'bg-white' : 'bg-white/50'
          }`} />
        </button>
      </div>

      {/* Camera ready indicator */}
      {isCameraReady && !cameraError && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400 text-sm font-medium">Camera ready</span>
        </div>
      )}
    </div>
  );
}
