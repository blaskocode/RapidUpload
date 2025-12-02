'use client';

import { useState } from 'react';
import { AnalysisResult, Detection } from '@/types/api';
import Card from '@/components/ui/Card';
import { useDetectionSettingsStore, isDetectionVisible } from '@/stores/detectionSettingsStore';

interface AnalysisResultsPanelProps {
  analysis: AnalysisResult;
  onVolumeUpdate?: (detectionIndex: number, volume: number) => void;
  isUpdatingVolume?: boolean;
}

// Sub-component for editable loose material item
function LooseMaterialItem({
  detection,
  detectionIndex,
  onVolumeUpdate,
  isUpdatingVolume,
}: {
  detection: Detection;
  detectionIndex: number;
  onVolumeUpdate?: (detectionIndex: number, volume: number) => void;
  isUpdatingVolume?: boolean;
}) {
  const displayVolume = detection.userVolumeOverride ?? detection.volumeEstimate;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayVolume?.toFixed(1) || '');

  const handleSave = () => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0 && onVolumeUpdate) {
      onVolumeUpdate(detectionIndex, value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(displayVolume?.toFixed(1) || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-primary)] font-medium">{detection.label}</span>
        {displayVolume != null ? (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border rounded"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={isUpdatingVolume}
                  className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                >
                  {isUpdatingVolume ? '...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className="text-amber-700 font-semibold">
                  ~{displayVolume.toFixed(1)} {detection.volumeUnit || 'cubic yards'}
                </span>
                {detection.userVolumeOverride != null && (
                  <span className="text-xs text-amber-600">(confirmed)</span>
                )}
                {onVolumeUpdate && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-amber-600 hover:text-amber-800 underline"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <span className="text-orange-600 text-xs">Unable to estimate</span>
        )}
      </div>
      {detection.volumeConfidence && detection.volumeConfidence !== 'none' && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <span className={`px-1.5 py-0.5 rounded ${
            detection.volumeConfidence === 'high' ? 'bg-green-100 text-green-700' :
            detection.volumeConfidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-orange-100 text-orange-700'
          }`}>
            {detection.volumeConfidence} confidence
          </span>
          {detection.volumeReference && detection.volumeReference !== 'no_reference' && (
            <span>via {detection.volumeReference}</span>
          )}
        </div>
      )}
      {detection.volumeNotes && (
        <p className="text-xs text-[var(--color-text-secondary)] italic">
          {detection.volumeNotes}
        </p>
      )}
      {detection.volumeEstimate == null && (
        <p className="text-xs text-orange-600">
          Volume could not be estimated - no reference objects visible
        </p>
      )}
    </div>
  );
}

