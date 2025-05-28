import React from 'react'
import type { TreatmentRecommendation } from '../../lib/ai/services/RecommendationService'

interface RecommendationDisplayProps {
  recommendations: TreatmentRecommendation[]
  onSelect?: (rec: TreatmentRecommendation) => void
}

export default function RecommendationDisplay({
  recommendations,
  onSelect,
}: RecommendationDisplayProps) {
  if (!recommendations || recommendations.length === 0) {
    return <div className="text-gray-500">No recommendations available.</div>
  }

  return (
    <div className="space-y-6">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer group"
          tabIndex={0}
          aria-label={`Recommendation: ${rec.title}`}
          onClick={() => onSelect?.(rec)}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-blue-800 group-hover:underline">
              {rec.title}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                rec.priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : rec.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
              }`}
            >
              {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
            </span>
          </div>
          <p className="text-gray-700 mb-2">{rec.description}</p>
          <div className="mb-2">
            <span className="font-medium text-gray-800">Techniques:</span>
            <ul className="list-disc pl-5 text-gray-700">
              {rec.techniques.map((tech) => (
                <li key={tech.id} className="mb-1">
                  <span className="font-semibold">{tech.name}</span>:{' '}
                  {tech.description}
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-2">
            <span className="font-medium text-gray-800">
              Evidence Strength:
            </span>
            <span className="ml-2 text-blue-700 font-bold">
              {(rec.evidenceStrength * 100).toFixed(0)}%
            </span>
          </div>
          {rec.supportingPatterns && rec.supportingPatterns.length > 0 && (
            <div className="mb-2">
              <span className="font-medium text-gray-800">
                Supporting Patterns:
              </span>
              <ul className="list-disc pl-5 text-gray-700">
                {rec.supportingPatterns.map((pattern, idx) => (
                  <li key={idx}>
                    {'type' in pattern ? pattern.type : pattern.riskFactor}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rec.personalizedDescription && (
            <div className="mb-2 text-sm text-blue-600">
              <span className="font-medium">Personalized:</span>{' '}
              {rec.personalizedDescription}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-2">
            Valid until: {new Date(rec.validUntil).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}
