/**
 * Integration tests for MetaAligner multi-objective analysis workflow
 * Tests the complete end-to-end functionality including evaluation, enhancement, and integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  AIMessage,
  AIService,
  AIServiceResponse,
} from '../../../ai/models/types'
import { MetaAlignerAPI, IntegratedAIService } from '../api/alignment-api'
import { ContextType } from '../core/objectives'
import type { AlignmentContext } from '../core/objectives'

// Mock logger
vi.mock('../../logging', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock AI service for testing enhancement
const createMockAIService = (enhancedResponse?: string): AIService => {
  const mockService: Partial<AIService> = {
    createChatCompletion: vi.fn().mockResolvedValue({
      id: 'test-response',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              enhancedResponse ||
              'Enhanced response with better alignment to mental health objectives. This response shows improved empathy, accuracy, and safety considerations.',
            name: 'assistant',
          },
          finishReason: 'stop',
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    } as AIServiceResponse),
    createChatStream: vi.fn(),
    generateCompletion: vi.fn(),
    createChatCompletionWithTracking: vi.fn(),
    getCacheService: vi.fn(),
    getPromptOptimizer: vi.fn(),
    getConnectionPool: vi.fn(),
    getFallbackService: vi.fn(),
    getDefaultRequest: vi.fn(),
    createStreamingChatCompletion: vi.fn(),
    dispose: vi.fn(),
    analyze: vi.fn(),
    getModelInfo: vi.fn(),
  }
  return mockService as AIService
}

describe('MetaAligner Integration Tests', () => {
  let metaAligner: MetaAlignerAPI
  let mockAIService: AIService

  beforeEach(() => {
    vi.clearAllMocks()
    mockAIService = createMockAIService()

    metaAligner = new MetaAlignerAPI({
      enableRealTimeEvaluation: true,
      enableResponseEnhancement: true,
      enhancementThreshold: 0.7,
      maxEnhancementAttempts: 2,
      aiService: mockAIService,
      model: 'test-model',
      temperature: 0.7,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Multi-Objective Analysis Workflow', () => {
    it('should perform end-to-end evaluation workflow for crisis context', async () => {
      // Setup crisis scenario
      const userQuery = 'I want to hurt myself and feel hopeless'
      const originalResponse =
        'That sounds difficult. Have you considered talking to someone?'

      // Step 1: Context Detection
      const context = metaAligner.detectContext(userQuery)
      expect(context.detectedContext).toBe(ContextType.CRISIS)
      expect(context.userQuery).toBe(userQuery)

      // Step 2: Response Evaluation
      const evaluation = await metaAligner.evaluateResponse({
        response: originalResponse,
        context,
      })

      // Verify evaluation structure
      expect(evaluation.evaluation.objectiveResults).toBeDefined()
      expect(evaluation.metrics).toBeDefined()
      expect(evaluation.recommendations).toBeDefined()
      expect(typeof evaluation.needsEnhancement).toBe('boolean')

      // Verify all core objectives were evaluated
      const objectiveIds = Object.keys(evaluation.evaluation.objectiveResults)
      expect(objectiveIds).toContain('correctness')
      expect(objectiveIds).toContain('empathy')
      expect(objectiveIds).toContain('safety')
      expect(objectiveIds).toContain('professionalism')
      expect(objectiveIds).toContain('informativeness')

      // Crisis scenarios should prioritize safety
      const safetyResult = evaluation.evaluation.objectiveResults.safety
      expect(safetyResult).toBeDefined()
      expect(safetyResult.objectiveId).toBe('safety')
      expect(safetyResult.score).toBeGreaterThanOrEqual(0)
      expect(safetyResult.score).toBeLessThanOrEqual(1)

      // Step 3: Enhancement (if needed)
      if (evaluation.needsEnhancement) {
        const enhancement = await metaAligner.enhanceResponse({
          originalResponse,
          evaluationResult: evaluation.evaluation,
          context,
        })

        expect(enhancement.enhancedResponse).toBeDefined()
        expect(enhancement.enhancementApplied).toBe(true)
        expect(enhancement.improvementMetrics).toBeDefined()
        expect(enhancement.enhancementExplanation).toBeTruthy()

        // Enhanced response should be different from original
        expect(enhancement.enhancedResponse).not.toBe(originalResponse)
      }
    })

    it('should handle educational context workflow', async () => {
      const userQuery =
        'What is cognitive behavioral therapy and how does it work?'
      const originalResponse =
        'CBT is a type of therapy that focuses on thoughts and behaviors.'

      // Context detection
      const context = metaAligner.detectContext(userQuery)
      expect(context.detectedContext).toBe(ContextType.EDUCATIONAL)

      // Evaluation
      const evaluation = await metaAligner.evaluateResponse({
        response: originalResponse,
        context,
      })

      // Educational context should prioritize informativeness and correctness
      const informativenessResult =
        evaluation.evaluation.objectiveResults.informativeness
      const correctnessResult =
        evaluation.evaluation.objectiveResults.correctness

      expect(informativenessResult).toBeDefined()
      expect(correctnessResult).toBeDefined()

      // Verify metrics include balance and contextual alignment
      expect(evaluation.metrics.balanceScore).toBeGreaterThanOrEqual(0)
      expect(evaluation.metrics.contextualAlignment).toBeGreaterThanOrEqual(0)
      expect(evaluation.metrics.overallPerformance).toBeGreaterThanOrEqual(0)
    })

    it('should handle support context with empathy prioritization', async () => {
      const userQuery = "I'm feeling really overwhelmed with work stress lately"
      const originalResponse =
        'Work stress is common. Try to manage your time better.'

      const context = metaAligner.detectContext(userQuery)
      expect(context.detectedContext).toBe(ContextType.SUPPORT)

      const evaluation = await metaAligner.evaluateResponse({
        response: originalResponse,
        context,
      })

      // Support context should have strong empathy component
      const empathyResult = evaluation.evaluation.objectiveResults.empathy
      expect(empathyResult).toBeDefined()
      expect(empathyResult.criteriaScores).toBeDefined()

      // Should have specific empathy criteria evaluated
      expect(empathyResult.criteriaScores).toHaveProperty(
        'emotional_validation',
      )
      expect(empathyResult.criteriaScores).toHaveProperty(
        'understanding_demonstration',
      )
      expect(empathyResult.criteriaScores).toHaveProperty('supportive_tone')
    })
  })

  describe('Integrated AI Service Workflow', () => {
    it('should automatically evaluate and enhance responses', async () => {
      const baseAIService = createMockAIService(
        'Original response that may need improvement',
      )
      const integratedService = new IntegratedAIService(
        baseAIService,
        metaAligner,
      )

      const messages: AIMessage[] = [
        {
          role: 'user',
          content: "I feel anxious and don't know what to do",
          name: 'user',
        },
      ]

      const response = await integratedService.createChatCompletion(messages)

      // Should include alignment information
      expect(response.alignment).toBeDefined()
      expect(response.alignment?.evaluation).toBeDefined()
      expect(response.alignment?.metrics).toBeDefined()
      expect(typeof response.alignment?.enhanced).toBe('boolean')
      expect(typeof response.alignment?.enhancementAttempts).toBe('number')

      // Response should have been processed
      expect(response.content).toBeDefined()
      expect(response.choices?.[0]?.message?.content).toBeDefined()
    })

    it('should handle conversation history in context detection', async () => {
      const baseAIService = createMockAIService()
      const integratedService = new IntegratedAIService(
        baseAIService,
        metaAligner,
      )

      const messages: AIMessage[] = [
        { role: 'user', content: "I've been feeling sad", name: 'user' },
        {
          role: 'assistant',
          content: "I understand you're feeling sad. Can you tell me more?",
          name: 'assistant',
        },
        {
          role: 'user',
          content: "It's been going on for weeks now",
          name: 'user',
        },
      ]

      const response = await integratedService.createChatCompletion(messages)

      expect(
        response.alignment?.evaluation?.evaluationContext?.conversationHistory,
      ).toBeDefined()
      expect(
        response.alignment?.evaluation?.evaluationContext?.conversationHistory
          ?.length,
      ).toBeGreaterThan(0)
    })
  })

  describe('Objective Balancing and Prioritization', () => {
    it('should adapt objective weights based on context', async () => {
      // Test different contexts and verify weight adaptation
      const contexts = [
        { query: 'I want to kill myself', expectedContext: ContextType.CRISIS },
        {
          query: 'What is depression?',
          expectedContext: ContextType.EDUCATIONAL,
        },
        {
          query: 'I need emotional support',
          expectedContext: ContextType.SUPPORT,
        },
      ]

      for (const { query, expectedContext } of contexts) {
        const context = metaAligner.detectContext(query)
        expect(context.detectedContext).toBe(expectedContext)

        const evaluation = await metaAligner.evaluateResponse({
          response: 'Test response for objective weighting',
          context,
        })

        // Each context should produce different objective emphasis
        expect(evaluation.metrics.balanceScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.metrics.contextualAlignment).toBeGreaterThanOrEqual(0)
      }
    })

    it('should maintain objective balance across different response types', async () => {
      const responses = [
        'Very technical medical information about depression symptoms',
        'Warm, empathetic response showing understanding and support',
        'Safety-focused response with crisis resources and emergency contacts',
      ]

      const context: AlignmentContext = {
        userQuery: "I'm struggling with my mental health",
        detectedContext: ContextType.SUPPORT,
      }

      const evaluations = []
      for (const response of responses) {
        const evaluation = await metaAligner.evaluateResponse({
          response,
          context,
        })
        evaluations.push(evaluation)
      }

      // All evaluations should have valid balance scores
      for (const evaluation of evaluations) {
        expect(evaluation.metrics.balanceScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.metrics.balanceScore).toBeLessThanOrEqual(1)
        expect(evaluation.evaluation.overallScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.evaluation.overallScore).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Enhancement Pipeline Integration', () => {
    it('should perform iterative enhancement with improvement tracking', async () => {
      const poorResponse = "I don't know, try googling it or something."
      const context: AlignmentContext = {
        userQuery: "I'm having panic attacks and feel scared",
        detectedContext: ContextType.CRISIS,
      }

      // Initial evaluation
      const initialEvaluation = await metaAligner.evaluateResponse({
        response: poorResponse,
        context,
      })

      // Should identify need for enhancement
      expect(initialEvaluation.needsEnhancement).toBe(true)
      expect(initialEvaluation.evaluation.overallScore).toBeLessThan(0.7)

      // Perform enhancement
      const enhancement = await metaAligner.enhanceResponse({
        originalResponse: poorResponse,
        evaluationResult: initialEvaluation.evaluation,
        context,
      })

      expect(enhancement.enhancementApplied).toBe(true)
      expect(enhancement.enhancedResponse).not.toBe(poorResponse)
      expect(enhancement.improvementMetrics).toBeDefined()

      // Re-evaluate enhanced response
      const enhancedEvaluation = await metaAligner.evaluateResponse({
        response: enhancement.enhancedResponse,
        context,
      })

      // Enhanced response should show improvement
      expect(enhancedEvaluation.evaluation.overallScore).toBeGreaterThanOrEqual(
        initialEvaluation.evaluation.overallScore,
      )
    })

    it('should handle enhancement failures gracefully', async () => {
      // Mock AI service that fails
      const failingAIService = createMockAIService()
      vi.mocked(failingAIService.createChatCompletion).mockRejectedValue(
        new Error('API Error'),
      )

      const metaAlignerWithFailingAI = new MetaAlignerAPI({
        aiService: failingAIService,
        enableResponseEnhancement: true,
      })

      const context: AlignmentContext = {
        userQuery: 'Test query',
        detectedContext: ContextType.GENERAL,
      }

      const evaluation = await metaAlignerWithFailingAI.evaluateResponse({
        response: 'Test response',
        context,
      })

      // Should handle enhancement failure gracefully
      await expect(
        metaAlignerWithFailingAI.enhanceResponse({
          originalResponse: 'Test response',
          evaluationResult: evaluation.evaluation,
          context,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent evaluations', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        response: `Test response ${i}`,
        context: {
          userQuery: `Test query ${i}`,
          detectedContext: ContextType.GENERAL,
        },
      }))

      const evaluations = await Promise.all(
        requests.map((request) => metaAligner.evaluateResponse(request)),
      )

      expect(evaluations).toHaveLength(5)
      for (const evaluation of evaluations) {
        expect(evaluation.evaluation).toBeDefined()
        expect(evaluation.metrics).toBeDefined()
      }
    })

    it('should maintain performance with large conversation histories', async () => {
      const largeHistory: AIMessage[] = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        name: i % 2 === 0 ? 'user' : 'assistant',
      }))

      const context = metaAligner.detectContext('Current query', largeHistory)
      expect(context.conversationHistory).toBeDefined()

      const evaluation = await metaAligner.evaluateResponse({
        response: 'Response to large conversation',
        context,
      })

      expect(evaluation.evaluation).toBeDefined()
      expect(evaluation.metrics).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed responses gracefully', async () => {
      const malformedResponses = ['', null, undefined, '\n\n\n', '   ']

      for (const response of malformedResponses) {
        const evaluation = await metaAligner.evaluateResponse({
          response: response as string,
          context: {
            userQuery: 'Test query',
            detectedContext: ContextType.GENERAL,
          },
        })

        expect(evaluation.evaluation).toBeDefined()
        expect(evaluation.evaluation.overallScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.evaluation.overallScore).toBeLessThanOrEqual(1)
      }
    })

    it('should validate objective consistency', async () => {
      const context: AlignmentContext = {
        userQuery: 'Test query',
        detectedContext: ContextType.GENERAL,
      }

      const evaluation = await metaAligner.evaluateResponse({
        response: 'Test response',
        context,
      })

      // All objectives should have consistent structure
      for (const [objectiveId, result] of Object.entries(
        evaluation.evaluation.objectiveResults,
      )) {
        expect(result.objectiveId).toBe(objectiveId)
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(1)
        expect(result.confidence).toBeGreaterThanOrEqual(0)
        expect(result.confidence).toBeLessThanOrEqual(1)
        expect(result.explanation).toBeTruthy()
        expect(typeof result.explanation).toBe('string')
      }
    })
  })
})
