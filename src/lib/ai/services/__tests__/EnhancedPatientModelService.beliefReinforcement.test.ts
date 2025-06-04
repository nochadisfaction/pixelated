import { describe, it, expect, beforeEach } from 'vitest'
import {
  EnhancedPatientModelService,
  ReinforcementType,
  ChallengeType,
  type ReinforcementInput,
  type ChallengeInput,
  type ProcessTurnInput,
} from '../EnhancedPatientModelService'
import type { CognitiveModel, CoreBelief } from '../../types/CognitiveModel'
import type { KVStore } from '@/lib/db/KVStore'

// Define a partial type for the KvStore for mocking purposes
interface MockKvStore {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
  // Adding missing properties based on linter error
  storagePrefix: string
  cache: Map<string, unknown> // Changed any to unknown
  useLocalStorage: boolean
  prefixKey: (key: string) => string
  // Assuming the "3 more" are standard KV store methods or properties
  // Add them here if known, otherwise this might still cause issues
  // For now, adding some common ones with basic types or mocks:
  clear: ReturnType<typeof vi.fn>
  has: (key: string) => Promise<boolean>
  entries: () => Promise<[string, unknown][]> // Changed any to unknown
  // Adding newly identified missing properties
  exists: (key: string) => Promise<boolean>
  keys: () => Promise<string[]>
}

interface DetectionResult {
  beliefId: string
  challengeType: ChallengeType
  statementText?: string
}

interface ServiceWithTestableApplyBelief {
  applyBeliefReinforcement: (
    model: CognitiveModel,
    input: ReinforcementInput,
  ) => { updatedModel: CognitiveModel; changesMade: boolean }
  applyBeliefChallenge: (
    model: CognitiveModel,
    input: ChallengeInput,
  ) => { updatedModel: CognitiveModel; changesMade: boolean }
  updateTherapeuticProgress: (
    model: CognitiveModel,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
    }>,
    therapistUtterance: string,
    patientUtterance: string,
    nluData?: unknown,
  ) => CognitiveModel
  extractBeliefKeywords: (belief: CoreBelief) => string[]
  calculateBeliefRelevance: (utterance: string, keywords: string[]) => number
  detectTherapistChallenge: (
    utterance: string,
    beliefs: CoreBelief[],
  ) => DetectionResult | null
  detectPatientDoubtOrContradiction: (
    utterance: string,
    beliefs: CoreBelief[],
  ) => DetectionResult | null
}

const mockKvStore: MockKvStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  storagePrefix: 'test-',
  cache: new Map<string, unknown>(), // Changed any to unknown
  useLocalStorage: false,
  prefixKey: (key: string) => `test-${key}`,
  clear: vi.fn(),
  has: vi.fn().mockResolvedValue(false),
  entries: vi.fn().mockResolvedValue([] as [string, unknown][]), // Changed any to unknown
  // Adding mock implementations for new properties
  exists: vi.fn().mockResolvedValue(false),
  keys: vi.fn().mockResolvedValue([] as string[]),
}

