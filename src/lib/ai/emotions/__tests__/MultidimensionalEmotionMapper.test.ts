import { MultidimensionalEmotionMapper } from '../MultidimensionalEmotionMapper'
import type { EmotionAnalysis, EmotionData } from '../types'

describe('MultidimensionalEmotionMapper', () => {
  let mapper: MultidimensionalEmotionMapper

  beforeEach(() => {
    mapper = new MultidimensionalEmotionMapper()

    // Mock the database methods if needed
    vi.mock('../database', () => ({
      storeDimensionalMapping: vi.fn().mockResolvedValue(true),
    }))
  })

  it('should create an instance of MultidimensionalEmotionMapper', () => {
    expect(mapper).toBeInstanceOf(MultidimensionalEmotionMapper)
  })

  it('should map joy to positive valence and moderate arousal', () => {
    const joyEmotion: EmotionData = {
      type: 'joy',
      confidence: 0.9,
      intensity: 0.8,
    }

    const mapping = mapper.mapEmotionToDimensions(joyEmotion)

    expect(mapping).toBeDefined()
    expect(mapping.valence).toBeGreaterThan(0.5) // Positive valence
    expect(mapping.arousal).toBeGreaterThan(0.3) // Moderate arousal
    expect(mapping.dominance).toBeGreaterThan(0.5) // Moderate-high dominance
  })

  it('should map sadness to negative valence and low arousal', () => {
    const sadnessEmotion: EmotionData = {
      type: 'sadness',
      confidence: 0.85,
      intensity: 0.7,
    }

    const mapping = mapper.mapEmotionToDimensions(sadnessEmotion)

    expect(mapping).toBeDefined()
    expect(mapping.valence).toBeLessThan(0) // Negative valence
    expect(mapping.arousal).toBeLessThan(0) // Low arousal
    expect(mapping.dominance).toBeLessThan(0) // Low dominance
  })

  it('should map anger to negative valence and high arousal', () => {
    const angerEmotion: EmotionData = {
      type: 'anger',
      confidence: 0.8,
      intensity: 0.9,
    }

    const mapping = mapper.mapEmotionToDimensions(angerEmotion)

    expect(mapping).toBeDefined()
    expect(mapping.valence).toBeLessThan(0) // Negative valence
    expect(mapping.arousal).toBeGreaterThan(0.5) // High arousal
    expect(mapping.dominance).toBeGreaterThan(0.5) // High dominance
  })

  it('should map fear to negative valence and high arousal, low dominance', () => {
    const fearEmotion: EmotionData = {
      type: 'fear',
      confidence: 0.75,
      intensity: 0.8,
    }

    const mapping = mapper.mapEmotionToDimensions(fearEmotion)

    expect(mapping).toBeDefined()
    expect(mapping.valence).toBeLessThan(0) // Negative valence
    expect(mapping.arousal).toBeGreaterThan(0.3) // High arousal
    expect(mapping.dominance).toBeLessThan(0) // Low dominance
  })

  it('should combine multiple emotions with weighted importance', () => {
    const emotions: EmotionData[] = [
      { type: 'joy', confidence: 0.9, intensity: 0.8 }, // Primary emotion (high confidence)
      { type: 'surprise', confidence: 0.6, intensity: 0.5 }, // Secondary emotion (lower confidence)
    ]

    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-123',
      userId: 'user-abc',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: 'I am so happy about the surprise party!',
      emotions: emotions,
      overallSentiment: 0.75,
      riskFactors: [],
    }

    const mapping = mapper.createDimensionalMapping(mockAnalysis)

    expect(mapping).toBeDefined()
    expect(mapping.dimensions.valence).toBeGreaterThan(0.5) // Joy is dominant, so positive valence
    expect(mapping.dimensions.arousal).toBeGreaterThan(0) // Both emotions have some arousal
    expect(mapping.analysisId).toBe(mockAnalysis.id)
    expect(mapping.quadrant).toBe('positive-high') // Should be positive-high quadrant
  })

  it('should determine the correct quadrant based on dimensions', () => {
    // Test various dimension combinations and expected quadrants
    expect(
      mapper.determineQuadrant({ valence: 0.7, arousal: 0.6, dominance: 0.5 }),
    ).toBe('positive-high')
    expect(
      mapper.determineQuadrant({ valence: 0.6, arousal: -0.4, dominance: 0.3 }),
    ).toBe('positive-low')
    expect(
      mapper.determineQuadrant({
        valence: -0.7,
        arousal: 0.8,
        dominance: -0.2,
      }),
    ).toBe('negative-high')
    expect(
      mapper.determineQuadrant({
        valence: -0.5,
        arousal: -0.6,
        dominance: -0.7,
      }),
    ).toBe('negative-low')
  })

  it('should determine the dominant dimension based on absolute values', () => {
    expect(
      mapper.determineDominantDimension({
        valence: 0.8,
        arousal: 0.3,
        dominance: 0.2,
      }),
    ).toBe('valence')
    expect(
      mapper.determineDominantDimension({
        valence: 0.3,
        arousal: 0.9,
        dominance: 0.2,
      }),
    ).toBe('arousal')
    expect(
      mapper.determineDominantDimension({
        valence: 0.2,
        arousal: 0.3,
        dominance: 0.7,
      }),
    ).toBe('dominance')

    // Test with negative values (should use absolute magnitude)
    expect(
      mapper.determineDominantDimension({
        valence: -0.9,
        arousal: 0.5,
        dominance: 0.3,
      }),
    ).toBe('valence')
  })

  it('should store mapping in the database', async () => {
    const emotions: EmotionData[] = [
      { type: 'contentment', confidence: 0.85, intensity: 0.7 },
    ]

    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-456',
      userId: 'user-xyz',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: 'I feel content with my progress',
      emotions: emotions,
      overallSentiment: 0.6,
      riskFactors: [],
    }

    // Mock the database store function
    mapper.database.storeDimensionalMapping = vi
      .fn()
      .mockResolvedValue('mapping-id-123')

    const result = await mapper.mapAndStoreEmotions(mockAnalysis)

    expect(result).toBeDefined()
    expect(result.id).toBe('mapping-id-123')
    expect(mapper.database.storeDimensionalMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: mockAnalysis.id,
        dimensions: expect.any(Object),
        quadrant: expect.any(String),
        dominantDimension: expect.any(String),
      }),
    )
  })

  it('should handle an unknown emotion type gracefully', () => {
    const unknownEmotion: EmotionData = {
      type: 'unknown_emotion_type',
      confidence: 0.5,
      intensity: 0.5,
    }

    // Should not throw an error for unknown emotion types
    const mapping = mapper.mapEmotionToDimensions(unknownEmotion)

    // Should return a default neutral mapping
    expect(mapping).toBeDefined()
    expect(mapping.valence).toBe(0)
    expect(mapping.arousal).toBe(0)
    expect(mapping.dominance).toBe(0)
  })

  it('should correctly scale dimensions based on intensity', () => {
    const joyHighIntensity: EmotionData = {
      type: 'joy',
      confidence: 0.9,
      intensity: 0.9,
    }

    const joyLowIntensity: EmotionData = {
      type: 'joy',
      confidence: 0.9,
      intensity: 0.3,
    }

    const highMapping = mapper.mapEmotionToDimensions(joyHighIntensity)
    const lowMapping = mapper.mapEmotionToDimensions(joyLowIntensity)

    // Higher intensity should lead to more extreme dimension values
    expect(Math.abs(highMapping.valence)).toBeGreaterThan(
      Math.abs(lowMapping.valence),
    )
    expect(Math.abs(highMapping.arousal)).toBeGreaterThan(
      Math.abs(lowMapping.arousal),
    )
  })

  it('should normalize dimensions to a -1 to 1 range', () => {
    const mockDimensions = {
      valence: 2.5, // Beyond 1
      arousal: -3.2, // Beyond -1
      dominance: 0.5, // Within range
    }

    const normalized = mapper.normalizeDimensions(mockDimensions)

    expect(normalized.valence).toBeLessThanOrEqual(1)
    expect(normalized.valence).toBeGreaterThan(0) // Should still be positive
    expect(normalized.arousal).toBeGreaterThanOrEqual(-1)
    expect(normalized.arousal).toBeLessThan(0) // Should still be negative
    expect(normalized.dominance).toBe(0.5) // Should remain unchanged
  })
})
