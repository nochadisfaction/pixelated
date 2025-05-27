import type { TherapyAICache } from './cache/TherapyAICache'
import { PerformanceLogger } from '../logging/performance-logger'
import type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIResponse,
  TherapySession,
  TherapyAIProvider,
  EmotionRepository,
  // MentalHealthMetrics,
  // BehavioralTrait,
  // CommunicationStyle,
  // CognitivePattern,
  // Emotion,
} from './interfaces/therapy'
import type { ContextFactors } from './services/ContextualAwarenessService'

// Add import for EmotionDetectionEngine
import { EmotionDetectionEngine } from './emotions/EmotionDetectionEngine'

// Define interfaces
interface PerformanceMetrics {
  model: string
  latency: number
  totalTokens?: number
  success: boolean
  errorCode?: string
  cached: boolean
  optimized: boolean
  requestId: string
  startTime: number
  endTime: number
  metadata?: Record<string, unknown>
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIServiceOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  content: string
  usage?: {
    totalTokens: number
  }
}

// New documentation interfaces
export interface SessionDocumentation {
  summary: string
  keyInsights: string[]
  therapeuticTechniques: {
    name: string
    description: string
    effectiveness: number
  }[]
  emotionalPatterns: {
    pattern: string
    significance: string
  }[]
  recommendedFollowUp: string
  treatmentProgress: {
    goals: {
      description: string
      progress: number
      notes: string
    }[]
    overallAssessment: string
  }
  nextSessionPlan: string
  emergentIssues?: string[]
  clientStrengths?: string[]
  formattedNotes?: string
  outcomePredictions?: {
    technique: string
    predictedEfficacy: number
    confidence: number
    rationale: string
  }[]
}

// Export types from therapy interfaces
export type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIResponse,
  TherapySession,
}

