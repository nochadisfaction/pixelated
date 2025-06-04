import React from 'react'
import type { MentalHealthAnalysis } from '../../lib/ai/types/MentalHealthAnalysis'

interface MentalHealthInsightsProps {
  analysis: MentalHealthAnalysis
  showConfidenceScore?: boolean
  className?: string
}

const ListSection = ({ title, items }: { title: string; items: string[] }) => {
  if (!items.length) {
    return null
  }

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const MentalHealthInsights: React.FC<MentalHealthInsightsProps> = ({
  analysis,
  showConfidenceScore = false,
  className = '',
}) => {
  if (!analysis) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        No analysis data available
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className={`p-5 bg-white rounded-lg shadow ${className}`}>
      <h2 className="text-xl font-bold mb-4">Mental Health Analysis</h2>

      {/* Display session ID if available */}
      {analysis.sessionId && (
        <div className="mb-4 text-xs text-gray-500">
          Session ID: {analysis.sessionId}
        </div>
      )}

      {/* Emotional State */}
      {analysis.emotionalState && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Emotional State</h3>
          <p className="text-sm">{analysis.emotionalState}</p>
        </div>
      )}

      {/* Lists */}
      <ListSection
        title="Cognitive Patterns"
        items={analysis.cognitivePatterns}
      />

      <ListSection title="Strengths" items={analysis.strengths} />

      <ListSection title="Primary Concerns" items={analysis.primaryConcerns} />

      <ListSection
        title="Therapeutic Recommendations"
        items={analysis.therapeuticRecommendations}
      />

      {/* Risk Factors (highlight differently) */}
      {analysis.riskFactors.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-amber-700">
            Risk Factors
          </h3>
          <ul className="list-disc pl-5 space-y-1 bg-amber-50 p-3 rounded border border-amber-100">
            {analysis.riskFactors.map((risk, index) => (
              <li key={index} className="text-sm text-amber-800">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp and confidence */}
      <div className="mt-6 text-xs text-gray-500">
        <div>Assessment time: {formatDate(analysis.assessmentTimestamp)}</div>
        {showConfidenceScore && (
          <div className="mt-1">
            Confidence: {(analysis.confidenceScore * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

export default MentalHealthInsights
