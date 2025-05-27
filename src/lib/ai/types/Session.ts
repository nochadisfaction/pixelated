/**
 * Represents a therapy session
 */
export interface Session {
  /**
   * Unique identifier for the session
   */
  id: string

  /**
   * Client identifier
   */
  clientId: string

  /**
   * Therapist identifier
   */
  therapistId: string

  /**
   * Timestamp when the session occurred
   */
  timestamp: string

  /**
   * Session transcript entries
   */
  transcript?: Array<{
    content: string
    [key: string]: unknown
  }>

  /**
   * Session summary
   */
  summary?: string

  /**
   * Emotional state information
   */
  emotionalState?: {
    dominantEmotion: string
    intensity: number
  }

  /**
   * Session outcomes
   */
  outcomes?: {
    emotionalState?: number
    improvement?: number
    consistency?: number
    engagement?: number
  }
}
