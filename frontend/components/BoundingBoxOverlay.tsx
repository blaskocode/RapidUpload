'use client';

import { Detection } from '@/types/api';

interface BoundingBoxOverlayProps {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
}

const CATEGORY_COLORS = {
  damage: { border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-500' },
  material: { border: 'border-green-500', bg: 'bg-green-500', text: 'text-green-500' },
  other: { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-orange-500' },
};

export default function BoundingBoxOverlay({
  detections,
}: BoundingBoxOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((detection, index) => {
        if (!detection.boundingBox) return null;

        const { left, top, width, height } = detection.boundingBox;
        const colors = CATEGORY_COLORS[detection.category] || CATEGORY_COLORS.other;
        const isLowConfidence = detection.confidence < 60;

        return (
          <div
            key={`${detection.label}-${index}`}
            className={`absolute border-2 ${colors.border} ${isLowConfidence ? 'border-dashed' : ''}`}
            style={{
              left: `${left * 100}%`,
              top: `${top * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            }}
          >
            {/* Label */}
            <div
              className={`absolute -top-6 left-0 ${colors.bg} text-white text-xs px-1 py-0.5 rounded whitespace-nowrap`}
            >
              {detection.label} ({detection.confidence.toFixed(0)}%)
              {isLowConfidence && ' !!!'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
