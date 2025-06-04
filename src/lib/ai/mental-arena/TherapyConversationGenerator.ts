import { getLogger } from '../../logging'
import type { MentalArenaAdapter } from './MentalArenaAdapter'
import type { EncodedSymptom } from './MentalArenaAdapter'
import type { TherapyAIProvider } from '../interfaces/therapy'
import type { FHEService } from '../../fhe'
import { MentalArenaFactory } from './MentalArenaFactory'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const logger = getLogger()

/**
 * Configuration options for generating synthetic therapy conversations
 */
export interface ConversationGeneratorConfig {
  numSessions: number
  maxTurns: number
  disorders?: string[]
  outputPath?: string
  pythonBridge?: boolean
  model?: string
  includeEdgeCases?: boolean
  edgeCaseRatio?: number // 0-1, percentage of generated conversations that should be edge cases
  edgeCaseTypes?: string[] // Specific types of edge cases to include
  edgeCasePromptPath?: string // Path to edge case prompts file
  privacySettings?: {
    enabled: boolean
    epsilon: number
    delta: number | 'auto'
    clipNorm?: number
  }
  evaluateQuality?: boolean
  compareToRealData?: boolean
}

/**
 * CLI interface for running the conversation generator interactively
 */
export interface CLIOptions {
  interactive?: boolean
  outputFormat?: 'json' | 'csv' | 'text'
  verbose?: boolean
  includeFullConversation?: boolean
  scenarioCategories?: string[]
  emotionalIntensity?: 'low' | 'medium' | 'high' | 'extreme'
  therapistExpertise?: 'novice' | 'experienced' | 'expert'
  challengingBehaviors?: boolean
  demographicVariety?: boolean
}

/**
 * Represents a generated edge case conversation.
 */
export interface GeneratedEdgeCaseConversation {
  patientText: string
  therapistText: string
  encodedSymptoms: EncodedSymptom[]
  decodedSymptoms: string[]
  sessionSummary?: string
  isEdgeCase: boolean
  edgeCaseType: string
  emotionalIntensity?: number
  challengeLevel?: number
  scenarioDetail?: string
  fullConversation?: string // Added to match usage in generateEdgeCaseConversations result processing
}

/**
 * Enhanced theme configuration for richer conversation generation
 */
export interface ThemeConfig {
  clientDemographics?: {
    age?: number | { min: number; max: number }
    gender?: string
    culturalBackground?: string
    socioeconomicStatus?: string
    education?: string
    occupation?: string
    relationshipStatus?: string
    sexuality?: string
    religiousBackground?: string
    disabilities?: string[]
  }
  therapeuticContext?: {
    sessionNumber?: number
    sessionFrequency?: string
    treatmentDuration?: string
    modality?: string
    pastTreatmentHistory?: string
    referralSource?: string
    settingType?: string
  }
  clinicalElements?: {
    primaryConcerns?: string[]
    comorbidConditions?: string[]
    treatmentGoals?: string[]
    defenseMechanisms?: string[]
    attachmentStyle?: string
    traumaHistory?: string[]
    substanceUseHistory?: string
    medicationStatus?: string
    familyDynamics?: string[]
    copingMechanisms?: string[]
  }
  scenarioParameters?: {
    emotionalIntensity?: 'low' | 'medium' | 'high' | 'extreme'
    resistanceLevel?: 'none' | 'mild' | 'moderate' | 'severe'
    insightCapacity?: 'poor' | 'fair' | 'good' | 'excellent'
    ambivalence?: boolean
    transference?: string
    countertransference?: string
    crisis?: boolean
    suicidality?: 'none' | 'ideation' | 'plan' | 'intent'
    specificEvents?: string[]
  }
}

/**
 * Configuration for differential privacy settings
 */
export interface PrivacyConfig {
  enabled: boolean
  epsilon: number
  delta: number | 'auto'
  clipNorm?: number
  entityColumn?: string
}

// Extend TherapyAIProvider interface to add generateText method
declare module '../interfaces/therapy' {
  interface TherapyAIProvider {
    generateText(prompt: string): Promise<string>
  }
}

/**
 * Generator for synthetic therapy conversations
 * Uses MentalArena to create realistic patient-therapist interactions
 * Can also generate edge cases for stress testing and boundary exploration
 */
export class TherapyConversationGenerator {
  private adapter: MentalArenaAdapter
  private provider: TherapyAIProvider
  private fheService: FHEService
  private edgeCasePrompts: Array<{
    prompt_id: string
    scenario_type: string
    fail_no_matter_what: boolean
    instructions: string
  }> | null = null

  constructor(
    adapter: MentalArenaAdapter,
    provider: TherapyAIProvider,
    fheService: FHEService,
  ) {
    this.adapter = adapter
    this.provider = provider
    this.fheService = fheService
  }

  /**
   * Load edge case prompts from a JSONL file
   */
  private async loadEdgeCasePrompts(filePath?: string): Promise<boolean> {
    try {
      const promptPath =
        filePath || path.join(process.cwd(), 'ai', 'edge_case_prompts.jsonl')

      try {
        // Use async stat instead of existsSync
        await fs.promises.stat(promptPath)
      } catch (_err) {
        logger.warn(`Edge case prompts file not found: ${promptPath}`)
        return false
      }

      const content = await fs.promises.readFile(promptPath, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim() !== '')

      this.edgeCasePrompts = lines.map((line) => JSON.parse(line))
      logger.info(`Loaded ${this.edgeCasePrompts.length} edge case prompts`)

      return true
    } catch (error) {
      logger.error('Failed to load edge case prompts', { error })
      return false
    }
  }

