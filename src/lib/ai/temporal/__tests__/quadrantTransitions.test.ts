import {
  detectQuadrantTransitions,
  analyzeQuadrantTransitions,
} from '../quadrantTransitions'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'
import type { QuadrantTransitionPattern } from '../types'

describe('quadrantTransitions', () => {
  describe('detectQuadrantTransitions', () => {
    it('should return empty array for empty input', () => {
      const result = detectQuadrantTransitions([])
      expect(result).toEqual([])
    })

    it('should return empty array for single point', () => {
      const point: DimensionalEmotionMap = {
        timestamp: new Date().toISOString(),
        pleasure: 0.5,
        arousal: 0.5,
        dominance: 0.5,
      }
      const result = detectQuadrantTransitions([point])
      expect(result).toEqual([])
    })

    it('should detect transition between quadrants', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5, // Q1: High pleasure, high arousal
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.5, // Q2: High pleasure, low arousal
          arousal: -0.5,
          dominance: 0.5,
        },
      ]

      const result = detectQuadrantTransitions(points)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'quadrant_transition',
        fromQuadrant: 'Q1',
        toQuadrant: 'Q2',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:30:00Z'),
      })
      expect(result[0].clinicalInterpretation).toBeDefined()
    })

    it('should handle data with primaryVector format', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          primaryVector: {
            pleasure: 0.5, // Q1: High pleasure, high arousal
            arousal: 0.5,
            dominance: 0.5,
          },
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          primaryVector: {
            pleasure: -0.5, // Q4: Low pleasure, high arousal
            arousal: 0.5,
            dominance: 0.5,
          },
        },
      ]

      const result = detectQuadrantTransitions(points)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'quadrant_transition',
        fromQuadrant: 'Q1',
        toQuadrant: 'Q4',
      })
    })

    it('should handle data with valence instead of pleasure', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.5, // Q1: High valence, high arousal
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: -0.5, // Q4: Low valence, high arousal
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const result = detectQuadrantTransitions(points)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        fromQuadrant: 'Q1',
        toQuadrant: 'Q4',
      })
    })

    it('should not detect transition for points in same quadrant', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.6,
          arousal: 0.4,
          dominance: 0.3,
        },
      ]

      const result = detectQuadrantTransitions(points)
      expect(result).toHaveLength(0)
    })

    it('should only detect transitions above minimum strength threshold', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.1, // Q1, but very close to boundary
          arousal: 0.1,
          dominance: 0,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: -0.1, // Q4, but very close to Q1
          arousal: 0.1,
          dominance: 0,
        },
      ]

      // With default threshold
      let result = detectQuadrantTransitions(points)
      expect(result).toHaveLength(0)

      // With very low threshold
      result = detectQuadrantTransitions(points, 0.01)
      expect(result).toHaveLength(1)
    })

    it('should detect multiple transitions', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5, // Q1
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.5, // Q2
          arousal: -0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: -0.5, // Q3
          arousal: -0.5,
          dominance: 0.5,
        },
      ]

      const result = detectQuadrantTransitions(points)
      expect(result).toHaveLength(2)
      expect(result[0].fromQuadrant).toBe('Q1')
      expect(result[0].toQuadrant).toBe('Q2')
      expect(result[1].fromQuadrant).toBe('Q2')
      expect(result[1].toQuadrant).toBe('Q3')
    })

    it('should assign higher strength to clinically significant transitions', () => {
      // Diagonal transitions (Q1->Q3) should have higher strength
      const diagonalPoints: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5, // Q1
          arousal: 0.5,
          dominance: 0,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: -0.5, // Q3
          arousal: -0.5,
          dominance: 0,
        },
      ]

      // Non-diagonal transitions with similar distance
      const nonDiagonalPoints: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5, // Q1
          arousal: 0.5,
          dominance: 0,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.5, // Q2
          arousal: -0.5,
          dominance: 0,
        },
      ]

      const diagonalResult = detectQuadrantTransitions(diagonalPoints)
      const nonDiagonalResult = detectQuadrantTransitions(nonDiagonalPoints)

      expect(diagonalResult[0].strength).toBeGreaterThan(
        nonDiagonalResult[0].strength,
      )
    })
  })

  describe('analyzeQuadrantTransitions', () => {
    it('should return empty array for empty input', () => {
      const result = analyzeQuadrantTransitions([])
      expect(result).toEqual([])
    })

    it('should generate insights for a single transition', () => {
      const transitions: QuadrantTransitionPattern[] = [
        {
          type: 'quadrant_transition',
          fromQuadrant: 'Q1',
          toQuadrant: 'Q3',
          strength: 0.8,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T10:30:00Z'),
          description:
            'Transition from Excited, Elated, Enthusiastic to Depressed, Bored, Fatigued',
          clinicalInterpretation:
            'Major shift from positive-activated to negative-deactivated (significant mood deterioration)',
        },
      ]

      const insights = analyzeQuadrantTransitions(transitions)
      expect(insights.length).toBeGreaterThan(0)
      expect(insights[0]).toContain('Most significant emotional transition')
      expect(insights[1]).toContain('Clinical significance')
    })

    it('should identify recurring patterns', () => {
      const transitions: QuadrantTransitionPattern[] = [
        {
          type: 'quadrant_transition',
          fromQuadrant: 'Q1',
          toQuadrant: 'Q4',
          strength: 0.6,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T10:30:00Z'),
          description: 'Transition from Excited to Frustrated',
          clinicalInterpretation:
            'Mood deterioration with continued activation',
        },
        {
          type: 'quadrant_transition',
          fromQuadrant: 'Q4',
          toQuadrant: 'Q1',
          strength: 0.7,
          startTime: new Date('2025-01-01T11:00:00Z'),
          endTime: new Date('2025-01-01T11:30:00Z'),
          description: 'Transition from Frustrated to Excited',
          clinicalInterpretation: 'Mood improvement with maintained energy',
        },
        {
          type: 'quadrant_transition',
          fromQuadrant: 'Q1',
          toQuadrant: 'Q4',
          strength: 0.5,
          startTime: new Date('2025-01-01T12:00:00Z'),
          endTime: new Date('2025-01-01T12:30:00Z'),
          description: 'Transition from Excited to Frustrated',
          clinicalInterpretation:
            'Mood deterioration with continued activation',
        },
      ]

      const insights = analyzeQuadrantTransitions(transitions)
      const hasPatternsInsight = insights.some(
        (insight) =>
          insight.includes('Recurring pattern') &&
          insight.includes('transitions from'),
      )
      expect(hasPatternsInsight).toBe(true)
    })

    it('should detect emotional volatility', () => {
      // Create transitions that happen in quick succession
      const volatileTransitions: QuadrantTransitionPattern[] = []
      const baseTime = new Date('2025-01-01T10:00:00Z').getTime()

      // Create 5 transitions over 30 minutes (high volatility)
      const quadrants = ['Q1', 'Q2', 'Q3', 'Q4']
      for (let i = 0; i < 4; i++) {
        volatileTransitions.push({
          type: 'quadrant_transition',
          fromQuadrant: quadrants[i],
          toQuadrant: quadrants[(i + 1) % 4],
          strength: 0.5,
          startTime: new Date(baseTime + i * 6 * 60000),
          endTime: new Date(baseTime + (i + 1) * 6 * 60000),
          description: `Transition from ${quadrants[i]} to ${quadrants[(i + 1) % 4]}`,
          clinicalInterpretation: 'Test interpretation',
        })
      }

      const insights = analyzeQuadrantTransitions(volatileTransitions)
      const hasVolatilityInsight = insights.some(
        (insight) =>
          insight.includes('volatility') || insight.includes('instability'),
      )
      expect(hasVolatilityInsight).toBe(true)
    })
  })
})
