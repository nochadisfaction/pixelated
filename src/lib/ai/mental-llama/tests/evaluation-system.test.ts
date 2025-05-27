/**
 * Integration Tests for the Mental Health Evaluation System
 *
 * This file contains tests for verifying the correct integration and functioning
 * of the evaluation system components, including BART-score, clinical relevance
 * scoring, and user feedback collection.
 */

import { expect, describe, it, vi } from 'vitest'
import { MentalLLaMAAdapter } from '../MentalLLaMAAdapter'
import { calculateBARTScore } from '../utils/bart-score'
import { evaluateClinicalRelevance } from '../utils/clinical-relevance'
import {
  UserRole,
  FeedbackType,
  createFeedback,
  InMemoryFeedbackStore,
  setDefaultFeedbackStore,
} from '../feedback'
import type { TherapyAIProvider } from '../../interfaces/therapy'
import type { FHEService } from '../../../fhe'

// Define mental health categories as string literals for testing
const DEPRESSION = 'depression'
const ANXIETY = 'anxiety'
const PTSD = 'ptsd'

// Mock the logger
vi.mock('../../../logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the MentalLLaMAModelProvider
vi.mock('../MentalLLaMAModelProvider', () => ({
  MentalLLaMAModelProvider: vi.fn().mockImplementation(() => ({
    initialized: true,
    chat: vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is a test response',
            role: 'assistant',
          },
        },
      ],
    }),
    evaluateExplanation: vi.fn().mockResolvedValue({
      fluency: 4.2,
      completeness: 3.8,
      reliability: 4.0,
      overall: 4.0,
      bartScore: 0.82,
    }),
  })),
}))

