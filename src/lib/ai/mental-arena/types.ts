/**
 * Types for the MentalArena integration
 */

/**
 * Configuration for MentalArena adapter
 */
export interface MentalArenaAdapterConfig {
  baseUrl: string
  apiKey: string
  pythonBridgeEnabled?: boolean
}

/**
 * Symptom severity levels
 */
export enum SymptomSeverity {
  None = 0,
  Mild = 0.25,
  Moderate = 0.5,
  Severe = 0.75,
  Extreme = 1.0,
}

/**
 * Mental health disorder categories
 */
export enum DisorderCategory {
  Anxiety = 'anxiety',
  Depression = 'depression',
  Trauma = 'trauma',
  Bipolar = 'bipolar',
  Psychotic = 'psychotic',
  Personality = 'personality',
  Substance = 'substance',
  Eating = 'eating',
  Neurodevelopmental = 'neurodevelopmental',
  Other = 'other',
}

/**
 * Therapeutic approach types
 */
export enum TherapeuticApproach {
  CBT = 'cognitive-behavioral',
  Psychodynamic = 'psychodynamic',
  Humanistic = 'humanistic',
  SystemicFamily = 'systemic-family',
  Mindfulness = 'mindfulness',
  Motivational = 'motivational',
  Solution = 'solution-focused',
  Acceptance = 'acceptance-commitment',
  Dialectical = 'dialectical-behavior',
  EMDR = 'emdr',
  Eclectic = 'eclectic',
}

/**
 * Treatment stage in therapy
 */
export enum TreatmentStage {
  Assessment = 'assessment',
  GoalSetting = 'goal-setting',
  Intervention = 'intervention',
  Maintenance = 'maintenance',
  Termination = 'termination',
}

/**
 * Therapeutic rapport level
 */
export enum TherapeuticRapport {
  None = 0,
  Low = 0.25,
  Moderate = 0.5,
  High = 0.75,
  Excellent = 1.0,
}

/**
 * Patient resistance level
 */
export enum PatientResistance {
  None = 0,
  Low = 0.25,
  Moderate = 0.5,
  High = 0.75,
  Extreme = 1.0,
}

/**
 * Patient insight level
 */
export enum PatientInsight {
  None = 0,
  Low = 0.25,
  Moderate = 0.5,
  High = 0.75,
  Profound = 1.0,
}

/**
 * Synthetic therapy session configuration
 */
export interface TherapySimulationConfig {
  disorderCategories: DisorderCategory[]
  therapeuticApproach: TherapeuticApproach
  treatmentStage: TreatmentStage
  patientResistance: PatientResistance
  patientInsight: PatientInsight
  therapeuticRapport: TherapeuticRapport
  sessionNumber: number
  maxTurns: number
  patientDemographics?: {
    age?: number
    gender?: string
    culturalBackground?: string
  }
  specificSymptoms?: string[]
  triggerEvents?: string[]
}

/**
 * Patient profile for simulation
 */
export interface SimulatedPatientProfile {
  primaryDisorder: DisorderCategory
  secondaryDisorders: DisorderCategory[]
  symptoms: {
    name: string
    severity: SymptomSeverity | number
    duration: string
    manifestations: string[]
    cognitions: string[]
  }[]
  traumaHistory?: string[]
  copingMechanisms?: string[]
  supportSystem?: string[]
  medicationHistory?: string[]
  treatmentHistory?: string[]
  demographicInfo?: {
    age?: number
    gender?: string
    occupation?: string
    relationshipStatus?: string
    culturalBackground?: string
    socioeconomicStatus?: string
  }
}

/**
 * Structure of a generated therapy session
 */
export interface GeneratedTherapySession {
  sessionId: string
  patientProfile: SimulatedPatientProfile
  interactions: {
    patientText: string
    therapistText: string
    timestamp: string
    emotionalState?: {
      dominantEmotion: string
      intensity: number
      secondaryEmotions: string[]
    }
  }[]
  therapeuticTechniquesUsed: string[]
  sessionSummary: string
  treatmentProgress: {
    symptomChanges: {
      symptom: string
      before: number
      after: number
    }[]
    insightGained: PatientInsight
    homeworkAssigned?: string
    nextSessionFocus?: string
  }
}

/**
 * Therapeutic intervention techniques
 */
export enum TherapeuticTechnique {
  ActiveListening = 'active-listening',
  Reflection = 'reflection',
  Validation = 'validation',
  CognitiveRestructuring = 'cognitive-restructuring',
  ExposureTherapy = 'exposure-therapy',
  BehavioralActivation = 'behavioral-activation',
  MindfulnessExercises = 'mindfulness-exercises',
  EmotionRegulation = 'emotion-regulation',
  ProblemSolving = 'problem-solving',
  SocraticQuestioning = 'socratic-questioning',
  RolePlay = 'role-play',
  GuidedDiscovery = 'guided-discovery',
  StrengthsBasedApproach = 'strengths-based-approach',
  Psychoeducation = 'psychoeducation',
  ParadoxicalIntervention = 'paradoxical-intervention',
  MotivationalInterviewing = 'motivational-interviewing',
}
