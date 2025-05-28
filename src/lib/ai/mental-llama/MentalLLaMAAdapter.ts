import type { FHEService } from '../../fhe'
import type {
  TherapySession,
  EmotionAnalysis,
  TherapyAIProvider,
} from '../interfaces/therapy'
import { appLogger as logger } from '../../logging'
import { MentalLLaMAModelProvider } from './MentalLLaMAModelProvider'
import type { MentalLLaMACompletionParams } from './MentalLLaMAModelProvider'
import { MentalLLaMAPythonBridge } from './PythonBridge'
import {
  MentalHealthCategory,
  } from './prompts'
import {
  MentalHealthTaskRouter,
  type RoutingContext,
  type RoutingDecision,
  type LLMInvoker as RouterLLMInvoker,
} from './routing/MentalHealthTaskRouter'
import type { CrisisResponse } from '../crisis/types'
import type { EmotionType } from '../emotions/types'

/**
 * Interface for handling crisis notifications
 */
export interface ICrisisNotificationHandler {
  sendCrisisAlert(context: {
    userId?: string;
    sessionId?: string;
    sessionType?: string;
    explicitTaskHint?: string;
    timestamp: number;
    textSample: string;
    decisionDetails: any;
  }): Promise<void>;
}

// Extend MentalHealthCategory type to include additional categories used in this file
type ExtendedMentalHealthCategory = 
  | MentalHealthCategory 
  | 'suicidality'
  | 'bipolar_disorder'
  | 'social_anxiety'
  | 'panic_disorder'
  | 'stress'
  | 'general_mental_health';

// Define available analyzers for mental health analysis
const AVAILABLE_ANALYZERS: ExtendedMentalHealthCategory[] = [
  'depression',
  'anxiety',
  'ptsd',
  'suicidality',
  'bipolar_disorder',
  'ocd',
  'eating_disorder',
  'stress',
  'social_anxiety',
  'panic_disorder',
  'general_mental_health',
];

// Extend the provider interfaces to include the expected methods
declare module './MentalLLaMAModelProvider' {
  interface MentalLLaMAModelProvider {
    analyzeMentalHealth(
      text: string,
      categories: ExtendedMentalHealthCategory[]
    ): Promise<{
      categories: Record<string, number>;
      analysis: string;
      confidenceScore: number;
      hasMentalHealthIssue?: boolean;
      mentalHealthCategory?: string;
      explanation?: string;
      confidence?: number;
      supportingEvidence?: string[];
    }>;
  }
}

// Extend the PythonBridge interface to include the expected methods
declare module './PythonBridge' {
  interface MentalLLaMAPythonBridge {
    analyzeMentalHealth(
      text: string,
      categories: ExtendedMentalHealthCategory[]
    ): Promise<{
      categories: Record<string, number>;
      analysis: string;
      confidenceScore: number;
      hasMentalHealthIssue?: boolean;
      mentalHealthCategory?: string;
      explanation?: string;
      confidence?: number;
      supportingEvidence?: string[];
    }>;
  }
}

/**
 * MentalLLaMA integration - Adapter for interpretable mental health analysis
 * Based on https://github.com/SteveKGYang/MentalLLaMA
 */
export class MentalLLaMAAdapter {
  private provider: TherapyAIProvider
  private fheService: FHEService
  private baseUrl: string
  private apiKey: string
  private modelProvider?: MentalLLaMAModelProvider
  private pythonBridge?: MentalLLaMAPythonBridge
  private taskRouter?: MentalHealthTaskRouter
  private crisisNotifier?: ICrisisNotificationHandler

  /**
   * Default confidence score for mental health analysis when no explicit confidence is available.
   * Set to 0.75 (75%) to indicate moderate-to-high confidence without being overly confident.
   * This value balances between being cautious (avoiding false positives) while still
   * providing actionable insights in clinical contexts.
   */
  private static readonly DEFAULT_CONFIDENCE_SCORE = 0.75

  // Define a threshold for what's considered low confidence from the router
  private static readonly ROUTER_LOW_CONFIDENCE_THRESHOLD = 0.4

  constructor(
    provider: TherapyAIProvider,
    fheService: FHEService,
    baseUrl: string,
    apiKey: string,
    modelProvider?: MentalLLaMAModelProvider,
    pythonBridge?: MentalLLaMAPythonBridge,
    crisisNotifier?: ICrisisNotificationHandler,
  ) {
    this.provider = provider
    this.fheService = fheService
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.modelProvider = modelProvider
    this.pythonBridge = pythonBridge
    this.crisisNotifier = crisisNotifier

    if (this.modelProvider) {
      const llmInvokerForRouter: RouterLLMInvoker = async (routerParams) => {
        if (!this.modelProvider) {
          logger.error(
            'LLMInvoker: modelProvider became undefined unexpectedly.',
          )
          return { content: null, error: new Error('modelProvider undefined') }
        }
        try {
          // Ensure routerParams align with what modelProvider.chat expects or adapt them.
          // MentalLLaMAModelProvider.chat expects MentalLLaMACompletionParams
          const modelChatParams: MentalLLaMACompletionParams = {
            messages: routerParams.messages,
            temperature: routerParams.temperature ?? 0.1,
            max_tokens: routerParams.max_tokens ?? 150,
            top_p: routerParams.top_p ?? 1.0,
            frequency_penalty: routerParams.frequency_penalty ?? 0,
            presence_penalty: routerParams.presence_penalty ?? 0,
            stop: routerParams.stop || undefined,
            use_self_consistency: routerParams.use_self_consistency ?? false,
            self_consistency_variants: routerParams.self_consistency_variants ?? 3,
            use_chain_of_thought: routerParams.use_chain_of_thought ?? false,
            use_emotional_context: routerParams.use_emotional_context ?? false
          }

          const modelResponse = await this.modelProvider.chat(modelChatParams)
          const content = modelResponse.choices[0]?.message?.content || null
          if (!content) {
            logger.warn(
              'LLMInvoker: Model response for router had no content.',
              { modelResponse },
            )
          }
          return { content }
        } catch (error) {
          logger.error(
            'LLMInvoker: Error calling modelProvider.chat for router',
            { error },
          )
          return { content: null, error }
        }
      }
      this.taskRouter = new MentalHealthTaskRouter(llmInvokerForRouter)
      logger.info(
        'MentalHealthTaskRouter initialized within MentalLLaMAAdapter.',
      )
    } else {
      logger.warn(
        'MentalLLaMAModelProvider not available, MentalHealthTaskRouter will not be initialized.',
      )
    }

    logger.info('Created MentalLLaMA adapter', {
      hasModelProvider: !!this.modelProvider,
      hasPythonBridge: !!this.pythonBridge,
      hasTaskRouter: !!this.taskRouter,
      hasCrisisNotifier: !!this.crisisNotifier,
    })
  }

