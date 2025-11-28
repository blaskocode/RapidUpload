'use client';

import { AnalysisResult } from '@/types/api';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface AnalysisResultsPanelProps {
  analysis: AnalysisResult;
}

export default function AnalysisResultsPanel({ analysis }: AnalysisResultsPanelProps) {
  const damageDetections = analysis.detections?.filter(d => d.category === 'damage') || [];
  const materialDetections = analysis.detections?.filter(d => d.category === 'material') || [];

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
        {analysis.lowConfidence && (
          <Badge variant="warning" size="md">
            <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Review Recommended
          </Badge>
        )}
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
                <div className="flex items-center gap-2">
                  <span className={d.confidence < 60 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'}>
                    {d.confidence.toFixed(0)}%
                  </span>
                  {d.confidence < 60 && (
                    <svg className="w-4 h-4 text-[var(--color-warning)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
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
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-text-secondary)]">{d.count || 1} unit(s)</span>
                  <span className="text-[var(--color-text-muted)]">{d.confidence.toFixed(0)}%</span>
                </div>
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
