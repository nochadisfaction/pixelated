/**
 * Enhanced Patient Model Service
 *
 * Integrates Patient-Psi dataset capabilities with existing cognitive model infrastructure
 * Provides advanced patient simulation and therapeutic training features
 */

import type {
  CognitiveModel,
  PatientResponseContext,
  PatientResponseStyleConfig,
  CoreBelief,
} from '../types/CognitiveModel'
import { PatientModelService } from './PatientModelService'
import { PatientPsiParser } from '../datasets/patient-psi-parser'
import { PatientPsiIndexer } from '../datasets/patient-psi-indexer'
import {
  PatientPsiIntegration,
  type NormalizationResult,
} from '../datasets/patient-psi-integration'
import {
  CopingStrategyResponseService,
  type CopingSelectionCriteria,
  type CopingGenerationOptions,
} from './CopingStrategyResponseService'
import type { KVStore } from '@/lib/db/KVStore'
import {
  getActiveBeliefs,
  getLikelyEmotionalResponses,
} from '../types/CognitiveModel'

export interface EnhancedModelFilters {
  diagnosisCategories?: string[]
  beliefThemes?: string[]
  emotionalIntensityRange?: [number, number]
  communicationStyles?: string[]
  complexityLevel?: 'beginner' | 'intermediate' | 'advanced'
  therapeuticFocus?: string[]
}

export interface ModelRecommendation {
  modelId: string
  matchScore: number
  reasons: string[]
  therapeuticObjectives: string[]
  estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface TherapeuticScenario {
  id: string
  name: string
  description: string
  models: string[]
  learningObjectives: string[]
  expectedChallenges: string[]
  assessmentCriteria: string[]
}

export interface SessionAnalytics {
  sessionId: string
  modelId: string
  therapistInterventions: Array<{
    type: string
    content: string
    timestamp: string
    effectiveness?: number
  }>
  patientResponses: Array<{
    emotionalState: string
    resistanceLevel: number
    engagementLevel: number
    distortionsTriggered: string[]
    timestamp: string
  }>
  therapeuticProgress: {
    insightsGained: string[]
    beliefsAddressed: string[]
    resistanceChanges: number[]
    overallEffectiveness: number
  }
  recommendations: string[]
}

export interface CopingEffectivenessEvaluation {
  copingStrategy: string
  situationContext: string
  effectiveness: {
    immediate: number // 0-1, how well it worked right away
    shortTerm: number // 0-1, effectiveness over hours/days
    longTerm: number // 0-1, effectiveness over weeks/months
    adaptivePotential: number // 0-1, how adaptive vs maladaptive
  }
  sideEffects: {
    emotional: string[] // emotional consequences
    behavioral: string[] // behavioral consequences
    social: string[] // social consequences
    physical: string[] // physical consequences
  }
  contextualFactors: {
    stressLevel: number // 1-10
    socialSupport: 'none' | 'limited' | 'moderate' | 'strong'
    resources: string[] // available resources when used
    barriers: string[] // barriers to implementation
  }
  recommendations: {
    continue: boolean
    modify: string[] // suggested modifications
    alternatives: string[] // alternative strategies to consider
    timing: 'immediate' | 'short-term' | 'long-term' | 'situational'
  }
  confidence: number // 0-1, confidence in evaluation
}

export interface CopingStrategyRecommendation {
  strategy: string
  rationale: string
  implementation: {
    steps: string[]
    timeline: string
    resources: string[]
    support: string[]
  }
  expectedOutcomes: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  riskFactors: string[]
  successIndicators: string[]
  alternatives: string[]
}

export enum ReinforcementType {
  THERAPIST_CONFIRMATION = 'therapist_confirmation',
  PATIENT_EVIDENCE = 'patient_evidence',
  CONSISTENT_EMOTION = 'consistent_emotion',
  // Could add: LACK_OF_CHALLENGE = 'lack_of_challenge'
}

export interface ReinforcementInput {
  beliefId: string // The unique ID of the CoreBelief
  type: ReinforcementType
  sourceText?: string // e.g., the patient's statement providing new evidence
  therapistStatementText?: string // The therapist's statement confirming belief (for evidence logging)
  emotionalContext?: { emotion: string; intensity: number }[]
  strengthIncrement?: number // Optional override for default increment per type
}

export enum ChallengeType {
  THERAPIST_COUNTER_EVIDENCE = 'therapist_counter_evidence',
  PATIENT_EXPRESSES_DOUBT = 'patient_expresses_doubt',
  PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE = 'patient_recalls_contradictory_experience',
}

export interface ChallengeInput {
  beliefId: string
  type: ChallengeType
  sourceText?: string // e.g., patient's statement of doubt or contradictory experience
  therapistStatementText?: string // The therapist's challenging statement
  strengthDecrement?: number // Optional override for default decrement per type
}

// Input for the public orchestrator method
export interface ProcessTurnInput {
  modelId: string
  therapistUtterance: string
  patientUtterance: string // The patient's response in the current turn
  conversationHistory: Array<{ role: 'therapist' | 'patient'; content: string }> // History BEFORE this turn
  // Optional: Pre-calculated NLU data if available from another service
  nluData?: {
    therapistConfirmsBelief?: { beliefId: string; confirmedText: string }
    patientProvidesNewEvidenceForBelief?: {
      beliefId: string
      evidenceText: string
    }
    // Placeholders for challenge detection
    therapistChallengesBelief?: {
      beliefId: string
      challengeText: string
      challengeType: ChallengeType
    }
    patientExpressesDoubtOrContradiction?: {
      beliefId: string
      statementText: string
      challengeType: ChallengeType
    }
  }
}

/**
 * Enhanced Patient Model Service with Patient-Psi integration
 */
export class EnhancedPatientModelService extends PatientModelService {
  private psiParser: PatientPsiParser
  private psiIndexer: PatientPsiIndexer
  private psiIntegration: PatientPsiIntegration
  private copingStrategyService: CopingStrategyResponseService
  private normalizedModels: Map<string, NormalizationResult> = new Map()
  private scenarios: Map<string, TherapeuticScenario> = new Map()

  constructor(kvStore: KVStore) {
    super(kvStore)
    this.psiParser = new PatientPsiParser()
    this.psiIndexer = new PatientPsiIndexer()
    this.psiIntegration = new PatientPsiIntegration(
      this.psiParser,
      this.psiIndexer,
      {
        strictValidation: false,
        preserveOriginalIds: true,
        requireCompleteness: 0.6, // Lower threshold for training data
        enableDataEnrichment: true,
        logConversions: true,
      },
    )
    this.copingStrategyService = new CopingStrategyResponseService()
    this.initializeBuiltInScenarios()
  }

  /**
   * Protected getter for kvStore access from parent class
   */
  protected getKvStore(): KVStore {
    return (this as unknown as { kvStore: KVStore }).kvStore
  }

  /**
   * Import and normalize Patient-Psi dataset
   */
  async importPatientPsiDataset(rawData: unknown[]): Promise<{
    imported: number
    failed: number
    errors: string[]
  }> {
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const rawModel of rawData) {
      try {
        // Parse the raw Patient-Psi data - this returns a CognitiveModel already
        const parsedModel = await this.psiParser.parsePatientPsiModel(rawModel)
        if (!parsedModel) {
          results.failed++
          const modelId = this.extractModelId(rawModel)
          results.errors.push(`Failed to parse model: ${modelId}`)
          continue
        }

        // Since parsePatientPsiModel already returns a CognitiveModel, we can use it directly
        // Store the normalized model
        const success = await this.saveModel(parsedModel)

        if (success) {
          // Create a basic normalization result for tracking
          const normalizationResult = {
            model: parsedModel,
            metadata: {
              sourceDataset: 'patient-psi' as const,
              normalizationDate: new Date().toISOString(),
              originalId: parsedModel.id,
              conversionNotes: ['Direct parsing from Patient-Psi format'],
              validationStatus: 'passed' as const,
              dataQuality: {
                completeness: 0.8,
                consistency: 0.9,
                clinicalValidity: 0.85,
              },
            },
          }
          this.normalizedModels.set(parsedModel.id, normalizationResult)
          results.imported++
        } else {
          results.failed++
          results.errors.push(`Failed to store model ${parsedModel.id}`)
        }
      } catch (error) {
        results.failed++
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(errorMessage)
      }
    }

    return results
  }

  /**
   * Helper method to safely extract model ID from unknown data
   */
  private extractModelId(rawModel: unknown): string {
    if (rawModel && typeof rawModel === 'object' && 'id' in rawModel) {
      return String((rawModel as { id: unknown }).id)
    }
    return 'Unknown ID'
  }

  /**
   * Get recommended models based on training objectives
   */
  async getRecommendedModels(
    learningObjectives: string[],
    therapistLevel: 'beginner' | 'intermediate' | 'advanced',
    filters?: EnhancedModelFilters,
  ): Promise<ModelRecommendation[]> {
    const availableModels = await this.getAvailableModels()
    const recommendations: ModelRecommendation[] = []

    for (const modelInfo of availableModels) {
      const model = await this.getModelById(modelInfo.id)
      if (!model) {
        continue
      }

      const matchScore = this.calculateMatchScore(
        model,
        learningObjectives,
        therapistLevel,
        filters,
      )

      if (matchScore > 0.3) {
        // Minimum relevance threshold
        recommendations.push({
          modelId: model.id,
          matchScore,
          reasons: this.generateMatchReasons(
            model,
            learningObjectives,
            filters,
          ),
          therapeuticObjectives: this.identifyTherapeuticObjectives(model),
          estimatedDifficulty: this.estimateModelDifficulty(model),
        })
      }
    }

    // Sort by match score
    return recommendations.sort((a, b) => b.matchScore - a.matchScore)
  }

  /**
   * Get models with specific cognitive patterns
   */
  async getModelsByPattern(
    patternType: 'core-beliefs' | 'distortions' | 'emotions' | 'behaviors',
    patternValue: string,
    limit: number = 10,
  ): Promise<CognitiveModel[]> {
    const availableModels = await this.getAvailableModels()
    const matchingModels: CognitiveModel[] = []

    for (const modelInfo of availableModels) {
      if (matchingModels.length >= limit) {
        break
      }

      const model = await this.getModelById(modelInfo.id)
      if (!model) {
        continue
      }

      const hasPattern = this.checkModelForPattern(
        model,
        patternType,
        patternValue,
      )
      if (hasPattern) {
        matchingModels.push(model)
      }
    }

    return matchingModels
  }

