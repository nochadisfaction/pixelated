/**
 * Patient-Psi Dataset Integration Service
 *
 * Normalizes Patient-Psi dataset structure with existing cognitive models
 * and provides seamless integration capabilities for therapeutic training
 */

import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type {
  CognitiveModel,
  CoreBelief,
  DistortionPattern,
  BehavioralPattern,
  EmotionalPattern,
  RelationshipPattern,
  FormativeExperience,
  TherapyHistory,
  ConversationalStyle,
  DemographicInfo,
  DiagnosisInfo,
  TherapeuticProgress,
} from '../types/CognitiveModel'
import type { PatientPsiIndexer } from './patient-psi-indexer'
import { PatientPsiParser } from './patient-psi-parser'
import type { PatientPsiCognitiveModel as ParsedPatientModel } from './patient-psi-parser'

// Validation schemas for normalized data
const NormalizationResultSchema = z.object({
  model: z.object({
    id: z.string(),
    name: z.string(),
    demographicInfo: z.object({
      age: z.number(),
      gender: z.string(),
      occupation: z.string(),
      familyStatus: z.string(),
      culturalFactors: z.array(z.string()).optional(),
      socioeconomicStatus: z.string().optional(),
    }),
    presentingIssues: z.array(z.string()),
    diagnosisInfo: z.object({
      primaryDiagnosis: z.string(),
      secondaryDiagnoses: z.array(z.string()).optional(),
      durationOfSymptoms: z.string().optional(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      previousTreatments: z.array(z.string()).optional(),
    }),
    coreBeliefs: z.array(
      z.object({
        id: z.string(),
        belief: z.string(),
        strength: z.number().min(0).max(10),
        evidence: z.array(z.string()),
        formationContext: z.string().optional(),
        relatedDomains: z.array(z.string()),
      }),
    ),
    distortionPatterns: z.array(
      z.object({
        type: z.string(),
        examples: z.array(z.string()),
        triggerThemes: z.array(z.string()),
        frequency: z.enum(['rare', 'occasional', 'frequent', 'pervasive']),
      }),
    ),
    behavioralPatterns: z.array(
      z.object({
        trigger: z.string(),
        response: z.string(),
        reinforcers: z.array(z.string()),
        consequences: z.array(z.string()),
        alternateTried: z.array(z.string()),
      }),
    ),
    emotionalPatterns: z.array(
      z.object({
        emotion: z.string(),
        intensity: z.number().min(0).max(10),
        triggers: z.array(z.string()),
        physicalManifestations: z.array(z.string()),
        copingMechanisms: z.array(z.string()),
      }),
    ),
    relationshipPatterns: z.array(
      z.object({
        type: z.string(),
        expectations: z.array(z.string()),
        fears: z.array(z.string()),
        behaviors: z.array(z.string()),
        historicalOutcomes: z.array(z.string()),
      }),
    ),
    formativeExperiences: z.array(
      z.object({
        age: z.union([z.number(), z.string()]),
        event: z.string(),
        impact: z.string(),
        beliefsFormed: z.array(z.string()),
        emotionalResponse: z.string(),
      }),
    ),
    therapyHistory: z.object({
      previousApproaches: z.array(z.string()),
      helpfulInterventions: z.array(z.string()),
      unhelpfulInterventions: z.array(z.string()),
      insights: z.array(z.string()),
      progressMade: z.string(),
      remainingChallenges: z.array(z.string()),
    }),
    conversationalStyle: z.object({
      verbosity: z.number().min(1).max(10),
      emotionalExpressiveness: z.number().min(1).max(10),
      resistance: z.number().min(1).max(10),
      insightLevel: z.number().min(1).max(10),
      preferredCommunicationModes: z.array(z.string()),
    }),
    goalsForTherapy: z.array(z.string()),
    therapeuticProgress: z.object({
      insights: z.array(
        z.object({
          belief: z.string(),
          insight: z.string(),
          dateAchieved: z.string(),
        }),
      ),
      resistanceLevel: z.number().min(1).max(10),
      changeReadiness: z.enum([
        'precontemplation',
        'contemplation',
        'preparation',
        'action',
        'maintenance',
      ]),
      sessionProgressLog: z.array(
        z.object({
          sessionNumber: z.number(),
          keyInsights: z.array(z.string()),
          resistanceShift: z.number(),
        }),
      ),
    }),
  }),
  metadata: z.object({
    sourceDataset: z.literal('patient-psi'),
    normalizationDate: z.string(),
    originalId: z.string(),
    conversionNotes: z.array(z.string()),
    validationStatus: z.enum(['passed', 'warning', 'error']),
    dataQuality: z.object({
      completeness: z.number().min(0).max(1),
      consistency: z.number().min(0).max(1),
      clinicalValidity: z.number().min(0).max(1),
    }),
  }),
})

export type NormalizationResult = z.infer<typeof NormalizationResultSchema>

export interface IntegrationConfig {
  strictValidation: boolean
  preserveOriginalIds: boolean
  requireCompleteness: number // 0-1, minimum completeness score
  enableDataEnrichment: boolean
  logConversions: boolean
}

export interface ConversionStats {
  totalProcessed: number
  successful: number
  failed: number
  warnings: number
  averageCompleteness: number
  conversionTime: number
}

/**
 * Patient-Psi Dataset Integration Service
 *
 * Handles normalization and integration of Patient-Psi data
 * with existing cognitive model structures
 */
export class PatientPsiIntegration {
  private parser: PatientPsiParser
  private indexer: PatientPsiIndexer
  private config: IntegrationConfig
  private stats: ConversionStats

  constructor(
    parser: PatientPsiParser,
    indexer: PatientPsiIndexer,
    config: Partial<IntegrationConfig> = {},
  ) {
    this.parser = parser
    this.indexer = indexer
    this.config = {
      strictValidation: false,
      preserveOriginalIds: true,
      requireCompleteness: 0.7,
      enableDataEnrichment: true,
      logConversions: true,
      ...config,
    }
    this.stats = this.initializeStats()
  }

  /**
   * Normalize a single Patient-Psi model to CognitiveModel format
   */
  async normalizeModel(
    parsedModel: ParsedPatientModel,
  ): Promise<NormalizationResult> {
    const startTime = Date.now()
    this.stats.totalProcessed++

    try {
      // Transform the parsed model to CognitiveModel format
      const cognitiveModel = await this.transformToCognitiveModel(parsedModel)

      // Validate the transformed model
      const validationResult =
        await this.validateNormalizedModel(cognitiveModel)

      // Calculate data quality metrics
      const dataQuality = this.assessDataQuality(cognitiveModel)

      // Update running total for average completeness calculation
      this.stats.averageCompleteness += dataQuality.completeness

      // Check completeness requirement
      if (dataQuality.completeness < this.config.requireCompleteness) {
        throw new Error(
          `Model completeness ${dataQuality.completeness} below required ${this.config.requireCompleteness}`,
        )
      }

      const result: NormalizationResult = {
        model: cognitiveModel,
        metadata: {
          sourceDataset: 'patient-psi',
          normalizationDate: new Date().toISOString(),
          originalId: parsedModel.id,
          conversionNotes: validationResult.notes,
          validationStatus: validationResult.status,
          dataQuality,
        },
      }

      // Validate the complete result
      const validated = NormalizationResultSchema.parse(result)

      this.stats.successful++
      if (validationResult.status === 'warning') {
        this.stats.warnings++
      }

      return validated
    } catch (error) {
      this.stats.failed++
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      if (this.config.logConversions) {
        console.error(
          `Failed to normalize model ${parsedModel.id}: ${errorMessage}`,
        )
      }

      throw new Error(
        `Normalization failed for model ${parsedModel.id}: ${errorMessage}`,
      )
    } finally {
      this.stats.conversionTime += Date.now() - startTime
    }
  }

  /**
   * Batch normalize multiple Patient-Psi models
   */
  async normalizeModels(
    parsedModels: ParsedPatientModel[],
  ): Promise<NormalizationResult[]> {
    const results: NormalizationResult[] = []
    const errors: Array<{ modelId: string; error: string }> = []

    for (const model of parsedModels) {
      try {
        const result = await this.normalizeModel(model)
        results.push(result)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        errors.push({ modelId: model.id, error: errorMessage })

        if (this.config.strictValidation) {
          throw new Error(
            `Batch normalization failed at model ${model.id}: ${errorMessage}`,
          )
        }
      }
    }

    if (errors.length > 0 && this.config.logConversions) {
      console.warn(
        `Batch normalization completed with ${errors.length} errors:`,
        errors,
      )
    }

    return results
  }

  /**
   * Transform Patient-Psi parsed model to CognitiveModel format
   */
  private async transformToCognitiveModel(
    parsedModel: ParsedPatientModel,
  ): Promise<CognitiveModel> {
    // Extract core beliefs from Patient-Psi belief structure
    const coreBeliefs = this.extractCoreBeliefs(parsedModel)

    // Transform distortion patterns
    const distortionPatterns = this.transformDistortionPatterns(parsedModel)

    // Create behavioral patterns from coping strategies
    const behavioralPatterns = this.createBehavioralPatterns(parsedModel)

    // Transform emotional patterns
    const emotionalPatterns = this.transformEmotionalPatterns(parsedModel)

    // Create relationship patterns from interpersonal data
    const relationshipPatterns = this.createRelationshipPatterns(parsedModel)

    // Extract formative experiences
    const formativeExperiences = this.extractFormativeExperiences(parsedModel)

    // Create therapy history from available data
    const therapyHistory = this.createTherapyHistory(parsedModel)

    // Transform conversational style
    const conversationalStyle = this.transformConversationalStyle(parsedModel)

    // Create demographic info
    const demographicInfo = this.createDemographicInfo(parsedModel)

    // Create diagnosis info
    const diagnosisInfo = this.createDiagnosisInfo(parsedModel)

    // Initialize therapeutic progress
    const therapeuticProgress = this.initializeTherapeuticProgress(parsedModel)

    return {
      id: this.config.preserveOriginalIds
        ? parsedModel.id
        : `normalized_${parsedModel.id}`,
      name: parsedModel.name || `Patient ${parsedModel.id}`,
      demographicInfo,
      presentingIssues: parsedModel.sessionContext?.presentingConcerns || [],
      diagnosisInfo,
      coreBeliefs,
      distortionPatterns,
      behavioralPatterns,
      emotionalPatterns,
      relationshipPatterns,
      formativeExperiences,
      therapyHistory,
      conversationalStyle,
      goalsForTherapy: parsedModel.sessionContext?.goalsForTherapy || [],
      therapeuticProgress,
    }
  }

  /**
   * Extract core beliefs from Patient-Psi belief structure
   */
  private extractCoreBeliefs(parsedModel: ParsedPatientModel): CoreBelief[] {
    const beliefs: CoreBelief[] = []

    // Process core beliefs directly from parsedModel.coreBeliefs
    if (parsedModel.coreBeliefs) {
      for (const belief of parsedModel.coreBeliefs) {
        beliefs.push({
          id: uuidv4(),
          belief: belief.category, // Note: In Patient-Psi schema, 'category' contains the full belief text (e.g., "I am incompetent", "I am unlovable")
          strength: belief.strength || 8,
          evidence: belief.evidence || [],
          formationContext: belief.formationContext,
          relatedDomains: [belief.category], // Using the belief statement as a domain for consistency
        })
      }
    }

    // Process intermediate beliefs directly from parsedModel.intermediateBeliefs
    if (parsedModel.intermediateBeliefs) {
      for (const beliefStatement of parsedModel.intermediateBeliefs) {
        beliefs.push({
          id: uuidv4(),
          belief: beliefStatement,
          strength: 6,
          evidence: [],
          formationContext: undefined,
          relatedDomains: ['intermediate'],
        })
      }
    }
    return beliefs
  }

  /**
   * Transform distortion patterns from Patient-Psi data
   */
  private transformDistortionPatterns(
    parsedModel: ParsedPatientModel,
  ): DistortionPattern[] {
    const patterns: DistortionPattern[] = []
    // Access automaticThoughts directly from parsedModel.automaticThoughts
    if (parsedModel.automaticThoughts) {
      const distortionGroups = new Map<string, string[]>()
      for (const thought of parsedModel.automaticThoughts) {
        const detectedDistortions = this.detectDistortionsInThought(thought)
        for (const distortion of detectedDistortions) {
          if (!distortionGroups.has(distortion)) {
            distortionGroups.set(distortion, [])
          }
          distortionGroups.get(distortion)!.push(thought) // thought is a string here
        }
      }
      for (const [type, examples] of distortionGroups) {
        patterns.push({
          type,
          examples,
          triggerThemes: this.extractTriggerThemes(examples),
          frequency: this.determineFrequency(examples.length),
        })
      }
    }
    return patterns
  }

  /**
   * Create behavioral patterns from coping strategies
   */
  private createBehavioralPatterns(
    parsedModel: ParsedPatientModel,
  ): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = []
    // Access copingStrategies directly from parsedModel.copingStrategies (array of strings)
    if (
      parsedModel.copingStrategies &&
      Array.isArray(parsedModel.copingStrategies)
    ) {
      for (const strategy of parsedModel.copingStrategies) {
        patterns.push({
          trigger: parsedModel.situation || 'general', // Use situation from PatientPsiCognitiveModel
          response: strategy,
          reinforcers: [],
          consequences: [],
          alternateTried: [],
        })
      }
    }
    return patterns
  }

  /**
   * Transform emotional patterns from Patient-Psi emotions
   */
  private transformEmotionalPatterns(
    parsedModel: ParsedPatientModel,
  ): EmotionalPattern[] {
    const patterns: EmotionalPattern[] = []
    // Access emotions directly from parsedModel.emotions
    if (parsedModel.emotions) {
      for (const emotionData of parsedModel.emotions) {
        patterns.push({
          emotion: emotionData.emotion,
          intensity: emotionData.intensity,
          triggers: emotionData.triggers || [],
          physicalManifestations: emotionData.physicalManifestations || [], // PatientPsiEmotionSchema has this
          copingMechanisms: [], // Not directly in PatientPsiEmotionSchema, needs inference or mapping
        })
      }
    }
    return patterns
  }

  /**
   * Create relationship patterns from available data
   */
  private createRelationshipPatterns(
    parsedModel: ParsedPatientModel,
  ): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []
    const relationshipTypes = ['family', 'romantic', 'professional', 'social']
    for (const type of relationshipTypes) {
      // Access presentingConcerns from parsedModel.sessionContext.presentingConcerns
      const relatedProblems =
        parsedModel.sessionContext?.presentingConcerns?.filter(
          (problem: string) => problem.toLowerCase().includes(type),
        ) || []
      if (relatedProblems.length > 0) {
        patterns.push({
          type: type.charAt(0).toUpperCase() + type.slice(1),
          expectations: this.extractExpectations(relatedProblems),
          fears: this.extractFears(relatedProblems),
          behaviors: this.extractBehaviors(relatedProblems),
          historicalOutcomes: [],
        })
      }
    }
    return patterns
  }

  /**
   * Extract formative experiences from available data
   */
  private extractFormativeExperiences(
    parsedModel: ParsedPatientModel,
  ): FormativeExperience[] {
    const experiences: FormativeExperience[] = []
    // Access coreBeliefs directly for formationContext
    if (parsedModel.coreBeliefs) {
      for (const belief of parsedModel.coreBeliefs) {
        if (belief.formationContext) {
          experiences.push({
            age: 'childhood',
            event: belief.formationContext,
            impact: `Formation of ${belief.category} beliefs`,
            beliefsFormed: [belief.category],
            emotionalResponse: this.inferEmotionalResponse(
              belief.formationContext,
            ),
          })
        }
      }
    }
    // Access relevantHistory directly from parsedModel.relevantHistory
    if (parsedModel.relevantHistory) {
      for (const historyEvent of parsedModel.relevantHistory) {
        experiences.push({
          age: 'unknown',
          event: historyEvent,
          impact: 'Potentially formative event from history.',
          beliefsFormed: [],
          emotionalResponse: this.inferEmotionalResponse(historyEvent),
        })
      }
    }
    return experiences
  }

  /**
   * Create therapy history from available data
   */
  private createTherapyHistory(
    parsedModel: ParsedPatientModel,
  ): TherapyHistory {
    return {
      // Access previousTreatments from parsedModel.sessionContext.previousTreatments
      previousApproaches: parsedModel.sessionContext?.previousTreatments || [],
      helpfulInterventions: [],
      unhelpfulInterventions: [],
      insights: [],
      progressMade: 'Assessment in progress',
      // Access presentingConcerns from parsedModel.sessionContext.presentingConcerns
      remainingChallenges: parsedModel.sessionContext?.presentingConcerns || [],
    }
  }

  /**
   * Transform conversational style from Patient-Psi communication style
   */
  private transformConversationalStyle(
    parsedModel: ParsedPatientModel,
  ): ConversationalStyle {
    const defaultStyle: ConversationalStyle = {
      verbosity: 5,
      emotionalExpressiveness: 5,
      resistance: 5,
      insightLevel: 5,
      preferredCommunicationModes: ['direct'],
    }
    // Access conversationalStyles directly from parsedModel.conversationalStyles
    if (
      !parsedModel.conversationalStyles ||
      parsedModel.conversationalStyles.length === 0
    ) {
      return defaultStyle
    }
    const styleData = parsedModel.conversationalStyles[0] // PatientPsiConversationalStyleSchema
    return {
      verbosity: this.mapVerbosityLevel(styleData.style),
      emotionalExpressiveness: this.mapEmotionalExpressiveness(styleData.style),
      resistance: this.mapResistanceLevel(
        styleData.style,
        styleData.difficulty,
      ),
      insightLevel: this.mapInsightLevel(styleData.style),
      preferredCommunicationModes: this.mapCommunicationModes(styleData.style),
    }
  }

  /**
   * Create demographic info from available data
   */
  private createDemographicInfo(
    parsedModel: ParsedPatientModel,
  ): DemographicInfo {
    return {
      age: parsedModel.demographics?.age || 30,
      gender: parsedModel.demographics?.gender || 'Not specified',
      occupation: parsedModel.demographics?.occupation || 'Not specified',
      familyStatus: parsedModel.demographics?.familyStatus || 'Not specified',
      culturalFactors: parsedModel.demographics?.culturalFactors,
      socioeconomicStatus: parsedModel.demographics?.socioeconomicStatus,
    }
  }

  /**
   * Create diagnosis info from available data
   */
  private createDiagnosisInfo(parsedModel: ParsedPatientModel): DiagnosisInfo {
    return {
      primaryDiagnosis:
        parsedModel.diagnosis?.primaryDiagnosis || 'To be determined', // Corrected property name
      secondaryDiagnoses: parsedModel.diagnosis?.secondaryDiagnoses,
      durationOfSymptoms: parsedModel.diagnosis?.durationOfSymptoms,
      severity: parsedModel.diagnosis?.severity || 'moderate',
      previousTreatments: parsedModel.sessionContext?.previousTreatments, // previousTreatments is on sessionContext
    }
  }

  /**
   * Initialize therapeutic progress structure
   */
  private initializeTherapeuticProgress(
    _parsedModel: ParsedPatientModel,
  ): TherapeuticProgress {
    return {
      insights: [],
      resistanceLevel: 5,
      changeReadiness: 'contemplation',
      sessionProgressLog: [],
    }
  }

  /**
   * Validate normalized cognitive model
   */
  private async validateNormalizedModel(model: CognitiveModel): Promise<{
    status: 'passed' | 'warning' | 'error'
    notes: string[]
  }> {
    const notes: string[] = []
    let status: 'passed' | 'warning' | 'error' = 'passed'

    if (!model.name || model.name.trim() === '') {
      notes.push('Missing or empty patient name')
      status = 'warning'
    }

    if (model.coreBeliefs.length === 0) {
      notes.push('No core beliefs identified')
      status = 'warning'
    }

    if (model.presentingIssues.length === 0) {
      notes.push('No presenting issues identified')
      status = 'warning'
    }

    for (const belief of model.coreBeliefs) {
      if (belief.strength < 0 || belief.strength > 10) {
        notes.push(`Invalid belief strength: ${belief.strength}`)
        status = 'error'
      }
    }

    for (const emotion of model.emotionalPatterns) {
      if (emotion.intensity < 0 || emotion.intensity > 10) {
        notes.push(`Invalid emotion intensity: ${emotion.intensity}`)
        status = 'error'
      }
    }

    if (notes.length === 0) {
      notes.push('Model validation passed')
    }

    return { status, notes }
  }

  /**
   * Assess data quality metrics
   */
  private assessDataQuality(
    cognitiveModel: CognitiveModel, // Removed parsedModel from here
  ): { completeness: number; consistency: number; clinicalValidity: number } {
    const totalFields = 12
    let filledFields = 0

    if (cognitiveModel.name) {
      filledFields++
    }
    if (cognitiveModel.presentingIssues.length > 0) {
      filledFields++
    }
    if (cognitiveModel.coreBeliefs.length > 0) {
      filledFields++
    }
    if (cognitiveModel.distortionPatterns.length > 0) {
      filledFields++
    }
    if (cognitiveModel.behavioralPatterns.length > 0) {
      filledFields++
    }
    if (cognitiveModel.emotionalPatterns.length > 0) {
      filledFields++
    }
    if (cognitiveModel.relationshipPatterns.length > 0) {
      filledFields++
    }
    if (cognitiveModel.formativeExperiences.length > 0) {
      filledFields++
    }
    if (cognitiveModel.goalsForTherapy.length > 0) {
      filledFields++
    }
    if (cognitiveModel.demographicInfo.age > 0) {
      filledFields++
    }
    if (cognitiveModel.diagnosisInfo.primaryDiagnosis !== 'To be determined') {
      filledFields++
    }
    if (cognitiveModel.conversationalStyle.verbosity > 0) {
      filledFields++
    }

    const completeness = filledFields / totalFields
    const consistency = this.assessConsistency(cognitiveModel)
    const clinicalValidity = this.assessClinicalValidity(cognitiveModel)

    return { completeness, consistency, clinicalValidity }
  }

  /**
   * Helper methods for style mapping
   */
  private mapVerbosityLevel(styleValue: string): number {
    if (styleValue === 'verbose') {
      return 8
    }
    if (styleValue === 'tangent') {
      return 9
    }
    if (styleValue === 'reserved') {
      return 3
    }
    if (styleValue === 'plain') {
      return 5
    }
    if (styleValue === 'pleasing') {
      return 6
    }
    if (styleValue === 'upset') {
      return 4
    }
    return 5
  }

  private mapEmotionalExpressiveness(styleValue: string): number {
    if (styleValue === 'high' || styleValue === 'upset') {
      return 8
    }
    if (styleValue === 'low' || styleValue === 'reserved') {
      return 3
    }
    if (styleValue === 'plain') {
      return 5
    }
    if (styleValue === 'pleasing') {
      return 4
    }
    return 5
  }

  private mapResistanceLevel(
    styleValue: string,
    difficulty?: 'easy' | 'medium' | 'hard',
  ): number {
    // Incorporate difficulty if available
    if (difficulty === 'hard' || styleValue === 'upset') {
      return 9
    }
    if (difficulty === 'medium' || styleValue === 'reserved') {
      return 7
    }
    if (difficulty === 'easy' || styleValue === 'pleasing') {
      return 2
    }
    // Fallback based on styleValue if difficulty is not provided
    if (styleValue === 'upset') {
      return 9
    }
    if (styleValue === 'reserved') {
      return 7
    }
    if (styleValue === 'tangent') {
      return 5
    }
    if (styleValue === 'pleasing') {
      return 2
    }
    if (styleValue === 'plain') {
      return 3
    }
    return 5
  }

  private mapInsightLevel(styleValue: string): number {
    if (styleValue === 'plain' || styleValue === 'pleasing') {
      return 6
    }
    if (['reserved', 'upset', 'tangent'].includes(styleValue)) {
      return 3
    }
    return 5
  }

  private mapCommunicationModes(styleValue: string): string[] {
    const modes: string[] = ['direct']
    if (styleValue === 'verbose' || styleValue === 'tangent') {
      modes.push('narrative')
    }
    if (styleValue === 'reserved') {
      modes.push('minimal')
    }
    return modes
  }

  private detectDistortionsInThought(thought: string): string[] {
    const distortions: string[] = []
    const lowerThought = thought.toLowerCase()

    // All-or-Nothing Thinking / Overgeneralization
    if (
      lowerThought.includes('always') ||
      lowerThought.includes('never') ||
      lowerThought.includes('everyone') ||
      lowerThought.includes('nobody') ||
      lowerThought.includes('everything') ||
      lowerThought.includes('nothing') ||
      /\ball\b/.test(lowerThought) ||
      /\bnone\b/.test(lowerThought)
    ) {
      distortions.push('All-or-Nothing Thinking')
    }

    // Should Statements
    if (
      lowerThought.includes('should') ||
      lowerThought.includes('must') ||
      lowerThought.includes('ought to') ||
      lowerThought.includes('have to') ||
      lowerThought.includes('supposed to')
    ) {
      distortions.push('Should Statements')
    }

    // Catastrophizing
    if (
      lowerThought.includes('awful') ||
      lowerThought.includes('terrible') ||
      lowerThought.includes('horrible') ||
      lowerThought.includes('disaster') ||
      lowerThought.includes('catastrophe') ||
      lowerThought.includes('worst') ||
      lowerThought.includes('unbearable') ||
      lowerThought.includes("can't stand")
    ) {
      distortions.push('Catastrophizing')
    }

    // Mental Filter / Negative Focus
    if (
      lowerThought.includes('only') ||
      lowerThought.includes('just') ||
      /\bbut\b/.test(lowerThought) ||
      lowerThought.includes('except') ||
      lowerThought.includes('however')
    ) {
      distortions.push('Mental Filter')
    }

    // Personalization
    if (
      lowerThought.includes('my fault') ||
      lowerThought.includes('i caused') ||
      lowerThought.includes('because of me') ||
      lowerThought.includes("i'm responsible") ||
      lowerThought.includes('if only i')
    ) {
      distortions.push('Personalization')
    }

    // Mind Reading
    if (
      lowerThought.includes('thinks i') ||
      lowerThought.includes('thinks that i') ||
      lowerThought.includes('probably thinks') ||
      lowerThought.includes('must think') ||
      lowerThought.includes('knows i')
    ) {
      distortions.push('Mind Reading')
    }

    // Fortune Telling
    if (
      lowerThought.includes('will never') ||
      lowerThought.includes("won't work") ||
      lowerThought.includes('going to fail') ||
      lowerThought.includes('bound to') ||
      lowerThought.includes('will definitely') ||
      lowerThought.includes('no point')
    ) {
      distortions.push('Fortune Telling')
    }

    // Emotional Reasoning
    if (
      lowerThought.includes('i feel') &&
      (lowerThought.includes('therefore') ||
        lowerThought.includes('so i must') ||
        lowerThought.includes('means i'))
    ) {
      distortions.push('Emotional Reasoning')
    }

    // Labeling
    if (
      lowerThought.includes('i am') &&
      (lowerThought.includes('stupid') ||
        lowerThought.includes('worthless') ||
        lowerThought.includes('loser') ||
        lowerThought.includes('failure') ||
        lowerThought.includes('incompetent'))
    ) {
      distortions.push('Labeling')
    }

    // Remove duplicates
    return [...new Set(distortions)]
  }

  /**
   * Helper methods for pattern extraction
   */
  private extractTriggerThemes(examples: string[]): string[] {
    const commonWords = [
      'failure',
      'rejection',
      'abandonment',
      'criticism',
      'uncertainty',
    ]
    const themes: string[] = []
    for (const word of commonWords) {
      if (examples.some((example) => example.toLowerCase().includes(word))) {
        themes.push(word)
      }
    }
    return themes
  }

  private determineFrequency(
    count: number,
  ): 'rare' | 'occasional' | 'frequent' | 'pervasive' {
    if (count >= 10) {
      return 'pervasive'
    }
    if (count >= 5) {
      return 'frequent'
    }
    if (count >= 2) {
      return 'occasional'
    }
    return 'rare'
  }

  private extractExpectations(problems: string[]): string[] {
    return problems.map((p) => `Expectation derived from: ${p}`)
  }

  private extractFears(problems: string[]): string[] {
    return problems.map((p) => `Fear related to: ${p}`)
  }

  private extractBehaviors(problems: string[]): string[] {
    return problems.map((p) => `Behavior pattern in: ${p}`)
  }

  private inferEmotionalResponse(context: string): string {
    const negativeWords = ['abuse', 'trauma', 'loss', 'rejection', 'failure']
    const hasNegative = negativeWords.some((word) =>
      context.toLowerCase().includes(word),
    )
    return hasNegative ? 'Fear, sadness, anger' : 'Mixed emotions'
  }

  private assessConsistency(model: CognitiveModel): number {
    let consistentConnections = 0
    let totalChecks = 0

    for (const belief of model.coreBeliefs) {
      for (const emotion of model.emotionalPatterns) {
        totalChecks++
        const hasOverlap = belief.relatedDomains.some((domain) =>
          emotion.triggers.some((trigger) =>
            trigger.toLowerCase().includes(domain.toLowerCase()),
          ),
        )
        if (hasOverlap) {
          consistentConnections++
        }
      }
    }

    return totalChecks > 0 ? consistentConnections / totalChecks : 1
  }

  private assessClinicalValidity(model: CognitiveModel): number {
    let validityScore = 1.0
    const extremeEmotions = model.emotionalPatterns.filter(
      (e) => e.intensity === 10,
    )
    if (extremeEmotions.length > model.emotionalPatterns.length * 0.5) {
      validityScore -= 0.2
    }
    if (model.coreBeliefs.length > 20) {
      validityScore -= 0.1
    }
    return Math.max(validityScore, 0)
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ConversionStats {
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      warnings: 0,
      averageCompleteness: 0,
      conversionTime: 0,
    }
  }

  /**
   * Get current conversion statistics
   */
  getStats(): ConversionStats {
    const stats = { ...this.stats }
    if (stats.totalProcessed > 0) {
      stats.averageCompleteness /= stats.totalProcessed
      stats.conversionTime /= stats.totalProcessed
    }
    return stats
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats()
  }
}
