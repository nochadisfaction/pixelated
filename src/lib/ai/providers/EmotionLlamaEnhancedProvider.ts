import type { FHEService } from '../../fhe'
import type { AIResponse, AIServiceOptions, Message } from '../AIService'
import type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIProvider,
  TherapyAIResponse,
  TherapySession,
} from '../interfaces/therapy'
import { createLogger } from '../../../utils/logger'
import { EmotionLlamaProvider } from './EmotionLlamaProvider'
import type { MentalLLaMAAdapterAPI } from '../mental-llama/MentalLLaMAAdapter'
import { MentalLLaMAFactory } from '../mental-llama/MentalLLaMAFactory'

const logger = createLogger({ context: 'EmotionLlamaEnhanced' })

/**
 * Enhanced EmotionLlama provider that integrates MentalLLaMA capabilities
 * for advanced mental health analysis and interpretable explanations
 */
export class EmotionLlamaEnhancedProvider implements TherapyAIProvider {
  private emotionLlamaProvider: EmotionLlamaProvider
  private mentalLLaMAAdapter: MentalLLaMAAdapterAPI | null = null
  private mentalHealthAnalysisEnabled: boolean
  private expertGuidanceEnabled: boolean

  /**
   * Create a new EmotionLlamaEnhancedProvider
   * @param baseUrl The base URL for the Emotion Llama API
   * @param apiKey The API key for the Emotion Llama API
   * @param fheService The FHE service to use for encryption
   * @param options Options for the enhanced provider
   */
  constructor(
    baseUrl: string,
    apiKey: string,
    fheService: FHEService,
    options: {
      mentalHealthAnalysisEnabled?: boolean
      expertGuidanceEnabled?: boolean
    } = {},
  ) {
    this.emotionLlamaProvider = new EmotionLlamaProvider(
      baseUrl,
      apiKey,
      fheService,
    )
    this.mentalHealthAnalysisEnabled =
      options.mentalHealthAnalysisEnabled ?? true
    this.expertGuidanceEnabled = options.expertGuidanceEnabled ?? true

    // Initialize the MentalLLaMA adapter in the background
    this.initializeMentalLLaMA().catch((error) => {
      logger.error('Failed to initialize MentalLLaMA adapter', { error })
    })
  }

  /**
   * Initialize the MentalLLaMA adapter
   */
  private async initializeMentalLLaMA(): Promise<void> {
    try {
      logger.info('Initializing MentalLLaMA adapter')
      const { adapter } = await MentalLLaMAFactory.createFromEnv()
      this.mentalLLaMAAdapter = adapter
      logger.info('MentalLLaMA adapter initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize MentalLLaMA adapter', { error })
      // Continue without MentalLLaMA capabilities if initialization fails
    }
  }

  /**
   * Delegate method to the EmotionLlama provider
   */
  async createChatCompletion(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse> {
    return this.emotionLlamaProvider.createChatCompletion(messages, options)
  }

  /**
   * Analyze emotions in text
   * @param text The text to analyze
   * @param options Options for the analysis
   * @returns The emotion analysis result
   */
  async analyzeEmotions(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    // First, use the base EmotionLlama provider to analyze emotions
    const emotionAnalysis = await this.emotionLlamaProvider.analyzeEmotions(
      text,
      options,
    )

    // If MentalLLaMA analysis is enabled and the adapter is available, enhance with mental health analysis
    if (
      this.mentalHealthAnalysisEnabled &&
      this.mentalLLaMAAdapter &&
      text.trim().length > 0
    ) {
      try {
        logger.info('Enhancing emotion analysis with MentalLLaMA')

        // Use MentalLLaMA to analyze the text for mental health indicators
        const mentalHealthAnalysis = this.expertGuidanceEnabled
          ? await this.mentalLLaMAAdapter.analyzeMentalHealthWithExpertGuidance(
              text,
            )
          : await this.mentalLLaMAAdapter.analyzeMentalHealth(text)

        // Enhance the emotion analysis with mental health information
        return {
          ...emotionAnalysis,
          // Add mental health analysis to the emotion analysis
          mentalHealth: {
            hasMentalHealthIssue: mentalHealthAnalysis.hasMentalHealthIssue,
            category: mentalHealthAnalysis.mentalHealthCategory,
            confidence: mentalHealthAnalysis.confidence,
            explanation: mentalHealthAnalysis.explanation,
            supportingEvidence: mentalHealthAnalysis.supportingEvidence,
            expertGuided:
              'expertGuided' in mentalHealthAnalysis &&
              typeof mentalHealthAnalysis.expertGuided === 'boolean'
                ? (mentalHealthAnalysis.expertGuided as boolean)
                : false,
          },
        }
      } catch (error) {
        logger.error('Failed to enhance emotion analysis with MentalLLaMA', {
          error,
        })
        // Continue with the original emotion analysis if MentalLLaMA analysis fails
      }
    }

    return emotionAnalysis
  }

  /**
   * Generate an intervention based on emotional analysis
   * @param context The therapy session context
   * @param analysis The emotion analysis
   * @param prompt Optional custom prompt to guide the intervention
   * @returns The therapy AI response
   */
  async generateIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
    prompt?: string,
  ): Promise<TherapyAIResponse> {
    // First, check if there's mental health analysis available and we need to enhance the prompt
    if (
      this.mentalHealthAnalysisEnabled &&
      this.mentalLLaMAAdapter &&
      analysis.mentalHealth
    ) {
      logger.info('Enhancing intervention with MentalLLaMA insights', {
        category: analysis.mentalHealth.category,
      })

      // Create an enhanced prompt that includes mental health insights
      const enhancedPrompt = prompt || this.createEnhancedPrompt(analysis)

      // Use the enhanced prompt to generate the intervention
      return this.emotionLlamaProvider.generateIntervention(
        context,
        analysis,
        enhancedPrompt,
      )
    }

    // Use the standard intervention generation if no mental health analysis or custom prompt is available
    return this.emotionLlamaProvider.generateIntervention(
      context,
      analysis,
      prompt,
    )
  }

