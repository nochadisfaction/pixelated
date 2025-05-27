/**
 * Enhanced Recommendation Service
 *
 * This service integrates pattern recognition, efficacy tracking, and personalization
 * to provide highly effective, evidence-based therapeutic recommendations.
 */

import { getLogger } from '../../logging'
import {
  TreatmentRecommendation,
  RecommendationOptions,
  TherapeuticTechnique,
  EvidenceWeightStrategy,
  EvidenceSource,
  RecommendationService,
  PersonalizationFactors,
} from './RecommendationService'
import type {
  EfficacyTrackingService,
  EfficacyFeedback,
} from './EfficacyTrackingService'
import type {
  TechniqueAdaptation,
  AdaptationOptions,
  PersonalizationLayerOptions,
  PersonalizationStrategy,
} from './PersonalizationService'
import type { PatternRecognitionService } from './PatternRecognitionService'

// Define local types for pattern handling
interface Pattern {
  id: string
  name: string
  [key: string]: any
}

// Define custom evidence types to avoid imported enum errors
const EVIDENCE_TYPES = {
  EFFICACY_DATA: 'EFFICACY_DATA',
}

// Define the logger for this service
const logger = getLogger({ prefix: 'enhanced-recommendation-service' })

// Define a type for recommendation results
interface RecommendationResult {
  techniques: TherapeuticTechnique[]
  evidence: Array<{
    type: string
    description: string
    strength: number
  }>
  strength: number
  description?: string
}

/**
 * Enhanced recommendation with personalized adaptations
 */
export interface EnhancedRecommendation extends TreatmentRecommendation {
  /**
   * Personalized adaptations of the recommendation
   */
  adaptations?: TechniqueAdaptation[]

  /**
   * Predicted efficacy based on client history and similar cases
   */
  predictedEfficacy: number

  /**
   * Confidence level in the prediction (0-1)
   */
  confidenceLevel: number

  /**
   * Enhanced description with client-specific adaptations
   */
  enhancedDescription?: string

  /**
   * Client-specific instructions
   */
  personalizedInstructions?: string

  /**
   * Additional media recommendations based on client preferences
   */
  mediaRecommendations?: string[]

  /**
   * Alternative approaches if the recommended technique isn't suitable
   */
  alternativeApproaches?: string[]

  /**
   * Metadata about the personalization process
   */
  personalizationMetadata?: {
    personalizationScore: number
    personalizationLevel: 'low' | 'medium' | 'high'
    strategiesApplied: PersonalizationStrategy[]
    clientInteractionCount: number
  }
}

/**
 * Options for generating enhanced therapeutic recommendations
 */
export interface EnhancedRecommendationOptions extends RecommendationOptions {
  /**
   * Options for personalizing recommendations
   */
  personalizationOptions?: AdaptationOptions

  /**
   * Whether to include detailed efficacy statistics
   */
  includeEfficacyStats?: boolean

  /**
   * Whether to include alternative approaches
   */
  includeAlternatives?: boolean

  /**
   * Maximum number of media recommendations to include
   */
  maxMediaRecommendations?: number

  /**
   * Advanced personalization layer options
   */
  personalizationLayerOptions?: PersonalizationLayerOptions
}

/**
 * Detailed feedback for tracking recommendation efficacy
 */
export interface RecommendationFeedback extends EfficacyFeedback {
  /**
   * Client comments on the recommendation
   */
  comments?: string

  /**
   * Whether the client applied the technique correctly
   */
  correctImplementation?: boolean

  /**
   * Any adverse effects experienced (for safety monitoring)
   */
  adverseEffects?: string[]

  /**
   * Any barriers to implementation encountered
   */
  implementationBarriers?: string[]

  /**
   * Duration of technique application (in minutes)
   */
  applicationDuration?: number

  /**
   * Context in which the technique was applied
   */
  applicationContext?: string

  /**
   * Name of the technique
   */
  techniqueName?: string
}

/**
 * Custom evidence weight strategy that integrates efficacy data
 */
export class EnhancedEvidenceWeightStrategy implements EvidenceWeightStrategy {
  constructor(private readonly efficacyService: EfficacyTrackingService) {}

  calculateWeight(
    evidence: EvidenceSource,
    techniqueRelevance: number,
    patternRelevance: number,
  ): number {
    // Base weight calculation without efficacy data
    let weight = evidence.confidence * 0.35

    // Add weights from relevance scores
    weight += evidence.relevanceScore * 0.25
    weight += techniqueRelevance * 0.15
    weight += patternRelevance * 0.1

    // Adjust weight based on evidence type
    const typeMultipliers: Record<EvidenceSource['type'], number> = {
      'meta-analysis': 1.3,
      'study': 1.0,
      'guideline': 1.2,
      'expert': 0.8,
    }

    weight *= typeMultipliers[evidence.type] || 1.0

    return weight
  }

