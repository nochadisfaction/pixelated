/**
 * Evidence-based Recommendation Service
 *
 * This service provides evidence-based recommendations based on pattern recognition
 * analysis, utilizing FHE for secure processing of sensitive client data.
 */

import { getLogger } from '../../logging'
import type { PatternRecognitionService } from './PatternRecognitionService'
import type {
  CrossSessionPattern,
  TrendPattern,
  RiskCorrelation,
} from '../../fhe/pattern-recognition'
import type { IRedisService } from '../../services/redis/types'
import type { AIRepository } from '../../db/ai/repository'
import type { TherapySession, EmotionAnalysis } from '../../ai/AIService'
import type {
  EfficacyTrackingService,
  EfficacyFeedback,
} from './EfficacyTrackingService'
import type { PersonalizationService } from './PersonalizationService'
import type { PersonalizationLayerFactory } from './PersonalizationLayerFactory'

// ExtendedEmotionAnalysis interface to include sessionId
interface ExtendedEmotionAnalysis extends EmotionAnalysis {
  sessionId: string
}

// Define the logger for this service
const logger = getLogger({ prefix: 'recommendation-service' })

/**
 * Interface for evidence sources used in recommendations
 */
export interface EvidenceSource {
  id: string
  name: string
  type: 'study' | 'guideline' | 'expert' | 'meta-analysis'
  confidence: number
  relevanceScore: number
  citation: string
  url?: string
}

/**
 * Interface for therapeutic technique with efficacy data
 */
export interface TherapeuticTechnique {
  id: string
  name: string
  description: string
  indicatedFor: string[]
  contraindications: string[]
  efficacyRating: number
  evidenceSources: EvidenceSource[]
}

/**
 * Interface for treatment recommendation with supporting evidence
 */
export interface TreatmentRecommendation {
  id: string
  clientId: string
  recommendationType: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  techniques: TherapeuticTechnique[]
  evidenceStrength: number
  supportingPatterns: (TrendPattern | CrossSessionPattern | RiskCorrelation)[]
  createdAt: Date
  validUntil: Date
  personalizationScore?: number
  personalizedDescription?: string
}

/**
 * Interface for personalization factors to adjust recommendations
 */
export interface PersonalizationFactors {
  clientPreferences?: string[]
  pastTechniqueEfficacy?: Record<string, number>
  clientCharacteristics?: Record<string, unknown>
  treatmentHistory?: string[]
}

/**
 * Options for recommendation generation
 */
export interface RecommendationOptions {
  maxRecommendations?: number
  priorityThreshold?: number
  includeContraindicated?: boolean
  evidenceThreshold?: number
  personalizedRanking?: boolean
  useAdvancedPersonalization?: boolean
  personalizationLayerType?: 'standard' | 'enhanced' | 'adaptive' | 'contextual'
}

/**
 * Interface for client session data
 */
export interface ClientSession extends TherapySession {
  [key: string]: unknown
}

/**
 * Interface for the technique repository operations
 */
interface ITechniqueRepository {
  getTechniques(): Promise<TherapeuticTechnique[]>
  getEvidenceSources(): Promise<EvidenceSource[]>
}

/**
 * Interface for the client repository operations
 */
interface IClientRepository {
  getClientSessions(options: {
    clientId: string
    startDate: Date
    endDate: Date
  }): Promise<ClientSession[]>
  getEmotionAnalysisForSessions?(
    sessionIds: string[],
  ): Promise<ExtendedEmotionAnalysis[]>
}

/**
 * Interface for the recommendation repository operations
 */
interface IRecommendationRepository {
  storeRecommendation(recommendation: TreatmentRecommendation): Promise<void>
  getClientRecommendations(
    clientId: string,
    limit: number,
  ): Promise<TreatmentRecommendation[]>
  updateRecommendationEfficacy(
    recommendationId: string,
    efficacyRating: number,
    feedback?: string,
  ): Promise<void>
}

/**
 * Interface for evidence weight calculation strategies
 */
