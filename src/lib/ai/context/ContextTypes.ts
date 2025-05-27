/**
 * @module ContextTypes
 * Defines shared types for context management.
 */

/**
 * Defines the structure for individual contextual factors.
 */
export interface ContextFactor<T = unknown> {
  id: string // Unique identifier for the factor (e.g., 'emotion', 'timeOfDay')
  value: T
  timestamp: Date
  source: string // Origin of the factor (e.g., 'EmotionDetectionService', 'SystemClock')
  confidence?: number // Optional confidence score (0-1)
  metadata?: Record<string, any> // Additional information
}

/**
 * Represents the overall context snapshot.
 */
export interface ContextSnapshot {
  sessionId: string
  userId: string
  timestamp: Date
  factors: ContextFactor[] // Note: This references the ContextFactor defined above
}

// Add other context-related types here as needed, for example:
// export type ContextEntry = ...;
// export type ContextUpdate = ...;
// export type ContextValue = ...;
// export type ContextSource = ...;
// export type ContextRelevance = ...;
// export type ContextStaleness = ...;
// export type ContextPriority = ...;

/**
 * Represents a single item from the history of past therapeutic techniques used.
 * Based on ClientPreferenceProfile.history.pastTechniques.
 */
export interface PastTechniqueHistoryItem {
  techniqueId: string
  techniqueName: string
  lastUsed: Date
  efficacy: number // A measure of how effective the technique was
  usageCount: number
}

/**
 * Represents a single item from the history of interventions applied in past sessions.
 * Based on TherapyAIOptions.interventionHistory.
 */
export interface InterventionHistoryLogItem {
  type: string // Type of intervention
  timestamp: Date
  outcome: string // Outcome of the intervention
  // Potentially add sessionId if tracking across multiple sessions
  // sessionId?: string;
}

/**
 * Represents an emotion analysis snapshot from a past session.
 * This reuses the EmotionAnalysis interface for consistency.
 * We might need to import it here or ensure it's globally available.
 * For now, assuming EmotionAnalysis is a known type.
 */
// import type { EmotionAnalysis } from '../interfaces/therapy'; // Potentially needed

/**
 * Defines the structure for the value of a 'sessionHistory' context factor.
 * It aggregates various historical data points for a client.
 */
export interface SessionHistoryContextValue {
  clientId: string
  pastTechniques: PastTechniqueHistoryItem[]
  // For intervention history, we might have a list per session or a flat list.
  // Let's assume a flat list of all past interventions for now.
  interventionLogs: InterventionHistoryLogItem[]
  // To include past emotions, we would need EmotionAnalysis type.
  // recentEmotionAnalyses?: EmotionAnalysis[]; // Array of emotion analyses from recent past sessions
  // metadata could include things like number of sessions summarized, date range, etc.
  historyMetadata?: {
    numberOfSessionsConsidered?: number
    oldestSessionDate?: Date
    latestSessionDate?: Date
  }
}