// Utility function for generating request IDs
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export class AIService {
  private performanceLogger: PerformanceLogger
  private cache: AICache | TherapyAICache
  private provider: AIProvider | TherapyAIProvider
  private emotionEngine: EmotionDetectionEngine | null = null
  private emotionRepository?: EmotionRepository

  constructor(
    cache: AICache | TherapyAICache,
    provider: AIProvider | TherapyAIProvider,
    emotionRepository?: EmotionRepository,
  ) {
    this.performanceLogger = PerformanceLogger.getInstance()
    this.cache = cache
    this.provider = provider
    this.emotionRepository = emotionRepository
  }

  private async trackPerformance(metric: PerformanceMetrics) {
    // Ensure startTime and endTime are set
    if (!metric.startTime) {
      metric.startTime = Date.now() - metric.latency
    }
    if (!metric.endTime) {
      metric.endTime = Date.now()
    }
    await this.performanceLogger.logMetric(metric)
  }

  async createChatCompletion(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse> {
    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache first
      const cachedResponse = await this.cache.get(messages, options)
      if (cachedResponse) {
        const endTime = Date.now()
        await this.trackPerformance({
          model: options?.model || 'unknown',
          latency: endTime - startTime,
          totalTokens: cachedResponse.usage?.totalTokens,
          success: true,
          cached: true,
          optimized: false,
          requestId: generateRequestId(),
          startTime,
          endTime,
        })
        return cachedResponse
      }

      // Make the actual request
      const response = await this.provider.createChatCompletion(
        messages,
        options,
      )

      // Track performance
      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'unknown',
        latency: endTime - startTime,
        totalTokens: response.usage?.totalTokens,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      return response
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      // Track error performance
      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'unknown',
        latency: endTime - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      throw error
    }
  }

  private isTherapyProvider(
    provider: AIProvider | TherapyAIProvider,
  ): provider is TherapyAIProvider {
    return (
      'analyzeEmotions' in provider &&
      'generateIntervention' in provider &&
      'assessRisk' in provider &&
      'handleEmergency' in provider
    )
  }

  private isTherapyCache(
    cache: AICache | TherapyAICache,
  ): cache is TherapyAICache {
    return (
      'getEmotionAnalysis' in cache &&
      'getIntervention' in cache &&
      'getRiskAssessment' in cache
    )
  }

  async analyzeEmotions(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support emotion analysis')
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (this.isTherapyCache(this.cache)) {
        const cachedAnalysis = await this.cache.getEmotionAnalysis(
          text,
          options,
        )
        if (cachedAnalysis) {
          const endTime = Date.now()
          await this.trackPerformance({
            model: options?.model || 'emotion-analysis',
            latency: endTime - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
            startTime,
            endTime,
          })
          return cachedAnalysis
        }
      }

      const analysis = await this.provider.analyzeEmotions(text, options)

      // Cache the result if possible
      if (this.isTherapyCache(this.cache)) {
        await this.cache.cacheEmotionAnalysis(text, analysis, options)
      }

      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'emotion-analysis',
        latency: endTime - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      return analysis
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'emotion-analysis',
        latency: endTime - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      throw error
    }
  }

  async generateIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error(
        'Current provider does not support intervention generation',
      )
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (this.isTherapyCache(this.cache)) {
        const cachedResponse = await this.cache.getIntervention(
          context,
          analysis,
        )
        if (cachedResponse) {
          const endTime = Date.now()
          await this.trackPerformance({
            model: 'intervention-generator',
            latency: endTime - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
            startTime,
            endTime,
          })
          return cachedResponse
        }
      }

      const response = await this.provider.generateIntervention(
        context,
        analysis,
      )

      // Cache the result if possible
      if (this.isTherapyCache(this.cache)) {
        await this.cache.cacheIntervention(context, analysis, response)
      }

      const endTime = Date.now()
      await this.trackPerformance({
        model: 'intervention-generator',
        latency: endTime - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      return response
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      const endTime = Date.now()
      await this.trackPerformance({
        model: 'intervention-generator',
        latency: endTime - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      throw error
    }
  }

  async assessRisk(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ): Promise<TherapyAIResponse> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support risk assessment')
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (this.isTherapyCache(this.cache)) {
        const cachedAssessment = await this.cache.getRiskAssessment(
          session,
          recentAnalyses,
        )
        if (cachedAssessment) {
          const endTime = Date.now()
          await this.trackPerformance({
            model: 'risk-assessment',
            latency: endTime - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
            startTime,
            endTime,
          })
          return cachedAssessment
        }
      }

      const assessment = await this.provider.assessRisk(session, recentAnalyses)

      // Cache the result if possible
      if (this.isTherapyCache(this.cache)) {
        await this.cache.cacheRiskAssessment(
          session,
          recentAnalyses,
          assessment,
        )
      }

      const endTime = Date.now()
      await this.trackPerformance({
        model: 'risk-assessment',
        latency: endTime - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      return assessment
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      const endTime = Date.now()
      await this.trackPerformance({
        model: 'risk-assessment',
        latency: endTime - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      throw error
    }
  }

  // Emergency handling is never cached
  async handleEmergency(
    session: TherapySession,
    trigger: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support emergency handling')
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      const response = await this.provider.handleEmergency(session, trigger)

      const endTime = Date.now()
      await this.trackPerformance({
        model: 'emergency-handler',
        latency: endTime - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      return response
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      const endTime = Date.now()
      await this.trackPerformance({
        model: 'emergency-handler',
        latency: endTime - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      throw error
    }
  }

  async generateSessionDocumentation(
    session: TherapySession,
    emotionAnalyses: EmotionAnalysis[],
    interventions: TherapyAIResponse[],
    options?: TherapyAIOptions,
  ): Promise<SessionDocumentation> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error(
        'Current provider does not support session documentation generation',
      )
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (
        this.isTherapyCache(this.cache) &&
        'getSessionDocumentation' in this.cache
      ) {
        const cachedDocumentation = await this.cache.getSessionDocumentation(
          session,
          emotionAnalyses,
          interventions,
          options,
        )

        if (cachedDocumentation) {
          const endTime = Date.now()
          await this.trackPerformance({
            model: options?.model || 'documentation-generator',
            latency: endTime - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
            startTime,
            endTime,
          })

          return cachedDocumentation
        }
      }

      // Generate combined prompt for documentation
      const messages: Message[] = [
        {
          role: 'system',
          content: `Generate comprehensive clinical documentation for therapy session.
Include summary, key insights, emotional patterns, treatment progress, and follow-up plan.
Format using professional clinical language appropriate for medical records.
Include only factual information derived from the session data.
Structure the documentation according to best practices in mental health record-keeping.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            session,
            emotionAnalyses,
            interventions,
          }),
        },
      ]

      // Use regular chat completion as base
      const response = await this.createChatCompletion(messages, {
        ...options,
        model: options?.model || 'documentation-generator',
        temperature: options?.temperature || 0.3, // Lower temperature for factual documentation
        maxTokens: options?.maxTokens || 2048, // Comprehensive documentation needs more tokens
      })

      // Process and structure the documentation
      let documentation: SessionDocumentation

      try {
        // Try to parse as JSON if the response is in JSON format
        documentation = JSON.parse(response.content) as SessionDocumentation
      } catch {
        // Handle potential JSON parsing errors gracefully
        // If parsing fails, return the original textContent as documentation
        console.warn(
          'Failed to parse AI response as JSON for session documentation. Using raw text.',
        )
        documentation = this.processTextDocumentation(response.content, session)
      }

      // === Outcome Prediction Integration ===
      try {
        const recentAnalysis = emotionAnalyses[emotionAnalyses.length - 1]
        const contextForOutcomeEngine: Record<string, unknown> = {
          session: session as unknown,
          chatSession: {
            messages:
              (session as unknown as { chatHistory?: Message[] }).chatHistory ||
              [],
          } as unknown,
          recentEmotionState: recentAnalysis
            ? ({
                ...recentAnalysis,
                overallSentiment: recentAnalysis.overallSentiment || 'neutral',
              } as unknown)
            : null,
          recentInterventions: interventions
            .flatMap(
              (inv) =>
                inv.suggestedInterventions?.map((si) => si.description) || [
                  'No intervention suggested',
                ],
            )
            .slice(-5),
          mentalHealthAnalysis:
            (recentAnalysis?.mentalHealth as unknown) || undefined,
          userPreferences: undefined,
        }

        // Use treatment goals and/or techniques as desired outcomes
        const desiredOutcomes: string[] = []
        if (documentation.treatmentProgress?.goals) {
          for (const goal of documentation.treatmentProgress.goals) {
            if (goal.description) {
              desiredOutcomes.push(goal.description)
            }
          }
        }
        if (documentation.therapeuticTechniques) {
          for (const tech of documentation.therapeuticTechniques) {
            if (tech.name) {
              desiredOutcomes.push(tech.name)
            }
          }
        }
        // Remove duplicates and sanitize
        const uniqueOutcomes = Array.from(
          new Set(desiredOutcomes.map((o) => o.trim()).filter(Boolean)),
        )
        let outcomePredictions: SessionDocumentation['outcomePredictions'] = []
        if (uniqueOutcomes.length > 0) {
          try {
            // Dynamically import OutcomeRecommendationEngine to avoid circular deps
            // Import OutcomeRecommendationEngine using ES6 module syntax
            const { OutcomeRecommendationEngine } = await import(
              './services/OutcomeRecommendationEngine'
            )
            const ranked = OutcomeRecommendationEngine.recommend({
              context: contextForOutcomeEngine as unknown as ContextFactors,
              desiredOutcomes: uniqueOutcomes,
              maxResults: 5,
            })
            outcomePredictions = ranked.map((r) => ({
              technique: r.technique.name,
              predictedEfficacy: r.score,
              confidence: 0.8, // Placeholder, can be improved with more data
              rationale: r.rationale,
            }))
          } catch (err) {
            console.error('Outcome prediction failed:', err)
            outcomePredictions = []
          }
        }
        documentation.outcomePredictions = outcomePredictions
      } catch (err) {
        console.error('Outcome prediction integration error:', err)
        documentation.outcomePredictions = []
      }
      // === End Outcome Prediction Integration ===

      // Cache the result if possible
      if (
        this.isTherapyCache(this.cache) &&
        'cacheSessionDocumentation' in this.cache
      ) {
        await this.cache.cacheSessionDocumentation(
          session,
          emotionAnalyses,
          interventions,
          documentation,
          options,
        )
      }

      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'documentation-generator',
        latency: endTime - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      return documentation
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'documentation-generator',
        latency: endTime - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
        startTime,
        endTime,
      })

      throw error
    }
  }

  private processTextDocumentation(
    textContent: string,
    _session: TherapySession,
  ): SessionDocumentation {
    // Extract sections from text-based documentation using regex patterns
    const summaryMatch = textContent.match(
      /Summary:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )
    const keyInsightsMatch = textContent.match(
      /Key Insights:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )
    const techniquesMatch = textContent.match(
      /Therapeutic Techniques:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )
    const patternsMatch = textContent.match(
      /Emotional Patterns:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )
    const followUpMatch = textContent.match(
      /Follow-up:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )
    const progressMatch = textContent.match(
      /Treatment Progress:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )
    const planMatch = textContent.match(
      /Next Session Plan:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is,
    )

    // Process key insights into array
    const keyInsights = keyInsightsMatch?.[1]
      ? keyInsightsMatch[1]
          .split(/(?:\n\s*[-•*]\s*|\d+\.\s*)/)
          .filter(Boolean)
          .map((item) => item.trim())
      : ['No key insights recorded']

    // Basic documentation structure when detailed parsing fails
    return {
      summary: summaryMatch?.[1]?.trim() || 'Session summary not available',
      keyInsights,
      therapeuticTechniques: techniquesMatch?.[1]
        ? this.extractTechniques(techniquesMatch[1])
        : [],
      emotionalPatterns: patternsMatch?.[1]
        ? this.extractPatterns(patternsMatch[1])
        : [],
      recommendedFollowUp:
        followUpMatch?.[1]?.trim() || 'No follow-up recommendations recorded',
      treatmentProgress: {
        goals: this.extractGoals(progressMatch?.[1] || ''),
        overallAssessment:
          progressMatch?.[1]?.trim() || 'No progress assessment available',
      },
      nextSessionPlan:
        planMatch?.[1]?.trim() || 'No plan for next session recorded',
      formattedNotes: textContent, // Store the full text for reference
      outcomePredictions: [],
    }
  }

  private extractTechniques(
    techniquesText: string,
  ): SessionDocumentation['therapeuticTechniques'] {
    const techniques: SessionDocumentation['therapeuticTechniques'] = []

    // Split by bullet points or numbered items
    const items = techniquesText
      .split(/(?:\n\s*[-•*]\s*|\d+\.\s*)/)
      .filter(Boolean)
      .map((item) => item.trim())

    for (const item of items) {
      const nameMatch = item.match(/^([^:]+):\s*(.*)$/)
      if (nameMatch) {
        techniques.push({
          name: nameMatch[1].trim(),
          description: nameMatch[2].trim(),
          effectiveness: this.estimateEffectiveness(nameMatch[2]),
        })
      } else {
        techniques.push({
          name: item,
          description: '',
          effectiveness: 0,
        })
      }
    }

    return techniques
  }

  private extractPatterns(
    patternsText: string,
  ): SessionDocumentation['emotionalPatterns'] {
    const patterns: SessionDocumentation['emotionalPatterns'] = []

    // Split by bullet points or numbered items
    const items = patternsText
      .split(/(?:\n\s*[-•*]\s*|\d+\.\s*)/)
      .filter(Boolean)
      .map((item) => item.trim())

    for (const item of items) {
      const parts = item.split(/:\s*(.+)/)
      if (parts.length > 1) {
        patterns.push({
          pattern: parts[0].trim(),
          significance: parts[1].trim(),
        })
      } else {
        patterns.push({
          pattern: item,
          significance: '',
        })
      }
    }

    return patterns
  }

  private extractGoals(
    progressText: string,
  ): SessionDocumentation['treatmentProgress']['goals'] {
    const goals: SessionDocumentation['treatmentProgress']['goals'] = []

    // Split by bullet points or numbered items
    const items = progressText
      .split(/(?:\n\s*[-•*]\s*|\d+\.\s*)/)
      .filter(Boolean)
      .map((item) => item.trim())

    for (const item of items) {
      const progressMatch = item.match(/\b(\d{1,3})%\b/)
      const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0

      goals.push({
        description: item,
        progress,
        notes: '',
      })
    }

    return goals.length
      ? goals
      : [
          {
            description: 'No specific goals recorded',
            progress: 0,
            notes: '',
          },
        ]
  }

  private estimateEffectiveness(description: string): number {
    // Estimate effectiveness based on keywords in the description
    const positiveKeywords = [
      'significant',
      'effective',
      'successful',
      'positive',
      'improvement',
      'progress',
    ]
    const negativeKeywords = [
      'limited',
      'minimal',
      'unsuccessful',
      'negative',
      'resistant',
      'challenging',
    ]

    let score = 5 // Default middle score

    for (const keyword of positiveKeywords) {
      if (description.toLowerCase().includes(keyword)) {
        score += 1
      }
    }

    for (const keyword of negativeKeywords) {
      if (description.toLowerCase().includes(keyword)) {
        score -= 1
      }
    }

    // Ensure score stays between 0-10
    return Math.max(0, Math.min(10, score))
  }

  /**
   * Get emotion detection engine instance (lazy-loaded)
   * @private
   */
  private getEmotionEngine(): EmotionDetectionEngine {
    if (!this.emotionEngine) {
      this.emotionEngine = new EmotionDetectionEngine({
        // Configure with sensible defaults for production use
        useCache: true,
        useAdaptiveBatchSize: true,
        minBatchSize: 3,
        maxBatchSize: 10,
        targetProcessingTimeMs: 200,
        batchTimeoutMs: 50,
      })
    }
    return this.emotionEngine
  }

  /**
   * Analyze emotions in real-time with optimized performance
   * This method prioritizes speed for interactive use cases
   * @param text The text to analyze for emotional content
   * @param options Optional configuration
   * @returns Promise resolving to emotion analysis results
   */
  async analyzeEmotionsRealTime(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support emotion analysis')
    }

    const startTime = Date.now()

    try {
      // Get the optimized emotion detection engine
      const engine = this.getEmotionEngine()
      const userId = options?.userId || 'anonymous'

      // Use the dedicated real-time method which implements:
      // - Priority queuing for real-time requests
      // - Optimized caching with LRU eviction
      // - Adaptive batch sizing based on processing times
      // - Dedicated real-time API endpoint
      const engineResult = await engine.detectEmotionsFromTextRealTime(
        text,
        options?.context,
      )

      // Map EngineResult to TherapyAPI.EmotionAnalysis
      const analysis: EmotionAnalysis = {
        id: engineResult.id || generateRequestId().replace('req_', 'emotion_'),
        timestamp: engineResult.timestamp
          ? new Date(engineResult.timestamp)
          : new Date(),
        emotions: (engineResult as unknown as { emotions?: unknown[] })
          .emotions || [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        overallSentiment:
          (engineResult as unknown as { overallSentiment?: string })
            .overallSentiment || 'neutral',
        userId: userId,
        source:
          (engineResult as unknown as { source?: string }).source || 'text',
        input: (engineResult as unknown as { input?: unknown }).input || text,
        error: (engineResult as unknown as { error?: string }).error,
        mentalHealth: (
          engineResult as unknown as { mentalHealth?: Record<string, unknown> }
        ).mentalHealth,
        behavioralTraits: (
          engineResult as unknown as { behavioralTraits?: unknown[] }
        ).behavioralTraits,
        communicationStyle: (
          engineResult as unknown as {
            communicationStyle?: Record<string, unknown>
          }
        ).communicationStyle,
        cognitivePatterns: (
          engineResult as unknown as { cognitivePatterns?: unknown[] }
        ).cognitivePatterns,
        stressLevel: (engineResult as unknown as { stressLevel?: number })
          .stressLevel,
        copingMechanisms: (
          engineResult as unknown as { copingMechanisms?: string[] }
        ).copingMechanisms,
      }

      // Store the analysis if we have a emotion repository
      if (this.emotionRepository && userId !== 'anonymous') {
        await this.emotionRepository.storeEmotionAnalysis({
          ...analysis,
          userId,
        })
      }

      // Track performance metrics
      const endTime = Date.now()
      await this.trackPerformance({
        model: options?.model || 'emotion-analysis-realtime',
        latency: endTime - startTime,
        success: true,
        cached: false, // The cache is handled inside the engine
        optimized: true,
        requestId: generateRequestId(),
        startTime,
        endTime,
        metadata: {
          textLength: text.length,
          emotionCount: analysis.emotions.length,
        },
      })

      return analysis
    } catch (error) {
      const endTime = Date.now()
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      // Log the error
      console.warn('Error analyzing emotions in real-time', {
        error: errorMessage,
        textLength: text.length,
        elapsed: endTime - startTime,
      })

      // Track the failed performance
      await this.trackPerformance({
        model: options?.model || 'emotion-analysis-realtime',
        latency: endTime - startTime,
        success: false,
        cached: false,
        optimized: true,
        requestId: generateRequestId(),
        startTime,
        endTime,
        metadata: {
          errorMessage,
        },
      })

      // Return a default neutral analysis on error
      return {
        id: generateRequestId().replace('req_', 'emotion_'),
        timestamp: new Date(), // Ensure this is a Date object
        emotions: [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        overallSentiment: 'neutral', // Added overallSentiment
        userId: options?.userId || 'anonymous',
        source: 'text',
        input: text,
        error: errorMessage,
      }
    }
  }
}

// Define interfaces for cache and provider
export interface AICache {
  get: (
    messages: Message[],
    options?: AIServiceOptions,
  ) => Promise<AIResponse | null>
}

interface AIProvider {
  createChatCompletion: (
    messages: Message[],
    options?: AIServiceOptions,
  ) => Promise<AIResponse>
}
