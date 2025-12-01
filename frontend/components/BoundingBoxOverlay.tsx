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
}: BoundingBoxOverlayProps) {
  return (
    <div
      className="pointer-events-none w-full h-full relative"
    >
      {detections.map((detection, index) => {
        if (!detection.boundingBox) return null;

        const { left, top, width, height } = detection.boundingBox;
        const colors = CATEGORY_COLORS[detection.category] || CATEGORY_COLORS.other;

        return (
          <div
            key={`${detection.label}-${index}`}
            className={`absolute border-2 ${colors.border} transition-all duration-200`}
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
              {detection.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