export interface EvidenceWeightStrategy {
  calculateWeight(
    evidence: EvidenceSource,
    techniqueRelevance: number,
    patternRelevance: number,
  ): number
}

/**
 * Default evidence weight calculation strategy
 */
class DefaultEvidenceWeightStrategy implements EvidenceWeightStrategy {
  calculateWeight(
    evidence: EvidenceSource,
    techniqueRelevance: number,
    patternRelevance: number,
  ): number {
    // Base weight from evidence confidence
    let weight = evidence.confidence * 0.4

    // Add weights from relevance scores
    weight += evidence.relevanceScore * 0.3
    weight += techniqueRelevance * 0.2
    weight += patternRelevance * 0.1

    // Adjust weight based on evidence type
    const typeMultipliers: Record<EvidenceSource['type'], number> = {
      'meta-analysis': 1.3,
      'study': 1.0,
      'guideline': 1.2,
      'expert': 0.8,
    }

    return weight * (typeMultipliers[evidence.type] || 1.0)
  }
}

/**
 * Evidence-based recommendation service for therapeutic interventions
 */
export class RecommendationService {
  private techniqueRegistry: Map<string, TherapeuticTechnique> = new Map()
  private evidenceSourceRegistry: Map<string, EvidenceSource> = new Map()
  private evidenceWeightStrategy: EvidenceWeightStrategy
  private personalizationService: PersonalizationService | null = null
  private personalizationLayerFactory: PersonalizationLayerFactory | null = null

  constructor(
    private readonly patternRecognitionService: PatternRecognitionService,
    private readonly redisService?: IRedisService,
    private readonly clientRepository?: AIRepository & IClientRepository,
    private readonly techniqueRepository?: AIRepository & ITechniqueRepository,
    private readonly recommendationRepository?: AIRepository &
      IRecommendationRepository,
    private readonly efficacyTrackingService?: EfficacyTrackingService,
    evidenceWeightStrategy?: EvidenceWeightStrategy,
    personalizationService?: PersonalizationService,
    personalizationLayerFactory?: PersonalizationLayerFactory,
  ) {
    this.loadTechniqueRegistry()
    this.loadEvidenceSourceRegistry()
    this.evidenceWeightStrategy =
      evidenceWeightStrategy || new DefaultEvidenceWeightStrategy()
    this.personalizationService = personalizationService || null
    this.personalizationLayerFactory = personalizationLayerFactory || null
  }

  /**
   * Load available therapeutic techniques into memory
   */
  private async loadTechniqueRegistry(): Promise<void> {
    try {
      // If we have a technique repository, load from there
      if (this.techniqueRepository) {
        const techniques = await this.techniqueRepository.getTechniques()
        techniques.forEach((technique: TherapeuticTechnique) => {
          this.techniqueRegistry.set(technique.id, technique)
        })
        logger.info('Loaded technique registry', { count: techniques.length })
      } else {
        // Otherwise load sample techniques for development
        this.loadSampleTechniques()
        logger.warn(
          'No technique repository available, loaded sample techniques',
        )
      }
    } catch (error) {
      logger.error('Failed to load technique registry', { error })
      // Load samples as fallback
      this.loadSampleTechniques()
    }
  }

  /**
   * Load available evidence sources into memory
   */
  private async loadEvidenceSourceRegistry(): Promise<void> {
    try {
      // If we have a repository, load from there
      if (this.techniqueRepository) {
        const sources = await this.techniqueRepository.getEvidenceSources()
        sources.forEach((source: EvidenceSource) => {
          this.evidenceSourceRegistry.set(source.id, source)
        })
        logger.info('Loaded evidence source registry', {
          count: sources.length,
        })
      } else {
        // Otherwise load sample sources for development
        this.loadSampleEvidenceSources()
        logger.warn('No evidence repository available, loaded sample sources')
      }
    } catch (error) {
      logger.error('Failed to load evidence source registry', { error })
      // Load samples as fallback
      this.loadSampleEvidenceSources()
    }
  }

