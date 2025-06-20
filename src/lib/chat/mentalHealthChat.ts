import { fheChat, type ChatMessage, type ChatMessageWithFHE } from './fheChat'
import { createLogger } from '@utils/logger'
import type { FHEService } from '@/lib/fhe'
import type { AIService } from '@/lib/ai/models/ai-types'

const logger = createLogger({ context: 'MentalHealthChat' })

/**
 * Mental health analysis result for a chat message
 */
export interface MentalHealthAnalysis {
  hasMentalHealthIssue: boolean
  category: string
  confidence: number
  explanation: string
  supportingEvidence: string[]
  timestamp: number
  expertGuided?: boolean
}

/**
 * Chat message with mental health analysis
 */
export interface ChatMessageWithMentalHealth extends ChatMessageWithFHE {
  mentalHealthAnalysis?: MentalHealthAnalysis
}

/**
 * Options for mental health chat analysis
 */
export interface MentalHealthChatOptions {
  enableAnalysis: boolean
  useExpertGuidance: boolean
  triggerInterventionThreshold: number
  analysisMinimumLength: number
}

/**
 * MentalHealthChat service for analyzing chat messages
 * and providing mental health insights
 */
export class MentalHealthChat {
  private aiService: AIService | null = null
  private options: MentalHealthChatOptions
  private analysisHistory: Map<string, MentalHealthAnalysis[]> = new Map()

  /**
   * Create a new MentalHealthChat service
   * @param fheService The FHE service for secure message processing
   * @param options Configuration options
   */
  constructor(
    options: Partial<MentalHealthChatOptions> & {fheService: FHEService},
  ) {
    // Initialize AI service with environment variables
    const baseUrl = process.env['EMOTION_LLAMA_API_URL'] || ''
    const apiKey = process.env['EMOTION_LLAMA_API_KEY'] || ''

    if (!baseUrl || !apiKey) {
      logger.warn(
        'Missing EMOTION_LLAMA_API_URL or EMOTION_LLAMA_API_KEY environment variables',
      )
    }

    // For now, we'll use a placeholder until proper AI service is implemented
    this.aiService = null

    // Set default options
    this.options = {
      enableAnalysis: options.enableAnalysis ?? true,
      useExpertGuidance: options.useExpertGuidance ?? true,
      triggerInterventionThreshold: options.triggerInterventionThreshold ?? 0.8,
      analysisMinimumLength: options.analysisMinimumLength ?? 20,
    }

  }

  /**
   * Process a chat message with mental health analysis
   * @param message The chat message to process
   * @returns The processed message with mental health analysis
   */
  async processMessage(
    message: ChatMessage,
  ): Promise<ChatMessageWithMentalHealth> {
    try {
      // First, apply FHE security
      const secureMessage = await fheChat.processMessage(message)

      // Skip analysis if disabled or message is too short
      if (
        !this.options.enableAnalysis ||
        message.content.length < this.options.analysisMinimumLength
      ) {
        return secureMessage
      }

      // Analyze the message content for mental health indicators
      const analysis = await this.analyzeMessage(message.content)

      // Store the analysis in history for the conversation
      this.updateAnalysisHistory(message.conversationId, analysis)

      // Return the enhanced message
      return {
        ...secureMessage,
        mentalHealthAnalysis: analysis,
      }
    } catch (error) {
      logger.error('Failed to process message with mental health analysis', {
        error,
      })
      // Return the original message with FHE security if analysis fails
      return fheChat.processMessage(message)
    }
  }

