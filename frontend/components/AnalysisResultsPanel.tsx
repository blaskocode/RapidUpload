'use client';

import { AnalysisResult } from '@/types/api';

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
    recommendations?: string;
  }
  let claudeData: ClaudeAnalysis = {};
  try {
    claudeData = JSON.parse(analysis.claudeAnalysis || '{}') as ClaudeAnalysis;
  } catch {
    // Ignore parse errors
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Analysis Results</h3>
        {analysis.lowConfidence && (
          <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
            !!! Review Recommended
          </span>
        )}
      </div>

      {/* Damage Section */}
      {damageDetections.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-600 mb-2">Damage Detected</h4>
          <ul className="space-y-1">
            {damageDetections.map((d, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                {d.label}: {d.confidence.toFixed(0)}%
                {d.confidence < 60 && <span className="ml-1 text-yellow-500">!!!</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Materials Section */}
      {materialDetections.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-600 mb-2">Materials Detected</h4>
          <ul className="space-y-1">
            {materialDetections.map((d, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                {d.label}: {d.count || 1} unit(s) ({d.confidence.toFixed(0)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Assessment */}
      {claudeData.damageAssessment && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">AI Assessment</h4>
          <div className="bg-gray-50 rounded p-3 text-sm">
            <p className="font-medium">
              Severity: <span className={`
                ${claudeData.damageAssessment.severity === 'severe' ? 'text-red-600' : ''}
                ${claudeData.damageAssessment.severity === 'moderate' ? 'text-orange-600' : ''}
                ${claudeData.damageAssessment.severity === 'minor' ? 'text-yellow-600' : ''}
                ${claudeData.damageAssessment.severity === 'none' ? 'text-green-600' : ''}
              `}>
                {claudeData.damageAssessment.severity?.toUpperCase()}
              </span>
            </p>
            {claudeData.damageAssessment.description && (
              <p className="mt-1 text-gray-600">{claudeData.damageAssessment.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {claudeData.recommendations && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Recommendations</h4>
          <p className="text-sm text-gray-700">{claudeData.recommendations}</p>
        </div>
      )}

      {/* Error State */}
      {analysis.status === 'failed' && (
        <div className="bg-red-50 rounded p-3">
          <p className="text-sm text-red-600">
            Analysis failed: {analysis.errorMessage || 'Unknown error'}
          </p>
        </div>
      )}
    </div>
  );
}