  /**
   * Create enhanced response context with Patient-Psi insights
   */
  async createEnhancedResponseContext(
    modelId: string,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
    }>,
    customStyleConfig?: Partial<PatientResponseStyleConfig>,
    therapeuticFocus?: string[],
    sessionNumber: number = 1,
  ): Promise<PatientResponseContext | null> {
    // Get base context from parent class
    const baseContext = await this.createResponseContext(
      modelId,
      conversationHistory,
      customStyleConfig,
      therapeuticFocus,
      sessionNumber,
    )

    if (!baseContext) {
      return null
    }

    // Enhance with Patient-Psi specific insights
    const normalizedResult = this.normalizedModels.get(modelId)
    if (normalizedResult) {
      return this.enhanceContextWithPsiInsights(baseContext, normalizedResult)
    }

    return baseContext
  }

  /**
   * Generate detailed patient prompt with Patient-Psi enhancements
   */
  generateEnhancedPatientPrompt(context: PatientResponseContext): string {
    const basePrompt = this.generatePatientPrompt(context)

    // Add Patient-Psi specific instructions
    return `
${basePrompt}

ENHANCED PATIENT SIMULATION GUIDELINES:

Cognitive Conceptualization Depth:
- Respond from the specific belief systems activated in this conversation
- Show the connection between triggered beliefs and emotional responses
- Demonstrate realistic cognitive distortion patterns when appropriate

Communication Style Consistency:
- Maintain your established verbal and emotional expression patterns
- Show realistic resistance levels based on therapeutic alliance
- Vary insight level based on previous session progress

Therapeutic Realism:
- Respond to interventions based on your specific coping mechanisms
- Show realistic progress/setbacks based on session number and rapport
- Include subtle non-verbal cues consistent with emotional state

Remember: You are simulating a real person with complex, interconnected psychological patterns, not just answering questions.
`
  }

  /**
   * Create therapeutic scenario for training
   */
  async createScenario(
    name: string,
    description: string,
    modelIds: string[],
    learningObjectives: string[],
  ): Promise<string> {
    const scenarioId = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Validate models exist
    const validModels: string[] = []
    for (const modelId of modelIds) {
      const model = await this.getModelById(modelId)
      if (model) {
        validModels.push(modelId)
      }
    }

    const scenario: TherapeuticScenario = {
      id: scenarioId,
      name,
      description,
      models: validModels,
      learningObjectives,
      expectedChallenges: this.identifyExpectedChallenges(validModels),
      assessmentCriteria: this.generateAssessmentCriteria(learningObjectives),
    }

    this.scenarios.set(scenarioId, scenario)

    // Store in KV store for persistence
    await this.getKvStore().set(`therapeutic_scenario_${scenarioId}`, scenario)

    return scenarioId
  }

  /**
   * Get therapeutic scenario
   */
  async getScenario(scenarioId: string): Promise<TherapeuticScenario | null> {
    if (this.scenarios.has(scenarioId)) {
      return this.scenarios.get(scenarioId)!
    }

    try {
      const scenario = await this.getKvStore().get<TherapeuticScenario>(
        `therapeutic_scenario_${scenarioId}`,
      )
      if (scenario) {
        this.scenarios.set(scenarioId, scenario)
        return scenario
      }
    } catch (error) {
      console.error(`Failed to load scenario ${scenarioId}:`, error)
    }

    return null
  }

  /**
   * Analyze session for therapeutic effectiveness
   */
  async analyzeSession(
    sessionId: string,
    modelId: string,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
      timestamp?: string
    }>,
  ): Promise<SessionAnalytics> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const analytics: SessionAnalytics = {
      sessionId,
      modelId,
      therapistInterventions:
        this.extractTherapistInterventions(conversationHistory),
      patientResponses: this.analyzePatientResponses(
        conversationHistory,
        model,
      ),
      therapeuticProgress: this.assessTherapeuticProgress(
        conversationHistory,
        model,
      ),
      recommendations: this.generateTherapeuticRecommendations(
        conversationHistory,
        model,
      ),
    }

    return analytics
  }

  /**
   * (Internal NLU Helper - Basic Implementation)
   * Detects if the therapist's utterance likely confirms an active patient belief.
   * TODO: Enhance with more sophisticated NLU (e.g., semantic similarity, intent recognition).
   */
  private detectTherapistConfirmation(
    therapistUtterance: string,
    activeBeliefs: CoreBelief[],
  ): { beliefId: string; confirmedText: string } | null {
    if (!therapistUtterance || activeBeliefs.length === 0) {
      return null
    }
    const utteranceLower = therapistUtterance.toLowerCase()

    // Keywords that might indicate confirmation/validation
    const confirmationKeywords = [
      'yes',
      'true',
      'right',
      'exactly',
      'correct',
      'i agree',
      'that makes sense',
      'i see that',
    ]

    for (const belief of activeBeliefs) {
      // Simple check: if utterance contains confirmation keyword AND part of the belief text
      // This is very basic and prone to false positives/negatives.
      const beliefTextLower = belief.belief.toLowerCase()
      const beliefSnippet = beliefTextLower.substring(
        0,
        Math.min(beliefTextLower.length, 30),
      ) // Check a snippet

      if (
        confirmationKeywords.some((keyword) =>
          utteranceLower.includes(keyword),
        ) &&
        utteranceLower.includes(beliefSnippet)
      ) {
        // More advanced: Check if the utterance is primarily about THIS belief.
        // For now, first match is taken.
        return { beliefId: belief.id, confirmedText: therapistUtterance }
      }

      // Alternative: Check for direct paraphrasing or strong semantic similarity (requires advanced NLU)
      // e.g., if this.hasSemanticSimilarity(utteranceLower, beliefTextLower) > 0.8 (concept)
    }
    return null
  }

  /**
   * (Internal NLU Helper - Basic Implementation)
   * Detects if the patient's utterance likely provides new evidence for an active belief.
   * TODO: Enhance with more sophisticated NLU and contextual understanding.
   */
  private detectPatientNewEvidence(
    patientUtterance: string,
    activeBeliefs: CoreBelief[],
  ): { beliefId: string; evidenceText: string } | null {
    if (!patientUtterance || activeBeliefs.length === 0) {
      return null
    }
    const utteranceLower = patientUtterance.toLowerCase()

    // Keywords/phrases that might introduce evidence
    const evidenceKeywords = [
      'because',
      'since',
      'for example',
      'i know this because',
      'the reason is',
      'look at',
      'you see',
    ]

    for (const belief of activeBeliefs) {
      for (const keyword of evidenceKeywords) {
        if (
          utteranceLower.startsWith(keyword + ' ') ||
          utteranceLower.includes(' ' + keyword + ' ')
        ) {
          const potentialEvidence = patientUtterance
            .substring(utteranceLower.indexOf(keyword) + keyword.length)
            .trim()
          // Basic check: if evidence is new and not too short
          if (
            potentialEvidence.length > 10 &&
            !belief.evidence.some((e) =>
              e
                .toLowerCase()
                .includes(potentialEvidence.toLowerCase().substring(0, 50)),
            )
          ) {
            // And if the utterance also mentions something related to the belief itself (very rough check)
            const beliefSnippet = belief.belief
              .toLowerCase()
              .substring(0, Math.min(belief.belief.length, 30))
            if (
              utteranceLower.includes(beliefSnippet) ||
              belief.relatedDomains.some((d) =>
                utteranceLower.includes(d.toLowerCase()),
              )
            ) {
              return { beliefId: belief.id, evidenceText: potentialEvidence }
            }
          }
        }
      }
    }
    return null
  }

  /**
   * Enhanced NLU Helper - Detects therapist challenges to patient beliefs
   * Uses sophisticated pattern matching and semantic analysis
   */
  private detectTherapistChallenge(
    therapistUtterance: string,
    activeBeliefs: CoreBelief[],
  ): {
    beliefId: string
    challengeText: string
    challengeType: ChallengeType
  } | null {
    if (!therapistUtterance || activeBeliefs.length === 0) {
      return null
    }

    const utteranceLower = therapistUtterance.toLowerCase()

    // Enhanced challenge patterns with confidence scoring
    const challengePatterns = [
      // Counter-evidence patterns
      {
        patterns: [
          /but what about/i,
          /have you considered/i,
          /what if/i,
          /another way to look at/i,
          /evidence suggests/i,
          /research shows/i,
          /studies indicate/i,
          /data shows/i,
          /statistics reveal/i,
          /however/i,
          /on the other hand/i,
          /alternatively/i,
          /could it be that/i,
          /is it possible/i,
          /might there be/i,
          /perhaps/i,
          /maybe/i,
          /what about the times when/i,
          /can you think of instances/i,
          /are there examples/i,
        ],
        type: ChallengeType.THERAPIST_COUNTER_EVIDENCE,
        weight: 1.0,
      },
    ]

    let bestMatch: {
      beliefId: string
      challengeText: string
      challengeType: ChallengeType
      confidence: number
    } | null = null

    for (const belief of activeBeliefs) {
      const beliefKeywords = this.extractBeliefKeywords(belief)
      const beliefRelevance = this.calculateBeliefRelevance(
        utteranceLower,
        beliefKeywords,
      )

      // Lower threshold for better detection - if no relevance, still check for general challenge patterns
      const relevanceThreshold = beliefRelevance > 0.1 ? beliefRelevance : 0.3

      for (const patternGroup of challengePatterns) {
        for (const pattern of patternGroup.patterns) {
          if (pattern.test(utteranceLower)) {
            // Calculate confidence based on pattern strength and belief relevance
            const patternStrength = this.calculatePatternStrength(
              pattern,
              utteranceLower,
            )
            const confidence =
              patternStrength *
              patternGroup.weight *
              Math.max(relevanceThreshold, 0.3)

            if (
              confidence > 0.3 &&
              (!bestMatch || confidence > bestMatch.confidence)
            ) {
              bestMatch = {
                beliefId: belief.id,
                challengeText: therapistUtterance,
                challengeType: patternGroup.type,
                confidence,
              }
            }
          }
        }
      }
    }

    return bestMatch
      ? {
          beliefId: bestMatch.beliefId,
          challengeText: bestMatch.challengeText,
          challengeType: bestMatch.challengeType,
        }
      : null
  }

  /**
   * Calculate the strength of a pattern match in the utterance
   */
  private calculatePatternStrength(pattern: RegExp, utterance: string): number {
    const matches = utterance.match(pattern)
    if (!matches) {
      return 0
    }

    // Base strength for having a match
    let strength = 0.7

    // Boost for multiple matches
    const globalPattern = new RegExp(pattern.source, 'gi')
    const allMatches = utterance.match(globalPattern)
    if (allMatches && allMatches.length > 1) {
      strength += 0.1 * Math.min(allMatches.length - 1, 3)
    }

    // Boost for longer matches (more specific patterns)
    if (matches[0] && matches[0].length > 10) {
      strength += 0.1
    }

    return Math.min(strength, 1.0)
  }

  /**
   * Enhanced NLU Helper - Detects patient expressions of doubt or contradictory experiences
   * Uses sophisticated pattern matching and context analysis
   */
  private detectPatientDoubtOrContradiction(
    patientUtterance: string,
    activeBeliefs: CoreBelief[],
  ): {
    beliefId: string
    statementText: string
    challengeType: ChallengeType
  } | null {
    if (!patientUtterance || activeBeliefs.length === 0) {
      return null
    }

    const utteranceLower = patientUtterance.toLowerCase()

    // Enhanced doubt and contradiction patterns
    const doubtPatterns = [
      {
        patterns: [
          /i'm not sure/i,
          /maybe i'm wrong/i,
          /i don't know if/i,
          /i'm starting to think/i,
          /perhaps/i,
          /could be wrong/i,
          /might not be true/i,
          /i'm questioning/i,
          /i'm doubting/i,
          /i wonder if/i,
          /what if i'm/i,
          /am i wrong/i,
          /is it possible/i,
          /maybe it's not/i,
          /i'm beginning to see/i,
          /i'm realizing/i,
          /now that i think about it/i,
        ],
        type: ChallengeType.PATIENT_EXPRESSES_DOUBT,
        weight: 1.0,
      },
    ]

    const contradictionPatterns = [
      {
        patterns: [
          /but then again/i,
          /on the other hand/i,
          /actually/i,
          /wait/i,
          /hold on/i,
          /that reminds me/i,
          /i remember when/i,
          /there was this time/i,
          /once i/i,
          /i recall/i,
          /thinking back/i,
          /looking back/i,
          /in retrospect/i,
          /come to think of it/i,
          /now i remember/i,
          /that's not always true/i,
          /except for/i,
          /but what about/i,
          /however/i,
          /although/i,
          /even though/i,
        ],
        type: ChallengeType.PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE,
        weight: 1.0,
      },
    ]

    let bestMatch: {
      beliefId: string
      statementText: string
      challengeType: ChallengeType
      confidence: number
    } | null = null

    for (const belief of activeBeliefs) {
      const beliefKeywords = this.extractBeliefKeywords(belief)
      const beliefRelevance = this.calculateBeliefRelevance(
        utteranceLower,
        beliefKeywords,
      )

      // Only consider beliefs that are relevant to the utterance
      if (beliefRelevance < 0.1) {
        continue
      }

      // Check doubt patterns
      for (const patternGroup of doubtPatterns) {
        for (const pattern of patternGroup.patterns) {
          if (pattern.test(utteranceLower)) {
            const patternStrength = this.calculatePatternStrength(
              pattern,
              utteranceLower,
            )
            const confidence =
              patternStrength *
              patternGroup.weight *
              Math.max(beliefRelevance, 0.25)

            if (
              confidence > 0.25 &&
              (!bestMatch || confidence > bestMatch.confidence)
            ) {
              bestMatch = {
                beliefId: belief.id,
                statementText: patientUtterance,
                challengeType: patternGroup.type,
                confidence,
              }
            }
          }
        }
      }

      // Check contradiction patterns
      for (const patternGroup of contradictionPatterns) {
        for (const pattern of patternGroup.patterns) {
          if (pattern.test(utteranceLower)) {
            const patternStrength = this.calculatePatternStrength(
              pattern,
              utteranceLower,
            )
            const confidence =
              patternStrength *
              patternGroup.weight *
              Math.max(beliefRelevance, 0.25)

            if (
              confidence > 0.25 &&
              (!bestMatch || confidence > bestMatch.confidence)
            ) {
              bestMatch = {
                beliefId: belief.id,
                statementText: patientUtterance,
                challengeType: patternGroup.type,
                confidence,
              }
            }
          }
        }
      }
    }

    return bestMatch
      ? {
          beliefId: bestMatch.beliefId,
          statementText: bestMatch.statementText,
          challengeType: bestMatch.challengeType,
        }
      : null
  }

  /**
   * Extracts key terms from a belief for semantic matching
   */
  private extractBeliefKeywords(belief: CoreBelief): string[] {
    const keywords: string[] = []

    // Extract from belief text
    const beliefWords = belief.belief
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !this.isStopWord(word))
    keywords.push(...beliefWords)

    // Extract from related domains
    belief.relatedDomains.forEach((domain) => {
      const domainWords = domain
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3 && !this.isStopWord(word))
      keywords.push(...domainWords)
    })

    // Extract from associated emotions
    if (belief.associatedEmotions) {
      keywords.push(...belief.associatedEmotions)
    }

    return [...new Set(keywords)] // Remove duplicates
  }

  /**
   * Calculates how relevant an utterance is to a belief based on keyword overlap
   */
  private calculateBeliefRelevance(
    utterance: string,
    beliefKeywords: string[],
  ): number {
    if (beliefKeywords.length === 0) {
      return 0
    }

    const utteranceWords = utterance
      .split(/\s+/)
      .map((word) => word.toLowerCase())
    let matches = 0

    for (const keyword of beliefKeywords) {
      if (
        utteranceWords.some(
          (word) =>
            word.includes(keyword) ||
            keyword.includes(word) ||
            this.calculateWordSimilarity(word, keyword) > 0.7,
        )
      ) {
        matches++
      }
    }

    return matches / beliefKeywords.length
  }

  /**
   * Simple word similarity calculation using character overlap
   */
  private calculateWordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) {
      return 1
    }
    if (word1.length < 3 || word2.length < 3) {
      return 0
    }

    const longer = word1.length > word2.length ? word1 : word2
    const shorter = word1.length > word2.length ? word2 : word1

    if (longer.includes(shorter)) {
      return 0.8
    }

    // Simple character overlap calculation
    let overlap = 0
    for (let i = 0; i < shorter.length - 1; i++) {
      const bigram = shorter.substring(i, i + 2)
      if (longer.includes(bigram)) {
        overlap++
      }
    }

    return overlap / (shorter.length - 1)
  }

  /**
   * Checks if a word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
      'a',
      'an',
    ])
    return stopWords.has(word.toLowerCase())
  }

  /**
   * Processes a conversational turn to identify and apply belief reinforcements.
   * This is a public method that orchestrates the belief adjustment logic.
   *
   * @param input - Data for the current conversational turn.
   * @returns The updated cognitive model after processing reinforcements.
   * @throws Error if the model is not found.
   */
  public async processBeliefReinforcementForTurn({
    modelId,
    therapistUtterance,
    patientUtterance,
    conversationHistory,
    nluData,
  }: ProcessTurnInput): Promise<CognitiveModel> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Cognitive model with id ${modelId} not found.`)
    }

    let updatedModel = model
    let overallChangesMade = false // Flag to track if any reinforcement caused a change

    const activeBeliefs = getActiveBeliefs(
      updatedModel,
      conversationHistory,
      patientUtterance,
    )

    let processedNluData = nluData
    if (!processedNluData) {
      const therapistConfirmation = this.detectTherapistConfirmation(
        therapistUtterance,
        activeBeliefs,
      )
      const patientEvidence = this.detectPatientNewEvidence(
        patientUtterance,
        activeBeliefs,
      )
      const therapistChallenge = this.detectTherapistChallenge(
        therapistUtterance,
        activeBeliefs,
      )
      const patientDoubt = this.detectPatientDoubtOrContradiction(
        patientUtterance,
        activeBeliefs,
      )

      processedNluData = {
        ...(therapistConfirmation && {
          therapistConfirmsBelief: therapistConfirmation,
        }),
        ...(patientEvidence && {
          patientProvidesNewEvidenceForBelief: patientEvidence,
        }),
        ...(therapistChallenge && {
          therapistChallengesBelief: therapistChallenge,
        }),
        ...(patientDoubt && {
          patientExpressesDoubtOrContradiction: patientDoubt,
        }),
      }
    }

    // Process reinforcements first
    for (const activeBelief of activeBeliefs) {
      let currentBeliefResult: {
        updatedModel: CognitiveModel
        changesMade: boolean
      } | null = null

      if (
        processedNluData?.therapistConfirmsBelief?.beliefId === activeBelief.id
      ) {
        currentBeliefResult = this.applyBeliefReinforcement(updatedModel, {
          beliefId: activeBelief.id,
          type: ReinforcementType.THERAPIST_CONFIRMATION,
          therapistStatementText:
            processedNluData.therapistConfirmsBelief.confirmedText,
        })
        updatedModel = currentBeliefResult.updatedModel
        if (currentBeliefResult.changesMade) {
          overallChangesMade = true
        }
      }

      // Apply patient evidence only if therapist confirmation wasn't already applied for this belief in this turn,
      // or decide if multiple reinforcements can apply to the same belief in one turn.
      // For now, let's allow multiple, as they are different types.
      if (
        processedNluData?.patientProvidesNewEvidenceForBelief?.beliefId ===
        activeBelief.id
      ) {
        currentBeliefResult = this.applyBeliefReinforcement(updatedModel, {
          beliefId: activeBelief.id,
          type: ReinforcementType.PATIENT_EVIDENCE,
          sourceText:
            processedNluData.patientProvidesNewEvidenceForBelief.evidenceText,
        })
        updatedModel = currentBeliefResult.updatedModel
        if (currentBeliefResult.changesMade) {
          overallChangesMade = true
        }
      }

      // Consistent emotion can also apply
      const likelyEmotions = getLikelyEmotionalResponses(
        updatedModel, // Use potentially updated model for emotion consistency check
        conversationHistory,
        patientUtterance,
      )

      if (
        this.isEmotionConsistentWithBelief(
          activeBelief,
          likelyEmotions,
          updatedModel,
        )
      ) {
        currentBeliefResult = this.applyBeliefReinforcement(updatedModel, {
          beliefId: activeBelief.id,
          type: ReinforcementType.CONSISTENT_EMOTION,
          emotionalContext: likelyEmotions,
        })
        updatedModel = currentBeliefResult.updatedModel
        if (currentBeliefResult.changesMade) {
          overallChangesMade = true
        }
      }
    }

    // Process challenges after reinforcements
    for (const activeBelief of activeBeliefs) {
      let currentChallengeResult: {
        updatedModel: CognitiveModel
        changesMade: boolean
      } | null = null

      // Apply therapist challenges
      if (
        processedNluData?.therapistChallengesBelief?.beliefId ===
        activeBelief.id
      ) {
        currentChallengeResult = this.applyBeliefChallenge(updatedModel, {
          beliefId: activeBelief.id,
          type: processedNluData.therapistChallengesBelief.challengeType,
          therapistStatementText:
            processedNluData.therapistChallengesBelief.challengeText,
        })
        updatedModel = currentChallengeResult.updatedModel
        if (currentChallengeResult.changesMade) {
          overallChangesMade = true
        }
      }

      // Apply patient doubt or contradictions
      if (
        processedNluData?.patientExpressesDoubtOrContradiction?.beliefId ===
        activeBelief.id
      ) {
        currentChallengeResult = this.applyBeliefChallenge(updatedModel, {
          beliefId: activeBelief.id,
          type: processedNluData.patientExpressesDoubtOrContradiction
            .challengeType,
          sourceText:
            processedNluData.patientExpressesDoubtOrContradiction.statementText,
        })
        updatedModel = currentChallengeResult.updatedModel
        if (currentChallengeResult.changesMade) {
          overallChangesMade = true
        }
      }
    }

    // Update therapeutic progress if any changes were made
    if (overallChangesMade) {
      updatedModel = this.updateTherapeuticProgress(
        updatedModel,
        conversationHistory,
        therapistUtterance,
        patientUtterance,
        processedNluData,
      )
      await this.saveModel(updatedModel)
    }

    return updatedModel
  }

  /**
   * Applies reinforcement to a specific core belief within a patient's cognitive model.
   * Modifies the belief's strength and evidence.
   *
   * @param model - The patient's cognitive model (will be mutated).
   * @param reinforcementData - The details of the reinforcement event.
   * @returns The same cognitive model instance, now updated.
   */
  private applyBeliefReinforcement(
    model: CognitiveModel,
    reinforcementData: ReinforcementInput,
  ): { updatedModel: CognitiveModel; changesMade: boolean } {
    const beliefIndex = model.coreBeliefs.findIndex(
      (b) => b.id === reinforcementData.beliefId,
    )
    let madeChange = false

    if (beliefIndex === -1) {
      console.warn(
        `Belief reinforcement: Belief ID "${reinforcementData.beliefId}" not found in model ${model.id}.`,
      )
      return { updatedModel: model, changesMade: false }
    }

    const beliefToReinforce = model.coreBeliefs[beliefIndex]
    const originalStrength = beliefToReinforce.strength
    const originalEvidence = [...beliefToReinforce.evidence] // Shallow copy for comparison

    let strengthIncrement = 0
    const currentEvidenceForBelief = [...beliefToReinforce.evidence] // Work with a copy for adding new evidence

    switch (reinforcementData.type) {
      case ReinforcementType.THERAPIST_CONFIRMATION:
        strengthIncrement = reinforcementData.strengthIncrement ?? 1.5
        if (reinforcementData.therapistStatementText) {
          let statement = reinforcementData.therapistStatementText.substring(
            0,
            100,
          )
          // Remove trailing punctuation more robustly
          while (
            statement.length > 0 &&
            (statement.endsWith('.') || statement.endsWith(','))
          ) {
            statement = statement.slice(0, -1)
          }
          const evidenceText = `Therapist confirmed: "${statement}..."`
          if (!currentEvidenceForBelief.includes(evidenceText)) {
            currentEvidenceForBelief.push(evidenceText)
          }
        }
        break
      case ReinforcementType.PATIENT_EVIDENCE:
        strengthIncrement = reinforcementData.strengthIncrement ?? 1.0
        if (
          reinforcementData.sourceText &&
          !currentEvidenceForBelief.includes(reinforcementData.sourceText)
        ) {
          currentEvidenceForBelief.push(reinforcementData.sourceText)
        }
        break
      case ReinforcementType.CONSISTENT_EMOTION:
        strengthIncrement = reinforcementData.strengthIncrement ?? 0.5
        if (
          reinforcementData.emotionalContext &&
          reinforcementData.emotionalContext.length > 0
        ) {
          const primaryEmotion = reinforcementData.emotionalContext[0]
          const evidenceText = `Felt ${primaryEmotion.emotion} (intensity ${primaryEmotion.intensity}) consistent with this belief.`
          if (!currentEvidenceForBelief.includes(evidenceText)) {
            currentEvidenceForBelief.push(evidenceText)
          }
        }
        break
      default:
        // console.warn(`Unknown reinforcement type: ${reinforcementData.type}`); // Already present in original draft
        return { updatedModel: model, changesMade: false } // No change for unknown type
    }

    const newStrength = Math.min(
      10,
      Math.max(0, beliefToReinforce.strength + strengthIncrement),
    )
    if (newStrength !== originalStrength) {
      beliefToReinforce.strength = newStrength
      madeChange = true
    }

    // Check if evidence array has actually changed
    if (
      currentEvidenceForBelief.length !== originalEvidence.length ||
      currentEvidenceForBelief.some(
        (evidence, i) => evidence !== originalEvidence[i],
      )
    ) {
      beliefToReinforce.evidence = currentEvidenceForBelief
      madeChange = true
    }

    return { updatedModel: model, changesMade: madeChange }
  }

  /**
   * Helper to determine if expressed emotions are consistent with a given belief.
   * Uses the belief's 'associatedEmotions' field if available.
   *
   * @param belief The core belief.
   * @param emotions Current emotional context from getLikelyEmotionalResponses.
   * @param _model The cognitive model (for broader context, if needed in future).
   * @returns True if emotions are considered consistent, false otherwise.
   */
  private isEmotionConsistentWithBelief(
    belief: CoreBelief,
    likelyEmotions: { emotion: string; intensity: number }[],
    _model: CognitiveModel, // Kept for potential future use, currently unused
  ): boolean {
    if (!likelyEmotions || likelyEmotions.length === 0) {
      return false
    }

    if (belief.associatedEmotions && belief.associatedEmotions.length > 0) {
      // Check if any of the likely emotions match the belief's associated emotions
      for (const likelyEmotion of likelyEmotions) {
        if (
          belief.associatedEmotions.includes(
            likelyEmotion.emotion.toLowerCase(),
          )
        ) {
          // Optional: Could also check intensity here if relevant
          // For example, if belief.associatedEmotions was Array<{emotion: string, minIntensity: number}>
          return true
        }
      }
      return false // No match found with predefined associated emotions
    } else {
      // Fallback to simpler string matching if no associatedEmotions are defined for the belief
      // This maintains the previous placeholder logic as a last resort.
      // Consider removing this fallback if associatedEmotions become mandatory or well-populated.
      const primaryLikelyEmotion = likelyEmotions[0].emotion.toLowerCase()
      const beliefText = belief.belief.toLowerCase()

      if (
        (beliefText.includes('danger') ||
          beliefText.includes('unsafe') ||
          beliefText.includes('threat')) &&
        (primaryLikelyEmotion.includes('fear') ||
          primaryLikelyEmotion.includes('anxiety') ||
          primaryLikelyEmotion.includes('worried'))
      ) {
        return true
      }
      if (
        (beliefText.includes('failure') ||
          beliefText.includes('inadequate') ||
          beliefText.includes('worthless')) &&
        (primaryLikelyEmotion.includes('sad') ||
          primaryLikelyEmotion.includes('hopeless') ||
          primaryLikelyEmotion.includes('ashamed'))
      ) {
        return true
      }
    }

    return false
  }

  /**
   * Private helper methods
   */
  private calculateMatchScore(
    model: CognitiveModel,
    objectives: string[],
    level: string,
    filters?: EnhancedModelFilters,
  ): number {
    let score = 0

    // Base relevance to learning objectives
    const objectiveRelevance = this.assessObjectiveRelevance(model, objectives)
    score += objectiveRelevance * 0.4

    // Difficulty alignment
    const difficultyAlignment = this.assessDifficultyAlignment(model, level)
    score += difficultyAlignment * 0.3

    // Filter matching
    if (filters) {
      const filterAlignment = this.assessFilterAlignment(model, filters)
      score += filterAlignment * 0.3
    } else {
      score += 0.3 // No filters = no penalty
    }

    return Math.min(score, 1.0)
  }

  private assessObjectiveRelevance(
    model: CognitiveModel,
    objectives: string[],
  ): number {
    let relevanceScore = 0
    const modelFeatures = [
      ...model.presentingIssues,
      ...model.coreBeliefs.map((b) => b.belief),
      ...model.distortionPatterns.map((d) => d.type),
      model.diagnosisInfo.primaryDiagnosis,
    ]

    for (const objective of objectives) {
      const hasRelevantFeature = modelFeatures.some(
        (feature) =>
          feature.toLowerCase().includes(objective.toLowerCase()) ||
          objective.toLowerCase().includes(feature.toLowerCase()),
      )
      if (hasRelevantFeature) {
        relevanceScore += 1
      }
    }

    return objectives.length > 0 ? relevanceScore / objectives.length : 0
  }

  private assessDifficultyAlignment(
    model: CognitiveModel,
    level: string,
  ): number {
    const modelDifficulty = this.estimateModelDifficulty(model)

    if (modelDifficulty === level) {
      return 1.0
    }

    const difficultyOrder = ['beginner', 'intermediate', 'advanced']
    const modelIndex = difficultyOrder.indexOf(modelDifficulty)
    const levelIndex = difficultyOrder.indexOf(level)
    const distance = Math.abs(modelIndex - levelIndex)

    return Math.max(0, 1 - distance * 0.3)
  }

  private assessFilterAlignment(
    model: CognitiveModel,
    filters: EnhancedModelFilters,
  ): number {
    let alignmentScore = 0
    let filterCount = 0

    if (filters.diagnosisCategories) {
      filterCount++
      const hasMatchingDiagnosis = filters.diagnosisCategories.some(
        (category) =>
          model.diagnosisInfo.primaryDiagnosis
            .toLowerCase()
            .includes(category.toLowerCase()),
      )
      if (hasMatchingDiagnosis) {
        alignmentScore++
      }
    }

    if (filters.beliefThemes) {
      filterCount++
      const hasMatchingBelief = filters.beliefThemes.some((theme) =>
        model.coreBeliefs.some(
          (belief) =>
            belief.belief.toLowerCase().includes(theme.toLowerCase()) ||
            belief.relatedDomains.some((domain) =>
              domain.toLowerCase().includes(theme.toLowerCase()),
            ),
        ),
      )
      if (hasMatchingBelief) {
        alignmentScore++
      }
    }

    if (filters.emotionalIntensityRange) {
      filterCount++
      const avgIntensity =
        model.emotionalPatterns.reduce(
          (sum, emotion) => sum + emotion.intensity,
          0,
        ) / model.emotionalPatterns.length

      const [min, max] = filters.emotionalIntensityRange
      if (avgIntensity >= min && avgIntensity <= max) {
        alignmentScore++
      }
    }

    return filterCount > 0 ? alignmentScore / filterCount : 1
  }

  private generateMatchReasons(
    model: CognitiveModel,
    objectives: string[],
    _filters?: EnhancedModelFilters,
  ): string[] {
    const reasons: string[] = []

    // Check objective matches
    for (const objective of objectives) {
      const relevantFeatures = model.presentingIssues.filter((issue) =>
        issue.toLowerCase().includes(objective.toLowerCase()),
      )
      if (relevantFeatures.length > 0) {
        reasons.push(
          `Presents ${objective} challenges: ${relevantFeatures.join(', ')}`,
        )
      }
    }

    // Check belief complexity
    if (model.coreBeliefs.length >= 5) {
      reasons.push(
        `Complex belief system with ${model.coreBeliefs.length} core beliefs`,
      )
    }

    // Check distortion patterns
    if (model.distortionPatterns.length >= 3) {
      const types = model.distortionPatterns.map((d) => d.type).slice(0, 3)
      reasons.push(`Multiple distortion patterns: ${types.join(', ')}`)
    }

    return reasons
  }

  private identifyTherapeuticObjectives(model: CognitiveModel): string[] {
    const objectives: string[] = []

    // Based on presenting issues
    objectives.push(
      ...model.presentingIssues.map((issue) => `Address ${issue}`),
    )

    // Based on core beliefs
    if (model.coreBeliefs.length > 0) {
      objectives.push('Challenge and modify core beliefs')
    }

    // Based on distortions
    if (model.distortionPatterns.length > 0) {
      objectives.push('Identify and correct cognitive distortions')
    }

    // Based on emotional patterns
    if (model.emotionalPatterns.some((e) => e.intensity >= 7)) {
      objectives.push('Develop emotional regulation skills')
    }

    return objectives
  }

  private estimateModelDifficulty(
    model: CognitiveModel,
  ): 'beginner' | 'intermediate' | 'advanced' {
    let complexityScore = 0

    // Core beliefs complexity
    complexityScore += model.coreBeliefs.length * 2

    // Distortion pattern variety
    complexityScore += model.distortionPatterns.length * 3

    // Emotional intensity and variety
    const avgEmotionalIntensity =
      model.emotionalPatterns.reduce(
        (sum, emotion) => sum + emotion.intensity,
        0,
      ) / (model.emotionalPatterns.length || 1)
    complexityScore += avgEmotionalIntensity

    // Resistance level
    complexityScore += model.conversationalStyle.resistance

    if (complexityScore <= 20) {
      return 'beginner'
    }
    if (complexityScore <= 40) {
      return 'intermediate'
    }
    return 'advanced'
  }

  private checkModelForPattern(
    model: CognitiveModel,
    patternType: string,
    patternValue: string,
  ): boolean {
    switch (patternType) {
      case 'core-beliefs':
        return model.coreBeliefs.some(
          (belief) =>
            belief.belief.toLowerCase().includes(patternValue.toLowerCase()) ||
            belief.relatedDomains.some((domain) =>
              domain.toLowerCase().includes(patternValue.toLowerCase()),
            ),
        )
      case 'distortions':
        return model.distortionPatterns.some((pattern) =>
          pattern.type.toLowerCase().includes(patternValue.toLowerCase()),
        )
      case 'emotions':
        return model.emotionalPatterns.some((emotion) =>
          emotion.emotion.toLowerCase().includes(patternValue.toLowerCase()),
        )
      case 'behaviors':
        return model.behavioralPatterns.some(
          (behavior) =>
            behavior.response
              .toLowerCase()
              .includes(patternValue.toLowerCase()) ||
            behavior.trigger.toLowerCase().includes(patternValue.toLowerCase()),
        )
      default:
        return false
    }
  }

  private enhanceContextWithPsiInsights(
    context: PatientResponseContext,
    normalizedResult: NormalizationResult,
  ): PatientResponseContext {
    // Add quality metrics to context for more nuanced responses
    const qualityMetrics = normalizedResult.metadata.dataQuality

    return {
      ...context,
      // Adjust response style based on data quality
      responseStyle: {
        ...context.responseStyle,
        coherence: Math.min(
          10,
          context.responseStyle.coherence * qualityMetrics.consistency * 1.5,
        ),
        openness: Math.min(
          10,
          context.responseStyle.openness * qualityMetrics.completeness * 1.2,
        ),
      },
    }
  }

  private extractTherapistInterventions(
    history: Array<{ role: string; content: string; timestamp?: string }>,
  ): Array<{
    type: string
    content: string
    timestamp: string
    effectiveness?: number
  }> {
    return history
      .filter((msg) => msg.role === 'therapist')
      .map((msg) => ({
        type: this.classifyIntervention(msg.content),
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
      }))
  }

  private classifyIntervention(content: string): string {
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes('how') && lowerContent.includes('feel')) {
      return 'emotional_exploration'
    }
    if (lowerContent.includes('what if') || lowerContent.includes('evidence')) {
      return 'cognitive_restructuring'
    }
    if (
      lowerContent.includes('understand') ||
      lowerContent.includes('difficult')
    ) {
      return 'validation'
    }
    if (lowerContent.includes('?')) {
      return 'socratic_questioning'
    }

    return 'general_response'
  }

  private analyzePatientResponses(
    history: Array<{ role: string; content: string; timestamp?: string }>,
    model: CognitiveModel,
  ): Array<{
    emotionalState: string
    resistanceLevel: number
    engagementLevel: number
    distortionsTriggered: string[]
    timestamp: string
  }> {
    return history
      .filter((msg) => msg.role === 'patient')
      .map((msg) => ({
        emotionalState: this.detectEmotionalState(msg.content, model),
        resistanceLevel: this.assessResistance(msg.content),
        engagementLevel: this.assessEngagement(msg.content),
        distortionsTriggered: this.identifyTriggeredDistortions(
          msg.content,
          model,
        ),
        timestamp: msg.timestamp || new Date().toISOString(),
      }))
  }

  private detectEmotionalState(content: string, model: CognitiveModel): string {
    // Simple emotional state detection based on content and model patterns
    const emotions = model.emotionalPatterns.map((p) => p.emotion.toLowerCase())

    for (const emotion of emotions) {
      if (content.toLowerCase().includes(emotion)) {
        return emotion
      }
    }

    // Fallback to basic sentiment
    const negativeWords = ['sad', 'angry', 'frustrated', 'worried', 'afraid']
    const hasNegative = negativeWords.some((word) =>
      content.toLowerCase().includes(word),
    )

    return hasNegative ? 'distressed' : 'neutral'
  }

  private assessResistance(content: string): number {
    const resistanceIndicators = [
      'but',
      'however',
      "can't",
      "won't",
      'difficult',
      'impossible',
    ]
    const count = resistanceIndicators.filter((indicator) =>
      content.toLowerCase().includes(indicator),
    ).length

    return Math.min(10, count * 2 + 1)
  }

  private assessEngagement(content: string): number {
    const engagementIndicators = [
      'yes',
      'i think',
      'maybe',
      'perhaps',
      'tell me more',
    ]
    const count = engagementIndicators.filter((indicator) =>
      content.toLowerCase().includes(indicator),
    ).length

    return Math.min(10, Math.max(1, content.length / 20 + count))
  }

  private identifyTriggeredDistortions(
    content: string,
    model: CognitiveModel,
  ): string[] {
    const triggered: string[] = []

    for (const pattern of model.distortionPatterns) {
      const hasDistortion = pattern.examples.some((example) =>
        this.hasSemanticSimilarity(content, example),
      )
      if (hasDistortion) {
        triggered.push(pattern.type)
      }
    }

    return triggered
  }

  private hasSemanticSimilarity(text1: string, text2: string): boolean {
    // Simple semantic similarity check
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)

    const overlap = words1.filter((word) => words2.includes(word)).length
    return overlap >= Math.min(words1.length, words2.length) * 0.3
  }

  private assessTherapeuticProgress(
    history: Array<{ role: string; content: string }>,
    model: CognitiveModel,
  ) {
    // Simplified progress assessment
    const patientMessages = history.filter((msg) => msg.role === 'patient')

    return {
      insightsGained: this.extractInsights(patientMessages),
      beliefsAddressed: this.identifyAddressedBeliefs(patientMessages, model),
      resistanceChanges: this.trackResistanceChanges(patientMessages),
      overallEffectiveness: this.calculateOverallEffectiveness(patientMessages),
    }
  }

  private extractInsights(messages: Array<{ content: string }>): string[] {
    const insightKeywords = [
      'realize',
      'understand',
      'see now',
      'makes sense',
      'never thought',
    ]
    const insights: string[] = []

    for (const msg of messages) {
      for (const keyword of insightKeywords) {
        if (msg.content.toLowerCase().includes(keyword)) {
          insights.push(`Insight related to: ${keyword}`)
        }
      }
    }

    return insights
  }

  private identifyAddressedBeliefs(
    messages: Array<{ content: string }>,
    model: CognitiveModel,
  ): string[] {
    const addressed: string[] = []

    for (const belief of model.coreBeliefs) {
      const isAddressed = messages.some((msg) =>
        belief.relatedDomains.some((domain) =>
          msg.content.toLowerCase().includes(domain.toLowerCase()),
        ),
      )
      if (isAddressed) {
        addressed.push(belief.belief)
      }
    }

    return addressed
  }

  private trackResistanceChanges(
    messages: Array<{ content: string }>,
  ): number[] {
    return messages.map((msg) => this.assessResistance(msg.content))
  }

  private calculateOverallEffectiveness(
    messages: Array<{ content: string }>,
  ): number {
    if (messages.length === 0) {
      return 0
    }

    const totalEngagement = messages.reduce(
      (sum, msg) => sum + this.assessEngagement(msg.content),
      0,
    )
    const avgResistance =
      messages.reduce(
        (sum, msg) => sum + this.assessResistance(msg.content),
        0,
      ) / messages.length

    return Math.max(
      0,
      Math.min(10, totalEngagement / messages.length - avgResistance * 0.5),
    )
  }

  private generateTherapeuticRecommendations(
    history: Array<{ role: string; content: string }>,
    model: CognitiveModel,
  ): string[] {
    const recommendations: string[] = []

    // Analyze last few patient responses
    const recentPatientResponses = history
      .filter((msg) => msg.role === 'patient')
      .slice(-3)

    const avgResistance =
      recentPatientResponses.reduce(
        (sum, msg) => sum + this.assessResistance(msg.content),
        0,
      ) / recentPatientResponses.length

    if (avgResistance > 6) {
      recommendations.push(
        'Consider building more rapport before challenging beliefs',
      )
      recommendations.push('Use more validation and empathy')
    }

    if (avgResistance < 3) {
      recommendations.push(
        'Patient appears receptive - good time for deeper exploration',
      )
      recommendations.push(
        'Consider introducing cognitive restructuring techniques',
      )
    }

    // Check for untriggered core beliefs
    const untriggeredBeliefs = model.coreBeliefs.filter(
      (belief) =>
        !history.some((msg) =>
          belief.relatedDomains.some((domain) =>
            msg.content.toLowerCase().includes(domain.toLowerCase()),
          ),
        ),
    )

    if (untriggeredBeliefs.length > 0) {
      recommendations.push(
        `Explore areas: ${untriggeredBeliefs
          .slice(0, 2)
          .map((b) => b.relatedDomains[0])
          .join(', ')}`,
      )
    }

    return recommendations
  }

  private identifyExpectedChallenges(_modelIds: string[]): string[] {
    // This would analyze the models to predict training challenges
    return [
      'Managing patient resistance',
      'Identifying cognitive distortions',
      'Building therapeutic rapport',
      'Maintaining professional boundaries',
    ]
  }

  private generateAssessmentCriteria(objectives: string[]): string[] {
    return objectives.map((obj) => `Demonstrate competency in: ${obj}`)
  }

  private initializeBuiltInScenarios(): void {
    // Initialize some default therapeutic scenarios
    const defaultScenarios: TherapeuticScenario[] = [
      {
        id: 'anxiety_basics',
        name: 'Anxiety Management Basics',
        description: 'Introduction to working with anxiety disorders',
        models: [], // Will be populated when models are available
        learningObjectives: [
          'Identify anxiety symptoms',
          'Use grounding techniques',
          'Practice cognitive restructuring',
        ],
        expectedChallenges: [
          'Patient may be highly activated',
          'Resistance to exposure concepts',
          'Catastrophic thinking patterns',
        ],
        assessmentCriteria: [
          'Demonstrates empathy and validation',
          'Introduces coping strategies appropriately',
          'Identifies cognitive distortions',
        ],
      },
    ]

    for (const scenario of defaultScenarios) {
      this.scenarios.set(scenario.id, scenario)
    }
  }

  /**
   * Applies a challenge to a specific core belief within a patient's cognitive model.
   * Modifies the belief's strength downwards and adds evidence of the challenge.
   *
   * @param model - The patient's cognitive model.
   * @param challengeData - The details of the challenge event.
   * @returns An object containing the updated model and a boolean indicating if changes were made.
   */
  private applyBeliefChallenge(
    model: CognitiveModel,
    challengeData: ChallengeInput,
  ): { updatedModel: CognitiveModel; changesMade: boolean } {
    const beliefIndex = model.coreBeliefs.findIndex(
      (b) => b.id === challengeData.beliefId,
    )
    let madeChange = false

    if (beliefIndex === -1) {
      console.warn(
        `Belief challenge: Belief ID "${challengeData.beliefId}" not found in model ${model.id}.`,
      )
      return { updatedModel: model, changesMade: false }
    }

    const beliefToChallenge = model.coreBeliefs[beliefIndex]
    const originalStrength = beliefToChallenge.strength

    let strengthDecrement = 0
    let newEvidenceText = ''

    // TODO: Determine appropriate strength decrements and evidence text based on ChallengeType
    // For now, using placeholder values.

    switch (challengeData.type) {
      case ChallengeType.THERAPIST_COUNTER_EVIDENCE:
        strengthDecrement = challengeData.strengthDecrement ?? 1.5 // Example decrement
        if (challengeData.therapistStatementText) {
          let statement = challengeData.therapistStatementText.substring(0, 100)
          while (
            statement.length > 0 &&
            (statement.endsWith('.') || statement.endsWith(','))
          ) {
            statement = statement.slice(0, -1)
          }
          newEvidenceText = `Therapist challenged: "${statement}..."`
        } else {
          newEvidenceText = 'Therapist presented counter-evidence.'
        }
        break
      case ChallengeType.PATIENT_EXPRESSES_DOUBT:
        strengthDecrement = challengeData.strengthDecrement ?? 1.0 // Example decrement
        if (challengeData.sourceText) {
          let statement = challengeData.sourceText.substring(0, 100)
          while (
            statement.length > 0 &&
            (statement.endsWith('.') || statement.endsWith(','))
          ) {
            statement = statement.slice(0, -1)
          }
          newEvidenceText = `Patient expressed doubt: "${statement}..."`
        } else {
          newEvidenceText = 'Patient expressed doubt about this belief.'
        }
        break
      case ChallengeType.PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE:
        strengthDecrement = challengeData.strengthDecrement ?? 1.2 // Example decrement
        if (challengeData.sourceText) {
          let statement = challengeData.sourceText.substring(0, 100)
          while (
            statement.length > 0 &&
            (statement.endsWith('.') || statement.endsWith(','))
          ) {
            statement = statement.slice(0, -1)
          }
          newEvidenceText = `Patient recalled contradictory experience: "${statement}..."`
        } else {
          newEvidenceText =
            'Patient recalled an experience contradicting this belief.'
        }
        break
      default:
        // console.warn(`Unknown challenge type: ${challengeData.type}`);
        return { updatedModel: model, changesMade: false }
    }

    const newStrength = Math.max(
      0,
      beliefToChallenge.strength - strengthDecrement,
    )

    if (newStrength !== originalStrength) {
      beliefToChallenge.strength = newStrength
      madeChange = true
    }

    if (
      newEvidenceText &&
      !beliefToChallenge.evidence.includes(newEvidenceText)
    ) {
      beliefToChallenge.evidence.push(newEvidenceText)
      madeChange = true
    }

    // If only strength changed to 0 but no new evidence added, still a change.
    // If evidence was added, it's a change.
    // If strength changed but not to 0, it's a change.

    return { updatedModel: model, changesMade: madeChange }
  }

  /**
   * Updates therapeutic progress based on belief changes and conversation dynamics
   */
  private updateTherapeuticProgress(
    model: CognitiveModel,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
    }>,
    therapistUtterance: string,
    patientUtterance: string,
    nluData?: {
      therapistConfirmsBelief?: { beliefId: string; confirmedText: string }
      patientProvidesNewEvidenceForBelief?: {
        beliefId: string
        evidenceText: string
      }
      therapistChallengesBelief?: {
        beliefId: string
        challengeText: string
        challengeType: ChallengeType
      }
      patientExpressesDoubtOrContradiction?: {
        beliefId: string
        statementText: string
        challengeType: ChallengeType
      }
    },
  ): CognitiveModel {
    const currentSessionNumber = Math.floor(conversationHistory.length / 10) + 1 // Estimate session number
    const updatedModel = { ...model }

    // Track insights gained from belief challenges
    const newInsights: {
      belief: string
      insight: string
      dateAchieved: string
    }[] = []

    if (
      nluData?.therapistChallengesBelief ||
      nluData?.patientExpressesDoubtOrContradiction
    ) {
      const challengedBeliefId =
        nluData.therapistChallengesBelief?.beliefId ||
        nluData.patientExpressesDoubtOrContradiction?.beliefId

      if (challengedBeliefId) {
        const challengedBelief = model.coreBeliefs.find(
          (b) => b.id === challengedBeliefId,
        )
        if (challengedBelief) {
          // Check if this represents a new insight (belief strength significantly reduced)
          const originalStrength = challengedBelief.strength
          const currentBelief = updatedModel.coreBeliefs.find(
            (b) => b.id === challengedBeliefId,
          )

          if (
            currentBelief &&
            originalStrength - currentBelief.strength >= 1.0
          ) {
            const insightText = nluData.therapistChallengesBelief
              ? `Recognized alternative perspective on: "${challengedBelief.belief}"`
              : `Expressed doubt about: "${challengedBelief.belief}"`

            newInsights.push({
              belief: challengedBelief.belief,
              insight: insightText,
              dateAchieved: new Date().toISOString(),
            })
          }
        }
      }
    }

    // Assess resistance level based on patient responses
    const currentResistance = this.assessResistance(patientUtterance)
    const previousResistance = updatedModel.therapeuticProgress.resistanceLevel

    // Update resistance level with weighted average (70% previous, 30% current)
    const newResistanceLevel =
      Math.round((previousResistance * 0.7 + currentResistance * 0.3) * 10) / 10

    // Determine change readiness based on resistance and insights
    let newChangeReadiness = updatedModel.therapeuticProgress.changeReadiness

    if (newInsights.length > 0 && newResistanceLevel < 5) {
      // Patient is gaining insights and showing low resistance
      switch (newChangeReadiness) {
        case 'precontemplation':
          newChangeReadiness = 'contemplation'
          break
        case 'contemplation':
          newChangeReadiness = 'preparation'
          break
        case 'preparation':
          newChangeReadiness = 'action'
          break
        case 'action':
          newChangeReadiness = 'maintenance'
          break
      }
    } else if (newResistanceLevel > 7) {
      // High resistance might indicate regression
      switch (newChangeReadiness) {
        case 'maintenance':
          newChangeReadiness = 'action'
          break
        case 'action':
          newChangeReadiness = 'preparation'
          break
        case 'preparation':
          newChangeReadiness = 'contemplation'
          break
      }
    }

    // Update session progress log
    const existingSessionLog =
      updatedModel.therapeuticProgress.sessionProgressLog.find(
        (log) => log.sessionNumber === currentSessionNumber,
      )

    const keyInsights = newInsights.map((insight) => insight.insight)
    const resistanceShift = newResistanceLevel - previousResistance

    if (existingSessionLog) {
      // Update existing session log
      existingSessionLog.keyInsights = [
        ...existingSessionLog.keyInsights,
        ...keyInsights,
      ]
      existingSessionLog.resistanceShift = resistanceShift
    } else {
      // Create new session log
      updatedModel.therapeuticProgress.sessionProgressLog.push({
        sessionNumber: currentSessionNumber,
        keyInsights,
        resistanceShift,
      })
    }

    // Update the therapeutic progress
    updatedModel.therapeuticProgress = {
      ...updatedModel.therapeuticProgress,
      insights: [...updatedModel.therapeuticProgress.insights, ...newInsights],
      resistanceLevel: newResistanceLevel,
      changeReadiness: newChangeReadiness,
    }

    return updatedModel
  }

  /**
   * Implements gradual belief modification tracking over multiple sessions
   */
  public async trackGradualBeliefModification(
    modelId: string,
    sessionHistory: Array<{
      sessionNumber: number
      conversationHistory: Array<{
        role: 'therapist' | 'patient'
        content: string
      }>
      beliefChanges: Array<{
        beliefId: string
        oldStrength: number
        newStrength: number
      }>
    }>,
  ): Promise<{
    beliefEvolution: Array<{
      beliefId: string
      beliefText: string
      strengthTrajectory: Array<{
        session: number
        strength: number
        changeRate: number
      }>
      modificationPattern:
        | 'linear'
        | 'exponential'
        | 'plateau'
        | 'oscillating'
        | 'breakthrough'
      predictedOutcome: {
        finalStrength: number
        sessionsToTarget: number
        confidence: number
      }
      therapeuticMilestones: Array<{
        session: number
        milestone: string
        significance: 'minor' | 'major' | 'breakthrough'
      }>
    }>
    overallProgress: {
      totalBeliefStrengthReduction: number
      averageChangeRate: number
      progressVelocity: 'accelerating' | 'steady' | 'decelerating' | 'stagnant'
      therapeuticMomentum: number // 0-10 scale
    }
    recommendations: Array<{
      type: 'intervention' | 'pacing' | 'focus-shift' | 'consolidation'
      description: string
      targetBeliefs: string[]
      priority: 'high' | 'medium' | 'low'
      rationale: string
    }>
  }> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Cognitive model with id ${modelId} not found.`)
    }

    const beliefEvolution: Array<{
      beliefId: string
      beliefText: string
      strengthTrajectory: Array<{
        session: number
        strength: number
        changeRate: number
      }>
      modificationPattern:
        | 'linear'
        | 'exponential'
        | 'plateau'
        | 'oscillating'
        | 'breakthrough'
      predictedOutcome: {
        finalStrength: number
        sessionsToTarget: number
        confidence: number
      }
      therapeuticMilestones: Array<{
        session: number
        milestone: string
        significance: 'minor' | 'major' | 'breakthrough'
      }>
    }> = []

    // Track each belief's evolution
    for (const belief of model.coreBeliefs) {
      const trajectory: Array<{
        session: number
        strength: number
        changeRate: number
      }> = []
      const milestones: Array<{
        session: number
        milestone: string
        significance: 'minor' | 'major' | 'breakthrough'
      }> = []

      let previousStrength = belief.strength

      for (const session of sessionHistory) {
        const beliefChange = session.beliefChanges.find(
          (change) => change.beliefId === belief.id,
        )
        const currentStrength = beliefChange
          ? beliefChange.newStrength
          : previousStrength
        const changeRate = currentStrength - previousStrength

        trajectory.push({
          session: session.sessionNumber,
          strength: currentStrength,
          changeRate,
        })

        // Identify therapeutic milestones
        if (Math.abs(changeRate) >= 2.0) {
          milestones.push({
            session: session.sessionNumber,
            milestone:
              changeRate < 0
                ? 'Significant belief weakening'
                : 'Belief reinforcement',
            significance:
              Math.abs(changeRate) >= 3.0 ? 'breakthrough' : 'major',
          })
        } else if (Math.abs(changeRate) >= 1.0) {
          milestones.push({
            session: session.sessionNumber,
            milestone:
              changeRate < 0
                ? 'Moderate belief challenge'
                : 'Belief strengthening',
            significance: 'minor',
          })
        }

        previousStrength = currentStrength
      }

      // Determine modification pattern
      const modificationPattern = this.analyzeModificationPattern(trajectory)

      // Predict outcome
      const predictedOutcome = this.predictBeliefOutcome(
        trajectory,
        belief.strength,
      )

      beliefEvolution.push({
        beliefId: belief.id,
        beliefText: belief.belief,
        strengthTrajectory: trajectory,
        modificationPattern,
        predictedOutcome,
        therapeuticMilestones: milestones,
      })
    }

    // Calculate overall progress metrics
    const totalBeliefStrengthReduction = beliefEvolution.reduce(
      (total, belief) => {
        const initialStrength = belief.strengthTrajectory[0]?.strength || 0
        const finalStrength =
          belief.strengthTrajectory[belief.strengthTrajectory.length - 1]
            ?.strength || 0
        return total + Math.max(0, initialStrength - finalStrength)
      },
      0,
    )

    const averageChangeRate =
      beliefEvolution.reduce((total, belief) => {
        const avgRate =
          belief.strengthTrajectory.reduce(
            (sum, point) => sum + Math.abs(point.changeRate),
            0,
          ) / belief.strengthTrajectory.length
        return total + avgRate
      }, 0) / beliefEvolution.length

    const progressVelocity = this.assessProgressVelocity(beliefEvolution)
    const therapeuticMomentum = this.calculateTherapeuticMomentum(
      beliefEvolution,
      sessionHistory,
    )

    // Generate recommendations
    const recommendations = this.generateProgressRecommendations(
      beliefEvolution,
      {
        totalBeliefStrengthReduction,
        averageChangeRate,
        progressVelocity,
        therapeuticMomentum,
      },
    )

    return {
      beliefEvolution,
      overallProgress: {
        totalBeliefStrengthReduction,
        averageChangeRate,
        progressVelocity,
        therapeuticMomentum,
      },
      recommendations,
    }
  }

  /**
   * Simulates insight development patterns based on therapeutic interactions
   */
  public async simulateInsightDevelopment(
    modelId: string,
    therapeuticInterventions: Array<{
      type:
        | 'cognitive-restructuring'
        | 'socratic-questioning'
        | 'behavioral-experiment'
        | 'mindfulness'
        | 'psychoeducation'
      content: string
      targetBeliefs: string[]
      sessionNumber: number
      patientResponse: string
    }>,
  ): Promise<{
    insightTrajectory: Array<{
      sessionNumber: number
      insightType:
        | 'cognitive'
        | 'emotional'
        | 'behavioral'
        | 'relational'
        | 'existential'
      insightContent: string
      depth: 'surface' | 'intermediate' | 'deep' | 'transformative'
      stability: number // 0-1, how likely the insight is to persist
      integration: number // 0-1, how well integrated into patient's worldview
      relatedBeliefs: string[]
      triggeringIntervention: string
    }>
    insightClusters: Array<{
      theme: string
      insights: string[]
      coherence: number // 0-1, how well insights support each other
      therapeuticValue: number // 0-1, clinical significance
    }>
    developmentPattern: {
      phase:
        | 'initial-awareness'
        | 'exploration'
        | 'understanding'
        | 'integration'
        | 'transformation'
      progressRate: 'slow' | 'moderate' | 'rapid' | 'breakthrough'
      readinessForNextPhase: number // 0-1
      potentialBarriers: string[]
    }
    recommendations: Array<{
      intervention: string
      timing: 'immediate' | 'next-session' | 'when-ready' | 'maintenance'
      expectedOutcome: string
      riskFactors: string[]
    }>
  }> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Cognitive model with id ${modelId} not found.`)
    }

    const insightTrajectory: Array<{
      sessionNumber: number
      insightType:
        | 'cognitive'
        | 'emotional'
        | 'behavioral'
        | 'relational'
        | 'existential'
      insightContent: string
      depth: 'surface' | 'intermediate' | 'deep' | 'transformative'
      stability: number
      integration: number
      relatedBeliefs: string[]
      triggeringIntervention: string
    }> = []

    // Simulate insight development from interventions
    for (const intervention of therapeuticInterventions) {
      const insights = this.generateInsightsFromIntervention(
        intervention,
        model,
      )

      for (const insight of insights) {
        insightTrajectory.push({
          sessionNumber: intervention.sessionNumber,
          insightType: this.classifyInsightType(
            insight.content,
            intervention.type,
          ),
          insightContent: insight.content,
          depth: this.assessInsightDepth(
            insight.content,
            intervention.patientResponse,
          ),
          stability: this.calculateInsightStability(
            insight.content,
            intervention.type,
            model,
          ),
          integration: this.assessInsightIntegration(
            insight.content,
            model,
            insightTrajectory,
          ),
          relatedBeliefs: intervention.targetBeliefs,
          triggeringIntervention: intervention.content,
        })
      }
    }

    // Identify insight clusters
    const insightClusters = this.identifyInsightClusters(insightTrajectory)

    // Assess development pattern
    const developmentPattern = this.assessInsightDevelopmentPattern(
      insightTrajectory,
      model,
    )

    // Generate recommendations
    const recommendations = this.generateInsightRecommendations(
      insightTrajectory,
      developmentPattern,
      model,
    )

    return {
      insightTrajectory,
      insightClusters,
      developmentPattern,
      recommendations,
    }
  }

  /**
   * Models skill acquisition for therapeutic techniques and coping strategies
   */
  public async modelSkillAcquisition(
    modelId: string,
    skillTrainingHistory: Array<{
      skillName: string
      category:
        | 'coping'
        | 'communication'
        | 'emotional-regulation'
        | 'cognitive'
        | 'behavioral'
      trainingMethod:
        | 'instruction'
        | 'modeling'
        | 'practice'
        | 'homework'
        | 'real-world-application'
      sessionNumber: number
      practiceAttempts: number
      successRate: number // 0-1
      patientFeedback: string
      therapistObservations: string
    }>,
  ): Promise<{
    skillProgression: Array<{
      skillName: string
      category: string
      acquisitionStage:
        | 'introduction'
        | 'learning'
        | 'practice'
        | 'mastery'
        | 'generalization'
      proficiencyLevel: number // 0-1
      retentionRate: number // 0-1
      transferability: number // 0-1, how well skill transfers to new situations
      learningCurve: Array<{
        session: number
        proficiency: number
        confidence: number
      }>
      masteryPrediction: { sessionsToMastery: number; confidence: number }
      barriers: string[]
      facilitators: string[]
    }>
    overallSkillProfile: {
      totalSkillsIntroduced: number
      skillsInProgress: number
      skillsMastered: number
      averageProficiency: number
      learningEfficiency: number // skills mastered per session
      preferredLearningMethods: string[]
    }
    adaptiveRecommendations: Array<{
      skillFocus: string
      trainingApproach: string
      sessionStructure: string
      expectedTimeline: string
      successIndicators: string[]
    }>
  }> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Cognitive model with id ${modelId} not found.`)
    }

    const skillProgression: Array<{
      skillName: string
      category: string
      acquisitionStage:
        | 'introduction'
        | 'learning'
        | 'practice'
        | 'mastery'
        | 'generalization'
      proficiencyLevel: number
      retentionRate: number
      transferability: number
      learningCurve: Array<{
        session: number
        proficiency: number
        confidence: number
      }>
      masteryPrediction: { sessionsToMastery: number; confidence: number }
      barriers: string[]
      facilitators: string[]
    }> = []

    // Group training history by skill
    const skillGroups = new Map<string, typeof skillTrainingHistory>()
    for (const training of skillTrainingHistory) {
      if (!skillGroups.has(training.skillName)) {
        skillGroups.set(training.skillName, [])
      }
      skillGroups.get(training.skillName)!.push(training)
    }

    // Analyze each skill's progression
    for (const [skillName, trainings] of skillGroups) {
      const sortedTrainings = trainings.sort(
        (a, b) => a.sessionNumber - b.sessionNumber,
      )
      const learningCurve: Array<{
        session: number
        proficiency: number
        confidence: number
      }> = []

      let cumulativeProficiency = 0
      for (const training of sortedTrainings) {
        // Calculate proficiency based on success rate and practice
        const sessionProficiency = this.calculateSessionProficiency(
          training,
          cumulativeProficiency,
        )
        cumulativeProficiency = sessionProficiency

        const confidence = this.assessSkillConfidence(
          training.patientFeedback,
          training.successRate,
        )

        learningCurve.push({
          session: training.sessionNumber,
          proficiency: sessionProficiency,
          confidence,
        })
      }

      const currentProficiency =
        learningCurve[learningCurve.length - 1]?.proficiency || 0
      const acquisitionStage = this.determineAcquisitionStage(
        currentProficiency,
        learningCurve,
      )
      const retentionRate = this.calculateRetentionRate(learningCurve)
      const transferability = this.assessTransferability(
        skillName,
        trainings[0].category,
        model,
      )
      const masteryPrediction = this.predictMastery(
        learningCurve,
        currentProficiency,
      )
      const barriers = this.identifySkillBarriers(trainings, model)
      const facilitators = this.identifySkillFacilitators(trainings, model)

      skillProgression.push({
        skillName,
        category: trainings[0].category,
        acquisitionStage,
        proficiencyLevel: currentProficiency,
        retentionRate,
        transferability,
        learningCurve,
        masteryPrediction,
        barriers,
        facilitators,
      })
    }

    // Calculate overall skill profile
    const totalSkillsIntroduced = skillProgression.length
    const skillsInProgress = skillProgression.filter(
      (s) =>
        s.acquisitionStage === 'learning' || s.acquisitionStage === 'practice',
    ).length
    const skillsMastered = skillProgression.filter(
      (s) =>
        s.acquisitionStage === 'mastery' ||
        s.acquisitionStage === 'generalization',
    ).length
    const averageProficiency =
      skillProgression.reduce((sum, s) => sum + s.proficiencyLevel, 0) /
      totalSkillsIntroduced

    const totalSessions = Math.max(
      ...skillTrainingHistory.map((t) => t.sessionNumber),
    )
    const learningEfficiency = skillsMastered / totalSessions

    const preferredLearningMethods =
      this.identifyPreferredLearningMethods(skillTrainingHistory)

    // Generate adaptive recommendations
    const adaptiveRecommendations = this.generateSkillRecommendations(
      skillProgression,
      model,
    )

    return {
      skillProgression,
      overallSkillProfile: {
        totalSkillsIntroduced,
        skillsInProgress,
        skillsMastered,
        averageProficiency,
        learningEfficiency,
        preferredLearningMethods,
      },
      adaptiveRecommendations,
    }
  }

  // Helper methods for therapeutic progress tracking

  private analyzeModificationPattern(
    trajectory: Array<{
      session: number
      strength: number
      changeRate: number
    }>,
  ): 'linear' | 'exponential' | 'plateau' | 'oscillating' | 'breakthrough' {
    if (trajectory.length < 3) {
      return 'linear'
    }

    const changeRates = trajectory.map((t) => t.changeRate)
    const _strengths = trajectory.map((t) => t.strength)

    // Check for breakthrough pattern (sudden large change)
    if (changeRates.some((rate) => Math.abs(rate) >= 3.0)) {
      return 'breakthrough'
    }

    // Check for oscillating pattern (alternating positive/negative changes)
    let oscillations = 0
    for (let i = 1; i < changeRates.length; i++) {
      if (
        (changeRates[i] > 0 && changeRates[i - 1] < 0) ||
        (changeRates[i] < 0 && changeRates[i - 1] > 0)
      ) {
        oscillations++
      }
    }
    if (oscillations >= changeRates.length * 0.6) {
      return 'oscillating'
    }

    // Check for plateau (minimal change in recent sessions)
    const recentChanges = changeRates.slice(-3)
    if (recentChanges.every((rate) => Math.abs(rate) < 0.5)) {
      return 'plateau'
    }

    // Check for exponential pattern (accelerating change)
    const earlyAvg =
      changeRates
        .slice(0, Math.floor(changeRates.length / 2))
        .reduce((a, b) => a + Math.abs(b), 0) /
      Math.floor(changeRates.length / 2)
    const lateAvg =
      changeRates
        .slice(Math.floor(changeRates.length / 2))
        .reduce((a, b) => a + Math.abs(b), 0) /
      Math.ceil(changeRates.length / 2)

    if (lateAvg > earlyAvg * 1.5) {
      return 'exponential'
    }

    return 'linear'
  }

  /**
   * Generates insights from therapeutic interventions
   */
  private generateInsightsFromIntervention(
    intervention: {
      type:
        | 'cognitive-restructuring'
        | 'socratic-questioning'
        | 'behavioral-experiment'
        | 'mindfulness'
        | 'psychoeducation'
      content: string
      targetBeliefs: string[]
      sessionNumber: number
      patientResponse: string
    },
    _model: CognitiveModel,
  ): Array<{ content: string; type: string }> {
    const insights: Array<{ content: string; type: string }> = []

    // Generate insights based on intervention type and patient response
    switch (intervention.type) {
      case 'cognitive-restructuring':
        if (
          intervention.patientResponse.toLowerCase().includes('realize') ||
          intervention.patientResponse.toLowerCase().includes('see now')
        ) {
          insights.push({
            content: `Recognized alternative perspective on ${intervention.targetBeliefs[0] || 'core belief'}`,
            type: 'cognitive',
          })
        }
        break

      case 'socratic-questioning':
        if (
          intervention.patientResponse
            .toLowerCase()
            .includes('never thought') ||
          intervention.patientResponse.toLowerCase().includes('good point')
        ) {
          insights.push({
            content: `Discovered new understanding through self-reflection`,
            type: 'cognitive',
          })
        }
        break

      case 'behavioral-experiment':
        if (
          intervention.patientResponse.toLowerCase().includes('surprised') ||
          intervention.patientResponse
            .toLowerCase()
            .includes('different than expected')
        ) {
          insights.push({
            content: `Learned from direct experience that challenged expectations`,
            type: 'behavioral',
          })
        }
        break

      case 'mindfulness':
        if (
          intervention.patientResponse.toLowerCase().includes('aware') ||
          intervention.patientResponse.toLowerCase().includes('notice')
        ) {
          insights.push({
            content: `Increased awareness of present-moment experience`,
            type: 'emotional',
          })
        }
        break

      case 'psychoeducation':
        if (
          intervention.patientResponse.toLowerCase().includes('understand') ||
          intervention.patientResponse.toLowerCase().includes('makes sense')
        ) {
          insights.push({
            content: `Gained educational understanding of psychological concepts`,
            type: 'cognitive',
          })
        }
        break
    }

    return insights
  }

  /**
   * Classifies the type of insight based on content and intervention
   */
  private classifyInsightType(
    content: string,
    interventionType: string,
  ): 'cognitive' | 'emotional' | 'behavioral' | 'relational' | 'existential' {
    const contentLower = content.toLowerCase()

    // Check for specific insight patterns
    if (
      contentLower.includes('feel') ||
      contentLower.includes('emotion') ||
      contentLower.includes('aware')
    ) {
      return 'emotional'
    }
    if (
      contentLower.includes('behavior') ||
      contentLower.includes('action') ||
      contentLower.includes('experience')
    ) {
      return 'behavioral'
    }
    if (
      contentLower.includes('relationship') ||
      contentLower.includes('others') ||
      contentLower.includes('connect')
    ) {
      return 'relational'
    }
    if (
      contentLower.includes('meaning') ||
      contentLower.includes('purpose') ||
      contentLower.includes('life')
    ) {
      return 'existential'
    }

    // Default based on intervention type
    switch (interventionType) {
      case 'mindfulness':
        return 'emotional'
      case 'behavioral-experiment':
        return 'behavioral'
      default:
        return 'cognitive'
    }
  }

  /**
   * Assesses the depth of an insight
   */
  private assessInsightDepth(
    content: string,
    patientResponse: string,
  ): 'surface' | 'intermediate' | 'deep' | 'transformative' {
    const combinedText = (content + ' ' + patientResponse).toLowerCase()

    // Transformative indicators
    if (
      combinedText.includes('completely different') ||
      combinedText.includes('life-changing') ||
      combinedText.includes('everything makes sense now')
    ) {
      return 'transformative'
    }

    // Deep insight indicators
    if (
      combinedText.includes('profound') ||
      combinedText.includes('deeply understand') ||
      combinedText.includes('fundamental') ||
      combinedText.includes('core of')
    ) {
      return 'deep'
    }

    // Intermediate insight indicators
    if (
      combinedText.includes('starting to see') ||
      combinedText.includes('beginning to understand') ||
      combinedText.includes('makes more sense')
    ) {
      return 'intermediate'
    }

    return 'surface'
  }

  /**
   * Calculates insight stability
   */
  private calculateInsightStability(
    content: string,
    interventionType: string,
    _model: CognitiveModel,
  ): number {
    let stability = 0.5 // Base stability

    // Intervention type affects stability
    const stabilityByType: Record<string, number> = {
      'cognitive-restructuring': 0.7,
      'behavioral-experiment': 0.8, // Experience-based insights are more stable
      'socratic-questioning': 0.6,
      'mindfulness': 0.5,
      'psychoeducation': 0.4,
    }

    stability = stabilityByType[interventionType] || 0.5

    // Content-based adjustments
    const contentLower = content.toLowerCase()
    if (contentLower.includes('experience') || contentLower.includes('felt')) {
      stability += 0.1 // Experiential insights are more stable
    }
    if (
      contentLower.includes('understand') ||
      contentLower.includes('realize')
    ) {
      stability += 0.05 // Cognitive insights have moderate stability
    }

    return Math.min(1, Math.max(0, stability))
  }

  /**
   * Assesses insight integration
   */
  private assessInsightIntegration(
    content: string,
    _model: CognitiveModel,
    existingInsights: Array<{ insightContent: string }>,
  ): number {
    let integration = 0.3 // Base integration

    // Check for connections to existing insights
    const contentLower = content.toLowerCase()
    const relatedInsights = existingInsights.filter((insight) =>
      this.hasSemanticSimilarity(
        contentLower,
        insight.insightContent.toLowerCase(),
      ),
    )

    // More related insights = better integration
    integration += Math.min(0.4, relatedInsights.length * 0.1)

    // Integration indicators in content
    if (
      contentLower.includes('connect') ||
      contentLower.includes('relate') ||
      contentLower.includes('together')
    ) {
      integration += 0.2
    }
    if (contentLower.includes('pattern') || contentLower.includes('theme')) {
      integration += 0.1
    }

    return Math.min(1, Math.max(0, integration))
  }

  /**
   * Identifies clusters of related insights
   */
  private identifyInsightClusters(
    insights: Array<{ insightContent: string; insightType: string }>,
  ): Array<{
    theme: string
    insights: string[]
    coherence: number
    therapeuticValue: number
  }> {
    const clusters: Array<{
      theme: string
      insights: string[]
      coherence: number
      therapeuticValue: number
    }> = []

    // Group by insight type first
    const typeGroups = new Map<string, string[]>()
    for (const insight of insights) {
      if (!typeGroups.has(insight.insightType)) {
        typeGroups.set(insight.insightType, [])
      }
      typeGroups.get(insight.insightType)!.push(insight.insightContent)
    }

    // Create clusters from type groups
    for (const [type, insightContents] of typeGroups) {
      if (insightContents.length >= 2) {
        const coherence = this.calculateClusterCoherence(insightContents)
        const therapeuticValue = this.assessTherapeuticValue(
          type,
          insightContents,
        )

        clusters.push({
          theme: `${type.charAt(0).toUpperCase() + type.slice(1)} insights`,
          insights: insightContents,
          coherence,
          therapeuticValue,
        })
      }
    }

    return clusters
  }

  /**
   * Calculates coherence within a cluster of insights
   */
  private calculateClusterCoherence(insights: string[]): number {
    if (insights.length < 2) {
      return 1
    }

    let totalSimilarity = 0
    let comparisons = 0

    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        totalSimilarity += this.hasSemanticSimilarity(insights[i], insights[j])
          ? 0.7
          : 0.3
        comparisons++
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0.5
  }

  /**
   * Assesses therapeutic value of insight cluster
   */
  private assessTherapeuticValue(type: string, insights: string[]): number {
    let value = 0.5 // Base value

    // Type-based value
    const valueByType = {
      cognitive: 0.8,
      emotional: 0.7,
      behavioral: 0.9,
      relational: 0.6,
      existential: 0.5,
    }

    value = valueByType[type as keyof typeof valueByType] || 0.5

    // Quantity bonus
    value += Math.min(0.2, insights.length * 0.05)

    return Math.min(1, value)
  }

  /**
   * Assesses insight development pattern
   */
  private assessInsightDevelopmentPattern(
    insights: Array<{
      sessionNumber: number
      depth: string
      stability: number
      integration: number
    }>,
    _model: CognitiveModel,
  ): {
    phase:
      | 'initial-awareness'
      | 'exploration'
      | 'understanding'
      | 'integration'
      | 'transformation'
    progressRate: 'slow' | 'moderate' | 'rapid' | 'breakthrough'
    readinessForNextPhase: number
    potentialBarriers: string[]
  } {
    if (insights.length === 0) {
      return {
        phase: 'initial-awareness',
        progressRate: 'slow',
        readinessForNextPhase: 0.1,
        potentialBarriers: ['No insights yet developed'],
      }
    }

    // Analyze recent insights
    const recentInsights = insights.slice(-3)
    const avgDepthScore = this.calculateDepthScore(recentInsights)
    const avgStability =
      recentInsights.reduce((sum, i) => sum + i.stability, 0) /
      recentInsights.length
    const avgIntegration =
      recentInsights.reduce((sum, i) => sum + i.integration, 0) /
      recentInsights.length

    // Determine phase
    let phase:
      | 'initial-awareness'
      | 'exploration'
      | 'understanding'
      | 'integration'
      | 'transformation'
    if (avgDepthScore >= 3.5 && avgIntegration >= 0.8) {
      phase = 'transformation'
    } else if (avgDepthScore >= 2.5 && avgIntegration >= 0.6) {
      phase = 'integration'
    } else if (avgDepthScore >= 2.0) {
      phase = 'understanding'
    } else if (insights.length >= 3) {
      phase = 'exploration'
    } else {
      phase = 'initial-awareness'
    }

    // Determine progress rate
    const sessionSpan = Math.max(
      1,
      insights[insights.length - 1].sessionNumber - insights[0].sessionNumber,
    )
    const insightsPerSession = insights.length / sessionSpan

    let progressRate: 'slow' | 'moderate' | 'rapid' | 'breakthrough'
    if (insightsPerSession >= 2) {
      progressRate = 'breakthrough'
    } else if (insightsPerSession >= 1) {
      progressRate = 'rapid'
    } else if (insightsPerSession >= 0.5) {
      progressRate = 'moderate'
    } else {
      progressRate = 'slow'
    }

    // Calculate readiness for next phase
    const readinessForNextPhase = Math.min(
      1,
      avgDepthScore / 4 + avgStability * 0.3 + avgIntegration * 0.3,
    )

    // Identify potential barriers
    const potentialBarriers: string[] = []
    if (avgStability < 0.5) {
      potentialBarriers.push('Low insight stability')
    }
    if (avgIntegration < 0.4) {
      potentialBarriers.push('Poor insight integration')
    }
    if (progressRate === 'slow') {
      potentialBarriers.push('Slow insight development rate')
    }

    return {
      phase,
      progressRate,
      readinessForNextPhase,
      potentialBarriers,
    }
  }

  /**
   * Calculates depth score for insights
   */
  private calculateDepthScore(insights: Array<{ depth: string }>): number {
    const depthScores = {
      surface: 1,
      intermediate: 2,
      deep: 3,
      transformative: 4,
    }

    const totalScore = insights.reduce((sum, insight) => {
      return sum + (depthScores[insight.depth as keyof typeof depthScores] || 1)
    }, 0)

    return insights.length > 0 ? totalScore / insights.length : 0
  }

  private predictBeliefOutcome(
    trajectory: Array<{
      session: number
      strength: number
      changeRate: number
    }>,
    initialStrength: number,
  ): { finalStrength: number; sessionsToTarget: number; confidence: number } {
    if (trajectory.length === 0) {
      return {
        finalStrength: initialStrength,
        sessionsToTarget: 0,
        confidence: 0,
      }
    }

    const currentStrength = trajectory[trajectory.length - 1].strength
    const averageChangeRate =
      trajectory.reduce((sum, t) => sum + t.changeRate, 0) / trajectory.length

    // Target strength for therapeutic success (typically 3 or below for maladaptive beliefs)
    const targetStrength = 3

    if (Math.abs(averageChangeRate) < 0.1) {
      // Minimal change - predict current strength will persist
      return {
        finalStrength: currentStrength,
        sessionsToTarget: Infinity,
        confidence: 0.3,
      }
    }

    const sessionsToTarget = Math.abs(
      (currentStrength - targetStrength) / averageChangeRate,
    )
    const finalStrength = Math.max(
      0,
      Math.min(10, currentStrength + averageChangeRate * 10),
    ) // Project 10 sessions ahead

    // Confidence based on consistency of change
    const changeVariance =
      trajectory.reduce(
        (sum, t) => sum + Math.pow(t.changeRate - averageChangeRate, 2),
        0,
      ) / trajectory.length
    const confidence = Math.max(0.1, Math.min(0.9, 1 - changeVariance / 2))

    return { finalStrength, sessionsToTarget, confidence }
  }

  private assessProgressVelocity(
    beliefEvolution: Array<{
      strengthTrajectory: Array<{ changeRate: number }>
    }>,
  ): 'accelerating' | 'steady' | 'decelerating' | 'stagnant' {
    const allChangeRates = beliefEvolution.flatMap((belief) =>
      belief.strengthTrajectory.map((t) => Math.abs(t.changeRate)),
    )

    if (allChangeRates.length < 4) {
      return 'steady'
    }

    const firstHalf = allChangeRates.slice(
      0,
      Math.floor(allChangeRates.length / 2),
    )
    const secondHalf = allChangeRates.slice(
      Math.floor(allChangeRates.length / 2),
    )

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    if (secondAvg < 0.2) {
      return 'stagnant'
    }
    if (secondAvg > firstAvg * 1.3) {
      return 'accelerating'
    }
    if (secondAvg < firstAvg * 0.7) {
      return 'decelerating'
    }
    return 'steady'
  }

  private calculateTherapeuticMomentum(
    beliefEvolution: Array<{
      strengthTrajectory: Array<{ changeRate: number }>
    }>,
    sessionHistory: Array<{ sessionNumber: number }>,
  ): number {
    const recentSessions = Math.min(3, sessionHistory.length)
    const recentChanges = beliefEvolution.flatMap((belief) =>
      belief.strengthTrajectory
        .slice(-recentSessions)
        .map((t) => Math.abs(t.changeRate)),
    )

    const averageRecentChange =
      recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length

    // Scale to 0-10, where 10 represents maximum therapeutic momentum
    return Math.min(10, averageRecentChange * 3)
  }

  private generateProgressRecommendations(
    beliefEvolution: Array<{
      beliefId: string
      beliefText: string
      modificationPattern: string
      predictedOutcome: {
        finalStrength: number
        sessionsToTarget: number
        confidence: number
      }
    }>,
    overallProgress: {
      totalBeliefStrengthReduction: number
      averageChangeRate: number
      progressVelocity: string
      therapeuticMomentum: number
    },
  ): Array<{
    type: 'intervention' | 'pacing' | 'focus-shift' | 'consolidation'
    description: string
    targetBeliefs: string[]
    priority: 'high' | 'medium' | 'low'
    rationale: string
  }> {
    const recommendations: Array<{
      type: 'intervention' | 'pacing' | 'focus-shift' | 'consolidation'
      description: string
      targetBeliefs: string[]
      priority: 'high' | 'medium' | 'low'
      rationale: string
    }> = []

    // Identify stagnant beliefs needing intervention
    const stagnantBeliefs = beliefEvolution.filter(
      (belief) =>
        belief.modificationPattern === 'plateau' &&
        belief.predictedOutcome.finalStrength > 5,
    )

    if (stagnantBeliefs.length > 0) {
      recommendations.push({
        type: 'intervention',
        description:
          'Implement intensive cognitive restructuring for resistant beliefs',
        targetBeliefs: stagnantBeliefs.map((b) => b.beliefId),
        priority: 'high',
        rationale:
          'These beliefs show resistance to change and may require more intensive intervention',
      })
    }

    // Check for rapid progress needing consolidation
    const rapidChangeBeliefs = beliefEvolution.filter(
      (belief) =>
        belief.modificationPattern === 'exponential' ||
        belief.modificationPattern === 'breakthrough',
    )

    if (rapidChangeBeliefs.length > 0) {
      recommendations.push({
        type: 'consolidation',
        description:
          'Focus on consolidating recent gains and preventing relapse',
        targetBeliefs: rapidChangeBeliefs.map((b) => b.beliefId),
        priority: 'medium',
        rationale:
          'Rapid changes need consolidation to ensure lasting therapeutic benefit',
      })
    }

    // Assess overall pacing
    if (
      overallProgress.progressVelocity === 'stagnant' &&
      overallProgress.therapeuticMomentum < 3
    ) {
      recommendations.push({
        type: 'pacing',
        description: 'Increase session frequency and intervention intensity',
        targetBeliefs: [],
        priority: 'high',
        rationale:
          'Overall progress has stagnated and requires therapeutic momentum boost',
      })
    } else if (
      overallProgress.progressVelocity === 'accelerating' &&
      overallProgress.therapeuticMomentum > 8
    ) {
      recommendations.push({
        type: 'pacing',
        description: 'Consider reducing intensity to allow integration time',
        targetBeliefs: [],
        priority: 'low',
        rationale: 'Very rapid progress may benefit from consolidation time',
      })
    }

    return recommendations
  }

  private generateInsightRecommendations(
    insights: Array<{
      insightType: string
      depth: string
      stability: number
      integration: number
    }>,
    developmentPattern: {
      phase: string
      progressRate: string
      readinessForNextPhase: number
      potentialBarriers: string[]
    },
    _model: CognitiveModel,
  ): Array<{
    intervention: string
    timing: 'immediate' | 'next-session' | 'when-ready' | 'maintenance'
    expectedOutcome: string
    riskFactors: string[]
  }> {
    const recommendations: Array<{
      intervention: string
      timing: 'immediate' | 'next-session' | 'when-ready' | 'maintenance'
      expectedOutcome: string
      riskFactors: string[]
    }> = []

    // Phase-specific recommendations
    switch (developmentPattern.phase) {
      case 'initial-awareness':
        recommendations.push({
          intervention:
            'Gentle psychoeducation and awareness-building exercises',
          timing: 'immediate',
          expectedOutcome: 'Increased recognition of patterns and symptoms',
          riskFactors: ['Overwhelming patient with too much information'],
        })
        break

      case 'exploration':
        recommendations.push({
          intervention: 'Socratic questioning to deepen self-discovery',
          timing: 'next-session',
          expectedOutcome: 'Enhanced understanding of personal patterns',
          riskFactors: ['Patient may feel interrogated if not done skillfully'],
        })
        break

      case 'understanding':
        recommendations.push({
          intervention: 'Cognitive restructuring and behavioral experiments',
          timing: 'when-ready',
          expectedOutcome:
            'Application of insights to create behavioral change',
          riskFactors: ['Premature action may lead to setbacks'],
        })
        break

      case 'integration':
        recommendations.push({
          intervention: 'Practice consolidation and relapse prevention',
          timing: 'maintenance',
          expectedOutcome:
            'Sustained therapeutic gains and skill generalization',
          riskFactors: ['Complacency may lead to skill deterioration'],
        })
        break

      case 'transformation':
        recommendations.push({
          intervention: 'Support for identity integration and meaning-making',
          timing: 'maintenance',
          expectedOutcome: 'Stable personality and worldview changes',
          riskFactors: ['Identity confusion during major changes'],
        })
        break
    }

    // Address specific barriers
    for (const barrier of developmentPattern.potentialBarriers) {
      if (barrier.includes('resistance')) {
        recommendations.push({
          intervention: 'Motivational interviewing and alliance building',
          timing: 'immediate',
          expectedOutcome:
            'Reduced resistance and improved therapeutic engagement',
          riskFactors: ['Pushing too hard may increase resistance'],
        })
      }
      if (barrier.includes('stability')) {
        recommendations.push({
          intervention: 'Repetition and reinforcement of key insights',
          timing: 'next-session',
          expectedOutcome: 'Improved insight retention and stability',
          riskFactors: ['Repetition may feel patronizing to some patients'],
        })
      }
      if (barrier.includes('integration')) {
        recommendations.push({
          intervention:
            'Homework assignments and real-world application exercises',
          timing: 'when-ready',
          expectedOutcome: 'Better integration of insights into daily life',
          riskFactors: [
            'Homework non-compliance may indicate readiness issues',
          ],
        })
      }
    }

    return recommendations
  }

  // Skill acquisition helper methods

  private calculateSessionProficiency(
    training: {
      practiceAttempts: number
      successRate: number
      trainingMethod: string
    },
    previousProficiency: number,
  ): number {
    const methodMultipliers = {
      'instruction': 0.1,
      'modeling': 0.15,
      'practice': 0.3,
      'homework': 0.2,
      'real-world-application': 0.4,
    }

    const methodMultiplier =
      methodMultipliers[
        training.trainingMethod as keyof typeof methodMultipliers
      ] || 0.2
    const practiceBonus = Math.min(0.2, training.practiceAttempts * 0.02)
    const successBonus = training.successRate * 0.3

    const sessionGain = methodMultiplier + practiceBonus + successBonus

    return Math.min(1, previousProficiency + sessionGain)
  }

  private assessSkillConfidence(feedback: string, successRate: number): number {
    let confidence = successRate * 0.7 // Base confidence from success rate

    const feedbackLower = feedback.toLowerCase()
    const positiveWords = [
      'confident',
      'comfortable',
      'easy',
      'natural',
      'good',
      'better',
    ]
    const negativeWords = [
      'difficult',
      'hard',
      'confused',
      'unsure',
      'struggle',
      'challenging',
    ]

    const positiveCount = positiveWords.filter((word) =>
      feedbackLower.includes(word),
    ).length
    const negativeCount = negativeWords.filter((word) =>
      feedbackLower.includes(word),
    ).length

    confidence += positiveCount * 0.1 - negativeCount * 0.1

    return Math.min(1, Math.max(0, confidence))
  }

  private determineAcquisitionStage(
    proficiency: number,
    learningCurve: Array<{ proficiency: number }>,
  ): 'introduction' | 'learning' | 'practice' | 'mastery' | 'generalization' {
    if (proficiency >= 0.9 && learningCurve.length >= 5) {
      return 'generalization'
    }
    if (proficiency >= 0.7) {
      return 'mastery'
    }
    if (proficiency >= 0.4 && learningCurve.length >= 3) {
      return 'practice'
    }
    if (learningCurve.length >= 2) {
      return 'learning'
    }
    return 'introduction'
  }

  private calculateRetentionRate(
    learningCurve: Array<{ session: number; proficiency: number }>,
  ): number {
    if (learningCurve.length < 3) {
      return 0.5
    }

    let retentionSum = 0
    let retentionCount = 0

    for (let i = 1; i < learningCurve.length; i++) {
      const sessionGap = learningCurve[i].session - learningCurve[i - 1].session
      if (sessionGap > 1) {
        // There was a gap between sessions
        const proficiencyRetained =
          learningCurve[i].proficiency / learningCurve[i - 1].proficiency
        retentionSum += Math.min(1, proficiencyRetained)
        retentionCount++
      }
    }

    return retentionCount > 0 ? retentionSum / retentionCount : 0.8 // Default good retention
  }

  private assessTransferability(
    skillName: string,
    category: string,
    _model: CognitiveModel,
  ): number {
    let transferability = 0.5 // Base transferability

    // Category-specific transferability
    const categoryTransfer = {
      'coping': 0.8, // Coping skills transfer well
      'communication': 0.7,
      'emotional-regulation': 0.6,
      'cognitive': 0.9, // Cognitive skills are highly transferable
      'behavioral': 0.5,
    }

    transferability =
      categoryTransfer[category as keyof typeof categoryTransfer] || 0.5

    // Patient characteristics affect transferability
    if (_model.conversationalStyle.insightLevel > 7) {
      transferability += 0.1 // High insight helps transfer
    }
    if (
      _model.therapeuticProgress.changeReadiness === 'action' ||
      _model.therapeuticProgress.changeReadiness === 'maintenance'
    ) {
      transferability += 0.1 // Readiness for change helps transfer
    }

    return Math.min(1, transferability)
  }

  private predictMastery(
    learningCurve: Array<{ proficiency: number }>,
    currentProficiency: number,
  ): { sessionsToMastery: number; confidence: number } {
    if (currentProficiency >= 0.7) {
      return { sessionsToMastery: 0, confidence: 0.9 }
    }

    if (learningCurve.length < 2) {
      return { sessionsToMastery: 10, confidence: 0.3 }
    }

    // Calculate average learning rate
    const learningRates: number[] = []
    for (let i = 1; i < learningCurve.length; i++) {
      learningRates.push(
        learningCurve[i].proficiency - learningCurve[i - 1].proficiency,
      )
    }

    const averageLearningRate =
      learningRates.reduce((a, b) => a + b, 0) / learningRates.length

    const sessionsToMastery = Math.ceil(
      (0.7 - currentProficiency) / averageLearningRate,
    )

    // Confidence based on consistency of learning rate
    const rateVariance =
      learningRates.reduce(
        (sum, rate) => sum + Math.pow(rate - averageLearningRate, 2),
        0,
      ) / learningRates.length
    const confidence = Math.max(0.1, Math.min(0.9, 1 - rateVariance))

    return { sessionsToMastery, confidence }
  }

  private identifySkillBarriers(
    trainings: Array<{
      patientFeedback: string
      therapistObservations: string
      successRate: number
    }>,
    _model: CognitiveModel,
  ): string[] {
    const barriers: string[] = []

    // Analyze feedback for barrier keywords
    const allFeedback = trainings
      .map((t) => t.patientFeedback + ' ' + t.therapistObservations)
      .join(' ')
      .toLowerCase()

    const barrierPatterns = [
      {
        pattern: /difficult|hard|struggle|challenging/i,
        barrier: 'Skill complexity',
      },
      {
        pattern: /forget|remember|memory/i,
        barrier: 'Memory/retention issues',
      },
      { pattern: /anxious|nervous|worried/i, barrier: 'Performance anxiety' },
      { pattern: /time|busy|schedule/i, barrier: 'Time constraints' },
      {
        pattern: /understand|confus|unclear/i,
        barrier: 'Comprehension difficulties',
      },
    ]

    for (const { pattern, barrier } of barrierPatterns) {
      if (pattern.test(allFeedback)) {
        barriers.push(barrier)
      }
    }

    // Model-based barriers
    if (_model.conversationalStyle.resistance > 6) {
      barriers.push('High therapeutic resistance')
    }
    if (_model.conversationalStyle.insightLevel < 4) {
      barriers.push('Limited insight capacity')
    }

    // Performance-based barriers
    const averageSuccessRate =
      trainings.reduce((sum, t) => sum + t.successRate, 0) / trainings.length
    if (averageSuccessRate < 0.4) {
      barriers.push('Consistently low performance')
    }

    return barriers
  }

  private identifySkillFacilitators(
    trainings: Array<{
      patientFeedback: string
      therapistObservations: string
      successRate: number
      trainingMethod: string
    }>,
    _model: CognitiveModel,
  ): string[] {
    const facilitators: string[] = []

    // Analyze feedback for facilitator keywords
    const allFeedback = trainings
      .map((t) => t.patientFeedback + ' ' + t.therapistObservations)
      .join(' ')
      .toLowerCase()

    const facilitatorPatterns = [
      {
        pattern: /helpful|useful|effective|works/i,
        facilitator: 'Perceived effectiveness',
      },
      {
        pattern: /easy|simple|natural|intuitive/i,
        facilitator: 'Skill accessibility',
      },
      {
        pattern: /practice|repetition|routine/i,
        facilitator: 'Regular practice',
      },
      { pattern: /support|encourage|help/i, facilitator: 'Social support' },
      {
        pattern: /motivated|interested|engaged/i,
        facilitator: 'High motivation',
      },
    ]

    for (const { pattern, facilitator } of facilitatorPatterns) {
      if (pattern.test(allFeedback)) {
        facilitators.push(facilitator)
      }
    }

    // Model-based facilitators
    if (_model.conversationalStyle.insightLevel > 6) {
      facilitators.push('High insight capacity')
    }
    if (
      _model.therapeuticProgress.changeReadiness === 'action' ||
      _model.therapeuticProgress.changeReadiness === 'preparation'
    ) {
      facilitators.push('Readiness for change')
    }

    // Method-based facilitators
    const methodCounts = new Map<string, number>()
    for (const training of trainings) {
      methodCounts.set(
        training.trainingMethod,
        (methodCounts.get(training.trainingMethod) || 0) + 1,
      )
    }

    const mostUsedMethod = Array.from(methodCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]
    if (mostUsedMethod && mostUsedMethod[1] >= 2) {
      facilitators.push(`Effective training method: ${mostUsedMethod[0]}`)
    }

    return facilitators
  }

  private identifyPreferredLearningMethods(
    trainings: Array<{ trainingMethod: string; successRate: number }>,
  ): string[] {
    const methodPerformance = new Map<
      string,
      { totalSuccess: number; count: number }
    >()

    for (const training of trainings) {
      if (!methodPerformance.has(training.trainingMethod)) {
        methodPerformance.set(training.trainingMethod, {
          totalSuccess: 0,
          count: 0,
        })
      }
      methodPerformance.get(training.trainingMethod)!.totalSuccess +=
        training.successRate
      methodPerformance.get(training.trainingMethod)!.count += 1
    }

    const methodAverages = Array.from(methodPerformance.entries()).map(
      ([method, data]) => ({
        method,
        averageSuccess: data.totalSuccess / data.count,
        count: data.count,
      }),
    )

    // Sort by average success rate, but require at least 2 attempts
    return methodAverages
      .filter((m) => m.count >= 2)
      .sort((a, b) => b.averageSuccess - a.averageSuccess)
      .slice(0, 3)
      .map((m) => m.method)
  }

  private generateSkillRecommendations(
    skillProgression: Array<{
      skillName: string
      category: string
      acquisitionStage: string
      proficiencyLevel: number
      retentionRate: number
      transferability: number
      learningCurve: Array<{
        session: number
        proficiency: number
        confidence: number
      }>
      masteryPrediction: { sessionsToMastery: number; confidence: number }
      barriers: string[]
      facilitators: string[]
    }>,
    _model: CognitiveModel,
  ): Array<{
    skillFocus: string
    trainingApproach: string
    sessionStructure: string
    expectedTimeline: string
    successIndicators: string[]
  }> {
    const recommendations: Array<{
      skillFocus: string
      trainingApproach: string
      sessionStructure: string
      expectedTimeline: string
      successIndicators: string[]
    }> = []

    // Identify skills needing attention
    const strugglingSkills = skillProgression.filter(
      (skill) => skill.proficiencyLevel < 0.4 && skill.barriers.length > 0,
    )

    const advancingSkills = skillProgression.filter(
      (skill) =>
        skill.proficiencyLevel >= 0.6 &&
        skill.acquisitionStage !== 'generalization',
    )

    // Recommendations for struggling skills
    for (const skill of strugglingSkills) {
      const primaryBarrier = skill.barriers[0]
      let trainingApproach = 'Standard practice with increased support'
      let sessionStructure = 'Structured practice with immediate feedback'

      if (primaryBarrier.includes('complexity')) {
        trainingApproach = 'Break skill into smaller components'
        sessionStructure = 'Step-by-step building with mastery checks'
      } else if (primaryBarrier.includes('anxiety')) {
        trainingApproach = 'Gradual exposure with relaxation techniques'
        sessionStructure = 'Low-pressure practice with anxiety management'
      } else if (primaryBarrier.includes('motivation')) {
        trainingApproach = 'Motivational interviewing and goal setting'
        sessionStructure = 'Collaborative goal-setting with choice in methods'
      }

      recommendations.push({
        skillFocus: skill.skillName,
        trainingApproach,
        sessionStructure,
        expectedTimeline: '4-6 sessions for basic proficiency',
        successIndicators: [
          'Increased success rate in practice',
          'Reduced anxiety about skill use',
          'Spontaneous skill application',
        ],
      })
    }

    // Recommendations for advancing skills
    for (const skill of advancingSkills) {
      recommendations.push({
        skillFocus: skill.skillName,
        trainingApproach: 'Real-world application and generalization',
        sessionStructure: 'Practice scenarios and homework assignments',
        expectedTimeline: '2-3 sessions for mastery',
        successIndicators: [
          'Consistent skill use outside sessions',
          'Adaptation of skill to new situations',
          'Teaching skill to others',
        ],
      })
    }

    return recommendations
  }

  // Coping Strategy Framework Integration Methods

  /**
   * Generate coping strategy recommendations based on patient model and current situation
   */
  async generateCopingStrategyRecommendations(
    modelId: string,
    situationContext: {
      stressLevel: number
      triggers: string[]
      availableResources: string[]
      timeConstraints: string
      socialContext: 'alone' | 'family' | 'work' | 'social' | 'therapy'
    },
    patientPreferences?: {
      preferredStrategies?: string[]
      avoidedStrategies?: string[]
      pastEffectiveness?: Record<string, number>
    },
  ): Promise<CopingStrategyRecommendation[]> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    // Use the CopingStrategyResponseService to generate recommendations
    const selectionCriteria: CopingSelectionCriteria = {
      stressLevel: situationContext.stressLevel,
      emotionalState: this.getCurrentEmotionalState(model),
      cognitiveCapacity: this.assessCognitiveLoad(model),
      socialSupport: this.assessSocialSupportLevel(
        situationContext.socialContext,
      ),
      timeAvailable: this.parseTimeConstraintsToEnum(
        situationContext.timeConstraints,
      ),
      environment: this.mapSocialContextToEnvironment(
        situationContext.socialContext,
      ),
      pastEffectiveness: patientPreferences?.pastEffectiveness || {},
      therapeuticGoals: this.extractTherapeuticGoals(model),
      contraindications: this.identifyContraindications(model),
    }

    const generationOptions: CopingGenerationOptions = {
      includeDefensiveMechanisms: true,
      adaptToTherapeuticStage: true,
      considerPastEffectiveness: true,
      enableProgressiveAdaptation: true,
      respectPatientPace: true,
      maxStrategiesPerResponse: 5,
      preferenceForAdaptiveCoping: 0.7,
    }

    const copingResponse =
      await this.copingStrategyService.generateCopingResponse(
        `Stress level: ${situationContext.stressLevel}, Context: ${situationContext.socialContext}`,
        model,
        selectionCriteria,
        generationOptions,
      )

    // Convert to our recommendation format
    return this.convertToRecommendations(
      copingResponse,
      model,
      situationContext,
    )
  }

  /**
   * Evaluate the effectiveness of a coping strategy after use
   */
  async evaluateCopingEffectiveness(
    modelId: string,
    copingStrategy: string,
    situationContext: string,
    outcomeData: {
      immediateRelief: number // 1-10 scale
      durationOfRelief: number // minutes/hours
      sideEffects: string[]
      resourcesUsed: string[]
      barriers: string[]
      wouldUseAgain: boolean
      alternativesConsidered: string[]
    },
    followUpData?: {
      shortTermImpact: number // 1-10 scale after 24-48 hours
      longTermImpact: number // 1-10 scale after 1-2 weeks
      behavioralChanges: string[]
      emotionalChanges: string[]
    },
  ): Promise<CopingEffectivenessEvaluation> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const evaluation: CopingEffectivenessEvaluation = {
      copingStrategy,
      situationContext,
      effectiveness: {
        immediate: outcomeData.immediateRelief / 10,
        shortTerm: followUpData?.shortTermImpact
          ? followUpData.shortTermImpact / 10
          : 0.5,
        longTerm: followUpData?.longTermImpact
          ? followUpData.longTermImpact / 10
          : 0.5,
        adaptivePotential: this.assessAdaptivePotential(
          copingStrategy,
          outcomeData,
          model,
        ),
      },
      sideEffects: {
        emotional: this.categorizeEffects(outcomeData.sideEffects, 'emotional'),
        behavioral: this.categorizeEffects(
          outcomeData.sideEffects,
          'behavioral',
        ),
        social: this.categorizeEffects(outcomeData.sideEffects, 'social'),
        physical: this.categorizeEffects(outcomeData.sideEffects, 'physical'),
      },
      contextualFactors: {
        stressLevel: this.inferStressLevel(situationContext),
        socialSupport: this.assessSocialSupport(outcomeData.resourcesUsed),
        resources: outcomeData.resourcesUsed,
        barriers: outcomeData.barriers,
      },
      recommendations: {
        continue: outcomeData.wouldUseAgain && outcomeData.immediateRelief >= 6,
        modify: this.generateModificationSuggestions(
          copingStrategy,
          outcomeData,
        ),
        alternatives: outcomeData.alternativesConsidered,
        timing: this.recommendTiming(outcomeData),
      },
      confidence: this.calculateEvaluationConfidence(outcomeData, followUpData),
    }

    // Store the evaluation for future reference
    await this.storeCopingEvaluation(modelId, evaluation)

    return evaluation
  }

  /**
   * Get personalized coping strategy recommendations based on patient history
   */
  async getPersonalizedCopingStrategies(
    modelId: string,
    currentSituation: string,
    urgencyLevel: 'low' | 'medium' | 'high' | 'crisis',
  ): Promise<{
    primaryStrategies: CopingStrategyRecommendation[]
    backupStrategies: CopingStrategyRecommendation[]
    emergencyStrategies: CopingStrategyRecommendation[]
    personalizedNotes: string[]
  }> {
    const model = await this.getModelById(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const pastEvaluations = await this.getCopingHistory(modelId)
    const effectiveStrategies =
      this.identifyMostEffectiveStrategies(pastEvaluations)

    const situationContext = {
      stressLevel: this.mapUrgencyToStress(urgencyLevel),
      triggers: this.extractTriggers(currentSituation, model),
      availableResources: this.assessAvailableResources(model),
      timeConstraints: this.inferTimeConstraints(urgencyLevel),
      socialContext: this.inferSocialContext(currentSituation) as
        | 'alone'
        | 'family'
        | 'work'
        | 'social'
        | 'therapy',
    }

    const allRecommendations = await this.generateCopingStrategyRecommendations(
      modelId,
      situationContext,
      { pastEffectiveness: effectiveStrategies },
    )

    return {
      primaryStrategies: allRecommendations.slice(0, 3),
      backupStrategies: allRecommendations.slice(3, 6),
      emergencyStrategies: await this.getEmergencyStrategies(
        model,
        urgencyLevel,
      ),
      personalizedNotes: this.generatePersonalizedNotes(model, pastEvaluations),
    }
  }

  // Helper methods for coping strategy framework

  private parseTimeConstraints(timeConstraints: string): number {
    const timeMatch = timeConstraints.match(/(\d+)\s*(minute|hour|day)/i)
    if (!timeMatch) {
      return 30 // default 30 minutes
    }

    const value = parseInt(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()

    switch (unit) {
      case 'minute':
        return value
      case 'hour':
        return value * 60
      case 'day':
        return value * 60 * 24
      default:
        return 30
    }
  }

  private inferTimeConstraints(urgencyLevel: string): string {
    switch (urgencyLevel) {
      case 'crisis':
        return '5 minutes'
      case 'high':
        return '15 minutes'
      case 'medium':
        return '30 minutes'
      case 'low':
        return '1 hour'
      default:
        return '30 minutes'
    }
  }

  private parseTimeConstraintsToEnum(
    timeConstraints: string,
  ): 'immediate' | 'minutes' | 'hours' | 'days' {
    const minutes = this.parseTimeConstraints(timeConstraints)
    if (minutes <= 5) {
      return 'immediate'
    }
    if (minutes <= 60) {
      return 'minutes'
    }
    if (minutes <= 1440) {
      return 'hours' // 24 hours
    }
    return 'days'
  }

  private assessCognitiveLoad(
    model: CognitiveModel,
  ): 'limited' | 'impaired' | 'normal' | 'enhanced' {
    const activeBeliefs = model.coreBeliefs.filter(
      (b) => b.strength > 0.6,
    ).length
    const distortions = model.distortionPatterns.length

    const totalLoad = activeBeliefs + distortions

    if (totalLoad <= 2) {
      return 'enhanced'
    }
    if (totalLoad <= 4) {
      return 'normal'
    }
    if (totalLoad <= 6) {
      return 'limited'
    }
    return 'impaired'
  }

  private assessSocialSupportLevel(
    socialContext: string,
  ): 'none' | 'limited' | 'moderate' | 'strong' {
    switch (socialContext) {
      case 'alone':
        return 'none'
      case 'family':
        return 'strong'
      case 'work':
        return 'moderate'
      case 'social':
        return 'moderate'
      case 'therapy':
        return 'strong'
      default:
        return 'limited'
    }
  }

  private mapSocialContextToEnvironment(
    socialContext: string,
  ): 'private' | 'public' | 'clinical' {
    switch (socialContext) {
      case 'alone':
        return 'private'
      case 'family':
        return 'private'
      case 'work':
        return 'public'
      case 'social':
        return 'public'
      case 'therapy':
        return 'clinical'
      default:
        return 'private'
    }
  }

  private extractTherapeuticGoals(model: CognitiveModel): string[] {
    const goals: string[] = []

    // Extract goals from presenting issues
    goals.push(...model.presentingIssues.map((issue) => `Address ${issue}`))

    // Extract goals from core beliefs
    model.coreBeliefs.forEach((belief) => {
      if (belief.strength > 7) {
        goals.push(`Challenge belief: ${belief.belief.substring(0, 50)}...`)
      }
    })

    return goals.slice(0, 5) // Limit to top 5 goals
  }

  private identifyContraindications(model: CognitiveModel): string[] {
    const contraindications: string[] = []

    // Check for high-risk patterns
    if (
      model.coreBeliefs.some(
        (b) => b.belief.toLowerCase().includes('harm') && b.strength > 8,
      )
    ) {
      contraindications.push('self-harm risk')
    }

    if (
      model.distortionPatterns.some((d) => d.type.includes('catastrophizing'))
    ) {
      contraindications.push('catastrophic thinking')
    }

    // Check emotional patterns for contraindications
    if (
      model.emotionalPatterns.some(
        (e) => e.emotion === 'anger' && e.intensity > 8,
      )
    ) {
      contraindications.push('high anger levels')
    }

    return contraindications
  }

  private convertToRecommendations(
    copingResponse: unknown,
    _model: CognitiveModel,
    _situationContext: unknown,
  ): CopingStrategyRecommendation[] {
    // Convert the coping response to our recommendation format
    // This is a placeholder implementation
    const response = copingResponse as {
      strategies?: Array<{ name: string; description: string }>
    }

    return (response.strategies || []).map(
      (strategy: { name: string; description: string }) => ({
        strategy: strategy.name || strategy.description,
        rationale: `Recommended based on current stress level and context`,
        implementation: {
          steps: ['Apply the strategy when needed'],
          timeline: 'As needed',
          resources: [],
          support: [],
        },
        expectedOutcomes: {
          immediate: ['Reduced stress'],
          shortTerm: ['Improved coping'],
          longTerm: ['Better emotional regulation'],
        },
        riskFactors: [],
        successIndicators: ['Feeling calmer', 'Reduced anxiety'],
        alternatives: [],
      }),
    )
  }

  private assessAdaptivePotential(
    copingStrategy: string,
    outcomeData: {
      immediateRelief: number
      wouldUseAgain: boolean
      sideEffects: string[]
    },
    _model: CognitiveModel,
  ): number {
    let adaptivePotential = 0.5 // Base score

    // Positive indicators
    if (outcomeData.immediateRelief >= 7) {
      adaptivePotential += 0.2
    }
    if (outcomeData.wouldUseAgain) {
      adaptivePotential += 0.1
    }
    if (outcomeData.sideEffects.length === 0) {
      adaptivePotential += 0.1
    }

    // Strategy-specific assessment
    const adaptiveStrategies = [
      'mindfulness',
      'exercise',
      'social support',
      'problem solving',
    ]
    if (
      adaptiveStrategies.some((s) => copingStrategy.toLowerCase().includes(s))
    ) {
      adaptivePotential += 0.1
    }

    return Math.min(1, Math.max(0, adaptivePotential))
  }

  private categorizeEffects(effects: string[], category: string): string[] {
    const categoryKeywords = {
      emotional: ['sad', 'angry', 'anxious', 'depressed', 'mood', 'feeling'],
      behavioral: ['action', 'behavior', 'activity', 'habit', 'routine'],
      social: ['relationship', 'friend', 'family', 'social', 'isolation'],
      physical: ['tired', 'energy', 'sleep', 'appetite', 'pain', 'physical'],
    }

    const keywords =
      categoryKeywords[category as keyof typeof categoryKeywords] || []
    return effects.filter((effect) =>
      keywords.some((keyword) => effect.toLowerCase().includes(keyword)),
    )
  }

  private inferStressLevel(situationContext: string): number {
    const stressKeywords = {
      high: ['crisis', 'emergency', 'panic', 'overwhelming', 'severe'],
      medium: ['difficult', 'challenging', 'stressful', 'worried'],
      low: ['mild', 'manageable', 'slight', 'minor'],
    }

    const contextLower = situationContext.toLowerCase()

    if (stressKeywords.high.some((keyword) => contextLower.includes(keyword))) {
      return 8
    }
    if (
      stressKeywords.medium.some((keyword) => contextLower.includes(keyword))
    ) {
      return 5
    }
    if (stressKeywords.low.some((keyword) => contextLower.includes(keyword))) {
      return 2
    }

    return 5 // Default medium stress
  }

  private assessSocialSupport(
    resourcesUsed: string[],
  ): 'none' | 'limited' | 'moderate' | 'strong' {
    const socialResources = resourcesUsed.filter((resource) =>
      ['friend', 'family', 'therapist', 'support group', 'counselor'].some(
        (social) => resource.toLowerCase().includes(social),
      ),
    )

    if (socialResources.length === 0) {
      return 'none'
    }
    if (socialResources.length === 1) {
      return 'limited'
    }
    if (socialResources.length === 2) {
      return 'moderate'
    }
    return 'strong'
  }

  private generateModificationSuggestions(
    copingStrategy: string,
    outcomeData: {
      immediateRelief: number
      barriers: string[]
      sideEffects: string[]
    },
  ): string[] {
    const suggestions: string[] = []

    if (outcomeData.immediateRelief < 5) {
      suggestions.push('Try combining with another strategy')
      suggestions.push('Practice the technique more frequently')
    }

    if (outcomeData.barriers.length > 0) {
      suggestions.push('Address identified barriers before using')
      suggestions.push('Modify approach to work around constraints')
    }

    if (outcomeData.sideEffects.length > 0) {
      suggestions.push('Monitor for side effects and adjust intensity')
    }

    return suggestions
  }

  private recommendTiming(outcomeData: {
    immediateRelief: number
    durationOfRelief: number
    wouldUseAgain: boolean
  }): 'immediate' | 'short-term' | 'long-term' | 'situational' {
    if (outcomeData.immediateRelief >= 7) {
      return 'immediate'
    }
    if (outcomeData.durationOfRelief > 60) {
      return 'short-term'
    }
    if (outcomeData.wouldUseAgain) {
      return 'situational'
    }
    return 'long-term'
  }

  private calculateEvaluationConfidence(
    outcomeData: {
      practiceAttempts?: number
      barriers: string[]
      immediateRelief: number
    },
    followUpData?: unknown,
  ): number {
    let confidence = 0.5

    // More data points increase confidence
    if (followUpData) {
      confidence += 0.2
    }
    if (outcomeData.practiceAttempts && outcomeData.practiceAttempts > 1) {
      confidence += 0.1
    }
    if (outcomeData.barriers.length === 0) {
      confidence += 0.1
    }
    if (outcomeData.immediateRelief >= 7 || outcomeData.immediateRelief <= 3) {
      confidence += 0.1
    }

    return Math.min(1, confidence)
  }

  private async storeCopingEvaluation(
    modelId: string,
    evaluation: CopingEffectivenessEvaluation,
  ): Promise<void> {
    try {
      const key = `coping_evaluation_${modelId}_${Date.now()}`
      await this.getKvStore().set(key, evaluation)
    } catch (error) {
      console.error('Failed to store coping evaluation:', error)
    }
  }

  private async getCopingHistory(
    _modelId: string,
  ): Promise<CopingEffectivenessEvaluation[]> {
    try {
      // This is a simplified implementation - in practice, you'd want to query by prefix
      const evaluations: CopingEffectivenessEvaluation[] = []
      // Implementation would depend on your KV store's query capabilities
      return evaluations
    } catch (error) {
      console.error('Failed to get coping history:', error)
      return []
    }
  }

  private identifyMostEffectiveStrategies(
    pastEvaluations: CopingEffectivenessEvaluation[],
  ): Record<string, number> {
    const effectiveness: Record<string, number> = {}

    pastEvaluations.forEach((evaluation) => {
      const avgEffectiveness =
        (evaluation.effectiveness.immediate +
          evaluation.effectiveness.shortTerm +
          evaluation.effectiveness.longTerm) /
        3
      effectiveness[evaluation.copingStrategy] = avgEffectiveness
    })

    return effectiveness
  }

  private mapUrgencyToStress(urgencyLevel: string): number {
    switch (urgencyLevel) {
      case 'low':
        return 3
      case 'medium':
        return 5
      case 'high':
        return 8
      case 'crisis':
        return 10
      default:
        return 5
    }
  }

  private extractTriggers(
    currentSituation: string,
    model: CognitiveModel,
  ): string[] {
    const triggers: string[] = []
    const situationLower = currentSituation.toLowerCase()

    // Extract triggers from core beliefs
    model.coreBeliefs.forEach((belief) => {
      belief.relatedDomains.forEach((domain) => {
        if (situationLower.includes(domain.toLowerCase())) {
          triggers.push(domain)
        }
      })
    })

    // Common trigger patterns
    const commonTriggers = ['work', 'relationship', 'health', 'money', 'family']
    commonTriggers.forEach((trigger) => {
      if (situationLower.includes(trigger)) {
        triggers.push(trigger)
      }
    })

    return [...new Set(triggers)] // Remove duplicates
  }

  private assessAvailableResources(model: CognitiveModel): string[] {
    const resources: string[] = []

    // Infer resources from model characteristics
    if (model.conversationalStyle.insightLevel > 6) {
      resources.push('self-reflection', 'cognitive strategies')
    }

    if (
      model.therapeuticProgress.changeReadiness === 'action' ||
      model.therapeuticProgress.changeReadiness === 'maintenance'
    ) {
      resources.push('behavioral techniques', 'skill practice')
    }

    // Default resources
    resources.push('breathing exercises', 'mindfulness', 'journaling')

    return resources
  }

  private inferSocialContext(currentSituation: string): string {
    const situationLower = currentSituation.toLowerCase()

    if (situationLower.includes('work') || situationLower.includes('office')) {
      return 'work'
    }
    if (situationLower.includes('family') || situationLower.includes('home')) {
      return 'family'
    }
    if (
      situationLower.includes('friend') ||
      situationLower.includes('social')
    ) {
      return 'social'
    }
    if (
      situationLower.includes('therapy') ||
      situationLower.includes('session')
    ) {
      return 'therapy'
    }

    return 'alone'
  }

  private async getEmergencyStrategies(
    model: CognitiveModel,
    urgencyLevel: string,
  ): Promise<CopingStrategyRecommendation[]> {
    const emergencyStrategies: CopingStrategyRecommendation[] = [
      {
        strategy: 'Deep breathing exercise',
        rationale: 'Immediate physiological calming response',
        implementation: {
          steps: [
            'Breathe in for 4 counts',
            'Hold for 4 counts',
            'Breathe out for 6 counts',
            'Repeat 5 times',
          ],
          timeline: '2-3 minutes',
          resources: ['Quiet space'],
          support: ['Can be done anywhere'],
        },
        expectedOutcomes: {
          immediate: ['Reduced heart rate', 'Calmer feeling'],
          shortTerm: ['Improved focus'],
          longTerm: ['Better stress management'],
        },
        riskFactors: [],
        successIndicators: ['Slower breathing', 'Feeling more centered'],
        alternatives: ['Progressive muscle relaxation', '5-4-3-2-1 grounding'],
      },
    ]

    if (urgencyLevel === 'crisis') {
      emergencyStrategies.unshift({
        strategy: 'Crisis hotline contact',
        rationale: 'Professional support for crisis situations',
        implementation: {
          steps: [
            'Call crisis hotline',
            'Speak with trained counselor',
            'Follow safety plan',
          ],
          timeline: 'Immediate',
          resources: ['Phone', 'Crisis hotline number'],
          support: ['24/7 professional support'],
        },
        expectedOutcomes: {
          immediate: ['Safety', 'Professional guidance'],
          shortTerm: ['Crisis stabilization'],
          longTerm: ['Connection to ongoing support'],
        },
        riskFactors: [],
        successIndicators: ['Feeling safer', 'Having a plan'],
        alternatives: ['Emergency services', 'Trusted friend/family'],
      })
    }

    return emergencyStrategies
  }

  private generatePersonalizedNotes(
    model: CognitiveModel,
    pastEvaluations: CopingEffectivenessEvaluation[],
  ): string[] {
    const notes: string[] = []

    // Notes based on model characteristics
    if (model.conversationalStyle.resistance > 6) {
      notes.push(
        'You may initially resist new strategies - this is normal and will decrease with practice',
      )
    }

    if (model.conversationalStyle.insightLevel > 7) {
      notes.push(
        'Your high insight level means you can effectively analyze which strategies work best for you',
      )
    }

    // Notes based on past effectiveness
    if (pastEvaluations.length > 0) {
      const avgEffectiveness =
        pastEvaluations.reduce(
          (sum, evaluation) => sum + evaluation.effectiveness.immediate,
          0,
        ) / pastEvaluations.length

      if (avgEffectiveness > 0.7) {
        notes.push(
          'You have shown good response to coping strategies in the past',
        )
      } else if (avgEffectiveness < 0.4) {
        notes.push(
          'Consider working with your therapist to find strategies that work better for you',
        )
      }
    }

    return notes
  }

  private getCurrentEmotionalState(model: CognitiveModel): string {
    // Find the most prominent emotion based on triggers and beliefs
    const emotionCounts: Record<string, number> = {}

    model.coreBeliefs.forEach((belief) => {
      if (belief.associatedEmotions) {
        belief.associatedEmotions.forEach((emotion) => {
          emotionCounts[emotion] =
            (emotionCounts[emotion] || 0) + belief.strength
        })
      }
    })

    const dominantEmotion = Object.entries(emotionCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]

    return dominantEmotion ? dominantEmotion[0] : 'neutral'
  }
}
