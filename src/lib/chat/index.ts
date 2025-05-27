// Import types that we want to re-export
import type { MentalHealthAnalysis } from './mentalHealthChat'

// Export chat services and types
export * from './fheChat'
export { MentalHealthChat } from './mentalHealthChat'

// Re-export types
export type { MentalHealthAnalysis }

// Optional: Add a comment explaining what these exports do
/**
 * Chat module exports:
 * - fheChat: Secure chat implementation with FHE support
 * - MentalHealthAnalysis: Type for mental health analysis results
 * - MentalHealthChat: Service for analyzing chat messages
 */