  /**
   * Extended weight calculation that includes efficacy data
   * This is meant to be called separately when efficacy data is needed
   */
  async calculateWeightWithEfficacy(
    evidence: EvidenceSource,
    techniqueRelevance: number,
    patternRelevance: number,
    techniqueId: string,
    indication: string,
  ): Promise<number> {
    // Get base weight first
    let weight = this.calculateWeight(
      evidence,
      techniqueRelevance,
      patternRelevance,
    )

    // Add weight based on efficacy data if available
    if (techniqueId && indication) {
      try {
        // Get efficacy stats for the technique
        const efficacyData =
          await this.efficacyService.getTechniquesEfficacyStats([techniqueId])
        const stats = efficacyData.get(techniqueId)

        if (stats && stats.sampleSize >= 5) {
          // If we have sufficient data, incorporate it
          // Give more weight to efficacy data that has larger sample sizes
          const sampleSizeWeight = Math.min(stats.sampleSize / 50, 1.0) // Cap at 1.0

          // Check if there's indication-specific efficacy data
          if (
            stats.byIndication[indication] &&
            stats.byIndication[indication].sampleSize >= 3
          ) {
            // Use indication-specific efficacy with higher weight
            weight +=
              stats.byIndication[indication].averageEfficacy *
              0.15 *
              sampleSizeWeight
          } else {
            // Use overall efficacy with lower weight
            weight += stats.averageEfficacy * 0.1 * sampleSizeWeight
          }
        }
      } catch (error) {
        // If efficacy data retrieval fails, just continue with base weights
        logger.debug(
          'Failed to retrieve efficacy data for weight calculation',
          {
            techniqueId,
            indication,
            error,
          },
        )
      }
    }

    return weight
  }
}

// PersonalizationFactors is now imported from RecommendationService

/**
 * Enhanced recommendation service with additional features
 */
export class EnhancedRecommendationService extends RecommendationService {
  protected logger = getLogger({ prefix: 'enhanced-recommendation-service' })

  constructor(
    patternRecognitionService: PatternRecognitionService,
    private readonly efficacyService?: EfficacyTrackingService,
  ) {
    super(patternRecognitionService)
  }

