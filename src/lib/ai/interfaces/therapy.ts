import type { AIResponse, AIServiceOptions, Message } from '../AIService'
import type {
  RiskFactor,
  ContextualFactor,
  Emotion,
  MentalHealthAssessment,
  BehavioralTrait,
  CommunicationStyle,
  CognitivePattern,
} from '../emotions/types'

/**
 * Therapy session information
 */
export interface TherapySession {
  sessionId: string
  clientId: string
  therapistId: string
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed' | 'emergency'
  securityLevel: 'standard' | 'hipaa' | 'fhe'
  emotionAnalysisEnabled: boolean
}

/**
 * Emotion analysis result
 */
export interface EmotionAnalysis {
  id: string
  timestamp: Date
  emotions: Emotion[]
  mentalHealth?: MentalHealthAssessment
  behavioralTraits?: BehavioralTrait[]
  communicationStyle?: CommunicationStyle
  cognitivePatterns?: CognitivePattern[]
  stressLevel?: number // 0-10 scale
  copingMechanisms?: string[]
  overallSentiment: number
  riskFactors?: RiskFactor[]
  contextualFactors?: ContextualFactor[]
  requiresAttention?: boolean
  userId?: string
  source?: string
  input?: unknown
  error?: string
}

/**
 * Therapy AI provider specific options
 */
export interface TherapyAIOptions extends AIServiceOptions {
  sessionContext?: TherapySession
  previousEmotions?: EmotionAnalysis[]
  interventionHistory?: {
    type: string
    timestamp: Date
    outcome: string
  }[]
  securityOptions?: {
    useEncryption: boolean
    encryptionLevel: 'standard' | 'fhe'
    allowThirdParty: boolean
  }
  model?: string
  temperature?: number
  maxTokens?: number
  userId?: string
  context?: unknown
}

/**
 * Therapy AI response
 */
export interface TherapyAIResponse extends AIResponse {
  emotions?: EmotionAnalysis
  suggestedInterventions?: {
    type: string
    priority: number
    description: string
    evidence: string
  }[]
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    recommendedActions: string[]
    mentalHealthFactors?: {
      category: string
      confidence: number
      explanation: string
    }[]
  }
  nextSteps?: {
    type: 'question' | 'intervention' | 'referral' | 'emergency'
    content: string
    reasoning: string
  }[]
}

/**
 * Session documentation for comprehensive clinical notes
 */
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
  /**
   * Outcome predictions for the session/treatment plan
   */
  outcomePredictions?: Array<{
    technique: string
    predictedEfficacy: number
    confidence: number
    rationale: string
  }>
}

/**
 * Therapy AI provider interface
 */
export interface TherapyAIProvider {
  createChatCompletion: (
    messages: Message[],
    options?: AIServiceOptions,
  ) => Promise<AIResponse>

  analyzeEmotions: (
    text: string,
    options?: TherapyAIOptions,
  ) => Promise<EmotionAnalysis>

  generateIntervention: (
    context: TherapySession,
    analysis: EmotionAnalysis,
    prompt?: string,
  ) => Promise<TherapyAIResponse>

  assessRisk: (
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ) => Promise<TherapyAIResponse>

  handleEmergency: (
    session: TherapySession,
    trigger: EmotionAnalysis,
  ) => Promise<TherapyAIResponse>

  generateSessionDocumentation?: (
    session: TherapySession,
    emotionAnalyses: EmotionAnalysis[],
    interventions: TherapyAIResponse[],
    options?: TherapyAIOptions,
  ) => Promise<TherapyAIResponse>
}

export interface EmotionRepository {
  storeEmotionAnalysis: (analysis: EmotionAnalysis) => Promise<void>
}