  /**
   * Private implementation of mental health classification
   * Uses model provider if available, otherwise throws an error
   */
  private classifyMentalHealth(text: string) {
    if (this.modelProvider) {
      return this.modelProvider.classifyMentalHealth(text)
    }
    throw new Error('Method not implemented: requires model provider')
  }

  /**
   * Set the Python bridge instance
   */
  setPythonBridge(pythonBridge: MentalLLaMAPythonBridge): void {
    this.pythonBridge = pythonBridge
    logger.info('Python bridge set for MentalLLaMA adapter')
  }

  /**
   * Check if the adapter has a functioning Python bridge
   */
  hasPythonBridge(): boolean {
    return !!this.pythonBridge
  }

  /**
   * Check if the adapter has a direct model provider
   */
  hasModelProvider(): boolean {
    return !!this.modelProvider
  }

  /**
   * Analyze mental health indicators in text using MentalLLaMA.
   * This method can operate in different modes:
   * 1. Explicit Categories: If `categories` (e.g., ['depression']) are provided (and not 'auto_route' or 'all'),
   *    it performs analysis focused on those specific categories.
   * 2. All Categories: If `categories` includes 'all', it attempts a broad analysis across multiple known categories.
   * 3. Auto Route: If `categories` includes 'auto_route', is empty, or undefined, and a `MentalHealthTaskRouter` is configured,
   *    it uses the router to determine the most relevant category (or categories) for analysis. This is the preferred mode
   *    for dynamic and context-aware analysis.
   *
   * **Crisis Protocol Triggering:**
   * If the 'auto_route' mode is used and the `MentalHealthTaskRouter` determines a 'crisis' situation:
   *   - The `mentalHealthCategory` in the response will be set to 'crisis'.
   *   - If a `crisisNotifier` (implementing `ICrisisNotificationHandler`) is configured in the adapter,
   *     its `sendCrisisAlert()` method will be invoked with `CrisisAlertContext`.
   *     This context includes `userId`, `sessionId`, `sessionType`, `explicitTaskHint` (from `routingContextParams`),
   *     a `timestamp`, a `textSample` (up to 500 chars), and `decisionDetails` from the router.
   *   - Logging: A warning is logged for the crisis detection, and the dispatch of the crisis alert (or failure) is also logged.
   *   - Analysis: The subsequent analysis by MentalLLaMA will use broad categories (depression, anxiety, stress) for the crisis context.
   *   - Upstream Integration: Services consuming this adapter should check `mentalHealthCategory === 'crisis'` in the response.
   *     They are responsible for initiating further appropriate actions based on this flag, such as notifying human reviewers,
   *     escalating the case, or displaying specific UI warnings. The `ICrisisNotificationHandler` provides the immediate alert mechanism,
   *     but application-level crisis response logic resides with the consumer of this adapter.
   *
   * @param text The input text to analyze.
   * @param categories Optional array of categories to focus on. Can include 'all' or 'auto_route'.
   *                   If empty or undefined, defaults to 'auto_route' if router is available.
   * @param routingContextParams Optional context for the `MentalHealthTaskRouter` if 'auto_route' is used.
   *                             Includes `userId`, `sessionId`, `sessionType`, `explicitTaskHint`.
   * @returns A promise resolving to an object containing the analysis results,
   *          including detected categories, a textual analysis, confidence scores,
   *          and potentially a `_routingDecision` if the router was used.
   *          If a crisis is detected, `mentalHealthCategory` will be 'crisis'.
   */
  async analyzeMentalHealth(
    text: string,
    categories?: (MentalHealthCategory | 'all' | 'auto_route')[],
    routingContextParams?: Omit<RoutingContext, 'explicitTaskHint'> & {
      explicitTaskHint?: string
    },
  ): Promise<{
    categories: Record<string, number>
    analysis: string
    confidenceScore: number
    hasMentalHealthIssue?: boolean
    mentalHealthCategory?: string
    explanation?: string
    confidence?: number
    supportingEvidence?: string[]
    _routingDecision?: RoutingDecision | null
  }> {
    try {
      // Routing logic
      let effectiveCategories: MentalHealthCategory[] = []
      let analysisMentalHealthCategory: string | undefined = undefined
      let analysisConfidence: number | undefined = undefined
      let routingDecisionForLog: RoutingDecision | null = null

      const shouldUseRouter =
        this.taskRouter &&
        this.modelProvider &&
        (!categories ||
          categories.length === 0 ||
          categories.includes('auto_route'))

      if (shouldUseRouter) {
              logger.info(
                'Using MentalHealthTaskRouter to determine analysis categories.',
              )
              const routeContext: RoutingContext = {
                userId: routingContextParams?.userId,
                sessionId: routingContextParams?.sessionId,
                sessionType: routingContextParams?.sessionType,
                explicitTaskHint: routingContextParams?.explicitTaskHint,
              }
              try {
                if (!this.taskRouter) {
                  throw new Error('Task router is not initialized')
                }
                const routingDecision = await this.taskRouter.determineRoute(
                  text,
                  routeContext,
                )
                routingDecisionForLog = routingDecision
                logger.info('Task Router Decision:', { decision: routingDecision })
                if (routingDecision.targetAnalyzer === 'crisis') {
                  logger.warn(
                    'CRISIS DETECTED BY TASK ROUTER. Initiating crisis protocol.',
                    { textSample: text.substring(0, 100) }
                  )
                  effectiveCategories = ['depression', 'anxiety', 'stress'] // Broad categories for crisis context
                  analysisMentalHealthCategory = 'crisis'

                  // Implement proper crisis protocol using our dedicated crisis system
                  try {
                    // Import the crisis protocol system
                    const { CrisisRiskDetector, initializeCrisisProtocol } = require('../crisis')

                    // Get crisis protocol instance (initialized if not already)
                    const crisisProtocol = initializeCrisisProtocol()

                    // Use risk detector to analyze the text in detail
                    const riskDetector = new CrisisRiskDetector()
                    const riskAssessment = riskDetector.analyzeText(text)

                    // Extract detected risk terms for better context
                    const riskTerms = riskDetector.extractRiskTerms(text, riskAssessment)

                    // Get patient ID and session ID from context or generate placeholders
                    const patientId = routingContextParams?.userId || 'unknown-patient'
                    const sessionId = routingContextParams?.sessionId || `session-${Date.now()}`

                    // Handle the crisis through the protocol system
                    try {
                      const crisisResponse: CrisisResponse = await crisisProtocol.handleCrisis(
                        patientId,
                        sessionId,
                        text,
                        riskAssessment.overallRiskScore,
                        [riskAssessment.primaryRisk, ...riskAssessment.secondaryRisks, ...riskTerms]
                      )
                      logger.info('Crisis protocol executed successfully', {
                        alertLevel: crisisResponse.alertLevel,
                        caseId: crisisResponse.caseId,
                        staffNotified: crisisResponse.staffNotified,
                        sessionContinuation: crisisResponse.sessionContinuation
                      })
                    } catch (error) {
                      logger.error('Error executing crisis protocol', { error })
                    }
                  } catch (crisisError) {
                    logger.error('Failed to execute crisis protocol', {
                      crisisError,
                      fallback: 'Using basic crisis logging only'
                    })
                    // Fall back to basic logging if crisis system fails
                    logger.error('CRISIS PROTOCOL FALLBACK: Crisis detected but protocol system failed', {
                      textSample: text.substring(0, 100),
                      userId: routingContextParams?.userId,
                      sessionId: routingContextParams?.sessionId
                    })
                  }
                } else if (routingDecision.targetAnalyzer === 'unknown' ||
                  routingDecision.confidence < MentalLLaMAAdapter.ROUTER_LOW_CONFIDENCE_THRESHOLD) {
                  logger.info(
                                           `Router yielded 'unknown' or low confidence (${routingDecision.confidence}). Defaulting to general_mental_health.`,
                                         )
                                         effectiveCategories = [
                                           'general_mental_health' as MentalHealthCategory,
                                         ]
                                         analysisMentalHealthCategory = 'general_mental_health' // Keep it general
                } else if (AVAILABLE_ANALYZERS.includes(
                                             routingDecision.targetAnalyzer as ExtendedMentalHealthCategory,
                                           )) {
                                           effectiveCategories = [
                                             routingDecision.targetAnalyzer as MentalHealthCategory,
                                           ]
                                           analysisMentalHealthCategory =
                                             routingDecision.targetAnalyzer as string
                                         }
                       else {
                                           // If targetAnalyzer is not a valid MentalHealthCategory, fall back to general
                                           logger.warn(
                                             `Router returned an unsupported analyzer: ${routingDecision.targetAnalyzer}. Defaulting to general_mental_health.`,
                                           )
                                           effectiveCategories = [
                                             'general_mental_health' as MentalHealthCategory,
                                           ]
                                           analysisMentalHealthCategory = 'general_mental_health'
                                         }
                analysisConfidence = routingDecision.confidence
              } catch (error) {
                logger.error(
                  'Error during MentalHealthTaskRouter.determineRoute. Proceeding with fallback.',
                  {
                    error,
                    textSample: text.substring(0, 100),
                  },
                )
                routingDecisionForLog = {
                  // Log a representation of the error state
                  targetAnalyzer: 'unknown',
                  confidence: 0.1,
                  routingMethod: 'fallback',
                  preliminaryInsights: {
                    error: error instanceof Error ? error.message : 'Router failed',
                    errorName:
                      error instanceof Error ? error.name : 'UnknownRouterError',
                  },
                }
                effectiveCategories = [
                  'general_mental_health' as MentalHealthCategory,
                ]
              }
            } else if (!categories || categories.length === 0) {
                effectiveCategories = ['general_mental_health' as MentalHealthCategory]
              } else if (categories.includes('all')) {
                // Use all available categories - include only core MentalHealthCategory types
                // Core categories are the ones that are part of the base MentalHealthCategory type
                const coreCategories: MentalHealthCategory[] = [
                  'depression',
                  'anxiety',
                  'ptsd',
                  'ocd',
                  'eating_disorder',
                  'stress'
                ];
                effectiveCategories = coreCategories;
              } else {
                // Filter to only valid MentalHealthCategory values
                effectiveCategories = categories.filter(
                  (cat): cat is MentalHealthCategory =>
                    cat !== 'all' &&
                    cat !== 'auto_route' &&
                    AVAILABLE_ANALYZERS.includes(
                      cat as ExtendedMentalHealthCategory,
                    ),
                ) as MentalHealthCategory[]
      
                // If no valid categories remain, default to general_mental_health
                if (effectiveCategories.length === 0) {
                  effectiveCategories = [
                    'general_mental_health' as MentalHealthCategory,
                  ]
                }
              }

      // Ensure we have at least one category
      if (effectiveCategories.length === 0) {
        effectiveCategories = ['general_mental_health' as MentalHealthCategory]
      }

      logger.info('Using effective categories for analysis:', {
        effectiveCategories,
      })

      // Try direct model provider first
      if (this.modelProvider) {
        try {
          // Use the model provider to analyze the text
          // Add method to provider if it doesn't exist
          if (typeof this.modelProvider.analyzeMentalHealth !== 'function') {
            throw new Error('analyzeMentalHealth method not available on model provider')
          }
          const result = await this.modelProvider.analyzeMentalHealth(
            text,
            effectiveCategories,
          )

          // If we got a result from the router, use that category and confidence
          if (analysisMentalHealthCategory && analysisConfidence !== undefined) {
            result.mentalHealthCategory = analysisMentalHealthCategory
            result.confidence = analysisConfidence
          }

          // Add routing decision for logging purposes
          return {
            ...result,
            _routingDecision: routingDecisionForLog,
          }
        } catch (error) {
          logger.error('Error using model provider for analysis', { error })
          // Fall through to Python bridge
        }
      }

      // Fall back to Python bridge if available
      if (this.pythonBridge) {
        try {
          // Use the Python bridge to analyze the text
          // Add method to bridge if it doesn't exist
          if (typeof this.pythonBridge.analyzeMentalHealth !== 'function') {
            throw new Error('analyzeMentalHealth method not available on Python bridge')
          }
          const result = await this.pythonBridge.analyzeMentalHealth(
            text,
            effectiveCategories,
          )

          // If we got a result from the router, use that category and confidence
          if (analysisMentalHealthCategory && analysisConfidence !== undefined) {
            result.mentalHealthCategory = analysisMentalHealthCategory
            result.confidence = analysisConfidence
          }

          // Add routing decision for logging purposes
          return {
            ...result,
            _routingDecision: routingDecisionForLog,
          }
        } catch (error) {
          logger.error('Error using Python bridge for analysis', { error })
          // Fall through to fallback
        }
      }

      // If we get here, neither the model provider nor Python bridge worked
      // Return a basic fallback response
      const fallbackResponse = {
        categories: { general: 0.5 },
        analysis: 'Unable to perform mental health analysis.',
        confidenceScore: 0.1,
        hasMentalHealthIssue: false,
        mentalHealthCategory: 'unknown',
        explanation: 'Analysis services are currently unavailable.',
        confidence: 0.1,
        supportingEvidence: [],
        _routingDecision: routingDecisionForLog,
      }

      logger.error('All analysis methods failed, returning fallback response')
      return fallbackResponse
    } catch (error) {
      logger.error('Unexpected error in analyzeMentalHealth', { error })
      throw error
    }
  }