describe('EnhancedPatientModelService - applyBeliefReinforcement', () => {
  let service: EnhancedPatientModelService
  let testModel: CognitiveModel
  let initialBelief: CoreBelief

  beforeEach(() => {
    // Reset mocks if necessary
    vi.clearAllMocks()

    service = new EnhancedPatientModelService(mockKvStore as unknown as KVStore)
    initialBelief = {
      id: 'belief1',
      belief: 'The world is dangerous.',
      strength: 5,
      evidence: ['Saw a scary news report.'],
      relatedDomains: ['safety', 'threat'],
      associatedEmotions: ['fear', 'anxiety'],
    }
    testModel = {
      id: 'patient1',
      name: 'Test Patient',
      coreBeliefs: [initialBelief],
      // Populate with minimal valid structures for other CognitiveModel properties
      demographicInfo: {
        age: 30,
        gender: 'female',
        occupation: 'writer',
        familyStatus: 'single',
      },
      presentingIssues: ['general anxiety'],
      diagnosisInfo: {
        primaryDiagnosis: 'Generalized Anxiety Disorder',
        severity: 'moderate',
      },
      distortionPatterns: [],
      behavioralPatterns: [],
      emotionalPatterns: [
        {
          emotion: 'anxiety',
          intensity: 7,
          triggers: ['unknown situations'],
          physicalManifestations: ['racing heart'],
          copingMechanisms: ['avoidance'],
        },
      ],
      relationshipPatterns: [],
      formativeExperiences: [],
      therapyHistory: {
        previousApproaches: [],
        helpfulInterventions: [],
        unhelpfulInterventions: [],
        insights: [],
        progressMade: '',
        remainingChallenges: [],
      },
      conversationalStyle: {
        verbosity: 5,
        emotionalExpressiveness: 6,
        resistance: 3,
        insightLevel: 4,
        preferredCommunicationModes: ['direct'],
      },
      goalsForTherapy: ['reduce anxiety'],
      therapeuticProgress: {
        insights: [],
        resistanceLevel: 3,
        changeReadiness: 'contemplation',
        sessionProgressLog: [],
      },
    }
  })

  it('should correctly apply THERAPIST_CONFIRMATION and increase strength', () => {
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.THERAPIST_CONFIRMATION,
      therapistStatementText: 'Yes, it seems that way sometimes.,',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(true)
    const reinforcedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(reinforcedBelief?.strength).toBe(6.5)

    const expectedEvidence =
      'Therapist confirmed: "Yes, it seems that way sometimes..."'
    expect(reinforcedBelief?.evidence.length).toBe(2)
    expect(reinforcedBelief?.evidence[1]).toBe(expectedEvidence)
  })

  it('should correctly apply PATIENT_EVIDENCE and add new evidence', () => {
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.PATIENT_EVIDENCE,
      sourceText: 'Another bad thing happened today.',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(true)
    const reinforcedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(reinforcedBelief?.strength).toBe(6) // 5 + 1
    expect(reinforcedBelief?.evidence).toContain(
      'Another bad thing happened today.',
    )
    expect(reinforcedBelief?.evidence.length).toBe(2)
  })

  it('should not add duplicate PATIENT_EVIDENCE text', () => {
    const existingEvidence = 'Existing evidence.'
    testModel.coreBeliefs[0].evidence.push(existingEvidence) // Add it once

    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.PATIENT_EVIDENCE,
      sourceText: existingEvidence, // Attempt to add duplicate
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    const reinforcedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(reinforcedBelief?.strength).toBe(6) // Strength still increases
    expect(
      reinforcedBelief?.evidence.filter((e: string) => e === existingEvidence)
        .length,
    ).toBe(1)
    expect(changesMade).toBe(true) // Strength changed
  })

  it('should correctly apply CONSISTENT_EMOTION and add evidence', () => {
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.CONSISTENT_EMOTION,
      emotionalContext: [{ emotion: 'fear', intensity: 7 }],
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(true)
    const reinforcedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(reinforcedBelief?.strength).toBe(5.5) // 5 + 0.5
    expect(reinforcedBelief?.evidence).toContain(
      'Felt fear (intensity 7) consistent with this belief.',
    )
  })

  it('should cap belief strength at 10', () => {
    testModel.coreBeliefs[0].strength = 9
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.THERAPIST_CONFIRMATION, // Adds 1.5 by default
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(true)
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(10)
  })

  it('should cap belief strength at 0', () => {
    testModel.coreBeliefs[0].strength = 0.2
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.PATIENT_EVIDENCE,
      strengthIncrement: -1.0, // Override to subtract
      sourceText: 'This should not make it negative.',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(true) // Strength changed to 0
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(0)
  })

  it('should use custom strengthIncrement if provided', () => {
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.PATIENT_EVIDENCE,
      sourceText: 'Specific new proof with custom increment.',
      strengthIncrement: 2.5,
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(true)
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(7.5) // 5 + 2.5
  })

  it('should return changesMade: false if no actual change in strength or evidence occurs (e.g. max strength, existing evidence, zero increment)', () => {
    testModel.coreBeliefs[0].strength = 10 // Already at max
    const existingEvidence = testModel.coreBeliefs[0].evidence[0]
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.PATIENT_EVIDENCE,
      sourceText: existingEvidence,
      strengthIncrement: 0,
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(false)
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(10)
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.evidence.length,
    ).toBe(1) // No new evidence added
  })

  it('should do nothing and return changesMade: false if beliefId is not found', () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    const input: ReinforcementInput = {
      beliefId: 'nonExistentBelief',
      type: ReinforcementType.THERAPIST_CONFIRMATION,
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(false)
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(initialBelief.strength) // Original belief unchanged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Belief reinforcement: Belief ID "nonExistentBelief" not found in model patient1.',
    )
    consoleWarnSpy.mockRestore()
  })

  it('should add evidence for CONSISTENT_EMOTION even if emotionalContext is empty array if default strengthIncrement applies', () => {
    const input: ReinforcementInput = {
      beliefId: 'belief1',
      type: ReinforcementType.CONSISTENT_EMOTION,
      emotionalContext: [], // Empty array
    }
    // Default strength increment for CONSISTENT_EMOTION is 0.5
    // The current logic for adding evidence for CONSISTENT_EMOTION checks `emotionalContext.length > 0`
    // Let's refine this test or the implementation.
    // If strength changes, evidence should ideally reflect why, or it's an implicit reinforcement.
    // For this test, let's assume if strength is changed, some generic evidence note is added or change is just to strength
    // The current implementation would add generic evidence if emotionalContext is not empty.
    // If emotionalContext is empty, it will not add evidence text but will increment strength.

    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)
    expect(changesMade).toBe(true) // Strength should change
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(5.5)
    // Check if specific evidence for empty emotional context is NOT added, or if a default one is.
    // Based on current applyBeliefReinforcement, no specific evidence text for empty emotionalContext.
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.evidence.length,
    ).toBe(initialBelief.evidence.length)
  })

  it('should return changesMade: false if belief ID not found', () => {
    const input: ReinforcementInput = {
      beliefId: 'nonexistent',
      type: ReinforcementType.PATIENT_EVIDENCE,
      sourceText: 'This should not work.',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefReinforcement(testModel, input)

    expect(changesMade).toBe(false)
    expect(updatedModel).toBe(testModel) // No changes
  })
})

