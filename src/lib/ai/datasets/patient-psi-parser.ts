/**
 * Patient-Psi Dataset Parser
 *
 * Parses and transforms Patient-Psi style cognitive models based on CBT principles
 * into our internal cognitive model format for therapeutic training simulations.
 *
 * Based on the Patient-Psi research (Wang et al., 2024) which defines 8 core components:
 * 1. Relevant History - significant past events
 * 2. Core Beliefs - deeply ingrained perceptions (19 categories)
 * 3. Intermediate Beliefs - rules, attitudes, assumptions derived from core beliefs
 * 4. Coping Strategies - techniques to manage negative emotions
 * 5. Situation - external events or contexts that trigger responses
 * 6. Automatic Thoughts - quick evaluative thoughts without deliberation
 * 7. Emotions - emotional responses (9 categories)
 * 8. Behaviors - behavioral responses to situations
 */

import type {
  CognitiveModel,
  CoreBelief,
  DistortionPattern,
  BehavioralPattern,
  EmotionalPattern,
  FormativeExperience,
  TherapyHistory,
  ConversationalStyle,
  DemographicInfo,
  DiagnosisInfo,
  RelationshipPattern,
} from '../types/CognitiveModel'
import { randomBytes } from 'crypto'
import { z } from 'zod'

// Patient-Psi data structure schemas for validation
const PatientPsiCoreBeliefSchema = z.object({
  category: z.enum([
    // Helpless category
    'I am incompetent',
    'I am helpless',
    'I am powerless, weak, vulnerable',
    'I am a victim',
    'I am needy',
    'I am trapped',
    'I am out of control',
    'I am a failure, loser',
    'I am defective',
    // Unlovable category
    'I am unlovable',
    'I am unattractive',
    'I am undesirable, unwanted',
    'I am bound to be rejected',
    'I am bound to be abandoned',
    'I am bound to be alone',
    // Worthless category
    'I am worthless, waste',
    'I am immoral',
    'I am bad - dangerous, toxic, evil',
    "I don't deserve to live",
  ]),
  strength: z.number().min(0).max(10),
  evidence: z.array(z.string()),
  formationContext: z.string().optional(),
})

const PatientPsiEmotionSchema = z.object({
  emotion: z.enum([
    'anxious',
    'sad',
    'angry',
    'hurt',
    'disappointed',
    'ashamed',
    'guilty',
    'suspicious',
    'jealous',
  ]),
  intensity: z.number().min(0).max(10),
  triggers: z.array(z.string()),
  physicalManifestations: z.array(z.string()),
})

const PatientPsiConversationalStyleSchema = z.object({
  style: z.enum([
    'plain',
    'upset',
    'verbose',
    'reserved',
    'tangent',
    'pleasing',
  ]),
  description: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
})