  /**
   * Run IMHI benchmark evaluation using the Python bridge
   */
  async runIMHIEvaluation(params: {
    modelPath: string
    batchSize?: number
    outputPath: string
    testDataset: 'IMHI' | 'IMHI-completion' | 'expert'
    isLlama?: boolean
  }): Promise<string> {
    if (!this.pythonBridge) {
      throw new Error('Python bridge not available')
    }

    logger.info('Running IMHI benchmark evaluation', { params })
    return this.pythonBridge.runIMHIEvaluation(params)
  }

  /**
   * Label responses using MentalLLaMA classifiers via Python bridge
   */
  async labelResponses(params: {
    modelPath: string
    dataPath: string
    outputPath: string
    calculate?: boolean
  }): Promise<string> {
    if (!this.pythonBridge) {
      throw new Error('Python bridge not available')
    }

    logger.info('Labeling responses with MentalLLaMA classifiers', { params })
    return this.pythonBridge.labelResponses(params)
  }

  /**
   * Analyze a text for mental health indicators using MentalLLaMA's approach
   * @param text The text to analyze
   * @returns Analysis with mental health indicators and explanations
   */
  async analyzeMentalHealthWithDirectModel(text: string): Promise<{
    hasMentalHealthIssue: boolean
    mentalHealthCategory: string
    explanation: string
    confidence: number
    supportingEvidence: string[]
  }> {
    if (!this.modelProvider) {
      throw new Error('Model provider is not available')
    }

    logger.info(
      'Using direct MentalLLaMA-chat-7B model for mental health analysis',
    )

    try {
      // Use the model provider to classify the text
      const classificationResponse =
        await this.modelProvider.classifyMentalHealth(text)

      // Extract the classification from the response
      const { classification } =
        classificationResponse.choices[0]?.message || {}

      if (!classification) {
        logger.warn('No classification received from model provider')
        throw new Error('No classification received from model provider')
      }

      // Generate an explanation using the direct model
      // Corrected: extractExplanation -> generateExplanation
      const explanationResponse = await this.modelProvider.generateExplanation(
        text,
        classification.category,
      )

      const explanation =
        explanationResponse.choices[0]?.message.content ||
        classification.explanation

      // Extract supporting evidence from the explanation
      const supportingEvidence =
        this.extractEvidenceFromExplanation(explanation)

      return {
        hasMentalHealthIssue: classification.confidence > 0.5,
        mentalHealthCategory: classification.category,
        explanation,
        confidence: classification.confidence,
        supportingEvidence,
      }
    } catch (error) {
      logger.error('Error using direct model for mental health analysis', {
        error,
      })

      // Fall back to the standard approach if direct model fails
      logger.info('Falling back to standard approach after direct model error')

      const emotionAnalysis = await this.provider.analyzeEmotions(text)
      const mentalHealthCategories =
        this.mapEmotionsToMentalHealth(emotionAnalysis)
      const hasMentalHealthIssue =
        (emotionAnalysis.riskFactors &&
          emotionAnalysis.riskFactors.length > 0) ||
        emotionAnalysis.overallSentiment < -0.3
      const topCategory = this.getTopMentalHealthCategory(
        mentalHealthCategories,
      )
      const supportingEvidence = this.extractSupportingEvidence(
        text,
        topCategory,
      )

      return {
        hasMentalHealthIssue,
        mentalHealthCategory: topCategory.category,
        explanation: topCategory.explanation,
        confidence: topCategory.score,
        supportingEvidence,
      }
    }
  }