  /**
   * Load sample techniques for development
   */
  private loadSampleTechniques(): void {
    const sampleTechniques: TherapeuticTechnique[] = [
      {
        id: 'tech-001',
        name: 'Cognitive Restructuring',
        description: 'Identifying and challenging negative thought patterns',
        indicatedFor: ['anxiety', 'depression', 'stress'],
        contraindications: ['active psychosis', 'severe cognitive impairment'],
        efficacyRating: 0.85,
        evidenceSources: [],
      },
      {
        id: 'tech-002',
        name: 'Mindfulness Meditation',
        description: 'Present-moment awareness practice',
        indicatedFor: ['anxiety', 'stress', 'emotion regulation'],
        contraindications: [
          'trauma-related dissociation without stabilization',
        ],
        efficacyRating: 0.78,
        evidenceSources: [],
      },
      {
        id: 'tech-003',
        name: 'Exposure Therapy',
        description: 'Gradual exposure to feared stimuli',
        indicatedFor: ['phobias', 'ptsd', 'ocd'],
        contraindications: ['active suicidality', 'unmanaged psychosis'],
        efficacyRating: 0.82,
        evidenceSources: [],
      },
    ]

    sampleTechniques.forEach((technique) => {
      this.techniqueRegistry.set(technique.id, technique)
    })
  }

  /**
   * Load sample evidence sources for development
   */
  private loadSampleEvidenceSources(): void {
    const sampleSources: EvidenceSource[] = [
      {
        id: 'ev-001',
        name: 'Meta-analysis of CBT for Anxiety Disorders',
        type: 'meta-analysis',
        confidence: 0.92,
        relevanceScore: 0.88,
        citation:
          'Hoffman, S. G., et al. (2022). Journal of Anxiety Disorders, 45, 43-78.',
        url: 'https://doi.org/10.1016/j.janxdis.2022.08.021',
      },
      {
        id: 'ev-002',
        name: 'Clinical Practice Guidelines for Depression',
        type: 'guideline',
        confidence: 0.87,
        relevanceScore: 0.79,
        citation:
          'American Psychological Association. (2023). Clinical Practice Guideline for the Treatment of Depression.',
        url: 'https://www.apa.org/depression-guideline/guideline.pdf',
      },
      {
        id: 'ev-003',
        name: 'Mindfulness-Based Interventions for Stress Reduction',
        type: 'study',
        confidence: 0.83,
        relevanceScore: 0.76,
        citation:
          'Kabat-Zinn, J., et al. (2023). Journal of Consulting and Clinical Psychology, 91(2), 123-145.',
      },
      {
        id: 'ev-004',
        name: 'Expert Consensus on Exposure Therapy',
        type: 'expert',
        confidence: 0.78,
        relevanceScore: 0.82,
        citation:
          'Foa, E. B., et al. (2022). Journal of Anxiety Disorders, 44, 121-136.',
      },
      {
        id: 'ev-005',
        name: 'Efficacy of Mindfulness for Emotion Regulation',
        type: 'study',
        confidence: 0.84,
        relevanceScore: 0.78,
        citation: 'Chambers, R., et al. (2023). Emotion, 13(3), 456-471.',
      },
    ]

    sampleSources.forEach((source) => {
      this.evidenceSourceRegistry.set(source.id, source)
    })
  }