const PatientPsiCognitiveModelSchema = z.object({
  // Core identification
  id: z.string(),
  name: z.string(),

  // 8 CCD Components from Patient-Psi research
  relevantHistory: z.array(z.string()), // Component 1
  coreBeliefs: z.array(PatientPsiCoreBeliefSchema), // Component 2
  intermediateBeliefs: z.array(z.string()), // Component 3
  copingStrategies: z.array(z.string()), // Component 4
  situation: z.string(), // Component 5
  automaticThoughts: z.array(z.string()), // Component 6
  emotions: z.array(PatientPsiEmotionSchema), // Component 7
  behaviors: z.array(z.string()), // Component 8

  // Additional metadata
  conversationalStyles: z.array(PatientPsiConversationalStyleSchema),
  demographics: z.object({
    age: z.number(),
    gender: z.string(),
    occupation: z.string(),
    familyStatus: z.string(),
    culturalFactors: z.array(z.string()).optional(),
    socioeconomicStatus: z.string().optional(),
  }),

  // Diagnostic information
  diagnosis: z.object({
    primaryDiagnosis: z.string(),
    secondaryDiagnoses: z.array(z.string()).optional(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    durationOfSymptoms: z.string().optional(),
  }),

  // Session context
  sessionContext: z
    .object({
      presentingConcerns: z.array(z.string()),
      goalsForTherapy: z.array(z.string()),
      previousTreatments: z.array(z.string()).optional(),
    })
    .optional(),
})

export type PatientPsiCognitiveModel = z.infer<
  typeof PatientPsiCognitiveModelSchema
>

/**
 * Core belief mapping from Patient-Psi format to our internal format
 */
const CORE_BELIEF_MAPPING = {
  // Helpless beliefs
  'I am incompetent': { domain: 'competence', strength: 8 },
  'I am helpless': { domain: 'control', strength: 9 },
  'I am powerless, weak, vulnerable': { domain: 'control', strength: 8 },
  'I am a victim': { domain: 'agency', strength: 7 },
  'I am needy': { domain: 'independence', strength: 6 },
  'I am trapped': { domain: 'freedom', strength: 8 },
  'I am out of control': { domain: 'control', strength: 9 },
  'I am a failure, loser': { domain: 'achievement', strength: 9 },
  'I am defective': { domain: 'self-worth', strength: 8 },

  // Unlovable beliefs
  'I am unlovable': { domain: 'relationships', strength: 9 },
  'I am unattractive': { domain: 'appearance', strength: 7 },
  'I am undesirable, unwanted': { domain: 'relationships', strength: 8 },
  'I am bound to be rejected': { domain: 'relationships', strength: 8 },
  'I am bound to be abandoned': { domain: 'relationships', strength: 9 },
  'I am bound to be alone': { domain: 'relationships', strength: 8 },

  // Worthless beliefs
  'I am worthless, waste': { domain: 'self-worth', strength: 10 },
  'I am immoral': { domain: 'morality', strength: 8 },
  'I am bad - dangerous, toxic, evil': { domain: 'morality', strength: 9 },
  "I don't deserve to live": { domain: 'existence', strength: 10 },
} as const

/**
 * Conversational style mapping from Patient-Psi to our internal format
 */
const STYLE_MAPPING = {
  plain: {
    verbosity: 5,
    emotionalExpressiveness: 5,
    resistance: 3,
    insightLevel: 6,
  },
  upset: {
    verbosity: 4,
    emotionalExpressiveness: 8,
    resistance: 9,
    insightLevel: 3,
  },
  verbose: {
    verbosity: 9,
    emotionalExpressiveness: 7,
    resistance: 4,
    insightLevel: 5,
  },
  reserved: {
    verbosity: 2,
    emotionalExpressiveness: 3,
    resistance: 7,
    insightLevel: 4,
  },
  tangent: {
    verbosity: 8,
    emotionalExpressiveness: 6,
    resistance: 5,
    insightLevel: 3,
  },
  pleasing: {
    verbosity: 6,
    emotionalExpressiveness: 4,
    resistance: 2,
    insightLevel: 7,
  },
} as const

export class PatientPsiParser {
  /**
   * Parse raw Patient-Psi dataset and extract cognitive models
   */
  async parseDataset(rawData: unknown[]): Promise<CognitiveModel[]> {
    const models: CognitiveModel[] = []

    for (const item of rawData) {
      try {
        const parsedModel = await this.parsePatientPsiModel(item)
        if (parsedModel) {
          models.push(parsedModel)
        }
      } catch (error) {
        console.warn(
          `Failed to parse Patient-Psi model ${(item as { id?: string })?.id || 'unknown'}:`,
          error,
        )
        // Continue processing other models
      }
    }

    return models
  }

  /**
   * Parse a single Patient-Psi cognitive model
   */
  async parsePatientPsiModel(data: unknown): Promise<CognitiveModel | null> {
    try {
      // Validate input data against schema
      const validated = PatientPsiCognitiveModelSchema.parse(data)

      // Transform to our internal format
      const cognitiveModel: CognitiveModel = {
        id: validated.id || this.generateId(),
        name: validated.name,

        // Demographics
        demographicInfo: this.transformDemographics(validated.demographics),

        // Diagnosis
        diagnosisInfo: this.transformDiagnosis(validated.diagnosis),

        // Presenting issues from session context or inferred from diagnosis
        presentingIssues:
          validated.sessionContext?.presentingConcerns ||
          this.inferPresentingIssues(validated.diagnosis.primaryDiagnosis),

        // Core beliefs transformation
        coreBeliefs: this.transformCoreBeliefs(validated.coreBeliefs),

        // Emotional patterns from emotions
        emotionalPatterns: this.transformEmotionalPatterns(validated.emotions),

        // Behavioral patterns from behaviors and coping strategies
        behavioralPatterns: this.transformBehavioralPatterns(
          validated.behaviors,
          validated.copingStrategies,
          validated.situation,
        ),

        // Distortion patterns inferred from automatic thoughts
        distortionPatterns: this.inferDistortionPatterns(
          validated.automaticThoughts,
        ),

        // Relationship patterns inferred from core beliefs and history
        relationshipPatterns: this.inferRelationshipPatterns(
          validated.coreBeliefs,
          validated.relevantHistory,
        ),

        // Formative experiences from relevant history
        formativeExperiences: this.transformFormativeExperiences(
          validated.relevantHistory,
        ),

        // Therapy history
        therapyHistory: this.createTherapyHistory(
          validated.sessionContext?.previousTreatments,
        ),

        // Conversational style
        conversationalStyle: this.transformConversationalStyle(
          validated.conversationalStyles,
        ),

        // Goals for therapy
        goalsForTherapy:
          validated.sessionContext?.goalsForTherapy ||
          this.inferTherapyGoals(validated.diagnosis.primaryDiagnosis),

        // Therapeutic progress (initialized)
        therapeuticProgress: {
          insights: [],
          resistanceLevel: this.calculateInitialResistance(
            validated.conversationalStyles,
          ),
          changeReadiness: 'contemplation',
          sessionProgressLog: [],
        },
      }

      return cognitiveModel
    } catch (error) {
      console.error('Error parsing Patient-Psi model:', error)
      return null
    }
  }

  /**
   * Transform Patient-Psi core beliefs to our internal format
   */
  private transformCoreBeliefs(
    psiBeliefs: z.infer<typeof PatientPsiCoreBeliefSchema>[],
  ): CoreBelief[] {
    return psiBeliefs.map((belief, index) => {
      const mapping = CORE_BELIEF_MAPPING[belief.category]

      return {
        id: `cb_${this.generateId()}_${index}`,
        belief: belief.category,
        strength: belief.strength,
        evidence: belief.evidence,
        formationContext: belief.formationContext,
        relatedDomains: [mapping.domain],
      }
    })
  }

  /**
   * Transform emotional patterns from Patient-Psi format
   */
  private transformEmotionalPatterns(
    psiEmotions: z.infer<typeof PatientPsiEmotionSchema>[],
  ): EmotionalPattern[] {
    return psiEmotions.map((emotion) => ({
      emotion: emotion.emotion,
      intensity: emotion.intensity,
      triggers: emotion.triggers,
      physicalManifestations: emotion.physicalManifestations,
      copingMechanisms: [], // Will be populated from coping strategies
    }))
  }

  /**
   * Transform behavioral patterns from behaviors and coping strategies
   */
  private transformBehavioralPatterns(
    behaviors: string[],
    copingStrategies: string[],
    situation: string,
  ): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = []

    // Create behavioral patterns from behaviors
    behaviors.forEach((behavior) => {
      patterns.push({
        trigger: situation,
        response: behavior,
        reinforcers: ['immediate relief', 'avoiding discomfort'],
        consequences: ['temporary relief', 'problem persists'],
        alternateTried: [],
      })
    })

    // Create coping behavioral patterns
    copingStrategies.forEach((strategy) => {
      patterns.push({
        trigger: 'emotional distress',
        response: strategy,
        reinforcers: ['emotional regulation', 'sense of control'],
        consequences: this.assessCopingConsequences(strategy),
        alternateTried: [],
      })
    })

    return patterns
  }

  /**
   * Infer distortion patterns from automatic thoughts
   */
  private inferDistortionPatterns(
    automaticThoughts: string[],
  ): DistortionPattern[] {
    const patterns: DistortionPattern[] = []

    for (const thought of automaticThoughts) {
      const type = this.detectDistortionType(thought)

      const existingPattern = patterns.find((p) => p.type === type)
      if (existingPattern) {
        existingPattern.examples.push(thought)
        existingPattern.frequency = this.updateFrequency(
          existingPattern.frequency,
        )
      } else {
        patterns.push({
          type,
          examples: [thought],
          triggerThemes: this.extractTriggerThemes(thought),
          frequency: 'occasional',
        })
      }
    }

    return patterns
  }

  /**
   * Transform demographics from Patient-Psi format
   */
  private transformDemographics(
    demo: z.infer<typeof PatientPsiCognitiveModelSchema>['demographics'],
  ): DemographicInfo {
    return {
      age: demo.age,
      gender: demo.gender,
      occupation: demo.occupation,
      familyStatus: demo.familyStatus,
      culturalFactors: demo.culturalFactors,
      socioeconomicStatus: demo.socioeconomicStatus,
    }
  }

  /**
   * Transform diagnosis information
   */
  private transformDiagnosis(
    diagnosis: z.infer<typeof PatientPsiCognitiveModelSchema>['diagnosis'],
  ): DiagnosisInfo {
    return {
      primaryDiagnosis: diagnosis.primaryDiagnosis,
      secondaryDiagnoses: diagnosis.secondaryDiagnoses,
      severity: diagnosis.severity,
      durationOfSymptoms: diagnosis.durationOfSymptoms,
      previousTreatments: [],
    }
  }

  /**
   * Transform conversational styles
   */
  private transformConversationalStyle(
    psiStyles: z.infer<
      typeof PatientPsiCognitiveModelSchema
    >['conversationalStyles'],
  ): ConversationalStyle {
    if (!Array.isArray(psiStyles) || psiStyles.length === 0) {
      // Return a default style if none provided or invalid format
      return {
        ...STYLE_MAPPING.plain,
        preferredCommunicationModes: ['direct', 'collaborative'],
      }
    }
    // Assuming the first style is the primary one for transformation
    const primaryStyle = psiStyles[0]
    const styleKey = primaryStyle?.style || 'plain'

    const baseStyle = STYLE_MAPPING[styleKey] || STYLE_MAPPING.plain

    return {
      verbosity: baseStyle.verbosity,
      emotionalExpressiveness: baseStyle.emotionalExpressiveness,
      resistance: baseStyle.resistance,
      insightLevel: baseStyle.insightLevel,
      preferredCommunicationModes: this.getPreferredModes(styleKey),
    }
  }

  /**
   * Security validation for input data
   */
  private validateAndSanitize(data: unknown): unknown {
    if (typeof data === 'string') {
      // Sanitize string data
      return this.sanitizeString(data)
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.validateAndSanitize(item))
    }

    if (data && typeof data === 'object') {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        // Validate key names
        if (this.isValidPropertyName(key)) {
          sanitized[key] = this.validateAndSanitize(value)
        }
      }
      return sanitized
    }

    return data
  }

  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  private sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    // Length limits for different content types
    const maxLength = 10_000

    if (input.length > maxLength) {
      input = input.substring(0, maxLength)
    }

    // Remove potentially dangerous patterns
    input = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:(?!image\/)/gi, '') // Allow only image data URLs
      .replace(/[<>]/g, (match) => (match === '<' ? '&lt;' : '&gt;')) // Escape < and >

    // Normalize whitespace
    return input.replace(/\s+/g, ' ').trim()
  }

  /**
   * Validate property names to prevent prototype pollution
   */
  private isValidPropertyName(name: string): boolean {
    const dangerousProps = ['__proto__', 'constructor', 'prototype']
    return !dangerousProps.includes(name) && name.length <= 100
  }

  // Helper methods
  private generateId(): string {
    return `psi_${randomBytes(8).toString('hex')}`
  }

  /**
   * Generate deterministic age from event text and index
   * Uses a simple hash of the event text combined with index to create
   * consistent but varied ages between 5-20 years old
   */
  private deterministicAgeFromEvent(eventText: string, index: number): number {
    // Create a simple hash from the event text
    let hash = 0
    for (let i = 0; i < eventText.length; i++) {
      const char = eventText.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash &= hash // Convert to 32-bit integer
    }

    // Combine hash with index to create variation
    const combined = Math.abs(hash + index * 7) // Use index with a prime multiplier

    // Map to age range 5-20 (typical formative experience ages)
    const ageRange = 15 // 20 - 5
    const baseAge = 5

    return (combined % ageRange) + baseAge
  }

  private inferPresentingIssues(diagnosis: string): string[] {
    const commonIssues: Record<string, string[]> = {
      depression: [
        'persistent sadness',
        'loss of interest',
        'fatigue',
        'hopelessness',
      ],
      anxiety: [
        'excessive worry',
        'physical tension',
        'avoidance behaviors',
        'panic',
      ],
      trauma: [
        'intrusive memories',
        'hypervigilance',
        'emotional numbing',
        'avoidance',
      ],
      bipolar: [
        'mood swings',
        'energy fluctuations',
        'sleep disturbances',
        'impulsivity',
      ],
    }

    const lowerDiagnosis = diagnosis.toLowerCase()
    for (const [key, issues] of Object.entries(commonIssues)) {
      if (lowerDiagnosis.includes(key)) {
        return issues
      }
    }

    return [
      'general emotional distress',
      'interpersonal difficulties',
      'coping challenges',
    ]
  }

  private inferTherapyGoals(diagnosis: string): string[] {
    const commonGoals: Record<string, string[]> = {
      depression: [
        'improve mood',
        'increase activity levels',
        'develop coping skills',
        'challenge negative thoughts',
      ],
      anxiety: [
        'reduce worry',
        'manage physical symptoms',
        'face fears gradually',
        'develop relaxation techniques',
      ],
      trauma: [
        'process traumatic memories',
        'reduce symptoms',
        'improve sense of safety',
        'rebuild trust',
      ],
      bipolar: [
        'mood stabilization',
        'medication compliance',
        'identify triggers',
        'improve relationships',
      ],
    }

    const lowerDiagnosis = diagnosis.toLowerCase()
    for (const [key, goals] of Object.entries(commonGoals)) {
      if (lowerDiagnosis.includes(key)) {
        return goals
      }
    }

    return [
      'improve emotional regulation',
      'develop healthy coping strategies',
      'enhance relationships',
    ]
  }

  private detectDistortionType(thought: string): string {
    const lowerThought = thought.toLowerCase()

    if (lowerThought.includes('always') || lowerThought.includes('never')) {
      return 'all-or-nothing thinking'
    }
    if (
      lowerThought.includes('terrible') ||
      lowerThought.includes('awful') ||
      lowerThought.includes('catastrophic')
    ) {
      return 'catastrophizing'
    }
    if (
      lowerThought.includes('everyone') ||
      lowerThought.includes('everything')
    ) {
      return 'overgeneralization'
    }
    if (
      lowerThought.includes('should') ||
      lowerThought.includes('must') ||
      lowerThought.includes('have to')
    ) {
      return 'should statements'
    }
    if (
      lowerThought.includes('my fault') ||
      lowerThought.includes('because of me')
    ) {
      return 'personalization'
    }

    return 'negative thinking'
  }

  private extractTriggerThemes(thought: string): string[] {
    const themes: string[] = []
    const lowerThought = thought.toLowerCase()

    const themeKeywords = {
      'relationships': [
        'relationship',
        'friend',
        'family',
        'love',
        'rejection',
        'alone',
      ],
      'work': ['work', 'job', 'career', 'boss', 'colleague', 'performance'],
      'self-worth': [
        'worthless',
        'failure',
        'stupid',
        'inadequate',
        'not good enough',
      ],
      'future': ['future', 'tomorrow', 'next', 'will happen', 'going to'],
      'control': ['control', 'helpless', 'powerless', 'trapped', 'stuck'],
    }

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((keyword) => lowerThought.includes(keyword))) {
        themes.push(theme)
      }
    }

    return themes.length > 0 ? themes : ['general distress']
  }

  private updateFrequency(
    current: string,
  ): 'rare' | 'occasional' | 'frequent' | 'pervasive' {
    const levels: ('rare' | 'occasional' | 'frequent' | 'pervasive')[] = [
      'rare',
      'occasional',
      'frequent',
      'pervasive',
    ]
    const currentIndex = levels.indexOf(
      current as 'rare' | 'occasional' | 'frequent' | 'pervasive',
    )
    return levels[Math.min(currentIndex + 1, levels.length - 1)]
  }

  private assessCopingConsequences(strategy: string): string[] {
    const lowerStrategy = strategy.toLowerCase()
    const consequences: string[] = []

    // Evidence-based consequence mapping based on CBT research
    const copingMappings = {
      // Adaptive strategies
      'mindfulness': {
        positive: [
          'reduced anxiety',
          'improved emotional regulation',
          'increased present-moment awareness',
        ],
        negative: [
          'may increase distress initially if traumatic memories surface',
        ],
      },
      'exercise': {
        positive: [
          'improved mood',
          'reduced stress hormones',
          'better sleep',
          'increased energy',
        ],
        negative: [
          'potential for compulsive overuse',
          'may avoid emotional processing',
        ],
      },
      'deep breathing': {
        positive: [
          'immediate anxiety relief',
          'improved physiological regulation',
        ],
        negative: ['minimal long-term benefit without other skills'],
      },
      'problem solving': {
        positive: [
          'increased sense of control',
          'improved outcomes',
          'skill development',
        ],
        negative: ['may not work for uncontrollable situations'],
      },
      'social support': {
        positive: [
          'reduced isolation',
          'emotional validation',
          'practical assistance',
        ],
        negative: ['potential for over-dependence', 'burden on relationships'],
      },
      'cognitive restructuring': {
        positive: [
          'reduced negative thinking',
          'improved mood',
          'increased flexibility',
        ],
        negative: ['requires practice and time to be effective'],
      },

      // Maladaptive strategies
      'avoidance': {
        positive: ['immediate anxiety relief', 'short-term comfort'],
        negative: [
          'increased anxiety over time',
          'missed opportunities',
          'skill atrophy',
          'problem persistence',
        ],
      },
      'substance use': {
        positive: ['temporary numbing of pain'],
        negative: [
          'addiction risk',
          'health problems',
          'impaired judgment',
          'worsened mental health',
        ],
      },
      'isolation': {
        positive: ['reduced social anxiety', 'sense of control'],
        negative: [
          'increased depression',
          'loss of support',
          'rumination',
          'loneliness',
        ],
      },
      'self-harm': {
        positive: ['temporary emotional relief', 'sense of control'],
        negative: [
          'physical harm',
          'increased shame',
          'addiction potential',
          'escalation risk',
        ],
      },
      'rumination': {
        positive: ['illusion of problem-solving'],
        negative: [
          'increased depression',
          'anxiety amplification',
          'cognitive rigidity',
        ],
      },
      'denial': {
        positive: ['protection from overwhelming emotions'],
        negative: [
          'prevents processing',
          'delays healing',
          'problem escalation',
        ],
      },

      // Neutral/mixed strategies
      'distraction': {
        positive: ['temporary relief', 'breaks negative cycles'],
        negative: [
          'may become avoidance if overused',
          'prevents processing when needed',
        ],
      },
      'perfectionism': {
        positive: ['high achievement potential', 'sense of control'],
        negative: [
          'increased anxiety',
          'fear of failure',
          'rigidity',
          'burnout',
        ],
      },
    }

    // Match strategy to known patterns
    let matchFound = false
    for (const [pattern, outcomes] of Object.entries(copingMappings)) {
      if (lowerStrategy.includes(pattern)) {
        consequences.push(...outcomes.positive, ...outcomes.negative)
        matchFound = true
        break
      }
    }

    // If no specific match, analyze for general patterns
    if (!matchFound) {
      if (this.isAvoidantStrategy(lowerStrategy)) {
        consequences.push(
          'short-term relief',
          'long-term problem maintenance',
          'reduced self-efficacy',
        )
      } else if (this.isActiveStrategy(lowerStrategy)) {
        consequences.push(
          'skill development',
          'increased self-efficacy',
          'variable effectiveness',
        )
      } else {
        consequences.push(
          'mixed outcomes depending on context',
          'requires assessment of implementation',
        )
      }
    }

    return consequences.length > 0
      ? consequences
      : ['outcomes depend on implementation and context']
  }

  /**
   * Determine if a strategy is primarily avoidant
   */
  private isAvoidantStrategy(strategy: string): boolean {
    const avoidantKeywords = [
      'avoid',
      'escape',
      'withdraw',
      'hide',
      'ignore',
      'suppress',
      'deny',
      'distract',
      'numb',
      'procrastinate',
      'isolate',
    ]
    return avoidantKeywords.some((keyword) => strategy.includes(keyword))
  }

  /**
   * Determine if a strategy is primarily active/adaptive
   */
  private isActiveStrategy(strategy: string): boolean {
    const activeKeywords = [
      'confront',
      'face',
      'challenge',
      'practice',
      'communicate',
      'express',
      'plan',
      'organize',
      'seek help',
      'learn',
      'develop',
      'build',
    ]
    return activeKeywords.some((keyword) => strategy.includes(keyword))
  }

  private inferRelationshipPatterns(
    coreBeliefs: z.infer<typeof PatientPsiCoreBeliefSchema>[],
    history: string[],
  ): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []

    // Analyze core beliefs for relationship-related patterns
    const relationshipBeliefs = coreBeliefs.filter((belief) =>
      this.isRelationshipBelief(belief.category),
    )

    // Determine attachment style based on core beliefs
    const attachmentStyle = this.assessAttachmentStyle(relationshipBeliefs)
    if (attachmentStyle) {
      patterns.push(attachmentStyle)
    }

    // Analyze historical patterns from formative experiences
    const historicalPatterns =
      this.extractRelationshipPatternsFromHistory(history)
    patterns.push(...historicalPatterns)

    // Infer interaction patterns from beliefs and history
    const interactionPatterns = this.inferInteractionPatterns(
      relationshipBeliefs,
      history,
    )
    patterns.push(...interactionPatterns)

    return patterns
  }

  /**
   * Determine if a core belief is relationship-related
   */
  private isRelationshipBelief(belief: string): boolean {
    const relationshipKeywords = [
      'unlovable',
      'rejected',
      'abandoned',
      'alone',
      'unwanted',
      'undesirable',
    ]
    return relationshipKeywords.some((keyword) =>
      belief.toLowerCase().includes(keyword),
    )
  }

  /**
   * Assess attachment style based on core beliefs
   */
  private assessAttachmentStyle(
    relationshipBeliefs: z.infer<typeof PatientPsiCoreBeliefSchema>[],
  ): RelationshipPattern | null {
    const beliefTexts = relationshipBeliefs.map((b) => b.category.toLowerCase())
    const avgStrength =
      relationshipBeliefs.reduce((sum, b) => sum + b.strength, 0) /
      Math.max(relationshipBeliefs.length, 1)

    // Anxious-Preoccupied: Fear of abandonment, seeks closeness
    if (
      beliefTexts.some((b) => b.includes('abandoned') || b.includes('rejected'))
    ) {
      return {
        type: 'anxious-preoccupied',
        expectations: [
          'constant reassurance',
          'immediate responses',
          'exclusive attention',
        ],
        fears: [
          'abandonment',
          'rejection',
          'being alone',
          'partner losing interest',
        ],
        behaviors: [
          'clingy behavior',
          'jealousy',
          'constant need for reassurance',
          'emotional volatility in relationships',
        ],
        historicalOutcomes: [
          'relationship strain',
          'partner overwhelm',
          'self-fulfilling prophecies',
        ],
      }
    }

    // Dismissive-Avoidant: Fear of intimacy, values independence
    if (beliefTexts.some((b) => b.includes('unlovable') && avgStrength > 7)) {
      return {
        type: 'dismissive-avoidant',
        expectations: [
          'emotional independence',
          'minimal demands',
          'personal space',
        ],
        fears: ['intimacy', 'vulnerability', 'dependency', 'emotional demands'],
        behaviors: [
          'emotional distance',
          'difficulty with commitment',
          'minimizing relationship importance',
          'avoiding deep conversations',
        ],
        historicalOutcomes: [
          'partner frustration',
          'relationship dissolution',
          'loneliness',
        ],
      }
    }

    // Fearful-Avoidant: Wants close relationships but fears hurt
    if (beliefTexts.length >= 2 && avgStrength > 6) {
      return {
        type: 'fearful-avoidant',
        expectations: [
          'protection from hurt',
          'conditional closeness',
          'safety guarantees',
        ],
        fears: ['intimacy', 'abandonment', 'betrayal', 'vulnerability'],
        behaviors: [
          'push-pull dynamics',
          'difficulty trusting',
          'self-sabotage',
          'emotional instability',
        ],
        historicalOutcomes: [
          'unstable relationships',
          'missed opportunities',
          'repeated hurt',
        ],
      }
    }

    return null
  }

  /**
   * Extract relationship patterns from historical events
   */
  private extractRelationshipPatternsFromHistory(
    history: string[],
  ): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []

    for (const event of history) {
      const lowerEvent = event.toLowerCase()

      // Abandonment/loss patterns
      if (
        lowerEvent.includes('left') ||
        lowerEvent.includes('divorce') ||
        lowerEvent.includes('death') ||
        lowerEvent.includes('abandoned')
      ) {
        patterns.push({
          type: 'abandonment-sensitivity',
          expectations: [
            'people will leave',
            'relationships are temporary',
            'loss is inevitable',
          ],
          fears: [
            'abandonment',
            'loss',
            'being left alone',
            'relationship changes',
          ],
          behaviors: [
            'preemptive withdrawal',
            'testing behaviors',
            'clingy attachment',
          ],
          historicalOutcomes: [
            'self-fulfilling prophecies',
            'relationship strain',
            'increased anxiety',
          ],
        })
      }

      // Betrayal/trust patterns
      if (
        lowerEvent.includes('betray') ||
        lowerEvent.includes('cheated') ||
        lowerEvent.includes('lied') ||
        lowerEvent.includes('abuse')
      ) {
        patterns.push({
          type: 'trust-issues',
          expectations: [
            'people will betray me',
            'everyone has hidden motives',
            'trust leads to hurt',
          ],
          fears: ['betrayal', 'deception', 'vulnerability', 'being fooled'],
          behaviors: [
            'hypervigilance',
            'suspicion',
            'emotional walls',
            'background checking',
          ],
          historicalOutcomes: [
            'isolation',
            'missed connections',
            'chronic distrust',
          ],
        })
      }

      // Rejection patterns
      if (
        lowerEvent.includes('reject') ||
        lowerEvent.includes('bullied') ||
        lowerEvent.includes('excluded')
      ) {
        patterns.push({
          type: 'rejection-sensitivity',
          expectations: [
            'people will reject me',
            'I will be excluded',
            'criticism means rejection',
          ],
          fears: [
            'rejection',
            'social exclusion',
            'criticism',
            'not belonging',
          ],
          behaviors: [
            'withdrawal',
            'people-pleasing',
            'over-interpreting social cues',
          ],
          historicalOutcomes: [
            'social isolation',
            'missed opportunities',
            'chronic loneliness',
          ],
        })
      }
    }

    return patterns
  }

  /**
   * Infer interaction patterns from beliefs and history
   */
  private inferInteractionPatterns(
    relationshipBeliefs: z.infer<typeof PatientPsiCoreBeliefSchema>[],
    _history: string[],
  ): RelationshipPattern[] {
    const patterns: RelationshipPattern[] = []

    // People-pleasing pattern
    if (
      relationshipBeliefs.some(
        (b) =>
          b.category.includes('rejected') || b.category.includes('unwanted'),
      )
    ) {
      patterns.push({
        type: 'people-pleasing',
        expectations: [
          'others needs come first',
          'agreement prevents rejection',
          'saying no causes abandonment',
        ],
        fears: ['rejection', 'conflict', 'disapproval', 'abandonment'],
        behaviors: [
          'agreeing when disagree',
          'suppressing own needs',
          'excessive apologizing',
        ],
        historicalOutcomes: [
          'resentment buildup',
          'loss of identity',
          'exhaustion',
          'relationship imbalance',
        ],
      })
    }

    // Emotional dependency
    if (
      relationshipBeliefs.some(
        (b) => b.category.includes('alone') && b.strength > 7,
      )
    ) {
      patterns.push({
        type: 'emotional-dependency',
        expectations: [
          'others will regulate my emotions',
          'I cannot cope alone',
          'constant support needed',
        ],
        fears: [
          'being alone',
          'emotional overwhelm',
          'abandonment',
          'independence',
        ],
        behaviors: [
          'seeking constant reassurance',
          'inability to self-soothe',
          'clingy behavior',
        ],
        historicalOutcomes: [
          'loss of autonomy',
          'relationship pressure',
          'partner burnout',
        ],
      })
    }

    // Intimacy avoidance
    if (
      relationshipBeliefs.some(
        (b) => b.category.includes('unlovable') && b.strength > 8,
      )
    ) {
      patterns.push({
        type: 'intimacy-avoidance',
        expectations: [
          'closeness leads to hurt',
          'vulnerability is dangerous',
          'independence is safer',
        ],
        fears: [
          'intimacy',
          'vulnerability',
          'emotional exposure',
          'dependency',
        ],
        behaviors: [
          'emotional distance',
          'avoiding deep conversations',
          'sabotaging closeness',
        ],
        historicalOutcomes: [
          'shallow relationships',
          'loneliness',
          'partner dissatisfaction',
          'missed connections',
        ],
      })
    }

    return patterns
  }

  private transformFormativeExperiences(
    history: string[],
  ): FormativeExperience[] {
    return history.slice(0, 5).map((eventText, index) => {
      const age = this.inferAgeFromEvent(eventText, index)
      const impact = this.analyzeEventImpact(eventText, age)
      const emotionalResponse = this.extractEmotionalResponse(eventText)
      const beliefsFormed = this.inferBeliefsFromEvent(eventText, age)

      return {
        event: eventText,
        age,
        impact,
        emotionalResponse,
        beliefsFormed,
      } as FormativeExperience
    })
  }

  /**
   * Infer age from event context and content
   */
  private inferAgeFromEvent(eventText: string, index: number): number {
    const lowerEvent = eventText.toLowerCase()

    // Age-specific keywords mapping
    const ageKeywords = {
      infant: { min: 0, max: 2, keywords: ['baby', 'infant', 'born', 'birth'] },
      toddler: {
        min: 2,
        max: 4,
        keywords: ['toddler', 'walking', 'talking', 'potty'],
      },
      preschool: {
        min: 4,
        max: 6,
        keywords: ['preschool', 'kindergarten', 'first day'],
      },
      elementary: {
        min: 6,
        max: 12,
        keywords: ['school', 'elementary', 'grade', 'teacher', 'homework'],
      },
      middle: {
        min: 12,
        max: 14,
        keywords: ['middle school', 'puberty', 'teenager'],
      },
      teen: {
        min: 14,
        max: 18,
        keywords: [
          'high school',
          'teenager',
          'dating',
          'driving',
          'college prep',
        ],
      },
      young_adult: {
        min: 18,
        max: 25,
        keywords: ['college', 'university', 'job', 'career', 'marriage'],
      },
      adult: {
        min: 25,
        max: 65,
        keywords: ['career', 'children', 'family', 'mortgage', 'promotion'],
      },
    }

    // Check for explicit age mentions
    const ageMatch = lowerEvent.match(/(?:age|aged?)\s*(\d+)/)
    if (ageMatch) {
      return parseInt(ageMatch[1], 10)
    }

    // Check for grade mentions
    const gradeMatch = lowerEvent.match(/(?:grade|year)\s*(\d+)/)
    if (gradeMatch) {
      const grade = parseInt(gradeMatch[1], 10)
      return grade + 5 // Approximate age from grade
    }

    // Match against age-related keywords
    for (const [, ageRange] of Object.entries(ageKeywords)) {
      if (ageRange.keywords.some((keyword) => lowerEvent.includes(keyword))) {
        // Return middle of range with some variation based on index
        const midAge = (ageRange.min + ageRange.max) / 2
        const variation = ((index % 3) - 1) * 1 // -1, 0, or 1 year variation
        return Math.max(
          ageRange.min,
          Math.min(ageRange.max, Math.round(midAge + variation)),
        )
      }
    }

    // Default: use deterministic approach based on content
    return this.deterministicAgeFromEvent(eventText, index)
  }

  /**
   * Analyze the psychological impact level of an event
   */
  private analyzeEventImpact(
    eventText: string,
    age: number,
  ): 'mild' | 'moderate' | 'significant' | 'severe' {
    const lowerEvent = eventText.toLowerCase()

    // Severe impact indicators
    const severeKeywords = [
      'abuse',
      'violence',
      'assault',
      'rape',
      'molest',
      'trauma',
      'accident',
      'death',
      'suicide',
      'overdose',
      'murder',
      'war',
      'disaster',
    ]

    // Significant impact indicators
    const significantKeywords = [
      'divorce',
      'abandonment',
      'neglect',
      'bullying',
      'rejection',
      'failure',
      'hospitalization',
      'illness',
      'fired',
      'betrayal',
      'cheating',
    ]

    // Moderate impact indicators
    const moderateKeywords = [
      'argument',
      'conflict',
      'disappointed',
      'upset',
      'worried',
      'stress',
      'change',
      'moved',
      'new school',
      'breakup',
    ]

    // Check for severity indicators
    if (severeKeywords.some((keyword) => lowerEvent.includes(keyword))) {
      return 'severe'
    }

    if (significantKeywords.some((keyword) => lowerEvent.includes(keyword))) {
      return 'significant'
    }

    if (moderateKeywords.some((keyword) => lowerEvent.includes(keyword))) {
      return 'moderate'
    }

    // Consider age factors - younger children more vulnerable
    if (age <= 6) {
      // Young children are more vulnerable to all events
      return 'significant'
    } else if (age <= 12) {
      return 'moderate'
    }

    return 'mild'
  }

  /**
   * Extract primary emotional response from event description
   */
  private extractEmotionalResponse(eventText: string): string {
    const lowerEvent = eventText.toLowerCase()

    const emotionKeywords = {
      fear: [
        'scared',
        'afraid',
        'terrified',
        'panic',
        'fear',
        'worried',
        'anxious',
      ],
      sadness: [
        'sad',
        'depressed',
        'grief',
        'loss',
        'crying',
        'tears',
        'devastated',
      ],
      anger: ['angry', 'mad', 'furious', 'rage', 'irritated', 'frustrated'],
      shame: ['ashamed', 'embarrassed', 'humiliated', 'guilty', 'mortified'],
      helplessness: ['helpless', 'powerless', 'trapped', 'stuck', 'hopeless'],
      betrayal: [
        'betrayed',
        'deceived',
        'lied to',
        'cheated',
        'stabbed in back',
      ],
      confusion: ['confused', 'bewildered', 'lost', 'uncertain', 'unclear'],
    }

    // Score each emotion based on keyword matches
    let maxScore = 0
    let primaryEmotion = 'sadness' // default

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const score = keywords.reduce((count, keyword) => {
        return count + (lowerEvent.includes(keyword) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        primaryEmotion = emotion
      }
    }

    return primaryEmotion
  }

  /**
   * Infer beliefs formed from traumatic/formative events
   */
  private inferBeliefsFromEvent(eventText: string, age: number): string[] {
    const lowerEvent = eventText.toLowerCase()
    const beliefs: string[] = []

    // Abandonment events
    if (
      lowerEvent.includes('left') ||
      lowerEvent.includes('abandon') ||
      lowerEvent.includes('divorce')
    ) {
      beliefs.push('People always leave me')
      beliefs.push('I am not worth staying for')
      if (age <= 10) {
        beliefs.push('It was my fault they left')
      }
    }

    // Abuse/violence events
    if (
      lowerEvent.includes('abuse') ||
      lowerEvent.includes('hit') ||
      lowerEvent.includes('hurt')
    ) {
      beliefs.push('The world is dangerous')
      beliefs.push('I am powerless')
      beliefs.push('Adults cannot be trusted')
      if (age <= 12) {
        beliefs.push('I must have deserved it')
      }
    }

    // Rejection/bullying events
    if (
      lowerEvent.includes('reject') ||
      lowerEvent.includes('bully') ||
      lowerEvent.includes('exclude')
    ) {
      beliefs.push('I am different and that is bad')
      beliefs.push('I do not belong anywhere')
      beliefs.push('People will hurt me if they get close')
    }

    // Failure events
    if (
      lowerEvent.includes('fail') ||
      lowerEvent.includes('mistake') ||
      lowerEvent.includes('wrong')
    ) {
      beliefs.push('I am not good enough')
      beliefs.push('I must be perfect to be accepted')
      beliefs.push('Making mistakes is catastrophic')
    }

    // Neglect events
    if (
      lowerEvent.includes('ignored') ||
      lowerEvent.includes('neglect') ||
      lowerEvent.includes('alone')
    ) {
      beliefs.push('My needs do not matter')
      beliefs.push('I am invisible')
      beliefs.push('I must not burden others')
    }

    // Death/loss events
    if (
      lowerEvent.includes('death') ||
      lowerEvent.includes('died') ||
      lowerEvent.includes('lost')
    ) {
      beliefs.push('Everyone I love will leave me')
      beliefs.push('It is dangerous to get attached')
      beliefs.push('Loss is inevitable')
    }

    // If no specific beliefs inferred, add general ones based on impact
    if (beliefs.length === 0) {
      beliefs.push('Bad things happen to me')
      if (age <= 8) {
        beliefs.push('I caused this somehow')
      }
    }

    return beliefs
  }

  private createTherapyHistory(previousTreatments?: string[]): TherapyHistory {
    return {
      previousApproaches: previousTreatments || [],
      helpfulInterventions: [],
      unhelpfulInterventions: [],
      insights: [],
      progressMade: 'minimal',
      remainingChallenges: [
        'core belief modification',
        'behavioral change',
        'emotional regulation',
      ],
    }
  }

  private calculateInitialResistance(
    styles: z.infer<
      typeof PatientPsiCognitiveModelSchema
    >['conversationalStyles'],
  ): number {
    if (!Array.isArray(styles) || styles.length === 0) {
      return 3 // Default resistance
    }
    const primaryStyleInfo = styles[0]
    const styleKey = primaryStyleInfo?.style || 'plain'
    return STYLE_MAPPING[styleKey]?.resistance || 3
  }

  private getPreferredModes(style: string): string[] {
    const modeMap = {
      plain: ['Direct questions', 'Clear explanations'],
      upset: ['Validation', 'Emotional support'],
      verbose: ['Active listening', 'Gentle redirection'],
      reserved: ['Patience', 'Gradual exploration'],
      tangent: ['Structure', 'Gentle redirection'],
      pleasing: ['Gentle challenges', 'Encouraging autonomy'],
    }

    return modeMap[style as keyof typeof modeMap] || ['Supportive dialogue']
  }
}

/**
 * Create and export a parser instance
 */
export const patientPsiParser = new PatientPsiParser()

/**
 * Utility function to validate Patient-Psi data structure
 */
export function validatePatientPsiData(data: unknown): boolean {
  try {
    PatientPsiCognitiveModelSchema.parse(data)
    return true
  } catch (error) {
    console.error('Patient-Psi data validation failed:', error)
    return false
  }
}

/**
 * Utility function to get supported Patient-Psi conversational styles
 */
export function getSupportedConversationalStyles(): string[] {
  return ['plain', 'upset', 'verbose', 'reserved', 'tangent', 'pleasing']
}

/**
 * Utility function to get Patient-Psi core belief categories
 */
export function getCoreBeliefsCategories(): string[] {
  return Object.keys(CORE_BELIEF_MAPPING)
}
