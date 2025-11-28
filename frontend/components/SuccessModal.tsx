'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { propertyKeys } from '@/lib/hooks/useProperties';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string | null;
  totalUploaded: number;
  timeElapsed?: number; // in seconds
}

export default function SuccessModal({
  isOpen,
  onClose,
  propertyId,
  totalUploaded,
  timeElapsed,
}: SuccessModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}${remainingSeconds > 0 ? ` ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}` : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text-primary)]/50 backdrop-blur-sm">
      <Card variant="elevated" padding="lg" className="w-full max-w-md mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[var(--color-success-light)] mb-5">
            <svg
              className="h-8 w-8 text-[var(--color-success)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Upload Complete!</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Successfully uploaded <span className="font-semibold text-[var(--color-success)]">{totalUploaded}</span> photo{totalUploaded !== 1 ? 's' : ''}
            {timeElapsed && ` in ${formatTime(timeElapsed)}`}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {propertyId && (
              <Button
                variant="primary"
                onClick={async () => {
                  // Invalidate the photos cache to ensure fresh data is fetched
                  await queryClient.invalidateQueries({ queryKey: propertyKeys.photos(propertyId) });
                  // Also invalidate property details (for photo count)
                  await queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
                  await queryClient.invalidateQueries({ queryKey: propertyKeys.list() });
                  router.push(`/properties/${propertyId}`);
                  onClose();
                }}
                rightIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                }
              >
                View Gallery
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

