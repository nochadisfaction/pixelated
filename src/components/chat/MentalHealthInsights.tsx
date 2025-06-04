import React from 'react'
import type { MentalHealthAnalysis } from '../../lib/ai/types/MentalHealthAnalysis'

interface MentalHealthInsightsProps {
  analysis: MentalHealthAnalysis | null
  isLoading: boolean
}

const MentalHealthInsights: React.FC<MentalHealthInsightsProps> = ({
  analysis,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Session Insights
        </h2>
        <div className="flex flex-col items-center justify-center p-6">
          <div
            data-testid="insights-loading-spinner"
            className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"
          ></div>
          <p className="text-gray-600">Analyzing session data...</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Session Insights
        </h2>
        <div className="text-center p-6">
          <p className="text-gray-600">No analysis available</p>
        </div>
      </div>
    )
  }

  // Function to determine severity level colors
  const getSeverityColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Determine severity level based on risk factors
  const determineSeverityLevel = () => {
    if (!analysis.riskFactors || analysis.riskFactors.length === 0) {
      return 'Low'
    }

    // Check for high severity indicators in the emotional state or risk factors
    if (
      analysis.emotionalState.includes('significant') ||
      analysis.emotionalState.includes('severe') ||
      analysis.riskFactors.some(
        (risk) =>
          risk.includes('suicidal') ||
          risk.includes('self-harm') ||
          risk.includes('severe'),
      )
    ) {
      return 'High'
    }

    // Check for moderate severity indicators
    if (
      analysis.emotionalState.includes('moderate') ||
      analysis.riskFactors.some(
        (risk) => risk.includes('moderate') || risk.includes('concerning'),
      )
    ) {
      return 'Moderate'
    }

    return 'Low'
  }

  const severityLevel = determineSeverityLevel()
  const severityColorClass = getSeverityColor(severityLevel)

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Session Insights
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Emotional State */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">Emotional State</h3>
            <p className="text-gray-600">{analysis.emotionalState}</p>
          </div>

          {/* Cognitive Patterns */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">
              Cognitive Patterns
            </h3>
            <ul className="list-disc pl-5 text-gray-600">
              {analysis.cognitivePatterns.map((pattern, index) => (
                <li key={index}>{pattern}</li>
              ))}
            </ul>
          </div>

          {/* Therapeutic Recommendations */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">
              Therapeutic Recommendations
            </h3>
            <ul className="list-disc pl-5 text-gray-600">
              {analysis.therapeuticRecommendations.map(
                (recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ),
              )}
            </ul>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Client Strengths */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">Client Strengths</h3>
            <ul className="list-disc pl-5 text-gray-600">
              {analysis.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>

          {/* Primary Concerns */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">Primary Concerns</h3>
            <ul className="list-disc pl-5 text-gray-600">
              {analysis.primaryConcerns.map((concern, index) => (
                <li key={index}>{concern}</li>
              ))}
            </ul>
          </div>

          {/* Clinical Risk Assessment */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">
              Clinical Risk Assessment
            </h3>
            <div className="mt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${severityColorClass}`}
              >
                {severityLevel}
              </span>
            </div>
            {analysis.riskFactors.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Risk Factors:
                </h4>
                <ul className="list-disc pl-5 text-gray-600 text-sm mt-1">
                  {analysis.riskFactors.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with timestamp and confidence */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
        <div>
          Assessment: {new Date(analysis.assessmentTimestamp).toLocaleString()}
        </div>
        <div>Confidence: {Math.round(analysis.confidenceScore * 100)}%</div>
      </div>
    </div>
  )
}

export default MentalHealthInsights
