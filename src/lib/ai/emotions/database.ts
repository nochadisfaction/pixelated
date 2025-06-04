import type { EmotionAnalysis } from './types'
import { supabase } from '../../db/supabase'

/**
 * Store emotion analysis results in the database
 * @param analysis Emotion analysis data to store
 * @returns ID of the stored analysis
 */
export async function storeEmotionAnalysis(
  analysis: Omit<EmotionAnalysis, 'id'>,
): Promise<string> {
  // Insert the analysis into the emotion_analyses table
  const { data, error } = await supabase
    .from('emotion_analyses')
    .insert({
      user_id: analysis.userId,
      timestamp: new Date(analysis.timestamp).toISOString(),
      content_type: analysis.source,
      content_reference:
        typeof analysis.input === 'string'
          ? analysis.input
          : JSON.stringify(analysis.input),
      emotions: JSON.stringify(analysis.emotions),
      overall_sentiment: calculateOverallSentiment(analysis.emotions),
      risk_factors: analysis.dimensions
        ? JSON.stringify({
            valence: analysis.dimensions.valence,
            arousal: analysis.dimensions.arousal,
            dominance: analysis.dimensions.dominance,
          })
        : null,
      requires_attention: determineIfRequiresAttention(analysis),
      analysis_version: '1.0',
    })
    .select('id')
    .single()

  // Handle errors
  if (error) {
    console.error('Error storing emotion analysis:', error)
    throw new Error(`Failed to store emotion analysis: ${error.message}`)
  }

  // Return the ID of the stored analysis
  return data?.id
}

/**
 * Calculate overall sentiment from emotion data
 * @param emotions Array of emotion data
 * @returns Sentiment score from -1 to 1
 */
function calculateOverallSentiment(
  emotions: EmotionAnalysis['emotions'],
): number {
  // Positive emotions increase the score, negative emotions decrease it
  const sentimentMap: Record<string, number> = {
    joy: 1,
    contentment: 0.8,
    excitement: 0.9,
    trust: 0.7,
    acceptance: 0.6,
    calmness: 0.5,
    anticipation: 0.3,
    surprise: 0.1,
    neutral: 0,
    confusion: -0.2,
    apprehension: -0.4,
    anxiety: -0.6,
    disgust: -0.7,
    fear: -0.8,
    sadness: -0.9,
    anger: -1,
  }

  // Calculate weighted sentiment based on emotion confidence and intensity
  let totalWeight = 0
  let weightedSentiment = 0

  for (const emotion of emotions) {
    const weight = emotion.confidence * emotion.intensity
    const sentimentValue = sentimentMap[emotion.type] || 0

    weightedSentiment += sentimentValue * weight
    totalWeight += weight
  }

  // Normalize to -1 to 1 range
  return totalWeight > 0 ? weightedSentiment / totalWeight : 0
}

/**
 * Determine if this emotion analysis requires attention
 * @param analysis The emotion analysis data
 * @returns Boolean indicating if this requires attention
 */
function determineIfRequiresAttention(
  analysis: Omit<EmotionAnalysis, 'id'>,
): boolean {
  // Check for high intensity negative emotions
  const highIntensityNegative = analysis.emotions.some((emotion) => {
    const isNegative = [
      'fear',
      'anger',
      'sadness',
      'anxiety',
      'disgust',
    ].includes(emotion.type)
    return isNegative && emotion.intensity > 0.7 && emotion.confidence > 0.7
  })

  // Check for concerning dimensional values if dimensions exist
  let concerningDimensions = false
  if (analysis.dimensions) {
    // Very negative valence combined with high arousal can indicate distress
    concerningDimensions =
      analysis.dimensions.valence < -0.7 && analysis.dimensions.arousal > 0.7
  }

  return highIntensityNegative || concerningDimensions
}