  /**
   * Generate recommendations for a client based on pattern analysis
   */
  async generateRecommendations(
    clientId: string,
    personalizationFactors?: PersonalizationFactors,
    options: RecommendationOptions = {},
  ): Promise<TreatmentRecommendation[]> {
    logger.info('Generating recommendations', { clientId })

    try {
      // Get pattern recognition data
      // Note: This is handled by the FHE-enabled PatternRecognitionService
      // Get date range for trend analysis - default to last 90 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)

      const trendPatterns =
        await this.patternRecognitionService.analyzeLongTermTrends(
          clientId,
          startDate,
          endDate,
        )

      // Get recent sessions for cross-session analysis
      const recentSessions = await this.getClientSessions(
        clientId,
        startDate,
        endDate,
      )
      const crossSessionPatterns =
        await this.patternRecognitionService.detectCrossSessionPatterns(
          clientId,
          recentSessions,
        )

      // Convert sessions to emotion analysis format
      const sessionsEmotionData = await this.getEmotionAnalysisForSessions(
        clientId,
        recentSessions,
      )

      const riskCorrelations =
        await this.patternRecognitionService.analyzeRiskFactorCorrelations(
          clientId,
          sessionsEmotionData,
        )

      logger.info('Pattern detection complete', {
        clientId,
        trendCount: trendPatterns.length,
        crossSessionCount: crossSessionPatterns.length,
        riskCount: riskCorrelations.length,
      })

      // If personalizationFactors not provided, try to get them
      if (!personalizationFactors && this.personalizationService) {
        personalizationFactors =
          await this.personalizationService.createPersonalizationFactors(
            clientId,
          )
      }

      // Match patterns to techniques and generate recommendations
      const recommendations = this.matchPatternsToTechniques(
        clientId,
        trendPatterns,
        crossSessionPatterns,
        riskCorrelations,
        personalizationFactors,
        options,
      )

      // Apply advanced personalization if requested and available
      if (
        (options.useAdvancedPersonalization || options.personalizedRanking) &&
        (this.personalizationService || this.personalizationLayerFactory)
      ) {
        const personalizedRecommendations =
          await this.applyPersonalizationLayer(
            clientId,
            recommendations,
            options,
          )

        // Store the recommendations for future reference
        await this.persistRecommendations(clientId, personalizedRecommendations)

        return personalizedRecommendations
      }

      // Store the recommendations for future reference
      await this.persistRecommendations(clientId, recommendations)

      return recommendations
    } catch (error) {
      logger.error('Error generating recommendations', { clientId, error })
      return []
    }
  }

  /**
   * Apply personalization layer to recommendations
   */
  private async applyPersonalizationLayer(
    clientId: string,
    recommendations: TreatmentRecommendation[],
    options: RecommendationOptions = {},
  ): Promise<TreatmentRecommendation[]> {
    logger.info('Applying personalization layer', {
      clientId,
      recommendationsCount: recommendations.length,
    })

    try {
      // Get or create personalization service
      let personalization = this.personalizationService

      // Use factory to create optimal personalization if available
      if (this.personalizationLayerFactory) {
        if (options.personalizationLayerType) {
          // Create specific layer type
          personalization =
            this.personalizationLayerFactory.createPersonalizationLayer({
              layerType: options.personalizationLayerType,
            })
        } else {
          // Create optimal layer based on client data
          personalization =
            await this.personalizationLayerFactory.createOptimalPersonalizationLayer(
              clientId,
            )
        }
      }

      if (!personalization) {
        logger.warn('No personalization service available', { clientId })
        return recommendations
      }

      // Apply personalization layer
      const result = await personalization.applyPersonalizationLayer(
        clientId,
        recommendations,
      )

      // Transform results back to recommendation format
      return result.personalizedRecommendations.map((rec) => {
        return {
          ...rec,
          personalizationScore: rec.personalizationScore || 0,
          personalizedDescription: rec.personalizedDescription,
        } as TreatmentRecommendation
      })
    } catch (error) {
      logger.error('Error applying personalization layer', { clientId, error })
      return recommendations
    }
  }

  /**
   * Retrieve client sessions for analysis
   */
  private async getClientSessions(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ClientSession[]> {
    try {
      if (this.clientRepository) {
        return await this.clientRepository.getClientSessions({
          clientId,
          startDate,
          endDate,
        })
      } else {
        // For development, return mock sessions
        return this.createSampleSessions(clientId, startDate, endDate)
      }
    } catch (error) {
      logger.error('Error retrieving client sessions', {
        clientId,
        startDate,
        endDate,
        error,
      })
      return []
    }
  }

  /**
   * Create sample sessions for development
   */
  private createSampleSessions(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): ClientSession[] {
    const sessions: ClientSession[] = []
    const daySpan = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 3600 * 1000),
    )
    const sessionCount = Math.min(10, Math.max(3, Math.floor(daySpan / 7)))

