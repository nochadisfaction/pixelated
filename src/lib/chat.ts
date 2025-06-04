/**
 * MentalHealthChat implementation for Pixelated Empathy
 */

export interface MentalHealthAnalysis {
  category: string
  explanation: string
  expertGuided: any
  id: string
  timestamp: number
  scores: {
    depression: number
    anxiety: number
    stress: number
    anger: number
    socialIsolation: number
    bipolarDisorder?: number
    ocd?: number
    eatingDisorder?: number
    socialAnxiety?: number
    panicDisorder?: number
    [key: string]: number | undefined
  }
  evidence: {
    depression: string[]
    anxiety: string[]
    stress: string[]
    anger: string[]
    socialIsolation: string[]
    bipolarDisorder?: string[]
    ocd?: string[]
    eatingDisorder?: string[]
    socialAnxiety?: string[]
    panicDisorder?: string[]
    [key: string]: string[] | undefined
  }
  summary: string
  expertExplanation?: string
  riskLevel: 'low' | 'moderate' | 'high'
}

interface Message {
  id: string
  senderId: string
  content: string
  timestamp: number
}

interface MentalHealthChatOptions {
  enableAnalysis?: boolean
  useExpertGuidance?: boolean
  triggerInterventionThreshold?: number
  analysisMinimumLength?: number
}

/**
 * Creates a new MentalHealthChat instance
 */
export function createMentalHealthChat(
  fheService: any,
  options: MentalHealthChatOptions = {},
) {
  const defaultAnalysis: MentalHealthAnalysis = {
    id: 'demo-analysis',
    timestamp: Date.now(),
    scores: {
      depression: 0.2,
      anxiety: 0.3,
      stress: 0.4,
      anger: 0.1,
      socialIsolation: 0.2,
    },
    evidence: {
      depression: ['Example evidence for depression'],
      anxiety: ['Example evidence for anxiety'],
      stress: ['Example evidence for stress'],
      anger: ['Example evidence for anger'],
      socialIsolation: ['Example evidence for social isolation'],
    },
    summary: 'This is a demo analysis with mock data.',
    category: '', // Add category
    explanation: '', // Add explanation
    expertGuided: null, // Add expertGuided
    riskLevel: 'low',
  }

  return {
    processMessage: async (message: Omit<Message, 'conversationId'>) => {
      // Mock implementation for demo
      return {
        ...message,
        mentalHealthAnalysis: defaultAnalysis,
      }
    },
    needsIntervention: () => {
      // Mock implementation
      return Math.random() > 0.7
    },
    generateIntervention: async () => {
      // Mock implementation
      return "I notice you seem to be feeling stressed. Would you like to talk about what's causing this stress?"
    },
    configure: (newOptions: Partial<MentalHealthChatOptions>) => {
      // Mock implementation to update options
      Object.assign(options, newOptions)
    },
  }
}
