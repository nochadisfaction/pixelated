import { detectOscillations } from '../oscillations'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'

describe('oscillations', () => {
  describe('detectOscillations', () => {
    it('should return empty array for empty input', () => {
      const result = detectOscillations([], 'pleasure')
      expect(result).toEqual([])
    })

    it('should return empty array for too few points', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.7,
          arousal: 0.3,
          dominance: 0.4,
        },
      ]
      const result = detectOscillations(points, 'pleasure')
      expect(result).toEqual([])
    })

    it('should detect simple oscillation pattern', () => {
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
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          pleasure: 0.9,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T12:00:00Z').toISOString(),
          pleasure: 0.3,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const result = detectOscillations(points, 'pleasure')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'oscillation',
        dimension: 'pleasure',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T12:00:00Z'),
      })
      expect(result[0].strength).toBeGreaterThan(0)
    })

    it('should not detect oscillation below minimum amplitude', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          pleasure: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          pleasure: 0.55,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.45,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          pleasure: 0.52,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const result = detectOscillations(points, 'pleasure', 0.2)
      expect(result).toHaveLength(0)
    })

    it('should detect oscillations in all dimensions', () => {
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
          dominance: 0.8,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.2,
          dominance: 0.2,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          pleasure: 0.9,
          arousal: 0.9,
          dominance: 0.9,
        },
      ]

      const dimensions: Array<'pleasure' | 'arousal' | 'dominance'> = [
        'pleasure',
        'arousal',
        'dominance',
      ]

      dimensions.forEach((dimension) => {
        const result = detectOscillations(points, dimension)
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          type: 'oscillation',
          dimension,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:30:00Z'),
        })
        expect(result[0].strength).toBeGreaterThan(0)
      })
    })

    it('should include frequency in description', () => {
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
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          pleasure: 0.2,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const result = detectOscillations(points, 'pleasure')
      expect(result).toHaveLength(1)
      expect(result[0].description).toMatch(/frequency of \d+\.\d+ per hour/)
    })
  })
})