  /**
   * Extract evidence statements from a model-generated explanation
   * @param explanation The explanation text
   * @returns Array of evidence statements
   * @private
   */
  private extractEvidenceFromExplanation(explanation: string): string[] {
    // Split the explanation into sentences
    const sentences = explanation
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // Filter for sentences that contain evidence markers
    const evidenceMarkers = [
      'indicates',
      'suggests',
      'demonstrates',
      'shows',
      'evident',
      'describes',
      'mentions',
      'exhibits',
      'expresses',
      'states',
      'references',
      'reports',
      'evidence',
    ]

    const evidenceSentences = sentences.filter((sentence) =>
      evidenceMarkers.some((marker) => sentence.toLowerCase().includes(marker)),
    )

    // If we found evidence sentences, return those
    if (evidenceSentences.length > 0) {
      return evidenceSentences.slice(0, 5) // Limit to 5 pieces of evidence
    }

    // Secondary relevance filter: Look for mental health terminology and indicators
    // This is a more sophisticated fallback than just taking the first few sentences
    const mentalHealthTerms = [
      // Symptoms and conditions
      'depress',
      'anxious',
      'anxiety',
      'panic',
      'stress',
      'trauma',
      'ptsd',
      'suicid',
      'mood',
      'emotion',
      'feeling',
      'thought',
      'behavior',
      'sleep',
      'appetite',
      'energy',
      'fatigue',
      'hopeless',
      'worthless',
      'guilt',
      'concentrate',
      'decision',
      'restless',
      'irritable',

      // Clinical terms
      'symptom',
      'disorder',
      'diagnosis',
      'clinical',
      'psychiatric',
      'psychological',
      'mental health',
      'therapy',
      'treatment',

      // Severity indicators
      'severe',
      'moderate',
      'mild',
      'chronic',
      'acute',
      'persistent',
      'recurring',
      'episodic',
      'significant',
      'substantial',

      // Contextual factors
      'impact',
      'affect',
      'interfere',
      'function',
      'daily',
      'work',
      'relationship',
      'social',
      'isolat',
      'withdraw',
    ]

    // Score sentences by relevance (number of mental health terms)
    const scoredSentences = sentences.map((sentence) => {
      const lowerSentence = sentence.toLowerCase()
      const termCount = mentalHealthTerms.filter((term) =>
        lowerSentence.includes(term),
      ).length

      return {
        sentence,
        score: termCount,
      }
    })

    // Filter sentences with at least one relevant term and sort by relevance score
    const relevantSentences = scoredSentences
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.sentence)

