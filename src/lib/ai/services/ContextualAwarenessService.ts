import type { UserSession, EmotionState } from '../../../simulator/types'
import type { ChatSession, MentalHealthAnalysis } from '../../../types/chat'

/**
 * Context factors for real-time intervention
 */
export interface ContextFactors {
  session: UserSession
  chatSession: ChatSession
  recentEmotionState: EmotionState | null
  recentInterventions: string[]
  userPreferences?: Record<string, unknown>
  mentalHealthAnalysis?: MentalHealthAnalysis
}

/**
 * Contextual Awareness Service
 * Aggregates multi-factor context for real-time intervention decisions.
 */
export class ContextualAwarenessService {
  /**
   * Collects context factors for a given user/session.
   * @param session User session metadata
   * @param chatSession Chat session data
   * @param recentEmotionState Most recent emotion state (if available)
   * @param recentInterventions List of recent interventions (by id or description)
   * @param userPreferences Optional user preferences
   * @param mentalHealthAnalysis Optional latest mental health analysis
   */
  static collectContext({
    session,
    chatSession,
    recentEmotionState,
    recentInterventions,
    userPreferences,
    mentalHealthAnalysis,
  }: {
    session: UserSession
    chatSession: ChatSession
    recentEmotionState: EmotionState | null
    recentInterventions: string[]
    userPreferences?: Record<string, unknown>
    mentalHealthAnalysis?: MentalHealthAnalysis
  }): ContextFactors {
    // Validate input (security: never trust external input)
    if (!session || !chatSession) {
      throw new Error('Session and chatSession are required for context awareness')
    }
    // Optionally sanitize/validate userPreferences and interventions
    // (Add more validation as needed for your security model)
    return {
      session,
      chatSession,
      recentEmotionState,
      recentInterventions: Array.isArray(recentInterventions) ? recentInterventions.slice(0, 10) : [],
      userPreferences: userPreferences ? { ...userPreferences } : undefined,
      mentalHealthAnalysis,
    }
  }
} 