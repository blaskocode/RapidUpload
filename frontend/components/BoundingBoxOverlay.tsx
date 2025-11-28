'use client';

import { Detection } from '@/types/api';

interface BoundingBoxOverlayProps {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
}

const CATEGORY_COLORS = {
  damage: {
    border: 'border-[var(--color-error)]',
    bg: 'bg-[var(--color-error)]',
    text: 'text-[var(--color-error)]'
  },
  material: {
    border: 'border-[var(--color-success)]',
    bg: 'bg-[var(--color-success)]',
    text: 'text-[var(--color-success)]'
  },
  other: {
    border: 'border-[var(--color-accent)]',
    bg: 'bg-[var(--color-accent)]',
    text: 'text-[var(--color-accent)]'
  },
};

export default function BoundingBoxOverlay({
  detections,
  imageWidth,
  imageHeight,
}: BoundingBoxOverlayProps) {
  return (
    <div
      className="pointer-events-none w-full h-full relative"
    >
      {detections.map((detection, index) => {
        if (!detection.boundingBox) return null;

        const { left, top, width, height } = detection.boundingBox;
        const colors = CATEGORY_COLORS[detection.category] || CATEGORY_COLORS.other;
        const isLowConfidence = detection.confidence < 60;

        return (
          <div
            key={`${detection.label}-${index}`}
            className={`absolute border-2 ${colors.border} ${isLowConfidence ? 'border-dashed' : ''} transition-all duration-200`}
            style={{
              left: `${left * 100}%`,
              top: `${top * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            }}
          >
            {/* Label */}
            <div
              className={`absolute -top-7 left-0 ${colors.bg} text-white text-xs font-medium px-2 py-1 rounded-[var(--radius-sm)] whitespace-nowrap shadow-sm`}
            >
              {detection.label} ({detection.confidence.toFixed(0)}%)
              {isLowConfidence && (
                <svg className="w-3 h-3 ml-1 inline-block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