  /**
   * Analyze a message for mental health indicators
   * @param text The message text to analyze
   * @returns Mental health analysis
   */
  private async analyzeMessage(text: string): Promise<MentalHealthAnalysis> {
    try {
      // TODO: Implement proper AI-based analysis when AI service is available
      if (this.aiService) {
        try {
          // Placeholder for AI service integration - using a simple method call
          logger.debug('AI service available for analysis')
        } catch (error) {
          logger.warn('AI service call failed:', error)
        }
      }

      // Simple rule-based analysis for now
      const concernKeywords = ['depressed', 'anxious', 'suicidal', 'hopeless', 'worthless']
      const lowerText = text.toLowerCase()
      const foundConcerns = concernKeywords.filter(keyword => lowerText.includes(keyword))
      
      if (foundConcerns.length > 0) {
        return {
          hasMentalHealthIssue: true,
          category: 'mental-health-concern',
          confidence: Math.min(0.9, foundConcerns.length * 0.3),
          explanation: `Detected potential mental health indicators: ${foundConcerns.join(', ')}`,
          supportingEvidence: foundConcerns,
          timestamp: Date.now(),
          expertGuided: false,
        }
      }

      // No concerns detected
      return {
        hasMentalHealthIssue: false,
        category: 'none',
        confidence: 0.8,
        explanation: 'No mental health concerns detected in message',
        supportingEvidence: [],
        timestamp: Date.now(),
      }
    } catch (error) {
      logger.error('Failed to analyze message', { error })
      // Return a default analysis if the actual analysis fails
      return {
        hasMentalHealthIssue: false,
        category: 'none',
        confidence: 0,
        explanation: 'Analysis failed',
        supportingEvidence: [],
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Update the analysis history for a conversation
   * @param conversationId The conversation ID
   * @param analysis The mental health analysis to add
   */
  private updateAnalysisHistory(
    conversationId: string,
    analysis: MentalHealthAnalysis,
  ): void {
    // Get or create the history for this conversation
    const history = this.analysisHistory.get(conversationId) || []

    // Add the new analysis
    history.push(analysis)

    // Keep only the last 20 analyses to limit memory usage
    const limitedHistory = history.slice(-20)

    // Update the history
    this.analysisHistory.set(conversationId, limitedHistory)
  }

  /**
   * Get mental health analysis history for a conversation
   * @param conversationId The conversation ID
   * @returns Array of mental health analyses
   */
  getAnalysisHistory(conversationId: string): MentalHealthAnalysis[] {
    return this.analysisHistory.get(conversationId) || []
  }

  /**
   * Check if an intervention is needed based on recent analyses
   * @param conversationId The conversation ID
   * @returns True if an intervention is needed
   */
  needsIntervention(conversationId: string): boolean {
    const history = this.analysisHistory.get(conversationId) || []
    if (history.length === 0) {
      return false
    }

    // Get the most recent analyses (up to last 5)
    const recentAnalyses = history.slice(-5)

    // Check if any recent analysis exceeds the threshold
    return recentAnalyses.some(
      (analysis) =>
        analysis.hasMentalHealthIssue &&
        analysis.confidence >= this.options.triggerInterventionThreshold,
    )
  }

  /**
   * Generate a therapeutic intervention for a conversation
   * @param conversationId The conversation ID
   * @param clientId The client ID
   * @returns Therapeutic intervention text
   */
  async generateIntervention(
    conversationId: string,
  ): Promise<string> {
    try {
      // Get the analysis history
      const history = this.getAnalysisHistory(conversationId)

      // If no history, return a generic response
      if (history.length === 0) {
        return "I'm here to support you. How are you feeling today?"
      }

      // Create a synthetic session for the intervention

      // Get the most recent analysis with a mental health issue
      const recentIssues = history
        .filter((a) => a.hasMentalHealthIssue)
        .sort((a, b) => b.timestamp - a.timestamp)

      // If no mental health issues, provide a default intervention
      if (recentIssues.length === 0) {
        // Generate a simple intervention response
        const response = {
          content: "I'm here to support you. How are you feeling today?"
        }
        return response.content
      }

      // Use the most recent mental health issue for intervention
      const latestIssue = recentIssues[0]
      if (!latestIssue) {
        return "I'm here to support you. Let me know how I can help."
      }

      // Create a custom analysis for intervention

      // TODO: Generate proper intervention when AI service is available
      // For now, return a generic therapeutic response
      const response = {
        content: `I understand you're experiencing ${latestIssue.category}. ${latestIssue.explanation} Would you like to talk about what's been on your mind?`
      }

      return response.content
    } catch (error) {
      logger.error('Failed to generate intervention', { error })
      return "I'm here to support you. Let me know how I can help."
    }
  }

  /**
   * Configure the mental health analysis
   * @param options New options for mental health analysis
   */
  configure(options: Partial<MentalHealthChatOptions>): void {
    // Update options
    this.options = {
      ...this.options,
      ...options,
    }

    // TODO: Update AI service configuration when available
    // this.aiService?.configure?.(this.options)

    logger.info('Mental health chat configuration updated', {
      options: this.options,
    })
  }

  /**
   * Check if AI service is available
   * @returns True if AI service is available
   */
  isAIServiceAvailable(): boolean {
    return this.aiService !== null
  }

  /**
   * Clear analysis history for a conversation
   * @param conversationId The conversation ID
   */
  clearHistory(conversationId: string): void {
    this.analysisHistory.delete(conversationId)
  }
}

// Export a factory function to create the MentalHealthChat service
export const createMentalHealthChat = (
  fheService: FHEService,
  options: Partial<MentalHealthChatOptions> = {}
): MentalHealthChat => {
  return new MentalHealthChat({...options, fheService});
}
