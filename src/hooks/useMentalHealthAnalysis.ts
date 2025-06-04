import { useCallback } from 'react'
import { useAIService } from './useAIService'
import type { MentalHealthAnalysis } from '@/types/chat'

export const useMentalHealthAnalysis = () => {
  const { getAIResponse } = useAIService()

  const analyzeMessage = useCallback(
    async (content: string): Promise<MentalHealthAnalysis> => {
      try {
        const prompt = `Analyze the following message for mental health indicators. Consider:
      - Overall emotional state
      - Potential risk factors
      - Level of distress
      - Need for professional intervention

      Message: "${content}"

      Provide analysis in JSON format with scores (0-1) for:
      - anxiety
      - depression
      - stress
      - crisis
      - wellbeing`

        const analysisText = await getAIResponse(prompt)

        const analysisData = JSON.parse(analysisText)

        return {
          category:
            analysisData.crisis > 0.7
              ? 'high'
              : analysisData.crisis > 0.3
                ? 'medium'
                : 'low',
          scores: {
            anxiety: analysisData.anxiety || 0,
            depression: analysisData.depression || 0,
            stress: analysisData.stress || 0,
            wellbeing: analysisData.wellbeing || 0,
          },
          emotions: [],
          riskFactors: [],
          expertGuided: analysisData.crisis > 0.7,
          timestamp: Date.now(),
          confidence: analysisData.confidence || 0.8,
        }
      } catch (error) {
        console.error('Error analyzing message:', error)
        return {
          category: 'low',
          scores: {
            anxiety: 0,
            depression: 0,
            stress: 0,
            wellbeing: 0.5,
          },
          emotions: [],
          riskFactors: [],
          expertGuided: false,
          timestamp: Date.now(),
          confidence: 0.5,
        }
      }
    },
    [getAIResponse],
  )

  return { analyzeMessage }
}

export default useMentalHealthAnalysis