  /**
   * Create an enhanced prompt using mental health insights
   * @param analysis The emotion analysis with mental health information
   * @returns An enhanced prompt for intervention generation
   */
  private createEnhancedPrompt(analysis: EmotionAnalysis): string {
    if (!analysis.mentalHealth) {
      return ''
    }

    // Create a prompt that incorporates mental health insights
    return `
Based on my analysis, I've identified potential signs of ${analysis.mentalHealth.category.replace('_', ' ')} in this conversation.

The key indicators include:
${analysis.mentalHealth.supportingEvidence.map((evidence: string, i: number) => `${i + 1}. "${evidence}"`).join('\n')}

Clinical assessment: ${analysis.mentalHealth.explanation}

Please generate a therapeutic response that addresses these concerns with appropriate, evidence-based approaches for ${analysis.mentalHealth.category.replace('_', ' ')}.
`
  }

  /**
   * Assess risk based on emotion analyses
   * @param session The therapy session
   * @param recentAnalyses Recent emotion analyses
   * @returns The therapy AI response with risk assessment
   */
  async assessRisk(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ): Promise<TherapyAIResponse> {
    // Use the base EmotionLlama provider to assess risk
    const riskAssessment = await this.emotionLlamaProvider.assessRisk(
      session,
      recentAnalyses,
    )

    // If MentalLLaMA analysis is enabled and the adapter is available, enhance the risk assessment
    if (this.mentalHealthAnalysisEnabled && this.mentalLLaMAAdapter) {
      try {
        logger.info('Enhancing risk assessment with MentalLLaMA')

        // Look for mental health issues in recent analyses
        const mentalHealthIssues = recentAnalyses
          .filter((analysis) => analysis.mentalHealth?.hasMentalHealthIssue)
          .map((analysis) => analysis.mentalHealth!)

        // If mental health issues were found, enhance the risk assessment
        if (mentalHealthIssues.length > 0) {
          // Add mental health information to the risk assessment
          return {
            ...riskAssessment,
            riskAssessment: {
              level: riskAssessment.riskAssessment?.level || 'low', // Default to 'low' if undefined
              factors: riskAssessment.riskAssessment?.factors || [],
              recommendedActions:
                riskAssessment.riskAssessment?.recommendedActions || [],
              mentalHealthFactors: mentalHealthIssues.map((issue) => ({
                category: issue.category,
                confidence: issue.confidence,
                explanation: issue.explanation,
              })),
            },
          }
        }
      } catch (error) {
        logger.error('Failed to enhance risk assessment with MentalLLaMA', {
          error,
        })
        // Continue with the original risk assessment if enhancement fails
      }
    }

    return riskAssessment
  }

  /**
   * Handle an emergency situation
   * @param session The therapy session
   * @param trigger The trigger analysis
   * @returns The therapy AI response for the emergency
   */
  async handleEmergency(
    session: TherapySession,
    trigger: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    return this.emotionLlamaProvider.handleEmergency(session, trigger)
  }

  /**
   * Control settings for mental health analysis
   * @param enabled Whether mental health analysis should be enabled
   * @param useExpertGuidance Whether to use expert guidance for explanations
   */
  configureMentalHealthAnalysis(
    enabled: boolean,
    useExpertGuidance: boolean,
  ): void {
    this.mentalHealthAnalysisEnabled = enabled
    this.expertGuidanceEnabled = useExpertGuidance
    logger.info('Mental health analysis configuration updated', {
      enabled,
      useExpertGuidance,
    })
  }

  /**
   * Check if the MentalLLaMA adapter is available
   * @returns True if the MentalLLaMA adapter is available
   */
  isMentalLLaMAAvailable(): boolean {
    return this.mentalLLaMAAdapter !== null
  }

  /**
   * Evaluate the quality of an explanation
   * @param explanation The explanation to evaluate
   * @returns Quality metrics for the explanation
   */
  async evaluateExplanationQuality(explanation: string): Promise<{
    fluency: number
    completeness: number
    reliability: number
    overall: number
  }> {
    if (!this.mentalLLaMAAdapter) {
      throw new Error('MentalLLaMA adapter is not available')
    }

    return this.mentalLLaMAAdapter.evaluateExplanationQuality(explanation)
  }
}