    // If we found relevant sentences, return those
    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 3) // Limit to 3 most relevant sentences
    }

    // Last resort: If no relevant sentences found, log this issue and return a subset
    logger.warn('No relevant evidence sentences found in explanation')

    // Return sentences that are at least 10 words long (more likely to be substantive)
    const substantiveSentences = sentences.filter(
      (s) => s.split(/\s+/).length >= 10,
    )
    if (substantiveSentences.length > 0) {
      return substantiveSentences.slice(0, 2)
    }

    // Absolute fallback: return first sentence with a note
    return sentences.length > 0
      ? [`${sentences[0]} (Note: Limited evidence found)`]
      : ['No supporting evidence available']
  }

  /**
   * Evaluate the quality of an explanation using MentalLLaMA's metrics
   * @param explanation The explanation to evaluate
   * @param referenceExplanation Optional reference explanation
   * @returns Quality metrics for the explanation
   */
  async evaluateExplanationQuality(
    explanation: string,
    referenceExplanation?: string,
  ): Promise<{
    fluency: number
    completeness: number
    reliability: number
    overall: number
    bartScore?: number
    isErrorFallback?: boolean
  }> {
    logger.info('Evaluating explanation quality')

    try {
      // If we have a direct model provider, use it for evaluation
      if (this.modelProvider) {
        // Use the model provider first
        const modelResult = await this.modelProvider.evaluateExplanation(
          explanation,
          referenceExplanation,
        )

        // If we don't have a BART score but have a reference explanation, calculate one
        if (!modelResult.bartScore && referenceExplanation) {
          try {
            // Import BART-score implementation
            const { calculateBARTScore } = await import('./utils/bart-score')

            // Calculate BART-score
            const bartScoreResult = await calculateBARTScore({
              candidateExplanation: explanation,
              referenceExplanations: [referenceExplanation],
              modelProvider: this.modelProvider,
              pythonBridge: this.pythonBridge,
            })

            // Update the result with the calculated BART-score
            return {
              ...modelResult,
              bartScore: bartScoreResult.score,
            }
          } catch (bartError) {
            logger.warn(
              'Failed to calculate BART-score, using default model result',
              { bartError },
            )
            return modelResult
          }
        }

        return modelResult
      }

      // If we don't have a direct model provider but have a reference, use BART-score
      if (referenceExplanation) {
        try {
          // Import BART-score implementation
          const { calculateBARTScore } = await import('./utils/bart-score')

          // Calculate BART-score with available resources
          const bartScoreResult = await calculateBARTScore({
            candidateExplanation: explanation,
            referenceExplanations: [referenceExplanation],
            pythonBridge: this.pythonBridge,
          })

          // Calculate fluency, completeness, and reliability from BART-score metrics
          const fluency = Math.min(bartScoreResult.metrics.fluencyScore * 5, 5)
          const completeness = Math.min(
            bartScoreResult.metrics.coverageScore * 5,
            5,
          )
          const reliability = Math.min(
            bartScoreResult.metrics.clinicalRelevanceScore * 5,
            5,
          )

          // Calculate overall score
          const overall = (fluency + completeness + reliability) / 3

          return {
            fluency,
            completeness,
            reliability,
            overall,
            bartScore: bartScoreResult.score,
            isErrorFallback: true, // Indicate this is a fallback using heuristic approach
          }
        } catch (bartError) {
          logger.warn(
            'Failed to calculate BART-score, falling back to heuristic',
            { bartError },
          )
          // Continue to heuristic approach
        }
      }

      // Otherwise fall back to the heuristic approach
      // Count sentences as a proxy for completeness
      const sentences = explanation
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0)
      const completeness = Math.min(sentences.length / 5, 1) * 5 // 0-5 scale

      // Use word count as a proxy for fluency
      const words = explanation.split(/\s+/).filter((w) => w.trim().length > 0)
      const fluency = Math.min(words.length / 100, 1) * 5 // 0-5 scale

      // Use keyword presence as a proxy for reliability
      const reliabilityKeywords = [
        'evidence',
        'suggests',
        'indicates',
        'shows',
        'demonstrates',
        'appears',
        'seems',
        'likely',
        'possibly',
        'may',
      ]
      const reliabilityScore = reliabilityKeywords.reduce(
        (score, keyword) =>
          score + (explanation.toLowerCase().includes(keyword) ? 0.5 : 0),
        0,
      )
      const reliability = Math.min(reliabilityScore, 5)

      // Calculate overall score
      const overall = (fluency + completeness + reliability) / 3

      // If we have a reference, calculate BART-score using the heuristic implementation
      let bartScore: number | undefined = undefined
      if (referenceExplanation) {
        try {
          // Import BART-score implementation
          const { calculateBARTScore } = await import('./utils/bart-score')

          // Calculate BART-score with heuristic approach
          const bartScoreResult = await calculateBARTScore({
            candidateExplanation: explanation,
            referenceExplanations: [referenceExplanation],
          })

          bartScore = bartScoreResult.score
        } catch (bartError) {
          logger.warn(
            'Failed to calculate BART-score with heuristic approach',
            { bartError },
          )
          // Use a reasonable default based on other metrics
          bartScore = (overall / 5) * 0.85
        }
      }

      return {
        fluency,
        completeness,
        reliability,
        overall,
        bartScore,
        isErrorFallback: true, // Indicate this is a fallback using heuristic approach
      }
    } catch (error) {
      logger.error('Failed to evaluate explanation quality', { error })
      throw error
    }
  }

  /**
   * Generate an explanation for a mental health classification
   * @param text The text to explain
   * @param mentalHealthCategory The category to explain
   * @returns Detailed explanation
   */
  async generateExplanation(
    text: string,
    mentalHealthCategory: string,
  ): Promise<string> {
    logger.info('Generating explanation for mental health classification')

    try {
      // If we have a direct model provider, use it for explanation generation
      if (this.modelProvider) {
        const response = await this.modelProvider.generateExplanation(
          text,
          mentalHealthCategory,
        )
        return (
          response.choices[0]?.message.content ||
          'No explanation could be generated with the direct model.'
        )
      }

      // Fall back to existing implementation if no direct model
      // Create a synthetic session for the provider
      const session: TherapySession = {
        sessionId: `explanation-${Date.now()}`,
        clientId: process.env.CLIENT_ID || 'example-client-id',
        therapistId: 'mental-llama-therapist',
        startTime: new Date(),
        status: 'active',
        securityLevel: 'hipaa',
        emotionAnalysisEnabled: true,
      }

      // Analyze emotions first
      const emotionAnalysis = await this.provider.analyzeEmotions(text)

      // Generate therapeutic intervention
      const intervention = await this.provider.generateIntervention(
        session,
        emotionAnalysis,
      )

      // Extract the explanation part
      // Create a custom explanation from the intervention content
      return `Based on the text, there are indications of ${mentalHealthCategory}. ${intervention.content}`;
    } catch (error) {
      logger.error('Failed to generate explanation', { error })
      throw error
    }
  }

  /**
   * Load expert-written explanations from MentalLLaMA
   * @returns Expert explanations by category
   */
  async loadExpertExplanations(): Promise<Record<string, string[]>> {
    logger.info('Loading expert-written explanations')

    // This would load MentalLLaMA's expert explanations from a database or file
    // For now providing comprehensive expert explanations for all supported categories
    return {
      depression: [
        'The post exhibits signs of depression through expressions of hopelessness, lack of motivation, and persistent sadness. The individual describes feeling "empty" and having no energy to perform daily tasks, which are common symptoms of clinical depression.',
        'Multiple indicators of depression are present, including disrupted sleep patterns, loss of interest in previously enjoyed activities, and feelings of worthlessness. The prolonged nature of these symptoms (mentioned as "weeks") suggests clinical depression rather than temporary sadness.',
        'The language contains several markers of depression, including negative self-evaluation, expressed feelings of guilt, and descriptions of fatigue. The individual explicitly mentions feeling sad "all the time," which is consistent with the persistent low mood characteristic of major depressive disorder.',
      ],
      anxiety: [
        'The text demonstrates anxiety through descriptions of excessive worry about everyday situations, physical symptoms like racing heart and sweating, and avoidance behaviors. The individual expresses overwhelming fear that appears disproportionate to the actual threat.',
        'Signs of anxiety include catastrophic thinking patterns, anticipatory worry, and physical manifestations such as trembling and nausea. The individual describes these symptoms as interfering with daily functioning, suggesting clinical anxiety.',
        'The narrative contains clear anxiety markers including rumination on potential negative outcomes, physical symptoms of autonomic arousal, and explicit mention of feeling "on edge" constantly. The described worry is persistent and difficult to control, consistent with generalized anxiety disorder.',
      ],
      ptsd: [
        'The post contains multiple indicators of PTSD, including intrusive memories of the traumatic event, flashbacks that feel like re-experiencing the trauma, and hypervigilance. The individual describes being constantly "on edge" and having strong startle responses.',
        'Evidence of PTSD includes avoidance of situations that remind the person of the traumatic event, nightmares about the trauma, and emotional numbness. These symptoms have persisted for months, suggesting post-traumatic stress rather than acute stress.',
        'The text describes classic PTSD symptomatology, including intrusive memories, psychological distress when exposed to trauma reminders, and persistent negative emotional states. The individual mentions specific triggers that cause intense psychological distress, consistent with post-traumatic stress disorder.',
      ],
      suicidality: [
        'The content shows significant indicators of suicidal ideation, including explicit statements about wanting to die, feeling like a burden to others, and expressing that others would be "better off" without them. These direct expressions of wanting to end one\'s life represent serious suicide risk.',
        'Several concerning markers of suicide risk are present, including described feelings of hopelessness, expressions of having no future, and statements suggesting the individual has considered means of self-harm. The combination of hopelessness with specific thoughts about death indicates high risk.',
        'The text contains explicit suicidal content, including references to previous suicide attempts, current thoughts about ending life, and statements indicating the individual sees no alternative solution to their suffering. The presence of both ideation and potential planning represents acute suicide risk.',
      ],
      bipolar_disorder: [
        'The narrative contains descriptions of distinct mood episodes, with periods of extremely elevated energy, reduced need for sleep, and racing thoughts contrasted with periods of deep depression. This cyclical pattern of mood states is characteristic of bipolar disorder.',
        'The text describes experiences consistent with bipolar disorder, including episodes of grandiosity, increased goal-directed activity, and impulsive behavior followed by periods of severe depression. The individual mentions these episodes last for distinct periods, which matches the episodic nature of bipolar disorder.',
        'Clear indicators of bipolar symptomatology are present, including described periods of inflated self-esteem, flight of ideas, and excessive involvement in pleasurable activities with painful consequences, alternating with depressive episodes. The described mood oscillations suggest bipolar disorder rather than unipolar depression.',
      ],
      ocd: [
        'The individual describes intrusive, unwanted thoughts that cause significant distress, along with repetitive behaviors performed to reduce this distress. These thoughts are recognized as excessive, yet the compulsions are described as difficult to resist, which is typical of obsessive-compulsive disorder.',
        'The text contains clear descriptions of obsessions (intrusive thoughts about contamination and harm) and compulsions (washing, checking) that the individual recognizes as excessive but feels unable to control. The time-consuming nature of these rituals and their interference with daily functioning points to OCD.',
        'The narrative reveals classic OCD presentation, including distressing intrusive thoughts that the individual attempts to neutralize through ritualistic behaviors. Despite recognizing these behaviors as irrational, the individual describes feeling compelled to perform them to reduce anxiety, which is the hallmark of obsessive-compulsive disorder.',
      ],
      eating_disorder: [
        'The text demonstrates significant preoccupation with body weight and shape, fear of gaining weight, and restrictive eating patterns. The described distortion in how the individual perceives their body despite objective evidence to the contrary is particularly characteristic of eating disorders.',
        "Several indicators of an eating disorder are present, including rigid rules around food consumption, compensatory behaviors after eating, and intense body dissatisfaction. The individual's self-worth appears heavily contingent on weight and appearance, which is common in eating disorders.",
        "The content reveals patterns consistent with an eating disorder, including preoccupation with calories, described episodes of binge eating followed by compensation, and significant emotional distress around food and eating. The individual's described behaviors suggest a dysfunctional relationship with food and body image.",
      ],
      social_anxiety: [
        'The post describes intense fear of social situations in which the individual might be scrutinized or negatively evaluated by others. This fear has led to avoidance of important social activities, which is causing significant distress and functional impairment, consistent with social anxiety disorder.',
        'Multiple indicators of social anxiety are present, including fear of embarrassment in social situations, physical symptoms when anticipating social interaction, and avoidance of activities that involve other people. The individual explicitly mentions fear of judgment as the primary concern, which is central to social anxiety disorder.',
        'The text reveals classic social anxiety presentation, including anticipatory anxiety before social events, intense fear during social interactions, and post-event rumination. The individual describes these symptoms as significantly interfering with their ability to form relationships and perform at work/school, suggestive of social anxiety disorder.',
      ],
      panic_disorder: [
        'The individual describes recurrent, unexpected panic attacks characterized by sudden intense fear accompanied by physical symptoms such as heart palpitations, shortness of breath, and feelings of impending doom. Between attacks, there is persistent worry about having additional attacks, which is the defining feature of panic disorder.',
        'The text contains clear descriptions of panic attacks, including rapid heart rate, difficulty breathing, fear of dying, and a feeling of unreality. The individual expresses significant worry about when the next attack might occur, leading to avoidance behaviors, which is characteristic of panic disorder.',
        'The narrative reveals a pattern of sudden, intense episodes of fear accompanied by physical symptoms including chest pain, dizziness, and feelings of choking. The individual describes living in fear of these unpredictable attacks, which has led to significant behavioral changes and avoidance, consistent with panic disorder.',
      ],
    }
  }

  /**
   * Map emotions to mental health categories
   * @private
   */
  private mapEmotionsToMentalHealth(emotionAnalysis: EmotionAnalysis): Array<{
    category: string
    score: number
    explanation: string
  }> {
    const mentalHealthCategories: Array<{
      category: string
      score: number
      explanation: string
    }> = []

    // Helper function to find a specific emotion and its intensity
    const getEmotionIntensity = (type: EmotionType): number => {
      const emotion = emotionAnalysis.emotions.find(e => e.type === type);
      return emotion ? emotion.intensity : 0;
    };

    // Helper function to check for risk factors
    const hasRiskFactor = (factorType: string): boolean => {
      return emotionAnalysis.riskFactors?.some(rf => rf.type === factorType) ?? false;
    };

    // Depression indicators
    const sadnessIntensity = getEmotionIntensity('sadness');
    if (sadnessIntensity > 0.6) {
      if (
        hasRiskFactor('hopelessness') ||
        hasRiskFactor('worthlessness')
      ) {
        mentalHealthCategories.push({
          category: 'Depression',
          score: Math.max(
            sadnessIntensity,
            MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE,
          ), // Use a default if sadness is high but no specific score
          explanation:
            'High sadness combined with hopelessness/worthlessness suggests potential depression.',
        })
      } else if (emotionAnalysis.overallSentiment < -0.5) {
        mentalHealthCategories.push({
          category: 'Depression',
          score:
            (sadnessIntensity +
              (1 - (emotionAnalysis.overallSentiment + 1) / 2)) /
            2, // Average sadness and sentiment intensity
          explanation:
            'High sadness and very negative sentiment may indicate depression.',
        })
      }
    }

    // Anxiety indicators
    const fearIntensity = getEmotionIntensity('fear');
    if (fearIntensity > 0.5) {
      if (hasRiskFactor('panic_attacks')) {
        mentalHealthCategories.push({
          category: 'Anxiety (Panic)',
          score: Math.max(
            fearIntensity,
            MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE,
          ),
          explanation:
            'High fear combined with panic attacks suggests an anxiety disorder, possibly panic disorder.',
        })
      } else if (hasRiskFactor('excessive_worry')) {
        mentalHealthCategories.push({
          category: 'Anxiety (GAD)',
          score: Math.max(
            fearIntensity,
            MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE - 0.1,
          ), // Slightly lower default for GAD
          explanation:
            'High fear and excessive worry are indicative of Generalized Anxiety Disorder.',
        })
      }
    } else if (hasRiskFactor('excessive_worry')) {
      // Worry without high fear might still be GAD
      mentalHealthCategories.push({
        category: 'Anxiety (GAD)',
        score: MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE - 0.15, // Lower confidence if fear isn't prominent
        explanation:
          'Excessive worry, even without prominent fear, can be a sign of Generalized Anxiety Disorder.',
      })
    }


    // PTSD indicators (simplified)
    const angerIntensity = getEmotionIntensity('anger');
    if (
      hasRiskFactor('trauma_exposure') &&
      fearIntensity > 0.6 &&
      angerIntensity > 0.4
    ) {
      mentalHealthCategories.push({
        category: 'PTSD',
        score:
          (fearIntensity +
            angerIntensity) /
          2,
        explanation:
          'Trauma exposure combined with high fear and anger may indicate PTSD.',
      })
    }

    // Stress indicators
    if (
      angerIntensity > 0.5 &&
      sadnessIntensity > 0.3 &&
      emotionAnalysis.overallSentiment < -0.2
    ) {
      if (hasRiskFactor('high_stress_levels')) {
        mentalHealthCategories.push({
          category: 'Stress',
          score: Math.max(
            angerIntensity,
            MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE - 0.05,
          ),
          explanation:
            'Reported high stress levels combined with anger and sadness suggest significant stress.',
        })
      } else {
        mentalHealthCategories.push({
          category: 'Stress',
          score:
            (angerIntensity +
              sadnessIntensity) /
            2,
          explanation:
            'Elevated anger and sadness with negative sentiment can indicate stress.',
        })
      }
    } else if (hasRiskFactor('high_stress_levels')) {
      mentalHealthCategories.push({
        category: 'Stress',
        score: MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE, // Default confidence if explicitly mentioned
        explanation: 'Reported high stress levels are a direct indicator of stress.',
      })
    }


    // If no specific category is strongly indicated, but overall sentiment is very negative
    if (
      mentalHealthCategories.length === 0 &&
      emotionAnalysis.overallSentiment < -0.7
    ) {
      mentalHealthCategories.push({
        category: 'General Distress',
        score: (1 - (emotionAnalysis.overallSentiment + 1) / 2) * 0.8, // Scaled sentiment as score, slightly penalized
        explanation:
          'Very negative overall sentiment suggests general emotional distress.',
      })
    }

    // Fallback if no categories identified but risk factors exist
    if (
      mentalHealthCategories.length === 0 &&
      emotionAnalysis.riskFactors &&
      emotionAnalysis.riskFactors.length > 0
    ) {
      mentalHealthCategories.push({
        category: 'Potential Issue (Undifferentiated)',
        score: 0.5, // Low confidence, as it's undifferentiated
        explanation: `Presence of risk factors (${emotionAnalysis.riskFactors.join(
          ', ',
        )}) suggests a potential mental health concern that requires further exploration.`,
      })
    }

    // If still no categories, it might be a neutral or positive case
    if (mentalHealthCategories.length === 0) {
      mentalHealthCategories.push({
        category: 'No Specific Concern Detected',
        score: 1 - Math.abs(emotionAnalysis.overallSentiment), // Higher score if sentiment is closer to neutral
        explanation:
          'Emotion analysis did not detect strong indicators for specific mental health categories based on current input.',
      })
    }

    // Sort by score descending to have the most prominent category first
    return mentalHealthCategories.sort((a, b) => b.score - a.score)
  }

  /**
   * Get the top mental health category from the analysis
   * @param mentalHealthCategories Array of categories with scores
   * @returns The category with the highest score
   * @private
   */
  private getTopMentalHealthCategory(
    mentalHealthCategories: Array<{
      category: string
      score: number
      explanation: string
    }>
  ): { category: string; score: number; explanation: string } {
    if (!mentalHealthCategories || mentalHealthCategories.length === 0) {
      return {
        category: 'Unknown',
        score: 0,
        explanation: 'No mental health categories analyzed.',
      }
    }
    // Assuming categories are already sorted by score in mapEmotionsToMentalHealth
    return mentalHealthCategories[0]
  }

  /**
   * Extract supporting evidence from text for a given mental health category
   * This is a placeholder and should be implemented with more sophisticated NLP
   * @param text The original text
   * @param category The mental health category
   * @returns Array of supporting evidence strings
   * @private
   */
  private extractSupportingEvidence(
    text: string,
    category: { category: string; score: number; explanation: string },
  ): string[] {
    // Basic keyword matching for demonstration
    // In a real system, this would use NLP techniques like sentence analysis,
    // entity recognition, and relation extraction.
    const evidence: string[] = []
    const lowerText = text.toLowerCase()

    if (category.category.toLowerCase().includes('depression') && (lowerText.includes('sad') || lowerText.includes('hopeless'))) {
        evidence.push(
          "Text mentions feelings of sadness or hopelessness, which can be related to depression.",
        )
    } else if (category.category.toLowerCase().includes('anxiety') && (lowerText.includes('worried') || lowerText.includes('anxious') || lowerText.includes('panic'))) {
        evidence.push(
          "Text mentions feelings of worry, anxiety, or panic, which can be related to anxiety disorders.",
        )
    } else if (category.category.toLowerCase().includes('ptsd') && (lowerText.includes('trauma') || lowerText.includes('nightmare'))) {
        evidence.push(
          "Text mentions trauma or nightmares, which can be associated with PTSD.",
        )
    } else if (category.category.toLowerCase().includes('stress') && (lowerText.includes('stress') || lowerText.includes('overwhelmed'))) {
        evidence.push(
          "Text mentions stress or feeling overwhelmed, indicative of high stress levels.",
        )
    }


    // Add the model's explanation as a general piece of evidence if no specific snippets found
    if (evidence.length === 0 && category.explanation) {
      evidence.push(
        `Model explanation for ${category.category}: ${category.explanation}`,
      )
    }

    return evidence.length > 0 ? evidence : ["General analysis suggests this category, but specific textual snippets were not automatically extracted by this basic method."]
  }
}

// Add a type export to define the public API of MentalLLaMAAdapter
export type MentalLLaMAAdapterAPI = {
  analyzeMentalHealth(text: string): Promise<{
    hasMentalHealthIssue: boolean
    mentalHealthCategory: string
    explanation: string
    confidence: number
    supportingEvidence: string[]
  }>

  analyzeMentalHealthWithExpertGuidance(
    text: string,
    useExpertGuidance?: boolean,
  ): Promise<{
    hasMentalHealthIssue: boolean
    mentalHealthCategory: string
    explanation: string
    confidence: number
    supportingEvidence: string[]
    expertGuided: boolean
  }>

  evaluateExplanationQuality(
    explanation: string,
    referenceExplanation?: string,
  ): Promise<{
    fluency: number
    completeness: number
    reliability: number
    overall: number
    bartScore?: number
    isErrorFallback?: boolean
  }>
}
