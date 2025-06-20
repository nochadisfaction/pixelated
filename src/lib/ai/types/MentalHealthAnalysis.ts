export interface MentalHealthAnalysis {
  id: string
  patientId: string
  sessionId: string
  timestamp: Date
  overallScore: number
  sentiment: SentimentAnalysisResult
  crisisDetection: CrisisDetectionResult
  therapeuticResponse: TherapeuticResponse
  riskFactors: RiskFactor[]
  recommendations: Recommendation[]
  confidence: number
}

export interface SentimentAnalysisResult {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed'
  scores: {
    positive: number
    negative: number
    neutral: number
    compound: number
  }
  emotions: {
    joy: number
    sadness: number
    anger: number
    fear: number
    surprise: number
    disgust: number
  }
  confidence: number
  keyPhrases: string[]
}

export interface CrisisDetectionResult {
  isCrisis: boolean
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  riskScore: number
  indicators: CrisisIndicator[]
  immediateActions: string[]
  confidence: number
  assessmentTime: Date
}

export interface CrisisIndicator {
  type:
    | 'suicide'
    | 'self_harm'
    | 'substance_abuse'
    | 'violence'
    | 'psychosis'
    | 'severe_depression'
  severity: number
  evidence: string[]
  keywords: string[]
  confidence: number
}

export interface TherapeuticResponse {
  approach:
    | 'cognitive_behavioral'
    | 'psychodynamic'
    | 'humanistic'
    | 'dialectical_behavioral'
    | 'mindfulness'
  techniques: TherapeuticTechnique[]
  suggestedResponses: string[]
  followUpQuestions: string[]
  sessionGoals: string[]
  homework: string[]
  riskMitigation: string[]
}

export interface TherapeuticTechnique {
  name: string
  category:
    | 'assessment'
    | 'intervention'
    | 'coping'
    | 'exploration'
    | 'behavioral'
  description: string
  rationale: string
  expectedOutcome: string
  timeEstimate: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface RiskFactor {
  type: 'biological' | 'psychological' | 'social' | 'environmental'
  name: string
  severity: number
  description: string
  evidence: string[]
  interventions: string[]
  isModifiable: boolean
}

export interface Recommendation {
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'therapeutic' | 'medical' | 'social' | 'safety'
  action: string
  rationale: string
  timeline: string
  expectedOutcome: string
  resources: string[]
  monitoring: string[]
}

export interface PatientProgress {
  patientId: string
  timeframe: {
    start: Date
    end: Date
  }
  sessions: MentalHealthAnalysis[]
  trends: {
    sentiment: TrendAnalysis
    riskLevel: TrendAnalysis
    therapeuticProgress: TrendAnalysis
  }
  milestones: ProgressMilestone[]
  alerts: ProgressAlert[]
}

export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable' | 'fluctuating'
  slope: number
  confidence: number
  dataPoints: Array<{
    date: Date
    value: number
  }>
  interpretation: string
}

export interface ProgressMilestone {
  id: string
  date: Date
  type: 'goal_achieved' | 'setback' | 'breakthrough' | 'behavior_change'
  description: string
  significance: number
  linkedGoals: string[]
}

export interface ProgressAlert {
  id: string
  date: Date
  severity: 'info' | 'warning' | 'critical'
  type: 'deterioration' | 'improvement' | 'plateau' | 'risk_increase'
  message: string
  recommendations: string[]
  requiresAction: boolean
}

// Utility types for analysis configuration
export interface AnalysisConfig {
  enableSentimentAnalysis: boolean
  enableCrisisDetection: boolean
  enableTherapeuticResponse: boolean
  riskAssessmentThreshold: number
  confidenceThreshold: number
  language: 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt'
  specializations: TherapeuticSpecialization[]
}

export interface TherapeuticSpecialization {
  area:
    | 'anxiety'
    | 'depression'
    | 'trauma'
    | 'addiction'
    | 'eating_disorders'
    | 'relationships'
  experience: 'novice' | 'intermediate' | 'expert'
  certifications: string[]
  preferences: Record<string, unknown>
}

// Analysis result metadata
export interface AnalysisMetadata {
  version: string
  model: string
  processingTime: number
  tokensUsed: number
  apiCalls: number
  costs: {
    inputCost: number
    outputCost: number
    totalCost: number
  }
  qualityScore: number
  flags: string[]
}