describe('Evaluation System Integration Tests', () => {
  // Sample explanations and references for testing
  const sampleExplanation = `
    Depression is a common mental health disorder characterized by persistent sadness,
    loss of interest in activities, and reduced energy. It affects how a person feels,
    thinks, and handles daily activities. Research shows that depression is influenced
    by a combination of biological, psychological, and social factors.

    Clinical diagnosis typically involves looking for symptoms like persistent sadness,
    loss of interest in activities (anhedonia), changes in appetite or weight, sleep
    disturbances, psychomotor agitation or retardation, fatigue, feelings of worthlessness
    or guilt, difficulty concentrating, and recurrent thoughts of death.

    Treatment approaches often include psychotherapy (such as cognitive behavioral therapy),
    medication (like SSRIs), or a combination of both. Lifestyle modifications including
    regular exercise, healthy diet, and stress management techniques can also help in
    managing depression.
  `

  const referenceExplanation = `
    Depression, clinically known as Major Depressive Disorder (MDD), is a serious
    mood disorder characterized by persistent feelings of sadness, hopelessness, and
    loss of interest in previously enjoyed activities (anhedonia). The DSM-5 diagnostic
    criteria require the presence of five or more symptoms during the same 2-week period,
    representing a change from previous functioning.

    These symptoms include depressed mood, markedly diminished interest or pleasure in
    almost all activities, significant weight loss/gain, insomnia/hypersomnia, psychomotor
    agitation/retardation, fatigue, feelings of worthlessness or excessive guilt,
    diminished ability to think or concentrate, and recurrent thoughts of death or suicide.

    Evidence-based treatments include psychotherapy approaches such as Cognitive Behavioral
    Therapy (CBT), Interpersonal Therapy (IPT), and pharmacological interventions such as
    Selective Serotonin Reuptake Inhibitors (SSRIs), Serotonin-Norepinephrine Reuptake
    Inhibitors (SNRIs), and in severe cases, electroconvulsive therapy (ECT).

    The biopsychosocial model suggests depression arises from interacting biological
    factors (genetics, neurotransmitter dysregulation), psychological factors (negative
    thinking patterns, past trauma), and social factors (isolation, life stressors).
  `

  describe('BART-Score Tests', () => {
    it('should calculate BART-score using heuristic approach', async () => {
      const result = await calculateBARTScore({
        candidateExplanation: sampleExplanation,
        referenceExplanations: [referenceExplanation],
      })

      expect(result).toBeDefined()
      expect(result.score).toBeGreaterThan(0.5)
      expect(result.score).toBeLessThanOrEqual(1.0)
      expect(result.referenceScores).toHaveLength(1)
      expect(result.metrics).toHaveProperty('semanticSimilarity')
      expect(result.metrics).toHaveProperty('coverageScore')
      expect(result.metrics).toHaveProperty('fluencyScore')
      expect(result.metrics).toHaveProperty('clinicalRelevanceScore')
    })
  })

  describe('Clinical Relevance Tests', () => {
    it('should evaluate clinical relevance of an explanation', async () => {
      const result = await evaluateClinicalRelevance({
        explanation: sampleExplanation,
        category: DEPRESSION,
      })

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThan(0.5)
      expect(result.overallScore).toBeLessThanOrEqual(1.0)
      expect(result.components).toHaveProperty('evidenceBasedScore')
      expect(result.components).toHaveProperty('diagnosticCriteriaScore')
      expect(result.components).toHaveProperty('treatmentRelevanceScore')
      expect(result.components).toHaveProperty('clinicalAccuracyScore')
      expect(result.components).toHaveProperty('frameworkAlignmentScore')
    })

    it('should incorporate expert explanations when available', async () => {
      const result = await evaluateClinicalRelevance({
        explanation: sampleExplanation,
        category: DEPRESSION,
        expertExplanations: [referenceExplanation],
      })

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThan(0.5)
      // Clinical accuracy should be higher when expert explanations are provided
      expect(result.components.clinicalAccuracyScore).toBeGreaterThan(0.6)
    })
  })

  describe('User Feedback Tests', () => {
    it('should create and store user feedback', async () => {
      // Create a new feedback store
      const feedbackStore = new InMemoryFeedbackStore()
      setDefaultFeedbackStore(feedbackStore)

      // Create feedback
      const feedback = createFeedback({
        userRole: UserRole.CLINICIAN,
        detectedCategory: DEPRESSION,
        explanation: sampleExplanation,
        scores: {
          [FeedbackType.ACCURACY]: 4,
          [FeedbackType.CLARITY]: 5,
          [FeedbackType.HELPFULNESS]: 4,
          [FeedbackType.EMPATHY]: 3,
          [FeedbackType.OVERALL]: 4,
        },
        comments:
          'Clear explanation with good clinical detail. Could be more empathetic in tone.',
      })

      // Store feedback
      const id = await feedbackStore.storeFeedback(feedback)
      expect(id).toBeDefined()

      // Retrieve feedback
      const retrieved = await feedbackStore.getFeedback(id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.detectedCategory).toBe(DEPRESSION)
      expect(retrieved?.scores.accuracy).toBe(4)
    })

    it('should generate summary statistics', async () => {
      // Create a new feedback store
      const feedbackStore = new InMemoryFeedbackStore()

      // Create and store multiple feedback entries
      for (let i = 0; i < 10; i++) {
        const feedback = createFeedback({
          userRole: i % 2 === 0 ? UserRole.CLINICIAN : UserRole.CLIENT,
          detectedCategory:
            i % 3 === 0 ? DEPRESSION : i % 3 === 1 ? ANXIETY : PTSD,
          explanation: `Test explanation ${i}`,
          scores: {
            [FeedbackType.ACCURACY]: Math.floor(Math.random() * 3) + 3, // 3-5
            [FeedbackType.CLARITY]: Math.floor(Math.random() * 3) + 3, // 3-5
            [FeedbackType.HELPFULNESS]: Math.floor(Math.random() * 3) + 3, // 3-5
            [FeedbackType.EMPATHY]: Math.floor(Math.random() * 3) + 3, // 3-5
            [FeedbackType.OVERALL]: Math.floor(Math.random() * 3) + 3, // 3-5
          },
        })
        await feedbackStore.storeFeedback(feedback)
      }

      // Generate summary statistics
      const summary = await feedbackStore.getSummary()
      expect(summary).toBeDefined()
      expect(summary.totalCount).toBe(10)
      expect(summary.averageScores).toHaveProperty(FeedbackType.ACCURACY)
      expect(summary.categoryDistribution).toHaveProperty(DEPRESSION)
      expect(summary.userRoleDistribution).toHaveProperty(UserRole.CLINICIAN)
    })
  })

  describe('MentalLLaMA Adapter Integration', () => {
    it('should evaluate explanation quality with BART-score', async () => {
      // Create a minimal adapter instance
      const adapter = new MentalLLaMAAdapter(
        { analyzeEmotions: vi.fn() } as unknown as TherapyAIProvider,
        {} as unknown as FHEService,
        'http://mock-url',
        'mock-api-key',
        undefined,
        undefined,
      )

      // Evaluate explanation quality
      const quality = await adapter.evaluateExplanationQuality(
        sampleExplanation,
        referenceExplanation,
      )

      expect(quality).toBeDefined()
      expect(quality.fluency).toBeGreaterThan(0)
      expect(quality.completeness).toBeGreaterThan(0)
      expect(quality.reliability).toBeGreaterThan(0)
      expect(quality.overall).toBeGreaterThan(0)
      expect(quality.bartScore).toBeDefined()
    })
  })
})

// Export a placeholder function to avoid type errors
export const exportToAvoidTypeError = true
