/**
 * Types for cognitive models used in patient simulations
 */

/**
 * Demographic information for a cognitive model
 */
export type DemographicInfo = {
  age: number
  gender: string
  occupation: string
  familyStatus: string
  culturalFactors: string[]
}

/**
 * Diagnosis information for a cognitive model
 */
export type DiagnosisInfo = {
  primaryDiagnosis: string
  secondaryDiagnoses: string[]
  durationOfSymptoms: string
  severity: 'mild' | 'moderate' | 'severe'
}

/**
 * Core belief structure
 */
export type CoreBelief = {
  belief: string
  strength: number
  evidence: string[]
  formationContext: string
  relatedDomains: string[]
}

/**
 * Cognitive distortion pattern
 */
export type DistortionPattern = {
  type: string
  examples: string[]
  triggerThemes: string[]
  frequency: 'occasional' | 'frequent' | 'pervasive'
}

/**
 * Behavioral pattern
 */
export type BehavioralPattern = {
  trigger: string
  response: string
  reinforcers: string[]
  consequences: string[]
  alternateTried: string[]
}

/**
 * Emotional pattern
 */
export type EmotionalPattern = {
  emotion: string
  intensity: number
  triggers: string[]
  physicalManifestations: string[]
  copingMechanisms: string[]
}

/**
 * Relationship pattern
 */
export type RelationshipPattern = {
  type: string
  expectations: string[]
  fears: string[]
  behaviors: string[]
  historicalOutcomes: string[]
}

/**
 * Formative experience
 */
export type FormativeExperience = {
  age: number | string
  event: string
  impact: string
  beliefsFormed: string[]
  emotionalResponse: string
}

/**
 * Therapy history
 */
export type TherapyHistory = {
  previousApproaches: string[]
  helpfulInterventions: string[]
  unhelpfulInterventions: string[]
  insights: string[]
  progressMade: string
  remainingChallenges: string[]
}

/**
 * Conversational style
 */
export type ConversationalStyle = {
  verbosity: number
  emotionalExpressiveness: number
  resistance: number
  insightLevel: number
  preferredCommunicationModes: string[]
}

/**
 * Therapeutic insight
 */
export type TherapeuticInsight = {
  belief: string
  insight: string
  dateAchieved: string
}

/**
 * Session progress
 */
export type SessionProgress = {
  sessionNumber: number
  keyInsights: string[]
  resistanceShift: number
}

/**
 * Therapeutic progress
 */
export type TherapeuticProgress = {
  insights: TherapeuticInsight[]
  resistanceLevel: number
  changeReadiness:
    | 'precontemplation'
    | 'contemplation'
    | 'preparation'
    | 'action'
    | 'maintenance'
  sessionProgressLog: SessionProgress[]
}

/**
 * Patient response style configuration
 */
export type PatientResponseStyleConfig = {
  openness: number
  coherence: number
  defenseLevel: number
  disclosureStyle: 'open' | 'selective' | 'guarded'
  challengeResponses: 'defensive' | 'curious' | 'dismissive'
}

/**
 * Complete cognitive model for patient simulation
 */
export type CognitiveModel = {
  id: string
  name: string
  demographicInfo: DemographicInfo
  presentingIssues: string[]
  diagnosisInfo: DiagnosisInfo
  coreBeliefs: CoreBelief[]
  distortionPatterns: DistortionPattern[]
  behavioralPatterns: BehavioralPattern[]
  emotionalPatterns: EmotionalPattern[]
  relationshipPatterns: RelationshipPattern[]
  formativeExperiences: FormativeExperience[]
  therapyHistory: TherapyHistory
  conversationalStyle: ConversationalStyle
  goalsForTherapy: string[]
  therapeuticProgress: TherapeuticProgress
}
