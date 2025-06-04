/**
 * Cognitive Modeling System for Patient Simulation
 * Inspired by Patient-Psi approach (https://github.com/ruiyiw/patient-psi)
 */

/**
 * Core belief structure in a cognitive model
 */
export interface CoreBelief {
  id: string // Unique identifier for the belief
  belief: string
  strength: number // 0-10 scale
  evidence: string[]
  formationContext?: string
  relatedDomains: string[]
  associatedEmotions?: string[] // e.g., ["anxiety", "fear"] for a belief about danger
}

/**
 * Cognitive distortion patterns in thinking
 */
export interface DistortionPattern {
  type: string
  examples: string[]
  triggerThemes: string[]
  frequency: 'rare' | 'occasional' | 'frequent' | 'pervasive'
}

/**
 * Behavioral pattern in response to situations
 */
export interface BehavioralPattern {
  trigger: string
  response: string
  reinforcers: string[]
  consequences: string[]
  alternateTried: string[]
}

/**
 * Emotional pattern representation
 */
export interface EmotionalPattern {
  emotion: string
  intensity: number // 0-10 scale
  triggers: string[]
  physicalManifestations: string[]
  copingMechanisms: string[]
}

/**
 * Relationship pattern
 */
export interface RelationshipPattern {
  type: string // e.g., "Romantic", "Family", "Professional"
  expectations: string[]
  fears: string[]
  behaviors: string[]
  historicalOutcomes: string[]
}

/**
 * Formative experience representation
 */
export interface FormativeExperience {
  age: number | string // Can be specific age or range (e.g., "childhood", "teens")
  event: string
  impact: string
  beliefsFormed: string[]
  emotionalResponse: string
}

/**
 * Therapy history information
 */
export interface TherapyHistory {
  previousApproaches: string[]
  helpfulInterventions: string[]
  unhelpfulInterventions: string[]
  insights: string[]
  progressMade: string
  remainingChallenges: string[]
}

/**
 * Conversational style preferences
 */
export interface ConversationalStyle {
  verbosity: number // 1-10 scale
  emotionalExpressiveness: number // 1-10 scale
  resistance: number // 1-10 scale
  insightLevel: number // 1-10 scale
  preferredCommunicationModes: string[] // e.g., "Metaphors", "Direct questions", "Examples"
}

/**
 * Demographic information
 */
export interface DemographicInfo {
  age: number
  gender: string
  occupation: string
  familyStatus: string
  culturalFactors?: string[]
  socioeconomicStatus?: string
}

/**
 * Diagnosis information
 */
export interface DiagnosisInfo {
  primaryDiagnosis: string
  secondaryDiagnoses?: string[]
  durationOfSymptoms?: string
  severity: 'mild' | 'moderate' | 'severe'
  previousTreatments?: string[]
}

/**
 * Complete cognitive model for a simulated patient
 */
export interface CognitiveModel {
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

/**
 * Configuration for patient response style
 */
export interface PatientResponseStyleConfig {
  openness: number // 1-10, how open the patient is about their inner experience
  coherence: number // 1-10, how organized and coherent the patient's narrative is
  defenseLevel: number // 1-10, how defended the patient is
  disclosureStyle: 'guarded' | 'selective' | 'reflective' | 'open'
  challengeResponses: 'defensive' | 'curious' | 'dismissive' | 'receptive'
}

/**
 * Context for generating a patient response
 */
export interface PatientResponseContext {
  modelId: string
  patientName: string
  presentingIssues: string[]
  primaryDiagnosis: string
  sessionNumber: number
  conversationHistory: Array<{ role: 'therapist' | 'patient'; content: string }>
  lastTherapistMessage: string
  activeBeliefs: CoreBelief[]
  likelyEmotions: { emotion: string; intensity: number }[]
  likelyDistortions: DistortionPattern[]
  responseStyle: PatientResponseStyleConfig
  therapeuticFocus?: string[]
  nonverbalCues: {
    facialExpression: string
    bodyLanguage: string
    voiceTone: string
    eyeContact: boolean
  }
}

/**
 * Get beliefs that are likely to be activated based on conversation content
 */
export function getActiveBeliefs(
  model: CognitiveModel,
  conversationHistory: Array<{
    role: 'therapist' | 'patient'
    content: string
  }>,
  lastMessage: string,
): CoreBelief[] {
  // Extract all text to check against belief domains and triggers
  const allText = conversationHistory
    .map((msg) => msg.content)
    .join(' ')
    .toLowerCase()

  const lastMessageLower = lastMessage.toLowerCase()

  // Find beliefs that match themes in the conversation
  return model.coreBeliefs
    .filter((belief) => {
      // Check if any domains or specific words related to the belief are present
      const domainMatch = belief.relatedDomains.some(
        (domain) =>
          allText.includes(domain.toLowerCase()) ||
          lastMessageLower.includes(domain.toLowerCase()),
      )

      // Check if any evidence points are triggered
      const evidenceMatch = belief.evidence.some((evidence) =>
        lastMessageLower.includes(evidence.toLowerCase().substring(0, 20)),
      )

      return domainMatch || evidenceMatch
    })
    .sort((a, b) => b.strength - a.strength)
}

/**
 * Get emotional responses that are likely based on conversation
 */
export function getLikelyEmotionalResponses(
  model: CognitiveModel,
  conversationHistory: Array<{
    role: 'therapist' | 'patient'
    content: string
  }>,
  lastMessage: string,
): { emotion: string; intensity: number }[] {
  const lastMessageLower = lastMessage.toLowerCase()

  // Check which emotion triggers are present in the conversation
  return model.emotionalPatterns
    .filter((pattern) => {
      return pattern.triggers.some((trigger) =>
        lastMessageLower.includes(trigger.toLowerCase()),
      )
    })
    .map((pattern) => ({
      emotion: pattern.emotion,
      intensity: pattern.intensity,
    }))
    .sort((a, b) => b.intensity - a.intensity)
}

/**
 * Get cognitive distortions likely to appear in response
 */
export function getLikelyDistortions(
  model: CognitiveModel,
  conversationHistory: Array<{
    role: 'therapist' | 'patient'
    content: string
  }>,
  lastMessage: string,
): DistortionPattern[] {
  const lastMessageLower = lastMessage.toLowerCase()

  // Find distortions with trigger themes present in the conversation
  return model.distortionPatterns
    .filter((pattern) => {
      return pattern.triggerThemes.some((theme) =>
        lastMessageLower.includes(theme.toLowerCase()),
      )
    })
    .sort((a, b) => {
      // Sort by frequency, with 'pervasive' first
      const frequencyOrder = {
        pervasive: 3,
        frequent: 2,
        occasional: 1,
        rare: 0,
      }
      return frequencyOrder[b.frequency] - frequencyOrder[a.frequency]
    })
}

/**
 * Therapeutic progress information
 */
export interface TherapeuticProgress {
  insights: { belief: string; insight: string; dateAchieved: string }[]
  resistanceLevel: number // 1-10 scale that decreases with effective therapy
  changeReadiness:
    | 'precontemplation'
    | 'contemplation'
    | 'preparation'
    | 'action'
    | 'maintenance'
  sessionProgressLog: Array<{
    sessionNumber: number
    keyInsights: string[]
    resistanceShift: number
  }>
}

export default CognitiveModel
