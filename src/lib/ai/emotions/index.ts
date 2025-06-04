/**
 * Emotion Analysis Module
 *
 * Provides comprehensive emotion detection, analysis, and visualization
 * capabilities with support for personalization and contextual normalization.
 */

// Export types
export type { EmotionType, EmotionAnalysis } from './types'
export type {
  EmotionVector,
  EmotionDimension,
  DimensionalDistribution,
  DimensionalEmotionMap,
  DimensionalMappingResult,
} from './dimensionalTypes'
export type {
  BaselinePersonalizationParams,
  EmotionalBaseline,
} from './PersonalizedBaselineEstablishment'
export { AlertLevel, AlertType } from './EmotionAlertSystem'
export type { EmotionAlert } from './EmotionAlertSystem'

// Export main classes
export { EmotionDetectionEngine } from './EmotionDetectionEngine'
export { MultidimensionalEmotionMapper } from './MultidimensionalEmotionMapper'
export { PersonalizedBaselineEstablishment } from './PersonalizedBaselineEstablishment'
export { EmotionAnalysisAPI } from './EmotionAnalysisAPI'
export { EmotionAlertSystem } from './EmotionAlertSystem'

// Register services (for dynamic loading)
import { EmotionAnalysisAPI } from './EmotionAnalysisAPI'
import { EmotionAlertSystem } from './EmotionAlertSystem'

/**
 * Service registration for dependency injection systems
 */
export const services = [
  EmotionAnalysisAPI.register(),
  { name: 'emotionAlertSystem', service: EmotionAlertSystem },
]