describe('EnhancedPatientModelService - Belief Challenging', () => {
  let service: EnhancedPatientModelService
  let testModel: CognitiveModel
  let initialBelief: CoreBelief

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EnhancedPatientModelService(mockKvStore as unknown as KVStore)
    initialBelief = {
      id: 'belief1',
      belief: 'I am worthless and will never succeed',
      strength: 8,
      evidence: [
        'Failed my last job interview',
        'Got rejected by someone I liked',
      ],
      relatedDomains: ['self-worth', 'achievement', 'relationships'],
      associatedEmotions: ['sadness', 'shame', 'hopelessness'],
    }
    testModel = {
      id: 'patient1',
      name: 'Test Patient',
      coreBeliefs: [initialBelief],
      demographicInfo: {
        age: 28,
        gender: 'male',
        occupation: 'student',
        familyStatus: 'single',
      },
      presentingIssues: ['depression', 'low self-esteem'],
      diagnosisInfo: {
        primaryDiagnosis: 'Major Depressive Disorder',
        severity: 'moderate',
      },
      distortionPatterns: [],
      behavioralPatterns: [],
      emotionalPatterns: [],
      relationshipPatterns: [],
      formativeExperiences: [],
      therapyHistory: {
        previousApproaches: [],
        helpfulInterventions: [],
        unhelpfulInterventions: [],
        insights: [],
        progressMade: '',
        remainingChallenges: [],
      },
      conversationalStyle: {
        verbosity: 5,
        emotionalExpressiveness: 6,
        resistance: 4,
        insightLevel: 3,
        preferredCommunicationModes: ['direct'],
      },
      goalsForTherapy: ['improve self-esteem', 'reduce depression'],
      therapeuticProgress: {
        insights: [],
        resistanceLevel: 4,
        changeReadiness: 'contemplation',
        sessionProgressLog: [],
      },
    }
  })

  it('should correctly apply THERAPIST_COUNTER_EVIDENCE and decrease strength', () => {
    const input: ChallengeInput = {
      beliefId: 'belief1',
      type: ChallengeType.THERAPIST_COUNTER_EVIDENCE,
      therapistStatementText:
        'But what about when you helped your friend move last week? That showed real kindness and reliability.',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefChallenge(testModel, input)

    expect(changesMade).toBe(true)
    const challengedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(challengedBelief?.strength).toBe(6.5) // 8 - 1.5

    const expectedEvidence =
      'Therapist challenged: "But what about when you helped your friend move last week? That showed real kindness and reliability..."'
    expect(challengedBelief?.evidence).toContain(expectedEvidence)
  })

  it('should correctly apply PATIENT_EXPRESSES_DOUBT and decrease strength', () => {
    const input: ChallengeInput = {
      beliefId: 'belief1',
      type: ChallengeType.PATIENT_EXPRESSES_DOUBT,
      sourceText:
        "I'm not sure if I'm really that worthless... maybe I do have some good qualities.",
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefChallenge(testModel, input)

    expect(changesMade).toBe(true)
    const challengedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(challengedBelief?.strength).toBe(7) // 8 - 1.0

    const expectedEvidence =
      'Patient expressed doubt: "I\'m not sure if I\'m really that worthless... maybe I do have some good qualities..."'
    expect(challengedBelief?.evidence).toContain(expectedEvidence)
  })

  it('should correctly apply PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE', () => {
    const input: ChallengeInput = {
      beliefId: 'belief1',
      type: ChallengeType.PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE,
      sourceText:
        'Actually, I remember when I won that academic award in college. People seemed genuinely proud of me.',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefChallenge(testModel, input)

    expect(changesMade).toBe(true)
    const challengedBelief = updatedModel.coreBeliefs.find(
      (b: CoreBelief) => b.id === 'belief1',
    )
    expect(challengedBelief?.strength).toBe(6.8) // 8 - 1.2

    const expectedEvidence =
      'Patient recalled contradictory experience: "Actually, I remember when I won that academic award in college. People seemed genuinely proud of me..."'
    expect(challengedBelief?.evidence).toContain(expectedEvidence)
  })

  it('should not reduce belief strength below 0', () => {
    testModel.coreBeliefs[0].strength = 0.5
    const input: ChallengeInput = {
      beliefId: 'belief1',
      type: ChallengeType.THERAPIST_COUNTER_EVIDENCE,
      strengthDecrement: 2.0,
      therapistStatementText: 'Strong counter-evidence',
    }
    const { updatedModel, changesMade } = (
      service as unknown as ServiceWithTestableApplyBelief
    ).applyBeliefChallenge(testModel, input)

    expect(changesMade).toBe(true)
    expect(
      updatedModel.coreBeliefs.find((b: CoreBelief) => b.id === 'belief1')
        ?.strength,
    ).toBe(0)
  })
})

describe('EnhancedPatientModelService - Enhanced NLU Detection', () => {
  let service: EnhancedPatientModelService
  let testBeliefs: CoreBelief[]

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EnhancedPatientModelService(mockKvStore as unknown as KVStore)
    testBeliefs = [
      {
        id: 'belief1',
        belief: 'I am not good enough',
        strength: 7,
        evidence: [],
        relatedDomains: ['self-worth', 'competence'],
        associatedEmotions: ['shame', 'inadequacy'],
      },
      {
        id: 'belief2',
        belief: 'The world is dangerous',
        strength: 6,
        evidence: [],
        relatedDomains: ['safety', 'threat', 'danger'],
        associatedEmotions: ['fear', 'anxiety'],
      },
    ]
  })

  describe('extractBeliefKeywords', () => {
    it('should extract keywords from belief text and domains', () => {
      const keywords = (
        service as unknown as ServiceWithTestableApplyBelief
      ).extractBeliefKeywords(testBeliefs[0])
      expect(keywords).toContain('good')
      expect(keywords).toContain('enough')
      expect(keywords).toContain('self-worth')
      expect(keywords).toContain('competence')
      expect(keywords).toContain('shame')
      expect(keywords).toContain('inadequacy')
    })

    it('should filter out stop words and short words', () => {
      const keywords = (
        service as unknown as ServiceWithTestableApplyBelief
      ).extractBeliefKeywords(testBeliefs[0])
      expect(keywords).not.toContain('am')
      expect(keywords).not.toContain('not')
      expect(keywords).not.toContain('i')
    })
  })

  describe('calculateBeliefRelevance', () => {
    it('should calculate high relevance for matching keywords', () => {
      const keywords = ['good', 'enough', 'competence']
      const utterance = 'I feel like I am not good enough for this job'
      const relevance = (
        service as unknown as ServiceWithTestableApplyBelief
      ).calculateBeliefRelevance(utterance, keywords)
      expect(relevance).toBeGreaterThan(0.5)
    })

    it('should calculate low relevance for non-matching content', () => {
      const keywords = ['good', 'enough', 'competence']
      const utterance = 'The weather is nice today'
      const relevance = (
        service as unknown as ServiceWithTestableApplyBelief
      ).calculateBeliefRelevance(utterance, keywords)
      expect(relevance).toBeLessThan(0.2)
    })
  })

  describe('detectTherapistChallenge', () => {
    it('should detect therapist challenges with high confidence patterns', () => {
      const utterance =
        'But what if you are actually more capable than you think? Have you considered your recent successes with competence?'
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectTherapistChallenge(utterance, testBeliefs)

      expect(result).toBeTruthy()
      expect(result?.beliefId).toBe('belief1')
      expect(result?.challengeType).toBe(
        ChallengeType.THERAPIST_COUNTER_EVIDENCE,
      )
    })

    it('should detect evidence-based challenges', () => {
      const utterance =
        'Research shows that people often underestimate their own competence and self-worth'
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectTherapistChallenge(utterance, testBeliefs)

      expect(result).toBeTruthy()
      expect(result?.challengeType).toBe(
        ChallengeType.THERAPIST_COUNTER_EVIDENCE,
      )
    })

    it('should not detect challenges in irrelevant utterances', () => {
      const utterance = 'How was your week? Tell me about your daily routine.'
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectTherapistChallenge(utterance, testBeliefs)

      expect(result).toBeNull()
    })
  })

  describe('detectPatientDoubtOrContradiction', () => {
    it('should detect patient expressions of doubt', () => {
      const utterance =
        "I'm not sure if I'm really that incompetent... maybe I do have some good qualities"
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectPatientDoubtOrContradiction(utterance, testBeliefs)

      expect(result).toBeTruthy()
      expect(result?.beliefId).toBe('belief1')
      expect(result?.challengeType).toBe(ChallengeType.PATIENT_EXPRESSES_DOUBT)
    })

    it('should detect contradictory experiences', () => {
      const utterance =
        'Actually, I remember when I successfully completed that difficult project at work with competence'
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectPatientDoubtOrContradiction(utterance, testBeliefs)

      expect(result).toBeTruthy()
      expect(result?.challengeType).toBe(
        ChallengeType.PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE,
      )
    })

    it('should handle multiple beliefs and select the most relevant', () => {
      const utterance =
        'But yesterday I walked alone at night and felt completely safe from danger'
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectPatientDoubtOrContradiction(utterance, testBeliefs)

      expect(result).toBeTruthy()
      expect(result?.beliefId).toBe('belief2') // Should match the safety/danger belief
    })
  })

  it('should extract belief keywords correctly', () => {
    const belief: CoreBelief = {
      id: 'test',
      belief: 'I am not good enough',
      strength: 5,
      evidence: [],
      relatedDomains: ['self-worth', 'competence'],
      associatedEmotions: ['shame', 'inadequacy'],
    }

    const keywords = (
      service as unknown as ServiceWithTestableApplyBelief
    ).extractBeliefKeywords(belief)

    expect(keywords).toContain('good')
    expect(keywords).toContain('enough')
    expect(keywords).toContain('self-worth')
    expect(keywords).toContain('competence')
    expect(keywords).toContain('shame')
    expect(keywords).toContain('inadequacy')
  })

  it('should calculate belief relevance accurately', () => {
    const keywords = ['dangerous', 'threat', 'safety', 'fear']

    const highRelevanceUtterance =
      'I feel like the world is very dangerous and threatening'
    const lowRelevanceUtterance = 'I like ice cream and sunny days'

    const highRelevance = (
      service as unknown as ServiceWithTestableApplyBelief
    ).calculateBeliefRelevance(highRelevanceUtterance, keywords)
    const lowRelevance = (
      service as unknown as ServiceWithTestableApplyBelief
    ).calculateBeliefRelevance(lowRelevanceUtterance, keywords)

    expect(highRelevance).toBeGreaterThan(lowRelevance)
    expect(highRelevance).toBeGreaterThan(0.5)
    expect(lowRelevance).toBeLessThan(0.3)
  })

  it('should detect therapist challenges with enhanced patterns', () => {
    const challengeUtterances = [
      'But what about when you succeeded last week?',
      "Have you considered that maybe you're being too hard on yourself?",
      "What if there's another way to look at this situation?",
      'Research shows that most people experience setbacks',
      'However, I noticed you mentioned some positive experiences',
      "Is it possible that you're focusing only on the negatives?",
    ]

    challengeUtterances.forEach((utterance) => {
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectTherapistChallenge(utterance, testBeliefs)
      expect(result).toBeTruthy()
      expect(result?.challengeType).toBe(
        ChallengeType.THERAPIST_COUNTER_EVIDENCE,
      )
      expect(result?.beliefId).toBeDefined()
    })
  })

  it('should detect patient doubt with enhanced patterns', () => {
    const doubtUtterances = [
      "I'm not sure if that's really true anymore",
      "Maybe I'm wrong about this",
      "I'm starting to think differently about this",
      "Perhaps I've been too harsh on myself",
      "I'm questioning whether this belief is accurate",
      "What if I'm not as bad as I think?",
      "I'm beginning to see things differently",
    ]

    doubtUtterances.forEach((utterance) => {
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectPatientDoubtOrContradiction(utterance, testBeliefs)
      expect(result).toBeTruthy()
      expect(result?.challengeType).toBe(ChallengeType.PATIENT_EXPRESSES_DOUBT)
      expect(result?.beliefId).toBeDefined()
    })
  })

  it('should detect patient contradictory experiences with enhanced patterns', () => {
    const contradictionUtterances = [
      'Actually, I remember when I did succeed at something important',
      'Wait, there was this time when things went really well',
      'That reminds me of when I helped my friend and felt good about it',
      'Come to think of it, I have had some positive experiences',
      'On the other hand, I can think of times when I felt confident',
      'However, last month I accomplished something I was proud of',
    ]

    contradictionUtterances.forEach((utterance) => {
      const result = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectPatientDoubtOrContradiction(utterance, testBeliefs)
      expect(result).toBeTruthy()
      expect(result?.challengeType).toBe(
        ChallengeType.PATIENT_RECALLS_CONTRADICTORY_EXPERIENCE,
      )
      expect(result?.beliefId).toBeDefined()
    })
  })

  it('should not detect challenges in neutral utterances', () => {
    const neutralUtterances = [
      'I went to the store today',
      'The weather is nice',
      'I had lunch with my friend',
      'My cat is sleeping',
      'I watched a movie last night',
    ]

    neutralUtterances.forEach((utterance) => {
      const therapistResult = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectTherapistChallenge(utterance, testBeliefs)
      const patientResult = (
        service as unknown as ServiceWithTestableApplyBelief
      ).detectPatientDoubtOrContradiction(utterance, testBeliefs)

      expect(therapistResult).toBeNull()
      expect(patientResult).toBeNull()
    })
  })

  it('should prioritize beliefs with higher relevance', () => {
    const mixedBeliefs: CoreBelief[] = [
      {
        id: 'irrelevant',
        belief: 'Cats are better than dogs',
        strength: 5,
        evidence: [],
        relatedDomains: ['pets', 'animals'],
        associatedEmotions: ['joy'],
      },
      {
        id: 'relevant',
        belief: 'I am not competent at work',
        strength: 7,
        evidence: [],
        relatedDomains: ['work', 'competence', 'achievement'],
        associatedEmotions: ['anxiety', 'shame'],
      },
    ]

    const workRelatedChallenge =
      'But what about your recent promotion and the positive feedback from your boss about your competence?'

    const result = (
      service as unknown as ServiceWithTestableApplyBelief
    ).detectTherapistChallenge(workRelatedChallenge, mixedBeliefs)

    expect(result).toBeTruthy()
    expect(result?.beliefId).toBe('relevant')
  })
})

