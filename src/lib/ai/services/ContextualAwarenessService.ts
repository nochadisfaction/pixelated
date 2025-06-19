import { appLogger as logger } from '../../logging'
import type { RecommendationContext } from './OutcomeRecommendationEngine'

export interface ContextCollectionInput {
  session: any
  chatSession: any
  recentEmotionState: any
  recentInterventions: string[]
  userPreferences?: Record<string, unknown>
  mentalHealthAnalysis?: any
}

export class ContextualAwarenessService {
  static collectContext(input: ContextCollectionInput): RecommendationContext {
    logger.info('Collecting contextual data for recommendations')

    // Process and structure the context data
    const context: RecommendationContext = {
      session: {
        id: input.session?.sessionId,
        clientId: input.session?.clientId,
        therapistId: input.session?.therapistId,
        status: input.session?.status,
        securityLevel: input.session?.securityLevel,
        emotionAnalysisEnabled: input.session?.emotionAnalysisEnabled
      },
      chatSession: input.chatSession || {},
      recentEmotionState: input.recentEmotionState,
      recentInterventions: input.recentInterventions || [],
      userPreferences: input.userPreferences || {},
      mentalHealthAnalysis: input.mentalHealthAnalysis || {}
    }

    return context
  }
} 