import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'

describe('patternDetection', () => {
  describe('detectTemporalPatterns', () => {
    it('should detect oscillation patterns in emotional data', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.8,
          arousal: 0.8,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.2,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          pleasure: 0.9,
          arousal: 0.9,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const oscillations = patterns.filter((p) => p.type === 'oscillation')

      expect(oscillations).toHaveLength(2) // One for pleasure, one for arousal
      expect(oscillations.map((o) => o.dimension)).toContain('pleasure')
      expect(oscillations.map((o) => o.dimension)).toContain('arousal')
    })

    it('should detect both quadrant transitions and oscillations', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.8,
          arousal: 0.8,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.2,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.8,
          arousal: 0.8,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const oscillations = patterns.filter((p) => p.type === 'oscillation')
      const transitions = patterns.filter(
        (p) => p.type === 'quadrantTransition',
      )

      expect(oscillations.length).toBeGreaterThan(0)
      expect(transitions.length).toBeGreaterThan(0)
    })
  })

  describe('analyzePatterns', () => {
    it('should analyze oscillation patterns and generate insights', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.8,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.9,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const analysis = analyzePatterns(patterns)

      expect(analysis.insights).toBeDefined()
      expect(analysis.insights.length).toBeGreaterThan(0)
      expect(analysis.insights.some((i) => i.includes('oscillation'))).toBe(
        true,
      )
    })

    it('should combine insights from different pattern types', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.8,
          arousal: 0.8,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.2,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.8,
          arousal: 0.8,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const analysis = analyzePatterns(patterns)

      expect(analysis.insights).toBeDefined()
      expect(analysis.insights.length).toBeGreaterThan(1)
      expect(analysis.insights.some((i) => i.includes('oscillation'))).toBe(
        true,
      )
      expect(analysis.insights.some((i) => i.includes('transition'))).toBe(true)
    })

    it('should handle empty pattern list', () => {
      const analysis = analyzePatterns([])
      expect(analysis.insights).toEqual([])
    })

    it('should prioritize stronger patterns in insights', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.9,
          arousal: 0.6,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.1,
          arousal: 0.4,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const analysis = analyzePatterns(patterns)

      // Pleasure has stronger oscillation than arousal
      const pleasureIndex = analysis.insights.findIndex(
        (i) => i.includes('pleasure') && i.includes('oscillation'),
      )
      const arousalIndex = analysis.insights.findIndex(
        (i) => i.includes('arousal') && i.includes('oscillation'),
      )

      expect(pleasureIndex).toBeLessThan(arousalIndex)
    })
  })
})