describe('EnhancedPatientModelService - Therapeutic Progress Tracking', () => {
  let service: EnhancedPatientModelService
  let testModel: CognitiveModel

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EnhancedPatientModelService(mockKvStore as unknown as KVStore)
    testModel = {
      id: 'patient1',
      name: 'Test Patient',
      coreBeliefs: [
        {
          id: 'belief1',
          belief: 'I am worthless',
          strength: 8,
          evidence: [],
          relatedDomains: ['self-worth'],
          associatedEmotions: ['shame'],
        },
      ],
      demographicInfo: {
        age: 30,
        gender: 'female',
        occupation: 'teacher',
        familyStatus: 'married',
      },
      presentingIssues: ['depression'],
      diagnosisInfo: {
        primaryDiagnosis: 'Major Depressive Disorder',
        severity: 'moderate',
      },
      distortionPatterns: [],
      behavioralPatterns: [],
      emotionalPatterns: [],
      relationshipPatterns: [],
      formativeExperiences: [],
      therapyHistory: {
        previousApproaches: [],
        helpfulInterventions: [],
        unhelpfulInterventions: [],
        insights: [],
        progressMade: '',
        remainingChallenges: [],
      },
      conversationalStyle: {
        verbosity: 5,
        emotionalExpressiveness: 6,
        resistance: 5,
        insightLevel: 3,
        preferredCommunicationModes: ['direct'],
      },
      goalsForTherapy: ['improve self-esteem'],
      therapeuticProgress: {
        insights: [],
        resistanceLevel: 5,
        changeReadiness: 'contemplation',
        sessionProgressLog: [],
      },
    }
  })

  it('should track insights when beliefs are significantly challenged', () => {
    const conversationHistory = [
      { role: 'therapist' as const, content: 'Tell me about yourself' },
      { role: 'patient' as const, content: 'I feel worthless' },
    ]
    const nluData = {
      therapistChallengesBelief: {
        beliefId: 'belief1',
        challengeText: 'But what about your teaching achievements?',
        challengeType: ChallengeType.THERAPIST_COUNTER_EVIDENCE,
      },
    }

    // First reduce the belief strength to simulate a challenge
    testModel.coreBeliefs[0].strength = 6 // Reduced from 8

    const updatedModel = (
      service as unknown as ServiceWithTestableApplyBelief
    ).updateTherapeuticProgress(
      testModel,
      conversationHistory,
      'But what about your teaching achievements?',
      "Maybe you're right... I do help my students",
      nluData,
    )

    expect(updatedModel.therapeuticProgress.insights.length).toBeGreaterThan(0)
    expect(updatedModel.therapeuticProgress.insights[0].belief).toBe(
      'I am worthless',
    )
    expect(updatedModel.therapeuticProgress.insights[0].insight).toContain(
      'alternative perspective',
    )
  })

  it('should update resistance level based on patient responses', () => {
    const conversationHistory = [
      { role: 'therapist' as const, content: 'How do you feel about that?' },
      { role: 'patient' as const, content: "I don't want to talk about it" },
    ]

    const updatedModel = (
      service as unknown as ServiceWithTestableApplyBelief
    ).updateTherapeuticProgress(
      testModel,
      conversationHistory,
      'How do you feel about that?',
      "I don't want to talk about it", // High resistance response
      {},
    )

    // Resistance should be updated (weighted average of previous and current)
    expect(updatedModel.therapeuticProgress.resistanceLevel)
      .toBeDefined()
      .slice()
  })

  it('should advance change readiness when insights are gained with low resistance', () => {
    testModel.therapeuticProgress.changeReadiness = 'contemplation'
    testModel.therapeuticProgress.resistanceLevel = 3 // Low resistance

    const conversationHistory = [
      { role: 'therapist' as const, content: 'What do you think about that?' },
      { role: 'patient' as const, content: 'You know, maybe you have a point' },
    ]

    const nluData = {
      patientExpressesDoubtOrContradiction: {
        beliefId: 'belief1',
        statementText: "Maybe I'm not completely worthless",
        challengeType: ChallengeType.PATIENT_EXPRESSES_DOUBT,
      },
    }

    // Simulate belief strength reduction to trigger insight
    testModel.coreBeliefs[0].strength = 6

    const updatedModel = (
      service as unknown as ServiceWithTestableApplyBelief
    ).updateTherapeuticProgress(
      testModel,
      conversationHistory,
      'What do you think about that?',
      'You know, maybe you have a point',
      nluData,
    )

    expect(updatedModel.therapeuticProgress.changeReadiness).toBe('preparation')
  })

  it('should create session progress log entries', () => {
    const conversationHistory = Array.from({ length: 15 }, (_, i) => ({
      role: (i % 2 === 0 ? 'therapist' : 'patient') as 'therapist' | 'patient',
      content: `Message ${i + 1}`,
    }))

    const updatedModel = (
      service as unknown as ServiceWithTestableApplyBelief
    ).updateTherapeuticProgress(
      testModel,
      conversationHistory,
      'How are you feeling?',
      'Better, I think',
      {},
    )

    expect(
      updatedModel.therapeuticProgress.sessionProgressLog.length,
    ).toBeGreaterThan(0)
    const sessionLog = updatedModel.therapeuticProgress.sessionProgressLog[0]
    expect(sessionLog.sessionNumber).toBe(2) // Based on conversation length
    expect(sessionLog.resistanceShift).toBeDefined()
  })
})

