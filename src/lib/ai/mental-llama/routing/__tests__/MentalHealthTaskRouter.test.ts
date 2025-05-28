import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MentalHealthTaskRouter, type LLMInvoker } from '../MentalHealthTaskRouter'
import type { RoutingContext, } from '../MentalHealthTaskRouter'

describe('MentalHealthTaskRouter', () => {
  let mockLLMInvoker: LLMInvoker
  let router: MentalHealthTaskRouter

  beforeEach(() => {
    // Mock the LLM invoker to return a predefined response
    mockLLMInvoker = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        category: 'depression',
        confidence: 0.85,
        reasoning: 'The text mentions feeling sad and hopeless.'
      })
    })

    router = new MentalHealthTaskRouter(mockLLMInvoker)
  })

  describe('determineRoute', () => {
    it('should use explicit hint when provided', async () => {
      const text = 'I am feeling anxious about my upcoming exam.'
      const context: RoutingContext = {
        explicitTaskHint: 'anxiety'
      }

      const result = await router.determineRoute(text, context)

      expect(result.targetAnalyzer).toBe('anxiety')
      expect(result.routingMethod).toBe('explicit_hint')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('should detect crisis keywords', async () => {
      const text = 'I want to kill myself, I cannot go on anymore.'

      const result = await router.determineRoute(text)

      expect(result.targetAnalyzer).toBe('crisis')
      expect(result.routingMethod).toBe('keyword')
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.preliminaryInsights?.is_critical_flag).toBe(true)
    })

    it('should use LLM classification when no keywords match', async () => {
      const text = 'I have been feeling down lately and nothing seems enjoyable.'

      const result = await router.determineRoute(text)

      expect(result.targetAnalyzer).toBe('depression')
      expect(result.routingMethod).toBe('classification')
      expect(result.confidence).toBeCloseTo(0.85)
    })

    it('should apply contextual rules when session type is provided', async () => {
      const text = 'I am feeling a bit overwhelmed with everything.'
      const context: RoutingContext = {
        sessionType: 'stress_management_session'
      }

      const result = await router.determineRoute(text, context)

      expect(result.targetAnalyzer).toBe('stress')
      expect(result.routingMethod).toBe('contextual')
    })

    it('should handle LLM errors gracefully', async () => {
      // Override the mock to simulate an error
      mockLLMInvoker.mockRejectedValueOnce(new Error('LLM service unavailable'))

      const text = 'I am feeling quite sad today.'

      const result = await router.determineRoute(text)

      // Should fall back to keyword matching or general fallback
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should apply fallback mechanisms for low confidence decisions', async () => {
      // Override the mock to return low confidence
      mockLLMInvoker.mockResolvedValueOnce({
        content: JSON.stringify({
          category: 'unknown',
          confidence: 0.3
        })
      })

      const text = 'Just checking in.'

      const result = await router.determineRoute(text)

      // Should apply fallback for low confidence
      expect(result.targetAnalyzer).toBe('general_mental_health')
      expect(result.routingMethod).toBe('fallback')
    })

    it('should combine keyword and classification when they agree', async () => {
      // Set up a scenario where both keyword and classification would point to anxiety
      mockLLMInvoker.mockResolvedValueOnce({
        content: JSON.stringify({
          category: 'anxiety',
          confidence: 0.8
        })
      })

      const text = 'I am feeling very anxious and worried about everything.'

      const result = await router.determineRoute(text)

      expect(result.targetAnalyzer).toBe('anxiety')
      expect(result.routingMethod).toBe('keyword+classification')
      expect(result.confidence).toBeGreaterThan(0.8) // Should be boosted when both agree
    })

    it('should handle very short texts appropriately', async () => {
      const text = 'Hi.'

      const result = await router.determineRoute(text)

      expect(result.targetAnalyzer).toBe('unknown')
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should prioritize crisis detection over other categories', async () => {
      // Set up a scenario where LLM says depression but keywords indicate crisis
      mockLLMInvoker.mockResolvedValueOnce({
        content: JSON.stringify({
          category: 'depression',
          confidence: 0.9
        })
      })

      const text = 'I am depressed and I want to end my life.'

      const result = await router.determineRoute(text)

      expect(result.targetAnalyzer).toBe('crisis')
      expect(result.preliminaryInsights?.is_critical_flag).toBe(true)
    })
  })
}) 