    for (let i = 0; i < sessionCount; i++) {
      const sessionDate = new Date(
        startDate.getTime() +
          (i * (endDate.getTime() - startDate.getTime())) / sessionCount,
      )
      const sessionId = `sample-session-${clientId}-${i}`

      sessions.push({
        sessionId,
        clientId,
        startTime: sessionDate,
        endTime: new Date(sessionDate.getTime() + 50 * 60 * 1000), // 50 minutes
        notes: 'Sample session notes for development',
        type: 'therapy',
        provider: 'sample-provider',
        // Add required properties for ClientSession
        therapistId: 'sample-therapist',
        status: 'completed',
        securityLevel: 'standard',
        emotionAnalysisEnabled: false,
      })
    }

    return sessions
  }

  /**
   * Extract emotion analysis data from client sessions
   */
  private async getEmotionAnalysisForSessions(
    clientId: string,
    sessions: ClientSession[],
  ): Promise<ExtendedEmotionAnalysis[]> {
    try {
      // Extract emotion analysis data from sessions if available
      const emotionData: ExtendedEmotionAnalysis[] = []

      for (const session of sessions) {
        if (session.emotionAnalysis) {
          // Try to create an extended analysis from session data
          try {
            const extendedAnalysis: ExtendedEmotionAnalysis = {
              sessionId: session.sessionId,
              // Fill with minimal required EmotionAnalysis properties
              id: `ext-emo-${session.sessionId}-${Date.now()}`,
              timestamp: new Date(),
              emotions: [],
              overallSentiment: 'unknown',
              riskFactors: [],
              requiresAttention: false,
            }

            emotionData.push(extendedAnalysis)
          } catch (err) {
            logger.warn('Could not create extended emotion analysis', {
              sessionId: session.sessionId,
              error: err,
            })
          }
        }
      }

      if (emotionData.length > 0) {
        return emotionData
      }

      // If no emotion data in sessions, try to fetch from repository
      if (
        this.clientRepository &&
        'getEmotionAnalysisForSessions' in this.clientRepository &&
        typeof this.clientRepository.getEmotionAnalysisForSessions ===
          'function'
      ) {
        const sessionIds = sessions.map((s) => s.sessionId)
        return await this.clientRepository.getEmotionAnalysisForSessions(
          sessionIds,
        )
      }

      // Fallback to empty array if no data available
      logger.warn('No emotion analysis data available for risk correlation', {
        clientId,
      })
      return []
    } catch (error) {
      logger.error('Error fetching emotion analysis for sessions', {
        clientId,
        error,
      })
      return []
    }
  }

  /**
   * Match detected patterns to therapeutic techniques
   */
  private matchPatternsToTechniques(
    clientId: string,
    trendPatterns: TrendPattern[],
    crossSessionPatterns: CrossSessionPattern[],
    riskCorrelations: RiskCorrelation[],
    personalizationFactors?: PersonalizationFactors,
    options: RecommendationOptions = {},
  ): TreatmentRecommendation[] {
    const maxRecommendations = options.maxRecommendations || 3
    const priorityThreshold = options.priorityThreshold || 0.5
    const evidenceThreshold = options.evidenceThreshold || 0.6
    const includeContraindicated = options.includeContraindicated || false

    // Extract and consolidate relevant indicators from patterns
    const indicators = new Map<string, number>()

    // Process trend patterns
    trendPatterns.forEach((pattern) => {
      const indicator = pattern.type.toLowerCase()
      const currentValue = indicators.get(indicator) || 0
      indicators.set(indicator, Math.max(currentValue, pattern.confidence))
    })

    // Process cross-session patterns
    crossSessionPatterns.forEach((pattern) => {
      const indicator = pattern.type.toLowerCase()
      const currentValue = indicators.get(indicator) || 0
      indicators.set(indicator, Math.max(currentValue, pattern.confidence))
    })

    // Process risk correlations
    riskCorrelations.forEach((risk) => {
      const indicator = risk.riskFactor.toLowerCase()
      const currentValue = indicators.get(indicator) || 0
      indicators.set(indicator, Math.max(currentValue, risk.confidence))
    })

    // Find matching techniques based on indicators
    const techniqueScores = new Map<
      string,
      {
        technique: TherapeuticTechnique
        score: number
        evidenceStrength: number
        relevantPatterns: Array<
          TrendPattern | CrossSessionPattern | RiskCorrelation
        >
      }
    >()

    // Score each technique based on indicators and evidence
    this.techniqueRegistry.forEach((technique) => {
      // Skip contraindicated techniques unless specifically included
      if (
        !includeContraindicated &&
        this.isContraindicated(technique, personalizationFactors)
      ) {
        return
      }

      let score = 0
      let evidenceStrength = 0
      const relevantPatterns: Array<
        TrendPattern | CrossSessionPattern | RiskCorrelation
      > = []

      // For each indicator the technique is indicated for
      technique.indicatedFor.forEach((indication) => {
        const indicationWeight = indicators.get(indication.toLowerCase())
        if (indicationWeight) {
          score += indicationWeight

          // Find patterns that match this indication
          const matchingTrends = trendPatterns.filter(
            (p) => p.type.toLowerCase() === indication.toLowerCase(),
          )
          const matchingCrossPatterns = crossSessionPatterns.filter(
            (p) => p.type.toLowerCase() === indication.toLowerCase(),
          )
          const matchingRisks = riskCorrelations.filter(
            (r) => r.riskFactor.toLowerCase() === indication.toLowerCase(),
          )

          relevantPatterns.push(
            ...matchingTrends,
            ...matchingCrossPatterns,
            ...matchingRisks,
          )

          // Calculate evidence strength for this indication
          evidenceStrength += this.calculateEvidenceStrength(
            technique,
            indication,
            indicationWeight,
          )
        }
      })

      // Normalize score based on number of indications
      if (technique.indicatedFor.length > 0) {
        score /= technique.indicatedFor.length
      }

      // Apply personalization if available
      if (personalizationFactors && options.personalizedRanking) {
        score = this.applyPersonalization(
          score,
          technique,
          personalizationFactors,
        )
      }

      // Add to techniques if score is above threshold
      if (score > 0 && relevantPatterns.length > 0) {
        techniqueScores.set(technique.id, {
          technique,
          score,
          evidenceStrength,
          relevantPatterns,
        })
      }
    })

    // Sort techniques by score
    const sortedTechniques = Array.from(techniqueScores.values()).sort(
      (a, b) => b.score - a.score,
    )

    // Create recommendations from top techniques
    const recommendations: TreatmentRecommendation[] = []

    sortedTechniques.slice(0, maxRecommendations).forEach((item) => {
      const priority: 'high' | 'medium' | 'low' =
        item.score > 0.7 ? 'high' : item.score > 0.4 ? 'medium' : 'low'

      // Only include recommendations above the priority threshold
      if (
        ((priority === 'high' && priorityThreshold <= 0.7) ||
          (priority === 'medium' && priorityThreshold <= 0.4) ||
          (priority === 'low' && priorityThreshold <= 0.1)) &&
        item.evidenceStrength >= evidenceThreshold
      ) {
        const recommendationId = `rec-${clientId}-${Date.now()}-${recommendations.length}`
        const validUntil = new Date()
        validUntil.setDate(validUntil.getDate() + 30) // Valid for 30 days

        recommendations.push({
          id: recommendationId,
          clientId,
          recommendationType: 'therapeutic-technique',
          title: `${item.technique.name} Recommendation`,
          description: this.generateRecommendationDescription(
            item.technique,
            item.relevantPatterns,
          ),
          priority,
          techniques: [item.technique],
          evidenceStrength: item.evidenceStrength,
          supportingPatterns: item.relevantPatterns,
          createdAt: new Date(),
          validUntil,
        })
      }
    })

    logger.info('Generated recommendations', {
      clientId,
      count: recommendations.length,
    })

    return recommendations
  }

  /**
   * Calculate evidence strength for a technique and indication
   */
  private calculateEvidenceStrength(
    technique: TherapeuticTechnique,
    indication: string,
    patternRelevance: number,
  ): number {
    if (!technique.evidenceSources || technique.evidenceSources.length === 0) {
      // No evidence sources, use base efficacy rating
      return technique.efficacyRating * 0.5
    }

    // Calculate technique-specific relevance score
    const techniqueRelevance = technique.indicatedFor.includes(
      indication.toLowerCase(),
    )
      ? 1.0
      : 0.5

    // Calculate the weighted evidence strength
    let totalWeight = 0
    let weightedSum = 0

    technique.evidenceSources.forEach((source) => {
      const evidenceSource =
        typeof source === 'string'
          ? this.evidenceSourceRegistry.get(source)
          : source

      if (evidenceSource) {
        const weight = this.evidenceWeightStrategy.calculateWeight(
          evidenceSource,
          techniqueRelevance,
          patternRelevance,
        )

        totalWeight += weight
        weightedSum += evidenceSource.confidence * weight
      }
    })

    // Return normalized evidence strength
    return totalWeight > 0
      ? weightedSum / totalWeight
      : technique.efficacyRating * 0.5
  }

  /**
   * Generate a description for a recommendation based on technique and patterns
   */
  private generateRecommendationDescription(
    technique: TherapeuticTechnique,
    patterns: Array<TrendPattern | CrossSessionPattern | RiskCorrelation>,
  ): string {
    // Start with the technique description
    let description = `${technique.description}. `

    // Add pattern context
    if (patterns.length > 0) {
      description +=
        'This recommendation is based on observed patterns including '

      const patternDescriptions = patterns
        .slice(0, 3)
        .map((pattern) => {
          if ('type' in pattern && !('sessions' in pattern)) {
            return `${pattern.type} trend pattern`
          } else if ('type' in pattern && 'sessions' in pattern) {
            return `${pattern.type} cross-session pattern`
          } else if ('riskFactor' in pattern) {
            return `${pattern.riskFactor} risk factor`
          }
          return ''
        })
        .filter(Boolean)

      description += patternDescriptions.join(', ')

      if (patterns.length > 3) {
        description += `, and ${patterns.length - 3} more`
      }

      description += '. '
    }

    // Add evidence context
    if (technique.evidenceSources && technique.evidenceSources.length > 0) {
      description += 'This technique is supported by clinical evidence'

      // Include top evidence source if available
      const topEvidence = technique.evidenceSources[0]
      const evidenceSource =
        typeof topEvidence === 'string'
          ? this.evidenceSourceRegistry.get(topEvidence)
          : topEvidence

      if (evidenceSource) {
        description += `, including ${evidenceSource.type} "${evidenceSource.name}"`
      }

      description += '.'
    }

    return description
  }

  /**
   * Check if a technique is contraindicated for a client
   */
  private isContraindicated(
    technique: TherapeuticTechnique,
    personalizationFactors?: PersonalizationFactors,
  ): boolean {
    if (
      !technique.contraindications ||
      technique.contraindications.length === 0
    ) {
      return false
    }

    if (
      !personalizationFactors ||
      !personalizationFactors.clientCharacteristics
    ) {
      return false
    }

    // Check if any contraindication matches client characteristics
    return technique.contraindications.some((contraindication) => {
      const lowercaseContraindication = contraindication.toLowerCase()

      // Check in client characteristics
      if (personalizationFactors.clientCharacteristics) {
        for (const [key, value] of Object.entries(
          personalizationFactors.clientCharacteristics,
        )) {
          if (
            key.toLowerCase().includes(lowercaseContraindication) ||
            String(value).toLowerCase().includes(lowercaseContraindication)
          ) {
            return true
          }
        }
      }

      return false
    })
  }

  /**
   * Apply personalization factors to a base recommendation score
   */
  private applyPersonalization(
    baseScore: number,
    technique: TherapeuticTechnique,
    factors: PersonalizationFactors,
  ): number {
    let personalizedScore = baseScore

    // Adjust based on past technique efficacy
    if (
      factors.pastTechniqueEfficacy &&
      factors.pastTechniqueEfficacy[technique.id]
    ) {
      const pastEfficacy = factors.pastTechniqueEfficacy[technique.id]
      // Weight past efficacy at 40%
      personalizedScore = personalizedScore * 0.6 + pastEfficacy * 0.4
    }

    // Adjust based on client preferences
    if (factors.clientPreferences) {
      const techniqueNameLower = technique.name.toLowerCase()
      const hasPreference = factors.clientPreferences.some((pref) =>
        techniqueNameLower.includes(pref.toLowerCase()),
      )

      if (hasPreference) {
        // Boost score by 20% if client has preference for this technique
        personalizedScore *= 1.2
      }
    }

    // Apply a cap to the personalized score
    return Math.min(1.0, personalizedScore)
  }

  /**
   * Store recommendations for future reference
   */
  private async persistRecommendations(
    clientId: string,
    recommendations: TreatmentRecommendation[],
  ): Promise<void> {
    if (!this.recommendationRepository) {
      logger.warn(
        'No recommendation repository available, skipping persistence',
        {
          clientId,
        },
      )
      return
    }

    try {
      const storePromises = recommendations.map((rec) =>
        this.recommendationRepository?.storeRecommendation(rec),
      )

      await Promise.all(storePromises)

      logger.info('Persisted recommendations to storage', {
        clientId,
        count: recommendations.length,
      })
    } catch (error) {
      logger.error('Failed to persist recommendations', {
        clientId,
        error,
      })
      // Don't throw error to caller - this is non-critical
    }
  }

  /**
   * Get recommendation history for a client
   */
  async getClientRecommendationHistory(
    clientId: string,
    limit: number = 10,
  ): Promise<TreatmentRecommendation[]> {
    logger.info('Retrieving client recommendation history', {
      clientId,
      limit,
    })

    try {
      if (!this.recommendationRepository) {
        logger.warn('No recommendation repository available', { clientId })
        return []
      }

      const recommendations =
        await this.recommendationRepository.getClientRecommendations(
          clientId,
          limit,
        )

      logger.info('Retrieved client recommendation history', {
        clientId,
        count: recommendations.length,
      })

      return recommendations
    } catch (error) {
      logger.error('Error retrieving client recommendation history', {
        clientId,
        error,
      })
      throw new Error(
        `Failed to retrieve recommendation history: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Track efficacy of a recommendation
   */
  async trackRecommendationEfficacy(
    recommendationId: string,
    clientId: string,
    efficacyRating: number,
    feedback?: string,
    techniqueId?: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    logger.info('Tracking recommendation efficacy', {
      recommendationId,
      clientId,
      efficacyRating,
    })

    try {
      // Update recommendation in repository
      if (this.recommendationRepository) {
        await this.recommendationRepository.updateRecommendationEfficacy(
          recommendationId,
          efficacyRating,
          feedback,
        )
      }

      // Track efficacy if service is available
      if (this.efficacyTrackingService && techniqueId) {
        const efficacyFeedback: EfficacyFeedback = {
          recommendationId,
          clientId,
          techniqueId,
          efficacyRating,
          timestamp: new Date(),
          feedback,
          context,
        }

        await this.efficacyTrackingService.recordEfficacyFeedback(
          efficacyFeedback,
        )
      }

      // Invalidate caches
      const cacheKey = `recommendations:${clientId}:`
      if (this.redisService) {
        await this.redisService.deletePattern(`${cacheKey}*`)
      }

      logger.info('Tracked recommendation efficacy successfully', {
        recommendationId,
        clientId,
      })
    } catch (error) {
      logger.error('Error tracking recommendation efficacy', {
        recommendationId,
        clientId,
        error,
      })
      throw new Error(
        `Failed to track efficacy: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