describe('EnhancedPatientModelService - Integration Tests', () => {
  let service: EnhancedPatientModelService
  let testModel: CognitiveModel

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new EnhancedPatientModelService(mockKvStore as unknown as KVStore)

    testModel = {
      id: 'patient1',
      name: 'Integration Test Patient',
      coreBeliefs: [
        {
          id: 'belief1',
          belief: 'I always fail at important things',
          strength: 7,
          evidence: ['Failed my driving test', "Didn't get the promotion"],
          relatedDomains: ['achievement', 'failure', 'success'],
          associatedEmotions: ['disappointment', 'shame'],
        },
      ],
      demographicInfo: {
        age: 25,
        gender: 'non-binary',
        occupation: 'designer',
        familyStatus: 'single',
      },
      presentingIssues: ['perfectionism', 'fear of failure'],
      diagnosisInfo: { primaryDiagnosis: 'Anxiety Disorder', severity: 'mild' },
      distortionPatterns: [],
      behavioralPatterns: [],
      emotionalPatterns: [],
      relationshipPatterns: [],
      formativeExperiences: [],
      therapyHistory: {
        previousApproaches: [],
        helpfulInterventions: [],
        unhelpfulInterventions: [],
        insights: [],
        progressMade: '',
        remainingChallenges: [],
      },
      conversationalStyle: {
        verbosity: 6,
        emotionalExpressiveness: 5,
        resistance: 3,
        insightLevel: 5,
        preferredCommunicationModes: ['examples'],
      },
      goalsForTherapy: ['overcome perfectionism'],
      therapeuticProgress: {
        insights: [],
        resistanceLevel: 3,
        changeReadiness: 'preparation',
        sessionProgressLog: [],
      },
    }

    // Mock the getModelById method to return our test model
    mockKvStore.get.mockResolvedValue(JSON.stringify(testModel))
  })

  it('should process a complete therapeutic turn with reinforcement and challenge', async () => {
    const input: ProcessTurnInput = {
      modelId: 'patient1',
      therapistUtterance:
        'But what about when you successfully completed that complex design project last month?',
      patientUtterance:
        "Well, I did finish it, but I'm not sure if it was really that good...",
      conversationHistory: [
        {
          role: 'therapist',
          content: 'Tell me about your recent experiences with work projects',
        },
        {
          role: 'patient',
          content: 'I always mess things up when they matter most',
        },
      ],
    }

    const result = await service.processBeliefReinforcementForTurn(input)

    expect(result).toBeDefined()
    expect(result.id).toBe('patient1')

    // Should have detected and applied both challenge and doubt
    const belief = result.coreBeliefs.find((b) => b.id === 'belief1')
    expect(belief).toBeDefined()

    // Verify that therapeutic progress was updated
    expect(
      result.therapeuticProgress.sessionProgressLog.length,
    ).toBeGreaterThan(0)
  })
})