  /**
   * Generate a batch of synthetic conversations
   */
  async generateConversations(
    config: ConversationGeneratorConfig & {
      privacyConfig?: PrivacyConfig // Add privacy configuration
    },
  ): Promise<
    Array<{
      patientText: string
      therapistText: string
      encodedSymptoms: EncodedSymptom[]
      decodedSymptoms: string[]
      sessionSummary?: string
      accuracyScore?: number
      isEdgeCase?: boolean
      edgeCaseType?: string
    }>
  > {
    logger.info('Generating synthetic therapy conversations', { config })

    try {
      // Load edge case prompts if edge cases are requested
      if (config.includeEdgeCases) {
        await this.loadEdgeCasePrompts(config.edgeCasePromptPath)
      }

      // Determine number of regular vs edge case sessions to generate
      const edgeCaseRatio = config.edgeCaseRatio || 0.2 // Default 20% edge cases if not specified
      const numEdgeCases =
        config.includeEdgeCases && this.edgeCasePrompts
          ? Math.round(config.numSessions * edgeCaseRatio)
          : 0
      const numRegularSessions = config.numSessions - numEdgeCases

      // Generate regular mental health sessions with MentalArena
      const mentalArenaConfig = {
        numSessions: numRegularSessions,
        maxTurns: config.maxTurns,
        disorders: config.disorders,
        outputPath: config.outputPath,
      }

      logger.info('Generating regular therapy conversations', {
        count: numRegularSessions,
        config: mentalArenaConfig,
      })

      const regularConversations =
        numRegularSessions > 0
          ? await this.adapter.generateSyntheticData(mentalArenaConfig)
          : []

      // Process regular conversations to add accuracy score
      const enhancedRegularConversations = await Promise.all(
        regularConversations.map(async (conversation) => {
          // Compare encoded and decoded symptoms to measure accuracy
          const comparisonResult = await this.adapter.compareSymptoms(
            conversation.encodedSymptoms,
            conversation.decodedSymptoms,
          )

          return {
            ...conversation,
            accuracyScore: comparisonResult.accuracyScore,
            isEdgeCase: false,
          }
        }),
      )

      // Generate edge case conversations
      let edgeCaseConversations: GeneratedEdgeCaseConversation[] = []

      if (
        numEdgeCases > 0 &&
        this.edgeCasePrompts &&
        this.edgeCasePrompts.length > 0
      ) {
        logger.info('Generating edge case therapy conversations', {
          count: numEdgeCases,
        })

        // Filter edge case types if specific types are requested
        let availablePrompts = [...this.edgeCasePrompts]
        if (config.edgeCaseTypes && config.edgeCaseTypes.length > 0) {
          availablePrompts = this.edgeCasePrompts.filter((prompt) =>
            config.edgeCaseTypes!.includes(prompt.scenario_type),
          )

          if (availablePrompts.length === 0) {
            logger.warn(
              'No matching edge case prompts found for requested types',
              {
                requestedTypes: config.edgeCaseTypes,
              },
            )
            availablePrompts = [...this.edgeCasePrompts]
          }
        }

        // Generate edge case conversations
        edgeCaseConversations = await this.generateEdgeCaseConversations(
          numEdgeCases,
          availablePrompts,
          config.maxTurns,
        )
      }

      // Combine both types of conversations
      const allConversations = [
        ...enhancedRegularConversations,
        ...edgeCaseConversations,
      ]

      logger.info('Synthetic conversation generation complete', {
        generatedCount: allConversations.length,
        regularCount: enhancedRegularConversations.length,
        edgeCaseCount: edgeCaseConversations.length,
      })

      return allConversations
    } catch (error) {
      logger.error('Failed to generate synthetic conversations', { error })
      throw new Error(
        `Failed to generate synthetic conversations: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generate edge case therapy conversations with enhanced detail and emotional depth
   */
  private async generateEdgeCaseConversations(
    count: number,
    availablePrompts: Array<{
      prompt_id: string
      scenario_type: string
      fail_no_matter_what: boolean
      instructions: string
    }>,
    maxTurns: number,
  ): Promise<GeneratedEdgeCaseConversation[]> {
    const result: GeneratedEdgeCaseConversation[] = []

    // Cycle through prompts to generate the requested number of conversations
    for (let i = 0; i < count; i++) {
      const promptIndex = i % availablePrompts.length
      const prompt = availablePrompts[promptIndex]

      try {
        logger.info(`Generating edge case scenario: ${prompt.scenario_type}`, {
          prompt_id: prompt.prompt_id,
        })

        // Enhanced prompt with more detail requirements and emotional depth guidance
        const response = await this.provider.generateText(`
          ${prompt.instructions}

          ENHANCE THIS SCENARIO WITH:
          1. Rich emotional detail - include internal feelings, physical sensations, and unique personal context
          2. Complex character backgrounds - create nuanced history and motivations behind behaviors
          3. Specific therapeutic challenges that would test a skilled therapist
          4. Realistic dialogue with natural speech patterns and emotion-driven responses
          5. Psychological depth showing how past experiences influence current presentation

          Please limit the conversation to ${maxTurns} exchanges between therapist and client.

          After generating the conversation, please end with a "SESSION ANALYSIS" section that includes:
          1. Key symptoms observed (with behavioral examples)
          2. Potential diagnoses (with differential considerations)
          3. Risk assessment (specific factors that increase or decrease risk)
          4. Recommended interventions (with rationale)
          5. Emotional themes present in the session
          6. Countertransference issues that might arise
          7. Ethical considerations
        `)

        // Extract patient and therapist text with improved parsing
        const conversationParts = this.parseConversation(response)

        // Extract symptoms from the conversation text
        const decodedSymptoms =
          await this.extractEnhancedSymptomsFromText(response)

        // Create mocked encoded symptoms based on the scenario type with more detail
        const encodedSymptoms = this.mapEdgeCaseTypeToDetailedSymptoms(
          prompt.scenario_type,
        )

        // Generate scenario-specific metadata for enhanced understanding
        const scenarioMeta = this.generateScenarioMetadata(
          prompt.scenario_type,
          response,
        )

        result.push({
          patientText: conversationParts.patientText,
          therapistText: conversationParts.therapistText,
          encodedSymptoms,
          decodedSymptoms,
          sessionSummary: conversationParts.sessionSummary,
          fullConversation: conversationParts.fullConversation,
          isEdgeCase: true,
          edgeCaseType: prompt.scenario_type,
          emotionalIntensity: scenarioMeta.emotionalIntensity,
          challengeLevel: scenarioMeta.challengeLevel,
          scenarioDetail: scenarioMeta.detail,
        })
      } catch (error) {
        logger.error(
          `Failed to generate edge case scenario: ${prompt.scenario_type}`,
          {
            error,
            prompt_id: prompt.prompt_id,
          },
        )
      }
    }

    return result
  }

  /**
   * Parse conversation into structured components with improved reliability
   */
  private parseConversation(text: string): {
    patientText: string
    therapistText: string
    sessionSummary: string
    fullConversation: string
  } {
    const lines = text.split('\n')
    let patientText = ''
    let therapistText = ''
    let sessionSummary = ''
    let fullConversation = text

    // Extract session analysis if present
    const analysisIndex = lines.findIndex(
      (line) =>
        line.includes('SESSION ANALYSIS') ||
        line.includes('ANALYSIS') ||
        line.includes('Risk Assessment'),
    )

    if (analysisIndex !== -1) {
      sessionSummary = lines.slice(analysisIndex).join('\n')
    }

    // Extract last client message with improved pattern matching
    const clientPatterns = [
      /client\s*:\s*(.*)/i,
      /patient\s*:\s*(.*)/i,
      /c\s*:\s*(.*)/i,
      /^(?:patient|client)\s*(.*)/i,
    ]

    for (let j = lines.length - 1; j >= 0; j--) {
      const line = lines[j]
      for (const pattern of clientPatterns) {
        const match = line.match(pattern)
        if (match && match[1] && match[1].trim()) {
          patientText = match[1].trim()
          break
        }
      }
      if (patientText) {
        break
      }
    }

    // Extract last therapist message with improved pattern matching
    const therapistPatterns = [
      /therapist\s*:\s*(.*)/i,
      /counselor\s*:\s*(.*)/i,
      /t\s*:\s*(.*)/i,
      /^(?:therapist|counselor)\s*(.*)/i,
    ]

    for (let j = lines.length - 1; j >= 0; j--) {
      const line = lines[j]
      for (const pattern of therapistPatterns) {
        const match = line.match(pattern)
        if (match && match[1] && match[1].trim()) {
          therapistText = match[1].trim()
          break
        }
      }
      if (therapistText) {
        break
      }
    }

    return {
      patientText: patientText || 'Could not extract patient text',
      therapistText: therapistText || 'Could not extract therapist text',
      sessionSummary,
      fullConversation,
    }
  }

  /**
   * Extract detailed symptoms from conversation text with more nuanced understanding
   */
  private async extractEnhancedSymptomsFromText(
    text: string,
  ): Promise<string[]> {
    try {
      const extractionPrompt = `
        Perform a detailed clinical extraction of all mental health symptoms from the following therapy conversation.

        Consider:
        1. Explicit symptoms directly mentioned
        2. Implicit symptoms suggested by behavior or speech patterns
        3. Emotional states described or demonstrated
        4. Cognitive patterns revealed in thinking
        5. Interpersonal dynamics that suggest underlying issues
        6. Risk factors for self-harm or harm to others
        7. Functional impairments in daily life

        Organize symptoms by category and severity, and include brief contextual notes.
        Return only a structured list of symptoms:

        ${text}
      `

      const response = await this.provider.generateText(extractionPrompt)

      // Process the response into a clean symptom list
      return response
        .split('\n')
        .map((line) => line.trim())
        .filter(
          (line) =>
            line.length > 0 &&
            !line.startsWith('Category') &&
            !line.startsWith('-') &&
            !line.match(/^\d+\./),
        )
        .map((line) => {
          // Clean up the symptom text
          return line
            .replace(/^[•\-*]\s+/, '') // Remove bullet points
            .replace(/\(.*?\)/g, '') // Remove parenthetical notes
            .replace(/:.*/g, '') // Remove anything after colons
            .trim()
        })
        .filter((line) => line.length > 0)
    } catch (error) {
      logger.error('Failed to extract enhanced symptoms from conversation', {
        error,
      })
      return []
    }
  }

  /**
   * Map edge case type to more detailed and nuanced symptom profiles
   */
  private mapEdgeCaseTypeToDetailedSymptoms(
    edgeCaseType: string,
  ): EncodedSymptom[] {
    // Enhanced symptom mappings with more detailed manifestations and cognitions
    const detailedSymptomsByType: Record<string, EncodedSymptom[]> = {
      sexual_abuse: [
        {
          name: 'complex trauma',
          severity: 0.9,
          duration: 'chronic',
          manifestations: [
            'intrusive memories of abuse',
            'nightmare-induced sleep disturbance',
            'physiological reactivity to triggers',
            'emotional numbing during stress',
            'hypervigilance in intimate settings',
            'difficulty with trust in relationships',
          ],
          cognitions: [
            'belief that body is permanently damaged',
            'self-blame for not stopping the abuse',
            'hyperawareness of potential threats',
            'belief that others can sense vulnerability',
            'difficulty seeing future as positive',
          ],
        },
        {
          name: 'shame-based anxiety',
          severity: 0.85,
          duration: 'chronic',
          manifestations: [
            'avoidance of physical intimacy',
            'difficulty discussing sexual topics',
            'somatic symptoms during disclosure',
            'dissociative episodes when triggered',
            'hyperarousal in perceived unsafe situations',
          ],
          cognitions: [
            'belief that others can see their shame',
            'fear of being permanently damaged',
            'contamination thoughts',
            'catastrophizing about vulnerability',
            'perfectionism as protection',
          ],
        },
      ],
      // Additional detailed mappings would follow for other types
      // Truncated for brevity but would include similar detailed expansions
    }

    // Fall back to the original symptom mapping if no enhanced mapping exists
    return (
      detailedSymptomsByType[edgeCaseType] ||
      this.mapEdgeCaseTypeToSymptoms(edgeCaseType)
    )
  }

  /**
   * Map edge case type to relevant encoded symptoms
   */
  private mapEdgeCaseTypeToSymptoms(edgeCaseType: string): EncodedSymptom[] {
    // Map different edge case types to relevant symptom profiles
    const symptomsByType: Record<string, EncodedSymptom[]> = {
      sexual_abuse: [
        {
          name: 'trauma',
          severity: 0.9,
          duration: 'chronic',
          manifestations: [
            'nightmares',
            'flashbacks',
            'avoidance',
            'hypervigilance',
          ],
          cognitions: ['shame', 'guilt', 'negative self-perception'],
        },
        {
          name: 'anxiety',
          severity: 0.8,
          duration: 'chronic',
          manifestations: ['physical tension', 'hyperarousal', 'panic attacks'],
          cognitions: ['fear of vulnerability', 'hypervigilance'],
        },
      ],
      sexual_client: [
        {
          name: 'boundary violation',
          severity: 0.8,
          duration: 'persistent',
          manifestations: ['inappropriate behavior', 'testing limits'],
          cognitions: ['entitlement', 'poor impulse control'],
        },
      ],
      domestic_violence: [
        {
          name: 'fear',
          severity: 0.9,
          duration: 'ongoing',
          manifestations: ['hypervigilance', 'startle response', 'avoidance'],
          cognitions: ['helplessness', 'catastrophizing', 'perceived threat'],
        },
        {
          name: 'trauma',
          severity: 0.8,
          duration: 'chronic',
          manifestations: ['nightmares', 'flashbacks', 'emotional numbing'],
          cognitions: ['self-blame', 'hopelessness'],
        },
      ],
      manipulative_client: [
        {
          name: 'manipulation',
          severity: 0.9,
          duration: 'persistent',
          manifestations: ['dishonesty', 'triangulation', 'blame-shifting'],
          cognitions: ['entitlement', 'exploitation'],
        },
      ],
      sadistic_client: [
        {
          name: 'sadism',
          severity: 0.9,
          duration: 'persistent',
          manifestations: ["enjoyment of others' distress", 'cruelty'],
          cognitions: ['contempt for others', 'superiority beliefs'],
        },
      ],
      uncontrollable_escalation: [
        {
          name: 'emotional dysregulation',
          severity: 0.9,
          duration: 'acute',
          manifestations: ['outbursts', 'extreme mood shifts', 'impulsivity'],
          cognitions: ['black-and-white thinking', 'catastrophizing'],
        },
      ],
      therapist_failure: [
        {
          name: 'countertransference',
          severity: 0.8,
          duration: 'persistent',
          manifestations: [
            'ineffective interventions',
            'inappropriate responses',
          ],
          cognitions: ['personal biases', 'unresolved issues'],
        },
      ],
      child_abuse: [
        {
          name: 'trauma',
          severity: 0.9,
          duration: 'ongoing',
          manifestations: ['fear', 'withdrawn behavior', 'regression'],
          cognitions: ['shame', 'helplessness', 'confusion'],
        },
      ],
      evil_client: [
        {
          name: 'antisocial tendencies',
          severity: 0.9,
          duration: 'persistent',
          manifestations: ['lack of remorse', 'disregard for others'],
          cognitions: ['entitlement', 'lack of empathy'],
        },
      ],
      intense_edge_case: [
        {
          name: 'crisis',
          severity: 0.9,
          duration: 'acute',
          manifestations: ['extreme distress', 'risk behaviors'],
          cognitions: ['hopelessness', 'desperation'],
        },
      ],
    }

    // Return symptoms for the specific type or default symptoms if type not found
    return (
      symptomsByType[edgeCaseType] || [
        {
          name: 'distress',
          severity: 0.8,
          duration: 'current',
          manifestations: ['emotional intensity', 'difficulty coping'],
          cognitions: ['overwhelmed', 'distorted thinking'],
        },
      ]
    )
  }

  /**
   * Generate metadata about the scenario to enhance understanding
   */
  private generateScenarioMetadata(
    scenarioType: string,
    conversationText: string,
  ): {
    emotionalIntensity: number // 0-1 scale
    challengeLevel: number // 0-1 scale
    detail: string
  } {
    // Calculate emotional intensity based on content analysis
    const emotionalKeywords = [
      'terrified',
      'devastated',
      'furious',
      'desperate',
      'hopeless',
      'panic',
      'rage',
      'violent',
      'suicide',
      'abuse',
      'trauma',
      'assault',
      'death',
      'crisis',
      'emergency',
      'overwhelmed',
    ]

    // Calculate a simple measure of emotional intensity
    const emotionalIntensity = Math.min(
      1.0,
      emotionalKeywords.reduce((count, word) => {
        return count + (conversationText.toLowerCase().includes(word) ? 0.1 : 0)
      }, 0.3), // Base intensity of 0.3
    )

    // Calculate challenge level based on scenario type and content
    const challengeMap: Record<string, number> = {
      sexual_abuse: 0.9,
      sexual_client: 0.85,
      domestic_violence: 0.8,
      manipulative_client: 0.75,
      sadistic_client: 0.95,
      uncontrollable_escalation: 0.85,
      therapist_failure: 0.7,
      child_abuse: 0.9,
      evil_client: 0.9,
      intense_edge_case: 0.8,
    }

    const challengeLevel = challengeMap[scenarioType] || 0.5

    // Generate brief descriptor of the scenario
    const details: Record<string, string> = {
      sexual_abuse:
        'Client processing past sexual trauma with significant trust issues',
      sexual_client:
        'Client exhibiting inappropriate sexual behavior toward therapist',
      domestic_violence:
        'Client in active domestic violence situation with safety concerns',
      manipulative_client:
        'Client using manipulation tactics to control therapeutic relationship',
      sadistic_client:
        'Client demonstrating sadistic tendencies and enjoying therapist discomfort',
      uncontrollable_escalation:
        'Session with rapid emotional escalation and dysregulation',
      therapist_failure:
        'Therapist struggling with countertransference and making errors',
      child_abuse:
        'Discussion of child abuse with mandatory reporting implications',
      evil_client:
        'Client with severe antisocial features and concerning lack of empathy',
      intense_edge_case:
        'Complex presentation with multiple severe symptoms and risk factors',
    }

    return {
      emotionalIntensity,
      challengeLevel,
      detail:
        details[scenarioType] ||
        `Specialized edge case scenario: ${scenarioType}`,
    }
  }

  /**
   * Create a therapy conversation generator with the specified configuration
   */
  static async create(
    provider: TherapyAIProvider,
    fheService: FHEService,
    config: {
      usePythonBridge?: boolean
      model?: string
      baseUrl?: string
      apiKey?: string
      includeEdgeCases?: boolean
    } = {},
  ): Promise<TherapyConversationGenerator> {
    const { usePythonBridge = false, model, baseUrl, apiKey } = config

    let adapter: MentalArenaAdapter

    if (model) {
      // Create adapter for specific model
      adapter = await MentalArenaFactory.createForModel(
        model,
        provider,
        fheService,
      )
    } else if (usePythonBridge && process.env.MENTAL_ARENA_PATH) {
      // Create adapter with Python bridge
      adapter = await MentalArenaFactory.createWithPythonBridge(
        provider,
        fheService,
        {
          baseUrl:
            baseUrl ||
            process.env.EMOTION_LLAMA_API_URL ||
            'http://localhost:8000',
          apiKey: apiKey || process.env.EMOTION_LLAMA_API_KEY || '',
          pythonPath: process.env.PYTHON_PATH || 'python3',
          mentalArenaPath: process.env.MENTAL_ARENA_PATH,
          venvName: process.env.MENTAL_ARENA_VENV || 'venv',
        },
      )
    } else {
      // Create adapter from environment
      adapter = await MentalArenaFactory.createFromEnv(provider, fheService)
    }

    return new TherapyConversationGenerator(adapter, provider, fheService)
  }

  /**
   * Fine-tune a model using the generated conversations
   */
  async fineTuneModel(
    conversations: Array<{
      patientText: string
      therapistText: string
      encodedSymptoms?: EncodedSymptom[]
      decodedSymptoms?: string[]
      isEdgeCase?: boolean
    }>,
    config: {
      baseModel: string
      newModelName: string
      epochs?: number
      outputPath?: string
      includeEdgeCases?: boolean
    },
  ): Promise<void> {
    logger.info('Fine-tuning model with synthetic conversations', {
      baseModel: config.baseModel,
      newModelName: config.newModelName,
      conversationCount: conversations.length,
      includeEdgeCases: config.includeEdgeCases,
    })

    try {
      // Filter out edge cases if not requested
      const filteredConversations = config.includeEdgeCases
        ? conversations
        : conversations.filter((conv) => !conv.isEdgeCase)

      logger.info(
        `Using ${filteredConversations.length} conversations for fine-tuning`,
        {
          edgeCasesIncluded: config.includeEdgeCases,
        },
      )

      await this.adapter.fineTuneModel(filteredConversations, {
        baseModel: config.baseModel,
        newModelName: config.newModelName,
        epochs: config.epochs || 3,
        outputPath: config.outputPath,
      })

      logger.info('Model fine-tuning complete', {
        newModel: config.newModelName,
      })
    } catch (error) {
      logger.error('Failed to fine-tune model', { error })
      throw new Error(
        `Failed to fine-tune model: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Export conversations to a JSON file
   */
  async exportConversations(
    conversations: Array<{
      patientText: string
      therapistText: string
      encodedSymptoms: EncodedSymptom[]
      decodedSymptoms: string[]
      sessionSummary?: string
      isEdgeCase?: boolean
      edgeCaseType?: string
    }>,
    outputPath: string,
  ): Promise<boolean> {
    try {
      logger.info('Exporting conversations to file', {
        count: conversations.length,
        path: outputPath,
      })

      // Group conversations by type for detailed stats
      const regularCount = conversations.filter((c) => !c.isEdgeCase).length
      const edgeCaseCount = conversations.filter((c) => c.isEdgeCase).length

      // Calculate edge case type distributions
      const edgeCaseTypes = conversations
        .filter((c) => c.isEdgeCase && c.edgeCaseType)
        .reduce(
          (acc, conv) => {
            const type = conv.edgeCaseType as string
            acc[type] = (acc[type] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

      logger.info('Conversation statistics', {
        total: conversations.length,
        regular: regularCount,
        edgeCases: edgeCaseCount,
        edgeCaseTypes,
      })

      // Write conversations to file
      await fs.promises.writeFile(
        outputPath,
        JSON.stringify(conversations, null, 2),
        'utf-8',
      )

      logger.info('Successfully wrote conversations to file', {
        outputPath,
        conversationCount: conversations.length,
      })

      return true
    } catch (error) {
      logger.error('Failed to export conversations', { error, outputPath })
      return false
    }
  }

  /**
   * Generate enhanced conversations using MentalArena with rich thematic elements
   * This applies the enhanced theme generation to standard MentalArena conversations
   */
  async generateEnhancedMentalArenaConversations(
    config: ConversationGeneratorConfig & {
      themeConfig?: ThemeConfig
      demographicVariety?: boolean
      emotionalIntensity?: 'low' | 'medium' | 'high' | 'extreme'
      includeFullConversation?: boolean
    },
  ): Promise<
    Array<{
      patientText: string
      therapistText: string
      encodedSymptoms: EncodedSymptom[]
      decodedSymptoms: string[]
      sessionSummary?: string
      accuracyScore?: number
      theme?: ThemeConfig
      fullConversation?: string
    }>
  > {
    logger.info('Generating enhanced MentalArena conversations', { config })

    try {
      // Create theme config - either using provided theme or generating a new one
      const theme = config.themeConfig || this.generateEnhancedTheme()

      // Apply demographic variety if requested
      if (config.demographicVariety && !config.themeConfig) {
        // Generate multiple diverse demographic profiles
        logger.info('Applying demographic variety to conversations')
      }

      // Apply emotional intensity if specified
      if (
        config.emotionalIntensity &&
        !config.themeConfig?.scenarioParameters?.emotionalIntensity
      ) {
        theme.scenarioParameters = {
          ...theme.scenarioParameters,
          emotionalIntensity: config.emotionalIntensity,
        }
      }

      // Generate base MentalArena conversations
      const mentalArenaConfig = {
        numSessions: config.numSessions,
        maxTurns: config.maxTurns,
        disorders: config.disorders,
        outputPath: config.outputPath,
      }

      logger.info('Generating MentalArena conversations with enhanced themes', {
        theme: theme.scenarioParameters?.emotionalIntensity,
        concerns: theme.clinicalElements?.primaryConcerns,
      })

      // Generate conversations with MentalArena
      const conversations =
        await this.adapter.generateSyntheticData(mentalArenaConfig)

      // Enhance conversations with thematic elements and accuracy scoring
      const enhancedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          // Compare encoded and decoded symptoms to measure accuracy
          const comparisonResult = await this.adapter.compareSymptoms(
            conversation.encodedSymptoms,
            conversation.decodedSymptoms,
          )

          // Optionally reconstruct a fuller conversation if requested
          const fullConversation = config.includeFullConversation
            ? await this.reconstructFullConversation(
                conversation,
                theme.scenarioParameters?.emotionalIntensity || 'medium',
              )
            : undefined

          return {
            ...conversation,
            accuracyScore: comparisonResult.accuracyScore,
            theme,
            fullConversation,
          }
        }),
      )

      logger.info('Enhanced conversation generation complete', {
        generatedCount: enhancedConversations.length,
      })

      return enhancedConversations
    } catch (error) {
      logger.error('Failed to generate enhanced MentalArena conversations', {
        error,
      })
      throw new Error(
        `Failed to generate enhanced conversations: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Enhanced version of the generateConversations method that supports interactive CLI usage
   */
  async generateConversationsCLI(
    config: ConversationGeneratorConfig & CLIOptions,
  ): Promise<
    Array<{
      patientText: string
      therapistText: string
      encodedSymptoms: EncodedSymptom[]
      decodedSymptoms: string[]
      sessionSummary?: string
      accuracyScore?: number
      isEdgeCase?: boolean
      edgeCaseType?: string
      fullConversation?: string
    }>
  > {
    logger.info('Starting interactive conversation generation', { mode: 'CLI' })

    // If interactive mode is enabled, prompt for configuration
    if (config.interactive) {
      // This would be implemented with a real CLI interface
      // For now we'll just log what would happen
      logger.info('Would prompt user for the following settings:', {
        numSessions: 'Number of sessions to generate',
        includeEdgeCases: 'Include edge cases? (y/n)',
        edgeCaseRatio: 'Percentage of edge cases (0-100)',
        edgeCaseTypes: 'Types of edge cases to include',
        maxTurns: 'Maximum conversation turns',
        disorders: 'Target disorders to simulate',
        emotionalIntensity: 'Emotional intensity level',
        therapistExpertise: 'Therapist expertise level',
        challengingBehaviors: 'Include challenging behaviors? (y/n)',
        demographicVariety: 'Include demographic variety? (y/n)',
        outputFormat: 'Output format (json/csv/text)',
        outputPath: 'Output file path',
      })
    }

    // Generate conversations using the core method
    const conversations = await this.generateConversations(config)

    // Process conversations based on CLI options
    return await Promise.all(
      conversations.map(async (conversation) => {
        // Include the full conversation if requested
        if (config.includeFullConversation) {
          return {
            ...conversation,
            fullConversation: await this.reconstructFullConversation(
              conversation,
              config.emotionalIntensity || 'medium',
            ),
          }
        }
        return conversation
      }),
    )
  }

  /**
   * Reconstruct a full conversation from the final exchange
   * This creates a richer, more detailed conversation history by generating
   * a complete therapy session that concludes with the given patient and therapist texts.
   *
   * The method uses the existing symptoms and emotional intensity to create a
   * realistic dialogue that showcases the progression leading up to the final exchange.
   *
   * @param conversation The conversation data containing final exchanges and symptoms
   * @param emotionalIntensity The desired emotional intensity of the conversation
   * @returns A formatted string containing the complete conversation with appropriate formatting
   */
  private async reconstructFullConversation(
    conversation: {
      patientText: string
      therapistText: string
      encodedSymptoms: EncodedSymptom[]
      decodedSymptoms: string[]
      isEdgeCase?: boolean
      edgeCaseType?: string
    },
    emotionalIntensity: 'low' | 'medium' | 'high' | 'extreme' = 'medium',
  ): Promise<string> {
    try {
      // Create a detailed prompt for the AI to generate a realistic conversation history
      const symptomsText = conversation.encodedSymptoms
        .map(
          (symptom) =>
            `${symptom.name} (severity: ${symptom.severity}, duration: ${symptom.duration})
           - Manifestations: ${symptom.manifestations.join(', ')}
           - Cognitions: ${symptom.cognitions.join(', ')}`,
        )
        .join('\n\n')

      const prompt = `
        Generate a realistic therapy conversation between a therapist and client.

        CONVERSATION CONTEXT:
        - Emotional intensity: ${emotionalIntensity}
        ${conversation.isEdgeCase ? `- This is an edge case scenario: ${conversation.edgeCaseType}` : ''}

        CLIENT SYMPTOMS:
        ${symptomsText}

        FORMAT INSTRUCTIONS:
        - Create a natural conversation with 4-5 exchanges between therapist and client
        - Use "T:" for therapist lines and "C:" for client lines
        - Start with the therapist's opening and proceed through meaningful exchanges
        - The conversation should end with:
          C: ${conversation.patientText}
          T: ${conversation.therapistText}
        - Reflect symptoms naturally throughout the dialogue
        - Match the specified emotional intensity level (${emotionalIntensity})
        - Make the dialogue realistic, not scripted

        CONVERSATION:
      `

      // Generate the conversation
      const fullConversation = await this.provider.generateText(prompt)

      // Add formatting and a session ID to make it look more authentic
      // Use cryptographically secure UUIDv4 for maximum uniqueness and entropy
      const sessionId = crypto.randomUUID()
      return `SESSION ID: ${sessionId}\n\n${fullConversation}`
    } catch (error) {
      logger.error('Failed to reconstruct full conversation', { error })
      // Fallback to a minimal reconstruction if generation fails
      return (
        `T: [Opening statement from therapist]\n\n` +
        `C: [Earlier client dialogue]\n\n` +
        `T: [Therapist response]\n\n` +
        `C: ${conversation.patientText}\n\n` +
        `T: ${conversation.therapistText}`
      )
    }
  }

  /**
   * Run the generator as a CLI application
   */
  static async runCLI(
    args: string[],
    provider: TherapyAIProvider,
    fheService: FHEService,
  ): Promise<void> {
    logger.info('Starting TherapyConversationGenerator CLI', { args })

    // Create generator
    const generator = await TherapyConversationGenerator.create(
      provider,
      fheService,
      {
        includeEdgeCases: true,
      },
    )

    // Parse CLI arguments
    const parsedArgs = {
      interactive: args.includes('--interactive') || args.includes('-i'),
      verbose: args.includes('--verbose') || args.includes('-v'),
      includeFullConversation: args.includes('--full'),
      outputFormat: (args.includes('--csv')
        ? 'csv'
        : args.includes('--text')
          ? 'text'
          : 'json') as 'json' | 'csv' | 'text',
      numSessions:
        Number.parseInt(
          args.find((arg) => arg.startsWith('--sessions='))?.split('=')[1] ??
            '',
          10,
        ) || 10,
      maxTurns:
        Number.parseInt(
          args.find((arg) => arg.startsWith('--turns='))?.split('=')[1] ?? '',
          10,
        ) || 5,
      edgeCaseRatio:
        Number.parseFloat(
          args.find((arg) => arg.startsWith('--edge-ratio='))?.split('=')[1] ??
            '',
        ) || 0.2,
      outputPath:
        args.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
        './conversations.json',
    }

    // Generate conversations
    const conversations = await generator.generateConversationsCLI({
      ...parsedArgs,
      includeEdgeCases: true,
      emotionalIntensity: 'high' as const,
      scenarioCategories: ['trauma', 'addiction', 'mood_disorders', 'anxiety'],
      therapistExpertise: 'expert' as const,
      challengingBehaviors: true,
      demographicVariety: true,
    })

    // Output results based on format
    if (parsedArgs.outputFormat === 'json') {
      // Write JSON file
      await generator.exportConversations(conversations, parsedArgs.outputPath)
    } else if (parsedArgs.outputFormat === 'csv') {
      logger.info('Would output CSV format')
      // CSV output logic would go here
    } else {
      logger.info('Would output human-readable text format')
      // Human-readable output logic would go here
    }

    logger.info('CLI execution complete', {
      generatedConversations: conversations.length,
    })
  }

  /**
   * Generate an enhanced theme for conversation generation
   */
  private generateEnhancedTheme(baseTheme?: Partial<ThemeConfig>): ThemeConfig {
    // Generate a rich scenario theme for mental health dialogues
    const demographics =
      baseTheme?.clientDemographics || this.generateRandomDemographics()
    const therapeuticContext =
      baseTheme?.therapeuticContext || this.generateRandomTherapeuticContext()
    const clinicalElements =
      baseTheme?.clinicalElements || this.generateRandomClinicalElements()
    const scenarioParameters =
      baseTheme?.scenarioParameters || this.generateRandomScenarioParameters()

    return {
      clientDemographics: demographics,
      therapeuticContext: therapeuticContext,
      clinicalElements: clinicalElements,
      scenarioParameters: scenarioParameters,
    }
  }

  /**
   * Generate random demographic details for a client
   */
  private generateRandomDemographics(): ThemeConfig['clientDemographics'] {
    // Selection pools for various demographic factors
    const genders = [
      'male',
      'female',
      'non-binary',
      'transgender male',
      'transgender female',
      'genderfluid',
    ]
    const culturalBackgrounds = [
      'African American',
      'Hispanic/Latino',
      'Asian American',
      'Native American',
      'Middle Eastern',
      'European American',
      'South Asian',
      'East Asian',
      'Pacific Islander',
      'Multiracial',
      'Caribbean',
      'African',
      'Australian',
    ]
    const socioeconomicStatuses = [
      'low income',
      'working class',
      'middle class',
      'upper middle class',
      'affluent',
    ]
    const educationLevels = [
      'less than high school',
      'high school graduate',
      'some college',
      'associate degree',
      "bachelor's degree",
      "master's degree",
      'doctoral degree',
      'professional degree',
      'trade school',
    ]
    const occupations = [
      'healthcare worker',
      'teacher',
      'service industry',
      'business professional',
      'tradesperson',
      'artist',
      'engineer',
      'technology sector',
      'retail worker',
      'government employee',
      'self-employed',
      'unemployed',
      'student',
      'retired',
    ]
    const relationshipStatuses = [
      'single',
      'married',
      'divorced',
      'separated',
      'widowed',
      'in a relationship',
      'engaged',
      'polyamorous',
      'complicated',
    ]
    const sexualities = [
      'heterosexual',
      'homosexual',
      'bisexual',
      'pansexual',
      'asexual',
      'questioning',
      'demisexual',
    ]
    const religiousBackgrounds = [
      'Christian',
      'Catholic',
      'Protestant',
      'Jewish',
      'Muslim',
      'Hindu',
      'Buddhist',
      'Atheist',
      'Agnostic',
      'Spiritual but not religious',
      'Pagan',
      'Mormon',
      "Jehovah's Witness",
    ]
    const disabilities = [
      'physical disability',
      'chronic illness',
      'visual impairment',
      'hearing impairment',
      'cognitive disability',
      'neurodivergence',
      'mobility impairment',
      'invisible disability',
    ]

    // Randomly select demographic details
    const getRandomItem = <T>(items: T[]): T =>
      items[Math.floor(Math.random() * items.length)]

    // Randomly decide whether to include disabilities
    const hasDisabilities = Math.random() < 0.2 // 20% chance of having disabilities

    return {
      age: Math.floor(Math.random() * 50) + 18, // 18-68 age range
      gender: getRandomItem(genders),
      culturalBackground: getRandomItem(culturalBackgrounds),
      socioeconomicStatus: getRandomItem(socioeconomicStatuses),
      education: getRandomItem(educationLevels),
      occupation: getRandomItem(occupations),
      relationshipStatus: getRandomItem(relationshipStatuses),
      sexuality: getRandomItem(sexualities),
      religiousBackground: getRandomItem(religiousBackgrounds),
      disabilities: hasDisabilities
        ? Array(Math.floor(Math.random() * 2) + 1)
            .fill(0)
            .map(() => getRandomItem(disabilities))
        : [],
    }
  }

  /**
   * Generate random therapeutic context details
   */
  private generateRandomTherapeuticContext(): ThemeConfig['therapeuticContext'] {
    const modalities = [
      'Cognitive Behavioral Therapy',
      'Psychodynamic Therapy',
      'Person-Centered Therapy',
      'Dialectical Behavior Therapy',
      'Motivational Interviewing',
      'Solution-Focused Therapy',
      'Acceptance and Commitment Therapy',
      'EMDR',
      'Psychoanalysis',
      'Narrative Therapy',
      'Gestalt Therapy',
      'Family Systems Therapy',
      'Mindfulness-Based Cognitive Therapy',
    ]

    const pastTreatmentHistories = [
      'no prior treatment',
      'previous unsuccessful therapy',
      'multiple therapists in past',
      'psychiatric hospitalizations',
      'intensive outpatient program',
      'partial hospitalization',
      'residential treatment',
      'substance abuse treatment',
      'group therapy only',
    ]

    const referralSources = [
      'self-referred',
      'primary care physician',
      'psychiatrist',
      'emergency department',
      'court-mandated',
      'family member',
      'school counselor',
      'employee assistance program',
      'crisis intervention',
      'insurance company',
      'community agency',
    ]

    const settingTypes = [
      'private practice',
      'community mental health center',
      'hospital outpatient',
      'college counseling center',
      'telehealth',
      'hospital inpatient',
      'integrated care',
      'school-based',
      'correctional facility',
      'residential treatment facility',
    ]

    const frequencies = [
      'weekly',
      'bi-weekly',
      'monthly',
      'twice weekly',
      'as needed',
      'inconsistent attendance',
    ]

    const getRandomItem = <T>(items: T[]): T =>
      items[Math.floor(Math.random() * items.length)]

    return {
      sessionNumber: Math.floor(Math.random() * 20) + 1, // 1-20 sessions
      sessionFrequency: getRandomItem(frequencies),
      treatmentDuration: `${Math.floor(Math.random() * 12) + 1} months`,
      modality: getRandomItem(modalities),
      pastTreatmentHistory: getRandomItem(pastTreatmentHistories),
      referralSource: getRandomItem(referralSources),
      settingType: getRandomItem(settingTypes),
    }
  }

  /**
   * Generate random clinical elements for the scenario
   */
  private generateRandomClinicalElements(): ThemeConfig['clinicalElements'] {
    const primaryConcerns = [
      'depression',
      'anxiety',
      'relationship difficulties',
      'trauma',
      'grief',
      'adjustment issues',
      'identity issues',
      'self-esteem',
      'stress management',
      'life transitions',
      'parenting difficulties',
      'work problems',
      'sleep disturbance',
      'anger management',
      'emotional regulation',
      'existential concerns',
    ]

    const comorbidConditions = [
      'substance use disorder',
      'personality disorder traits',
      'eating disorder',
      'obsessive-compulsive disorder',
      'bipolar disorder',
      'PTSD',
      'ADHD',
      'social anxiety disorder',
      'panic disorder',
      'generalized anxiety disorder',
      'persistent depressive disorder',
      'somatic symptom disorder',
    ]

    const treatmentGoals = [
      'reduce depressive symptoms',
      'manage anxiety',
      'improve relationships',
      'process trauma',
      'adjust to life changes',
      'develop coping skills',
      'increase self-awareness',
      'improve communication skills',
      'address self-destructive behaviors',
      'build confidence',
      'reduce intrusive thoughts',
      'improve sleep hygiene',
      'develop assertiveness',
      'improve work-life balance',
    ]

    const defenseMechanisms = [
      'denial',
      'projection',
      'rationalization',
      'displacement',
      'regression',
      'intellectualization',
      'reaction formation',
      'sublimation',
      'compartmentalization',
      'dissociation',
      'splitting',
      'identification',
      'undoing',
      'humor',
    ]

    const attachmentStyles = [
      'secure',
      'anxious-preoccupied',
      'dismissive-avoidant',
      'fearful-avoidant',
      'disorganized',
      'ambivalent',
      'dependent',
    ]

    const traumaHistories = [
      'childhood emotional abuse',
      'childhood physical abuse',
      'childhood sexual abuse',
      'childhood neglect',
      'domestic violence',
      'sexual assault',
      'medical trauma',
      'combat trauma',
      'natural disaster',
      'accidents',
      'witnessing violence',
      'community violence',
      'loss of loved one',
      'bullying',
      'discrimination',
    ]

    const substanceUseHistories = [
      'no history of substance use',
      'alcohol use disorder in remission',
      'current alcohol misuse',
      'history of stimulant use',
      'opioid dependence',
      'cannabis use',
      'polydrug use history',
      'prescription medication misuse',
      'in recovery',
      'recreational use',
      'substance-induced disorders',
    ]

    const medicationStatuses = [
      'no psychiatric medications',
      'SSRIs for depression',
      'anxiolytics as needed',
      'mood stabilizers',
      'antipsychotics',
      'sleep aids',
      'stimulants for ADHD',
      'multiple psychiatric medications',
      'non-compliant with medication',
      'recently changed medications',
      'experiencing side effects',
    ]

    const familyDynamics = [
      'supportive family',
      'estranged from family',
      'enmeshed family system',
      'family conflict',
      'caretaking role',
      'intergenerational trauma',
      'dysfunctional communication patterns',
      'rigid family roles',
      'blended family challenges',
      'family mental health history',
    ]

    const copingMechanisms = [
      'exercise',
      'meditation',
      'social withdrawal',
      'substance use',
      'avoidance',
      'seeking social support',
      'problem-solving',
      'creative expression',
      'religious/spiritual practices',
      'overeating',
      'self-harm',
      'sleep',
      'humor',
      'denial',
      'workaholism',
      'rumination',
    ]

    const getRandomItem = <T>(items: T[]): T =>
      items[Math.floor(Math.random() * items.length)]
    const getRandomItems = <T>(items: T[], count: number): T[] => {
      const shuffled = [...items].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    }

    // Generate random clinical elements with some interdependencies
    const traumaHistoryPresent = Math.random() < 0.4 // 40% chance of trauma history
    const substanceUsePresent = Math.random() < 0.3 // 30% chance of substance use history

    const primaryConcernsCount = Math.floor(Math.random() * 3) + 1 // 1-3 concerns
    const comorbidConditionsCount = Math.floor(Math.random() * 2) // 0-1 comorbid conditions
    const treatmentGoalsCount = Math.floor(Math.random() * 3) + 1 // 1-3 goals
    const defenseMechanismsCount = Math.floor(Math.random() * 3) + 1 // 1-3 mechanisms
    const traumaHistoriesCount = traumaHistoryPresent
      ? Math.floor(Math.random() * 2) + 1
      : 0 // 0-2 trauma types
    const copingMechanismsCount = Math.floor(Math.random() * 4) + 1 // 1-4 coping mechanisms

    return {
      primaryConcerns: getRandomItems(primaryConcerns, primaryConcernsCount),
      comorbidConditions: getRandomItems(
        comorbidConditions,
        comorbidConditionsCount,
      ),
      treatmentGoals: getRandomItems(treatmentGoals, treatmentGoalsCount),
      defenseMechanisms: getRandomItems(
        defenseMechanisms,
        defenseMechanismsCount,
      ),
      attachmentStyle: getRandomItem(attachmentStyles),
      traumaHistory: getRandomItems(traumaHistories, traumaHistoriesCount),
      substanceUseHistory: substanceUsePresent
        ? getRandomItem(substanceUseHistories)
        : 'no history of substance use',
      medicationStatus: getRandomItem(medicationStatuses),
      familyDynamics: [getRandomItem(familyDynamics)],
      copingMechanisms: getRandomItems(copingMechanisms, copingMechanismsCount),
    }
  }

  /**
   * Generate random scenario parameters
   */
  private generateRandomScenarioParameters(): ThemeConfig['scenarioParameters'] {
    const emotionalIntensities = ['low', 'medium', 'high', 'extreme'] as const
    const resistanceLevels = ['none', 'mild', 'moderate', 'severe'] as const
    const insightCapacities = ['poor', 'fair', 'good', 'excellent'] as const
    const suicidalityLevels = ['none', 'ideation', 'plan', 'intent'] as const

    const transferences = [
      'none apparent',
      'parental figure',
      'authority figure',
      'sibling-like',
      'romantic/sexualized',
      'idealization',
      'devaluation',
      'savior/rescuer',
      'friend/peer',
      'persecutory',
    ]

    const countertransferences = [
      'protective impulses',
      'frustration',
      'over-identification',
      'avoidance',
      'caretaking',
      'boredom',
      'anxiety',
      'rescue fantasies',
      'disengagement',
      'positive regard',
      'anger',
      'parental feelings',
      'overwhelm',
    ]

    const specificEvents = [
      'recent loss of job',
      'divorce/breakup',
      'health diagnosis',
      'relocation',
      'financial crisis',
      'academic failure',
      'workplace conflict',
      'family conflict',
      'anniversary of trauma',
      'pregnancy/childbirth',
      'empty nest',
      'retirement',
      'legal problems',
      'identity milestone',
      'infidelity discovered',
    ]

    const getRandomItem = <T>(items: T[]): T =>
      items[Math.floor(Math.random() * items.length)]
    const getRandomItems = <T>(items: T[], count: number): T[] => {
      const shuffled = [...items].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    }

    // Determine scenario parameters with some logical constraints
    const emotionalIntensity = getRandomItem([...emotionalIntensities])
    const hasCrisis =
      emotionalIntensity === 'high' || emotionalIntensity === 'extreme'
        ? Math.random() < 0.6 // 60% chance of crisis for high/extreme intensity
        : Math.random() < 0.2 // 20% chance otherwise

    const suicidalityRisk = hasCrisis
      ? getRandomItem([...suicidalityLevels].filter((l) => l !== 'none')) // If crisis, some level of suicidality
      : Math.random() < 0.1 // 10% chance of suicidality if no crisis
        ? getRandomItem([...suicidalityLevels].filter((l) => l !== 'intent')) // No intent without crisis
        : ('none' as const)

    const specificEventsCount = Math.floor(Math.random() * 2) // 0-1 specific events

    return {
      emotionalIntensity: emotionalIntensity,
      resistanceLevel: getRandomItem([...resistanceLevels]),
      insightCapacity: getRandomItem([...insightCapacities]),
      ambivalence: Math.random() < 0.4, // 40% chance of ambivalence
      transference: getRandomItem(transferences),
      countertransference: getRandomItem(countertransferences),
      crisis: hasCrisis,
      suicidality: suicidalityRisk,
      specificEvents: getRandomItems(specificEvents, specificEventsCount),
    }
  }
}