  /**
   * Generate enhanced recommendations based on client ID and personalization factors
   */
  async generateRecommendations(
    clientId: string,
    personalizationFactors?: PersonalizationFactors,
    options: RecommendationOptions = {},
  ): Promise<TreatmentRecommendation[]> {
    // Use any to safely access potentially non-existent properties
    const factorsAny = personalizationFactors as any
    const detectedPatterns = factorsAny?.detectedPatterns || []

    this.logger.info('Generating enhanced recommendations', {
      patternCount: detectedPatterns.length,
      clientId,
    })

    try {
      // Get base recommendations from parent class
      const baseRecommendations = await super.generateRecommendations(
        clientId,
        personalizationFactors,
        options,
      )

      // Convert to our internal format for processing
      const recommendations = baseRecommendations.map((rec) => {
        // Create internal recommendation result object
        return {
          techniques: rec.techniques || [],
          // We'll create our own evidence array since the base recommendations don't have it
          evidence: [],
          strength: rec.evidenceStrength || 0.5,
          description: rec.description,
        } as RecommendationResult
      })

      // If efficacy service is available, enhance recommendations with efficacy data
      if (this.efficacyService && recommendations.length > 0) {
        await this.enhanceWithEfficacyData(
          recommendations,
          clientId,
          detectedPatterns,
        )
      }

      // Convert back to TreatmentRecommendation format by merging properties
      return recommendations.map((rec, index) => {
        const baseRec = baseRecommendations[index] || {}
        return {
          ...baseRec,
          evidenceStrength: rec.strength,
          description: rec.description || baseRec.description,
        } as TreatmentRecommendation
      })
    } catch (error) {
      this.logger.error('Error generating enhanced recommendations', {
        error,
        clientId,
      })
      throw new Error(
        `Failed to generate recommendations: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Enhance recommendations with efficacy data
   */
  private async enhanceWithEfficacyData(
    recommendations: RecommendationResult[],
    clientId: string,
    patterns: Pattern[],
  ): Promise<void> {
    if (!this.efficacyService) {
      return
    }

    try {
      // Extract all techniques from recommendations
      const techniques = recommendations.flatMap((r) => r.techniques)

      // Extract indications from patterns
      const indications = patterns.map((p) => p.name.toLowerCase())

      // Get personalized efficacy predictions
      const efficacyPredictions =
        await this.efficacyService.getPersonalizedEfficacyPredictions(
          clientId,
          techniques,
          indications,
        )

      // Enhance each recommendation with efficacy data
      for (const recommendation of recommendations) {
        // Get all technique IDs
        const techniqueIds = recommendation.techniques.map((t) => t.id)

        // Calculate average efficacy across all techniques in the recommendation
        let totalEfficacy = 0
        let count = 0

        for (const techniqueId of techniqueIds) {
          const predictedEfficacy = efficacyPredictions.get(techniqueId)

          if (predictedEfficacy !== undefined) {
            totalEfficacy += predictedEfficacy
            count++

            // Add efficacy evidence for this technique
            recommendation.evidence.push({
              type: EVIDENCE_TYPES.EFFICACY_DATA,
              description: `Based on efficacy data, this technique has a predicted efficacy of ${(predictedEfficacy * 100).toFixed(0)}% for this client.`,
              strength: predictedEfficacy,
            })
          }
        }

        // Calculate average efficacy if we have data
        if (count > 0) {
          const averageEfficacy = totalEfficacy / count

          // Adjust overall recommendation strength with a weighted average
          const updatedStrength =
            recommendation.strength * 0.75 + averageEfficacy * 0.25

          // Create updated recommendation with new strength
          Object.assign(recommendation, { strength: updatedStrength })

          // Update description to include efficacy information
          this.addEfficacyInfoToDescription(recommendation, averageEfficacy)
        }
      }

      // Re-sort recommendations by strength since we've adjusted them
      recommendations.sort((a, b) => b.strength - a.strength)
    } catch (error) {
      this.logger.warn('Failed to enhance recommendations with efficacy data', {
        error,
        clientId,
      })
      // Continue without efficacy data rather than failing
    }
  }

  /**
   * Add efficacy information to recommendation description
   */
  private addEfficacyInfoToDescription(
    recommendation: RecommendationResult,
    efficacy: number,
  ): void {
    const efficacyText = this.getEfficacyText(efficacy)

    if (recommendation.description) {
      // Append to existing description
      recommendation.description += ` ${efficacyText}`
    } else {
      // Set description if none exists
      Object.assign(recommendation, { description: efficacyText })
    }
  }

  /**
   * Generate descriptive text about efficacy
   */
  private getEfficacyText(efficacy: number): string {
    if (efficacy >= 0.85) {
      return 'This technique has shown excellent results with similar clients and situations.'
    } else if (efficacy >= 0.7) {
      return 'This technique has shown good results with similar clients and situations.'
    } else if (efficacy >= 0.5) {
      return 'This technique has shown moderate effectiveness with similar clients and situations.'
    } else {
      return 'While this technique matches the situation, it has shown variable results with similar clients.'
    }
  }

  /**
   * Record efficacy feedback for a recommendation
   */
  async recordRecommendationFeedback(
    recommendationId: string,
    clientId: string,
    techniqueId: string,
    efficacyRating: number,
    context?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.efficacyService) {
      this.logger.warn('Efficacy service not available for recording feedback')
      return
    }

    try {
      // Explicitly create the feedback object with clear property assignments
      await this.efficacyService.recordEfficacyFeedback({
        recommendationId,
        clientId,
        techniqueId,
        efficacyRating,
        timestamp: new Date(),
        context,
      })

      this.logger.info('Recorded recommendation feedback', {
        recommendationId,
        clientId,
        techniqueId,
        efficacyRating,
      })
    } catch (error) {
      this.logger.error('Failed to record recommendation feedback', {
        error,
        recommendationId,
        clientId,
      })
      // Convert to a new error with a descriptive message
      throw new Error(
        `Failed to record recommendation feedback: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get most effective techniques for a specific indication
   */
  async getMostEffectiveTechniquesForIndication(
    indication: string,
    limit: number = 5,
  ): Promise<Partial<TherapeuticTechnique>[]> {
    if (!this.efficacyService) {
      this.logger.warn(
        'Efficacy service not available for getting effective techniques',
      )
      return []
    }

    try {
      // Get effective techniques directly from the efficacy service and map them
      return (
        await this.efficacyService.getMostEffectiveTechniquesForIndication(
          indication,
          limit,
        )
      ).map((t) => ({
        id: t.techniqueId,
        name: t.techniqueName,
        efficacyRating: t.averageEfficacy,
      }))
    } catch (error) {
      this.logger.error('Failed to get most effective techniques', {
        error,
        indication,
      })
      return []
    }
  }
}
