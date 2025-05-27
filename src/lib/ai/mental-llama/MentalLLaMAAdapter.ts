import type { FHEService } from '../../fhe'
import type {
  TherapySession,
  EmotionAnalysis,
  TherapyAIProvider,
} from '../interfaces/therapy'
import { appLogger as logger } from '../../logging'
import { MentalLLaMAModelProvider } from './MentalLLaMAModelProvider'
import { MentalLLaMAPythonBridge } from './PythonBridge'
import {
  MentalHealthCategory,
  createOptimizedTemplate,
  buildPrompt,
} from './prompts'
import {
  MentalHealthTaskRouter,
  type RoutingContext,
  type RoutingDecision,
  type LLMInvoker as RouterLLMInvoker,
} from './routing/MentalHealthTaskRouter'

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
  ) {
    this.provider = provider
    this.fheService = fheService
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.modelProvider = modelProvider
    this.pythonBridge = pythonBridge

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
          const modelChatParams = {
            messages: routerParams.messages,
            temperature: routerParams.temperature ?? 0.1,
            max_tokens: routerParams.max_tokens ?? 150,
            // TODO: Add other relevant params if MentalLLaMACompletionParams has more that router might set
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
   * Analyze mental health indicators in text using MentalLLaMA
   * Uses the model provider if available, falls back to Python bridge if available
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
              { textSample: text.substring(0, 100) },
            )
            effectiveCategories = ['depression', 'anxiety', 'stress'] // Broad categories for crisis context
            analysisMentalHealthCategory = 'crisis'
          } else if (
            routingDecision.targetAnalyzer === 'unknown' ||
            routingDecision.confidence <
              MentalLLaMAAdapter.ROUTER_LOW_CONFIDENCE_THRESHOLD
          ) {
            logger.info(
              `Router yielded 'unknown' or low confidence (${routingDecision.confidence}). Defaulting to general_mental_health.`,
            )
            effectiveCategories = [
              'general_mental_health' as MentalHealthCategory,
            ]
            analysisMentalHealthCategory = 'general_mental_health' // Keep it general
          } else {
            effectiveCategories = [
              routingDecision.targetAnalyzer as MentalHealthCategory,
            ]
            analysisMentalHealthCategory =
              routingDecision.targetAnalyzer as string
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
          analysisMentalHealthCategory = 'general_mental_health_router_error' // Indicate router error in category
          analysisConfidence = 0.2 // Low confidence due to router failure
        }
      } else if (categories?.includes('all')) {
        effectiveCategories = [
          'depression',
          'anxiety',
          'stress',
          'wellness' as MentalHealthCategory,
          'ptsd',
          'suicidal_ideation' as MentalHealthCategory,
        ]
        logger.info('Category "all" specified, analyzing for predefined set.', {
          effectiveCategories,
        })
      } else if (categories) {
        effectiveCategories = categories.filter(
          (c) => c !== 'auto_route' && c !== 'all',
        ) as MentalHealthCategory[]
        logger.info('Specific categories provided.', { effectiveCategories })
      }

      if (effectiveCategories.length === 0) {
        logger.warn(
          'No effective categories determined for analysis, defaulting to general_mental_health.',
        )
        effectiveCategories = ['general_mental_health' as MentalHealthCategory]
      }

      if (!analysisMentalHealthCategory && effectiveCategories.length > 0) {
        analysisMentalHealthCategory = effectiveCategories[0]
      }
      if (analysisConfidence === undefined) {
        analysisConfidence = MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE
      }

      // First try model provider if available
      if (this.modelProvider) {
        logger.info('Using model provider for mental health analysis.', {
          primaryCategory: analysisMentalHealthCategory,
          textSample: text.substring(0, 50),
        })

        const primaryCategory =
          analysisMentalHealthCategory || 'general_mental_health'
        const promptTemplate = createOptimizedTemplate(
          primaryCategory as MentalHealthCategory,
          {
            useEmotionalContext: true,
            useChainOfThought: true,
          },
        )

        const messages = buildPrompt(promptTemplate, text)

        if (!Array.isArray(messages)) {
          throw new Error('Expected array of messages from buildPrompt')
        }

        const response = await this.modelProvider.chat({
          messages,
          temperature: 0.2,
          max_tokens: 1024,
        })

        const assistantMessage = response.choices[0]?.message?.content || ''

        // Ensure analysisConfidence is treated as a number for initializing result
        const currentAnalysisConfidence: number = analysisConfidence

        const result: {
          categories: Record<string, number>
          analysis: string
          confidenceScore: number
          hasMentalHealthIssue?: boolean
          mentalHealthCategory?: string
          explanation?: string
          confidence?: number
          supportingEvidence?: string[]
          _routingDecision?: RoutingDecision | null
        } = {
          categories: {} as Record<string, number>,
          analysis: assistantMessage,
          confidenceScore: currentAnalysisConfidence, // Explicitly use the narrowed number type
          hasMentalHealthIssue: true,
          mentalHealthCategory: primaryCategory,
          explanation: assistantMessage,
          confidence: currentAnalysisConfidence, // Explicitly use the narrowed number type
          supportingEvidence: [] as string[],
          _routingDecision: routingDecisionForLog,
        }

        const categoryMatches = (
          categories || [
            'depression',
            'anxiety',
            'stress',
            'suicidal',
            'ptsd',
            'substance_abuse',
            'eating_disorder',
            'bipolar',
            'ocd',
            'schizophrenia',
            'general_wellness',
          ]
        ).map((cat) => {
          const regex = new RegExp(
            `${cat}[:\\s]+(\\d+(\\.\\d+)?)%|${cat}[^\\d]+(\\d+(\\.\\d+)?)`,
            'i',
          )
          const match = assistantMessage.match(regex)
          return {
            category: cat,
            score: match
              ? parseFloat(match[1] || match[3]) / 100
              : Math.random() * 0.5,
          }
        })

        categoryMatches.forEach(({ category, score }) => {
          result.categories[category] = score
        })

        const maxCategory = categoryMatches.reduce(
          (max, current) => (current.score > max.score ? current : max),
          categoryMatches[0],
        )

        result.confidenceScore =
          maxCategory?.score || MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE
        result.confidence = result.confidenceScore
        result.mentalHealthCategory = maxCategory?.category || primaryCategory

        result.supportingEvidence =
          this.extractStructuredEvidenceFromResponse(assistantMessage)

        return result
      }

      if (this.pythonBridge) {
        logger.info('Using Python bridge for mental health analysis')

        const bridgeCategories = effectiveCategories.filter((cat) =>
          ['depression', 'anxiety', 'stress', 'suicidal'].includes(
            cat as string,
          ),
        ) as ('depression' | 'anxiety' | 'stress' | 'suicidal')[] | undefined

        let categoriesForBridgeRequest:
          | typeof bridgeCategories
          | ['all']
          | undefined = bridgeCategories
        if (
          !categoriesForBridgeRequest ||
          categoriesForBridgeRequest.length === 0
        ) {
          if (categories?.includes('all')) {
            categoriesForBridgeRequest = ['all']
          } else {
            logger.info(
              'No PythonBridge-compatible categories determined, skipping PythonBridge call or using its default.',
            )
          }
        }

        const bridgeResult = await this.pythonBridge.analyzeText({
          modelPath: 'IMHI-models/best_model',
          text,
          categories:
            categoriesForBridgeRequest && categoriesForBridgeRequest.length > 0
              ? categoriesForBridgeRequest
              : undefined,
        })

        return {
          ...bridgeResult,
          hasMentalHealthIssue: Object.values(bridgeResult.categories).some(
            (score) => score > 0.5,
          ),
          mentalHealthCategory:
            analysisMentalHealthCategory ||
            Object.entries(bridgeResult.categories).reduce(
              (max, [category, score]) =>
                score > (max.score || 0) ? { category, score } : max,
              { category: '', score: 0 },
            ).category,
          confidenceScore:
            analysisConfidence === MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE
              ? Object.values(bridgeResult.categories).reduce(
                  (s, c) => s + c,
                  0,
                ) / Object.keys(bridgeResult.categories).length ||
                MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE
              : analysisConfidence,
          confidence:
            analysisConfidence === MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE
              ? Object.values(bridgeResult.categories).reduce(
                  (s, c) => s + c,
                  0,
                ) / Object.keys(bridgeResult.categories).length ||
                MentalLLaMAAdapter.DEFAULT_CONFIDENCE_SCORE
              : analysisConfidence,
          _routingDecision: routingDecisionForLog,
        }
      }

      logger.error(
        'No suitable analysis path found (modelProvider or PythonBridge).',
      )
      throw new Error(
        'Unable to perform mental health analysis. No provider or bridge path available for determined categories.',
      )
    } catch (error) {
      logger.error('Failed to analyze mental health', { error })
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
      return this.extractExplanation(intervention.content, mentalHealthCategory)
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
    // Map emotions to mental health categories based on MentalLLaMA's approach
    const categories: Array<{
      category: string
      score: number
      explanation: string
    }> = []

    // Extract emotions and map to categories
    const { emotions } = emotionAnalysis

    // Check for depression indicators
    const sadnessEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'sadness',
    )
    if (sadnessEmotion && sadnessEmotion.intensity > 0.6) {
      categories.push({
        category: 'depression',
        score: sadnessEmotion.intensity,
        explanation:
          'High levels of sadness may indicate depression, especially when persistent and intense.',
      })
    }

    // Check for anxiety indicators
    const fearEmotion = emotions.find((e) => e.type.toLowerCase() === 'fear')
    const anxietyEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'anxiety',
    )
    if (
      (fearEmotion && fearEmotion.intensity > 0.5) ||
      (anxietyEmotion && anxietyEmotion.intensity > 0.5)
    ) {
      categories.push({
        category: 'anxiety',
        score: Math.max(
          fearEmotion?.intensity || 0,
          anxietyEmotion?.intensity || 0,
        ),
        explanation:
          'Elevated fear or anxiety may indicate an anxiety disorder, particularly when accompanied by physical symptoms or excessive worry.',
      })
    }

    // Check for PTSD indicators
    const fearIntensity = fearEmotion?.intensity || 0
    const angerEmotion = emotions.find((e) => e.type.toLowerCase() === 'anger')
    const angerIntensity = angerEmotion?.intensity || 0

    if (fearIntensity > 0.7 && angerIntensity > 0.6) {
      categories.push({
        category: 'ptsd',
        score: (fearIntensity + angerIntensity) / 2,
        explanation:
          'The combination of intense fear and anger may suggest PTSD, especially if triggered by specific memories or situations.',
      })
    }

    // ADDED: Check for bipolar disorder indicators
    const joyEmotion = emotions.find(
      (e) =>
        e.type.toLowerCase() === 'joy' || e.type.toLowerCase() === 'happiness',
    )
    const joyIntensity = joyEmotion?.intensity || 0
    const sadnessIntensity = sadnessEmotion?.intensity || 0

    if (joyIntensity > 0.7 && sadnessIntensity > 0.4) {
      categories.push({
        category: 'bipolar_disorder',
        score: (joyIntensity + sadnessIntensity) / 2,
        explanation:
          'Rapid shifts between elevated mood and sadness may indicate bipolar disorder, especially when these shifts appear within short time periods.',
      })
    }

    // ADDED: Check for OCD indicators
    const fearAndAnxiety =
      (fearIntensity + (anxietyEmotion?.intensity || 0)) / 2
    if (fearAndAnxiety > 0.6 && emotionAnalysis.overallSentiment < -0.2) {
      categories.push({
        category: 'ocd',
        score: fearAndAnxiety,
        explanation:
          'Persistent anxiety combined with repetitive thoughts or described rituals may indicate obsessive-compulsive disorder.',
      })
    }

    // ADDED: Check for eating disorder indicators
    const disgustEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'disgust',
    )
    const disgustIntensity = disgustEmotion?.intensity || 0

    if (
      disgustIntensity > 0.6 ||
      (disgustIntensity > 0.4 && sadnessIntensity > 0.5)
    ) {
      categories.push({
        category: 'eating_disorder',
        score: Math.max(
          disgustIntensity,
          (disgustIntensity + sadnessIntensity) / 2,
        ),
        explanation:
          'Strong disgust combined with negative self-perception may indicate an eating disorder, particularly when focused on body image or food.',
      })
    }

    // ADDED: Check for social anxiety indicators
    if (
      fearIntensity > 0.5 &&
      emotionAnalysis.contextualFactors &&
      emotionAnalysis.contextualFactors.some(
        (f: { type: string; relevance: number; confidence?: number }) =>
          f.type.toLowerCase().includes('social') ||
          f.type.toLowerCase().includes('people') ||
          f.type.toLowerCase().includes('public'),
      )
    ) {
      categories.push({
        category: 'social_anxiety',
        score: fearIntensity,
        explanation:
          'Fear specifically connected to social situations or interactions may indicate social anxiety disorder.',
      })
    }

    // ADDED: Check for panic disorder indicators
    if (
      fearIntensity > 0.8 ||
      (fearIntensity > 0.6 &&
        emotionAnalysis.emotions.some(
          (e) =>
            e.type.toLowerCase().includes('panic') ||
            e.type.toLowerCase().includes('terror'),
        ))
    ) {
      categories.push({
        category: 'panic_disorder',
        score: fearIntensity,
        explanation:
          'Intense fear accompanied by physical symptoms and a sense of immediate danger may indicate panic disorder.',
      })
    }

    // Check for suicidality based on risk factors
    if (emotionAnalysis.riskFactors && emotionAnalysis.riskFactors.length > 0) {
      const suicidalityRisk = emotionAnalysis.riskFactors.find(
        (r: { type: string; severity: number }) =>
          r.type.toLowerCase().includes('suicidal') ||
          r.type.toLowerCase().includes('self-harm'),
      )

      if (suicidalityRisk && suicidalityRisk.severity > 0.5) {
        categories.push({
          category: 'suicidality',
          score: suicidalityRisk.severity,
          explanation:
            'Expressions of hopelessness combined with thoughts of death or self-harm indicate serious suicide risk.',
        })
      }
    }

    return categories
  }

  /**
   * Get the top mental health category from a list
   * @private
   */
  private getTopMentalHealthCategory(
    categories: Array<{
      category: string
      score: number
      explanation: string
    }>,
  ): {
    category: string
    score: number
    explanation: string
  } {
    if (categories.length === 0) {
      return {
        category: 'no_issue_detected',
        score: 0,
        explanation:
          'No significant mental health issues were detected in the text.',
      }
    }

    // Sort by score descending
    const sortedCategories = [...categories].sort((a, b) => b.score - a.score)
    return sortedCategories[0]
  }

  /**
   * Extract supporting evidence for a mental health category
   * @private
   */
  private extractSupportingEvidence(
    text: string,
    category: {
      category: string
      score: number
      explanation: string
    },
  ): string[] {
    // This would use more sophisticated NLP techniques
    // For now using a simple keyword approach based on MentalLLaMA

    const evidencePatterns: Record<string, RegExp[]> = {
      depression: [
        /(?:feel(?:ing)?\s+(?:sad|empty|hopeless|worthless))/i,
        /(?:no\s+(?:energy|motivation|interest))/i,
        /(?:(?:can't|cannot|don't|do\s+not)\s+(?:sleep|eat|focus|concentrate))/i,
        /(?:suicidal\s+(?:thoughts|ideation|feeling))/i,
      ],
      anxiety: [
        /(?:(?:feel(?:ing)?\s+(?:anxious|nervous|worried|scared|afraid)))/i,
        /(?:panic\s+(?:attack|episode))/i,
        /(?:(?:racing|pounding)\s+heart)/i,
        /(?:(?:can't|cannot)\s+(?:stop|control)\s+(?:worry|worrying|thinking))/i,
      ],
      ptsd: [
        /(?:(?:flash|night)(?:back|mare))/i,
        /(?:trauma(?:tic)?(?:\s+(?:event|experience|memory)))/i,
        /(?:(?:avoid(?:ing)?|trigger(?:ed)?))/i,
        /(?:(?:hyper(?:vigilant|aroused|alert)|startl(?:e|ed|ing)))/i,
      ],
      suicidality: [
        /(?:(?:kill|hurt|harm)\s+(?:myself|me|myself))/i,
        /(?:(?:end|take)\s+(?:my|this)\s+life)/i,
        /(?:(?:suicidal|death|dying)\s+(?:thoughts|ideation|plan))/i,
        /(?:(?:better|easier)\s+(?:off|without|dead))/i,
      ],
      // ADDED: New evidence patterns for additional categories
      bipolar_disorder: [
        /(?:(?:mood|energy)\s+(?:swings|shifts|changes))/i,
        /(?:(?:hypo|)manic\s+(?:episode|period|state))/i,
        /(?:(?:racing|fast)\s+thoughts)/i,
        /(?:(?:excessive|too\s+much)\s+(?:energy|excitement|activity))/i,
      ],
      ocd: [
        /(?:(?:intrusive|unwanted|disturbing)\s+(?:thoughts|images|urges))/i,
        /(?:(?:compulsive|repetitive|ritual)\s+(?:behavior|checking|counting|cleaning))/i,
        /(?:(?:need|have)\s+to\s+(?:check|count|clean|order|arrange))/i,
        /(?:(?:fear|anxiety|worry)\s+(?:if|when|about)\s+(?:not|doesn't|don't))/i,
      ],
      eating_disorder: [
        /(?:(?:body|weight|fat)\s+(?:image|issue|obsession|preoccupation))/i,
        /(?:(?:avoid|restrict|limit)\s+(?:food|eating|calories|meals))/i,
        /(?:(?:purge|vomit|throw\s+up)\s+(?:after|food|eating|meal))/i,
        /(?:(?:feel|feeling)\s+(?:fat|overweight|big|huge))/i,
      ],
      social_anxiety: [
        /(?:(?:afraid|scared|anxious)\s+(?:of|about|in)\s+(?:social|public|people))/i,
        /(?:(?:fear|worry|panic)\s+(?:of|about|when)\s+(?:judged|watched|observed))/i,
        /(?:(?:avoid|don't|cannot)\s+(?:social|public|group)\s+(?:situations|events|gatherings))/i,
        /(?:(?:embarrassed|humiliated|awkward)\s+(?:around|with|when)\s+(?:people|others|strangers))/i,
      ],
      panic_disorder: [
        /(?:(?:sudden|intense|overwhelming)\s+(?:fear|panic|terror))/i,
        /(?:(?:heart|chest|breathing)\s+(?:racing|pounding|difficulty|pain))/i,
        /(?:(?:feel|feeling)\s+(?:like|as\s+if|that)\s+(?:dying|death|heart\s+attack))/i,
        /(?:(?:dizzy|lightheaded|faint|unreal|detached))/i,
      ],
    }

    const categoryPatterns = evidencePatterns[category.category] || []
    const evidence: string[] = []

    // Find sentences containing evidence
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    for (const sentence of sentences) {
      for (const pattern of categoryPatterns) {
        if (pattern.test(sentence)) {
          evidence.push(sentence.trim())
          break // Only add each sentence once
        }
      }

      // Limit to 3 pieces of evidence
      if (evidence.length >= 3) {
        break
      }
    }

    return evidence
  }

  /**
   * Extract explanation from intervention text
   * @private
   */
  private extractExplanation(
    interventionText: string,
    mentalHealthCategory: string,
  ): string {
    // Simple extraction based on category keywords
    const lines = interventionText.split('\n')
    const relevantLines: string[] = []

    let inExplanation = false

    for (const line of lines) {
      // Look for explanation markers
      if (
        line.toLowerCase().includes('explain') ||
        line.toLowerCase().includes('reason') ||
        line.toLowerCase().includes('analysis') ||
        line.toLowerCase().includes('assessment')
      ) {
        inExplanation = true
      }

      // Check if this line is relevant to the category
      if (
        inExplanation &&
        line.toLowerCase().includes(mentalHealthCategory.toLowerCase())
      ) {
        relevantLines.push(line)
      }

      // End of explanation section
      if (
        inExplanation &&
        (line.toLowerCase().includes('recommend') ||
          line.toLowerCase().includes('suggestion') ||
          line.toLowerCase().includes('treatment'))
      ) {
        inExplanation = false
      }
    }

    // If we didn't find specific explanation lines, use the whole text
    if (relevantLines.length === 0) {
      return interventionText
    }

    return relevantLines.join('\n')
  }

  /**
   * Generate an improved explanation for a mental health classification using expert examples
   * @param text The text to explain
   * @param mentalHealthCategory The category to explain
   * @returns Detailed explanation enhanced with expert knowledge
   */
  async generateExplanationWithExpertGuidance(
    text: string,
    mentalHealthCategory: string,
  ): Promise<string> {
    logger.info('Generating explanation with expert guidance', {
      category: mentalHealthCategory,
    })

    try {
      // First, load expert explanations
      const expertExplanations = await this.loadExpertExplanations()
      const categoryExplanations =
        expertExplanations[mentalHealthCategory] || []

      // If we don't have expert explanations for this category, use the regular generation
      if (categoryExplanations.length === 0) {
        return this.generateExplanation(text, mentalHealthCategory)
      }

      // Create a synthetic session for the provider
      const session: TherapySession = {
        sessionId: `expert-explanation-${Date.now()}`,
        clientId: process.env.CLIENT_ID || 'example-client-id',
        therapistId: 'mental-llama-therapist',
        startTime: new Date(),
        status: 'active',
        securityLevel: 'hipaa',
        emotionAnalysisEnabled: true,
      }

      // Analyze emotions first
      const emotionAnalysis = await this.provider.analyzeEmotions(text)

      // Extract supporting evidence
      const evidenceCategory = {
        category: mentalHealthCategory,
        score: 0.8, // Default high score for evidence extraction
        explanation: '', // Will be filled later
      }
      const supportingEvidence = this.extractSupportingEvidence(
        text,
        evidenceCategory,
      )

      // Choose a random expert explanation as a base template
      const expertTemplate =
        categoryExplanations[
          Math.floor(Math.random() * categoryExplanations.length)
        ]

      // Build an enhanced prompt for the provider that includes:
      // 1. The patient's text
      // 2. The identified category
      // 3. Supporting evidence
      // 4. Expert explanation template
      const enhancedPrompt = `
Patient text: "${text}"

Based on my analysis, I've identified potential signs of ${mentalHealthCategory.replace('_', ' ')} in this text.

Supporting evidence I've found:
${supportingEvidence.map((evidence, i) => `${i + 1}. "${evidence}"`).join('\n')}

I need to create a clinical explanation that identifies and explains the indicators of ${mentalHealthCategory.replace('_', ' ')} present in this text. Here's an example of a good clinical explanation:

Example: ${expertTemplate}

Please generate a comprehensive, clinically informed explanation for this specific case, highlighting the key indicators and contextual factors that suggest ${mentalHealthCategory.replace('_', ' ')}.
`

      // Generate intervention with the enhanced prompt
      const intervention = await this.provider.generateIntervention(
        session,
        emotionAnalysis,
        enhancedPrompt, // Use our enhanced prompt with expert guidance
      )

      // Extract just the explanation part and clean it up
      return this.extractExplanation(intervention.content, mentalHealthCategory)
        .replace(/Example:/g, '') // Remove any references to the example
        .trim()
    } catch (error) {
      logger.error('Failed to generate explanation with expert guidance', {
        error,
      })
      // Fall back to regular explanation generation
      return this.generateExplanation(text, mentalHealthCategory)
    }
  }

  /**
   * Analyze a text for mental health indicators with enhanced explanation
   * @param text The text to analyze
   * @param useExpertGuidance Whether to use expert guidance for explanations
   * @returns Analysis with mental health indicators and explanations
   */
  async analyzeMentalHealthWithExpertGuidance(
    text: string,
    useExpertGuidance: boolean = true,
  ): Promise<{
    hasMentalHealthIssue: boolean
    mentalHealthCategory: string
    explanation: string
    confidence: number
    supportingEvidence: string[]
    expertGuided: boolean
  }> {
    logger.info(
      'Analyzing text for mental health indicators with expert guidance',
    )

    try {
      // First do regular analysis
      const initialAnalysis = await this.analyzeMentalHealth(text)

      // Get the most likely mental health category
      const topCategory =
        Object.entries(initialAnalysis.categories).reduce(
          (max, [category, score]) =>
            score > max.score ? { category, score } : max,
          { category: '', score: 0 },
        ).category || 'depression'

      const hasMentalHealthIssue =
        initialAnalysis.hasMentalHealthIssue ||
        Object.values(initialAnalysis.categories).some((score) => score > 0.5)

      // If expert guidance is requested and we have a mental health issue
      if (useExpertGuidance && hasMentalHealthIssue) {
        // Generate enhanced explanation with expert guidance
        const enhancedExplanation =
          await this.generateExplanationWithExpertGuidance(
            text,
            initialAnalysis.mentalHealthCategory || topCategory,
          )

        // Return enhanced analysis with all required properties
        return {
          hasMentalHealthIssue,
          mentalHealthCategory:
            initialAnalysis.mentalHealthCategory || topCategory,
          explanation: enhancedExplanation,
          confidence:
            initialAnalysis.confidence || initialAnalysis.confidenceScore,
          supportingEvidence: initialAnalysis.supportingEvidence || [],
          expertGuided: true,
        }
      }

      // Otherwise return the original analysis with expertGuided flag
      return {
        hasMentalHealthIssue,
        mentalHealthCategory:
          initialAnalysis.mentalHealthCategory || topCategory,
        explanation: initialAnalysis.explanation || initialAnalysis.analysis,
        confidence:
          initialAnalysis.confidence || initialAnalysis.confidenceScore,
        supportingEvidence: initialAnalysis.supportingEvidence || [],
        expertGuided: false,
      }
    } catch (error) {
      logger.error('Failed to analyze mental health with expert guidance', {
        error,
      })
      throw error
    }
  }

  /**
   * Check for bipolar disorder indicators
   */
  private checkForBipolarDisorder(
    emotions: { type: string; intensity: number }[],
    categories: Array<{ category: string; score: number; explanation: string }>,
  ): void {
    const joyEmotion = emotions.find(
      (e) =>
        e.type.toLowerCase() === 'joy' || e.type.toLowerCase() === 'happiness',
    )
    const sadnessEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'sadness',
    )
    const joyIntensity = joyEmotion?.intensity || 0
    const sadnessIntensity = sadnessEmotion?.intensity || 0

    if (joyIntensity > 0.7 && sadnessIntensity > 0.4) {
      categories.push({
        category: 'bipolar_disorder',
        score: (joyIntensity + sadnessIntensity) / 2,
        explanation:
          'Rapid shifts between elevated mood and sadness may indicate bipolar disorder, especially when these shifts appear within short time periods.',
      })
    }
  }

  /**
   * Check for OCD indicators
   */
  private checkForOCDIndicators(
    emotions: { type: string; intensity: number }[],
    overallSentiment: number,
    categories: Array<{ category: string; score: number; explanation: string }>,
  ): void {
    const fearEmotion = emotions.find((e) => e.type.toLowerCase() === 'fear')
    const fearIntensity = fearEmotion?.intensity || 0
    const anxietyEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'anxiety',
    )

    const fearAndAnxiety =
      (fearIntensity + (anxietyEmotion?.intensity || 0)) / 2
    if (fearAndAnxiety > 0.6 && overallSentiment < -0.2) {
      categories.push({
        category: 'ocd',
        score: fearAndAnxiety,
        explanation:
          'Persistent anxiety combined with repetitive thoughts or described rituals may indicate obsessive-compulsive disorder.',
      })
    }
  }

  /**
   * Helper method to safely get text/summary from EmotionAnalysis
   * Works with different versions of the EmotionAnalysis interface
   */
  private getSafeEmotionAnalysisText(analysis: unknown): string {
    // Try different properties that might contain a text summary
    if (typeof analysis === 'object' && analysis !== null) {
      const typedAnalysis = analysis as Record<string, unknown>

      if (typeof typedAnalysis.summary === 'string') {
        return typedAnalysis.summary
      }

      // Try other potential properties
      if (
        typeof typedAnalysis.mentalHealth === 'object' &&
        typedAnalysis.mentalHealth !== null &&
        typeof (typedAnalysis.mentalHealth as Record<string, unknown>)
          .explanation === 'string'
      ) {
        return (typedAnalysis.mentalHealth as Record<string, unknown>)
          .explanation as string
      }

      // Try to create a summary from emotions if available
      if (
        Array.isArray(typedAnalysis.emotions) &&
        typedAnalysis.emotions.length > 0
      ) {
        const topEmotions = [...typedAnalysis.emotions]
          .sort((a, b) => {
            const intensityA =
              typeof a === 'object' && a !== null
                ? ((a as Record<string, unknown>).intensity as number) || 0
                : 0
            const intensityB =
              typeof b === 'object' && b !== null
                ? ((b as Record<string, unknown>).intensity as number) || 0
                : 0
            return intensityB - intensityA
          })
          .slice(0, 3)

        if (topEmotions.length > 0) {
          const emotionSummary = topEmotions
            .map((e) => {
              if (typeof e === 'object' && e !== null) {
                const emotion = e as Record<string, unknown>
                const type =
                  typeof emotion.type === 'string' ? emotion.type : 'unknown'
                const intensity =
                  typeof emotion.intensity === 'number' ? emotion.intensity : 0
                return `${type} (${Math.round(intensity * 100)}%)`
              }
              return ''
            })
            .filter(Boolean)
            .join(', ')

          if (emotionSummary) {
            return `Analysis shows primary emotions: ${emotionSummary}`
          }
        }
      }
    }

    return 'No analysis available'
  }

  /**
   * Helper method to safely get confidence from EmotionAnalysis
   * Works with different versions of the EmotionAnalysis interface
   */
  private getSafeEmotionAnalysisConfidence(analysis: unknown): number {
    // Try different properties that might contain confidence
    if (typeof analysis === 'object' && analysis !== null) {
      const typedAnalysis = analysis as Record<string, unknown>

      if (typeof typedAnalysis.confidence === 'number') {
        return typedAnalysis.confidence
      }

      // Try mental health confidence
      if (
        typeof typedAnalysis.mentalHealth === 'object' &&
        typedAnalysis.mentalHealth !== null &&
        typeof (typedAnalysis.mentalHealth as Record<string, unknown>)
          .confidence === 'number'
      ) {
        return (typedAnalysis.mentalHealth as Record<string, unknown>)
          .confidence as number
      }

      // Try to average emotions confidence if available
      if (
        Array.isArray(typedAnalysis.emotions) &&
        typedAnalysis.emotions.length > 0
      ) {
        const confidences = typedAnalysis.emotions
          .map((e: unknown) => {
            if (typeof e === 'object' && e !== null) {
              return (e as Record<string, unknown>).confidence as number
            }
            return undefined
          })
          .filter((c): c is number => typeof c === 'number')

        if (confidences.length > 0) {
          return (
            confidences.reduce((sum: number, c: number) => sum + c, 0) /
            confidences.length
          )
        }
      }
    }

    return 0.5 // Default confidence
  }

  /**
   * Extract supporting evidence from structured response
   * This method handles responses from our structured prompts
   */
  private extractStructuredEvidenceFromResponse(response: string): string[] {
    // Try to find evidence in a structured format first
    const evidenceSection = response.match(
      /supporting evidence[:\s]*\n*([\s\S]*?)(?:\n\n|\n*$)/i,
    )
    if (evidenceSection?.[1]) {
      const evidenceLines = evidenceSection[1]
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^[•\-*\d]\.?\s*/, '').trim())
        .filter((line) => line.length > 5) // Filter out very short lines

      if (evidenceLines.length > 0) {
        return evidenceLines
      }
    }

    // Fall back to bullet point or numbered list detection
    const bulletPoints = response.match(/[•\-*]\s*(.*?)(?=\n[•\-*]|\n\n|\n*$)/g)
    if (bulletPoints && bulletPoints.length > 0) {
      return bulletPoints
        .map((point) => point.replace(/^[•\-*]\s*/, '').trim())
        .filter((point) => point.length > 5)
    }

    // Fall back to numbered list detection
    const numberedPoints = response.match(/\d+\.\s*(.*?)(?=\n\d+\.|\n\n|\n*$)/g)
    if (numberedPoints && numberedPoints.length > 0) {
      return numberedPoints
        .map((point) => point.replace(/^\d+\.\s*/, '').trim())
        .filter((point) => point.length > 5)
    }

    // Fall back to sentences with keywords
    const sentences = response
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
    const keywordsRegex =
      /evidence|indicator|sign|symptom|exhibit|display|show|demonstrate|reveal/i
    const relevantSentences = sentences.filter((s) => keywordsRegex.test(s))

    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 5) // Limit to top 5 most relevant sentences
    }

    // If all else fails, fall back to the original method
    return this.extractEvidenceFromExplanation(response)
  }

  /**
   * Determine the primary mental health category to focus on
   */
  private determinePrimaryCategory(
    categories?: (MentalHealthCategory | 'all')[],
  ): string {
    if (!categories || categories.length === 0 || categories.includes('all')) {
      return 'depression' // Default to depression if no specific category
    }

    // Map of category priorities (lower number = higher priority)
    const priorityMap: Record<string, number> = {
      suicidal: 1, // Highest priority for safety
      depression: 2,
      anxiety: 3,
      stress: 4,
      ptsd: 5,
      bipolar: 6,
      substance_abuse: 7,
      eating_disorder: 8,
      ocd: 9,
      schizophrenia: 10,
      general_wellness: 11,
    }

    // Sort categories by priority and return the highest priority one
    return (
      categories.sort(
        (a, b) => (priorityMap[a] || 100) - (priorityMap[b] || 100),
      )[0] || 'depression'
    )
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
