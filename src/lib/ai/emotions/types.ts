/**
 * Basic emotion types supported by the system
 */
export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'surprise'
  | 'trust'
  | 'anticipation'
  | 'acceptance'
  | 'apprehension'
  | 'anxiety'
  | 'confusion'
  | 'contentment'
  | 'excitement'
  | 'calmness'
  | 'neutral'
  | 'mixed'
  | 'other'
  | 'depression'
  | 'stress'
  | 'loneliness'

/**
 * Emotion intensity level
 */
export type EmotionIntensity = 'low' | 'moderate' | 'high' | 'extreme'

/**
 * Basic emotion data structure
 */
export interface Emotion {
  /**
   * Type of emotion
   */
  type: EmotionType

  /**
   * Intensity value from 0-1
   */
  intensity: number

  /**
   * Categorical intensity (derived from intensity value)
   */
  intensityLevel: EmotionIntensity

  /**
   * Confidence in the emotion detection (0-1)
   */
  confidence: number

  /**
   * Timestamp when the emotion was detected
   */
  timestamp: Date
}

/**
 * Data structure for an emotion
 */
export interface EmotionData {
  type: string
  confidence: number
  intensity: number
}

/**
 * Dimensions of emotion in the valence-arousal-dominance model
 */
export interface EmotionDimensions {
  valence: number
  arousal: number
  dominance: number
}

/**
 * Risk factor identified in emotion analysis
 */
export interface RiskFactor {
  type: string
  severity: number
  confidence: number
}

/**
 * Contextual factor affecting emotion analysis
 */
export interface ContextualFactor {
  type: string
  relevance: number
  confidence?: number
}

/**
 * Represents the assessment of mental health status.
 */
export interface MentalHealthAssessment {
  hasMentalHealthIssue: boolean
  category: string
  confidence: number
  explanation: string
  supportingEvidence: string[]
  expertGuided: boolean
}

/**
 * Represents a behavioral trait observed.
 */
export interface BehavioralTrait {
  id: string
  trait: string
  description?: string
  confidence?: number
}

/**
 * Represents the communication style observed.
 */
export interface CommunicationStyle {
  id: string
  style: string
  description?: string
  confidence?: number
}

/**
 * Represents a cognitive pattern identified.
 */
export interface CognitivePattern {
  id: string
  pattern: string
  description?: string
  confidence?: number
  impact?: 'positive' | 'negative' | 'neutral'
}

/**
 * Emotion analysis result
 */
export interface EmotionAnalysis {
  id?: string
  userId: string
  timestamp: string
  source: 'text' | 'facial' | 'voice'
  input: string | unknown
  emotions: EmotionData[]
  content?: string
  dimensions?: EmotionDimensions
  riskFactors?: RiskFactor[]
  contextualFactors?: ContextualFactor[]
  requiresAttention?: boolean
  error?: string
  mentalHealth?: MentalHealthAssessment
}

/**
 * Facial data for emotion analysis
 */
export interface FacialData {
  faceId: string
  features: {
    smile: number
    eyebrows: string
    mouthOpen: number
    eyesOpen: boolean
    headPose: { pitch: number; roll: number; yaw: number }
  }
}

/**
 * Voice data for emotion analysis
 */
export interface VoiceData {
  audioId: string
  features: {
    pitch: { mean: number; variance: number }
    volume: { mean: number; variance: number }
    speakingRate: number
    pausePattern: number[]
  }
  transcript: string
}

/**
 * Response from the language model
 */
export interface LLMResponse<T> {
  data: T
  meta: {
    prompt: string
    model: string
    processingTime: number
  }
}

/**
 * Security options for therapy AI operations
 */
export interface SecurityOptions {
  /**
   * Whether to encrypt the data before sending
   */
  useEncryption: boolean

  /**
   * Level of encryption to use
   */
  encryptionLevel?: 'standard' | 'fhe'

  /**
   * Whether to allow third-party processing
   */
  allowThirdParty?: boolean
}

/**
 * Options for therapy AI operations
 */
export interface TherapyAIOptions {
  /**
   * Security options for the operation
   */
  securityOptions?: SecurityOptions

  /**
   * User ID for the operation
   */
  userId?: string

  /**
   * Model to use for the operation
   */
  model?: string

  /**
   * Additional context for the operation
   */
  context?: Record<string, unknown>
}
