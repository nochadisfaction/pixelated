export interface MentalHealthAnalysis {
  /**
   * Description of the client's current emotional state
   */
  emotionalState: string

  /**
   * List of identified cognitive patterns
   */
  cognitivePatterns: string[]

  /**
   * List of recommended therapeutic interventions
   */
  therapeuticRecommendations: string[]

  /**
   * List of client's identified strengths
   */
  strengths: string[]

  /**
   * List of key issues or concerns the client is experiencing
   */
  primaryConcerns: string[]

  /**
   * List of identified risk factors or warning signs
   */
  riskFactors: string[]

  /**
   * Timestamp when the assessment was generated
   */
  assessmentTimestamp: number

  /**
   * Confidence score of the analysis (0.0 to 1.0)
   */
  confidenceScore: number

  /**
   * Optional session ID reference
   */
  sessionId?: string
}
