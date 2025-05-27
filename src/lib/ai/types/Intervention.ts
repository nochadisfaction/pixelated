import type { Session } from './Session'

/**
 * Context for therapeutic interventions
 */
export interface InterventionContext {
  /**
   * Session history
   */
  sessionHistory: Session[]

  /**
   * Identified patterns
   */
  patterns: string[]

  /**
   * Optional progress metrics
   */
  progressMetrics?: {
    improvement: number
    consistency: number
    engagement: number
  }

  /**
   * Optional emotional trend analysis
   */
  emotionalTrend?: string | null
}