// Sub-component for the loose materials section
function LooseMaterialsSection({
  analysis,
  looseDetections,
  onVolumeUpdate,
  isUpdatingVolume,
}: {
  analysis: AnalysisResult;
  looseDetections: Detection[];
  onVolumeUpdate?: (detectionIndex: number, volume: number) => void;
  isUpdatingVolume?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <h4 className="text-sm font-medium text-amber-600">Loose Materials</h4>
      </div>
      <div className="bg-amber-50 rounded-[var(--radius-md)] p-3 space-y-3">
        {looseDetections.map((d, i) => {
          // Find the actual index in the full detections array
          const detectionIndex = analysis.detections?.findIndex(det => det === d) ?? i;
          return (
            <LooseMaterialItem
              key={i}
              detection={d}
              detectionIndex={detectionIndex}
              onVolumeUpdate={onVolumeUpdate}
              isUpdatingVolume={isUpdatingVolume}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function AnalysisResultsPanel({ analysis, onVolumeUpdate, isUpdatingVolume }: AnalysisResultsPanelProps) {
  const visibility = useDetectionSettingsStore((state) => state.visibility);

  // Filter detections based on visibility settings
  const allDetections = analysis.detections || [];
  const visibleDetections = allDetections.filter((d) =>
    isDetectionVisible(d.label, d.category, visibility)
  );

  const damageDetections = visibleDetections.filter(d => d.category === 'damage');
  const materialDetections = visibleDetections.filter(d => d.category === 'material');
  const looseDetections = visibleDetections.filter(d => d.category === 'loose_material');

  // Parse Claude analysis
  interface ClaudeAnalysis {
    damageAssessment?: {
      severity?: 'none' | 'minor' | 'moderate' | 'severe';
      description?: string;
    };
    materials?: {
      detected?: string[];
      description?: string;
    };
    recommendations?: string;
  }
  let claudeData: ClaudeAnalysis = {};
  try {
    claudeData = JSON.parse(analysis.claudeAnalysis || '{}') as ClaudeAnalysis;
  } catch {
    // Ignore parse errors
  }

  const severityConfig = {
    severe: { color: 'text-[var(--color-error)]', bg: 'bg-[var(--color-error-light)]' },
    moderate: { color: 'text-amber-600', bg: 'bg-amber-50' },
    minor: { color: 'text-yellow-600', bg: 'bg-yellow-50' },
    none: { color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-light)]' },
  };

  return (
    <Card variant="default" padding="lg" className="space-y-5">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Analysis Results</h3>
      </div>

      {/* Damage Section */}
      {damageDetections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-error)]" />
            <h4 className="text-sm font-medium text-[var(--color-error)]">Damage Detected</h4>
          </div>
          <div className="bg-[var(--color-error-light)] rounded-[var(--radius-md)] p-3 space-y-2">
            {damageDetections.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-primary)] font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials Section - from detections */}
      {materialDetections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <h4 className="text-sm font-medium text-[var(--color-success)]">Materials Detected</h4>
          </div>
          <div className="bg-[var(--color-success-light)] rounded-[var(--radius-md)] p-3 space-y-2">
            {materialDetections.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-primary)] font-medium">{d.label}</span>
                <span className="text-[var(--color-text-secondary)]">{d.count || 1} unit(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials Section - from AI analysis (fallback if no detection bounding boxes) */}
      {materialDetections.length === 0 && claudeData.materials && (claudeData.materials.detected?.length || claudeData.materials.description) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <h4 className="text-sm font-medium text-[var(--color-success)]">Materials Identified</h4>
          </div>
          <div className="bg-[var(--color-success-light)] rounded-[var(--radius-md)] p-3 space-y-2">
            {claudeData.materials.detected && claudeData.materials.detected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {claudeData.materials.detected.map((material, i) => (
                  <span key={i} className="text-sm text-[var(--color-text-primary)] font-medium bg-white/50 px-2 py-1 rounded">
                    {material}
                  </span>
                ))}
              </div>
            )}
            {claudeData.materials.description && (
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {claudeData.materials.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loose Materials / Volume Section */}
      {looseDetections.length > 0 && (
        <LooseMaterialsSection
          analysis={analysis}
          looseDetections={looseDetections}
          onVolumeUpdate={onVolumeUpdate}
          isUpdatingVolume={isUpdatingVolume}
        />
      )}

      {/* AI Assessment */}
      {claudeData.damageAssessment && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <h4 className="text-sm font-medium text-[var(--color-accent)]">AI Assessment</h4>
          </div>
          <div className={`rounded-[var(--radius-md)] p-4 ${severityConfig[claudeData.damageAssessment.severity || 'none']?.bg || 'bg-[var(--color-bg-tertiary)]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Severity:</span>
              <span className={`text-sm font-semibold ${severityConfig[claudeData.damageAssessment.severity || 'none']?.color}`}>
                {claudeData.damageAssessment.severity?.toUpperCase() || 'N/A'}
              </span>
            </div>
            {claudeData.damageAssessment.description && (
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {claudeData.damageAssessment.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {claudeData.recommendations && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h4 className="text-sm font-medium text-[var(--color-text-primary)]">Recommendations</h4>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-tertiary)] rounded-[var(--radius-md)] p-3">
            {claudeData.recommendations}
          </p>
        </div>
      )}

      {/* Error State */}
      {analysis.status === 'failed' && (
        <div className="bg-[var(--color-error-light)] rounded-[var(--radius-md)] p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[var(--color-error)]">Analysis Failed</p>
            <p className="text-sm text-red-700 mt-0.5">{analysis.errorMessage || 'Unknown error occurred'}</p>
          </div>
        </div>
      )}

      {/* No detections */}
      {damageDetections.length === 0 &&
       materialDetections.length === 0 &&
       looseDetections.length === 0 &&
       !claudeData.materials?.detected?.length &&
       !claudeData.materials?.description &&
       !claudeData.damageAssessment &&
       analysis.status === 'completed' && (
        <div className="text-center py-4">
          <svg className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[var(--color-text-secondary)]">No damage or materials detected</p>
        </div>
      )}
    </Card>
  );
}
