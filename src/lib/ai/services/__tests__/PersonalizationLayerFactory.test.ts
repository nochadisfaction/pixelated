import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PersonalizationLayerFactory } from '../PersonalizationLayerFactory'
import { PersonalizationServiceImpl } from '../PersonalizationServiceImpl'

// Mock dependencies
const mockRepository = {
  getClientProfile: vi.fn(),
} as any

const mockEfficacyService = {
  getClientEfficacyMetrics: vi.fn(),
  trackTechniqueAdaptation: vi.fn(),
} as any

const mockRedisService = {
  get: vi.fn(),
  set: vi.fn(),
} as any

describe('PersonalizationLayerFactory', () => {
  let factory: PersonalizationLayerFactory

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()

    // Create factory instance
    factory = new PersonalizationLayerFactory(
      mockRepository,
      mockEfficacyService,
      mockRedisService,
    )
  })

  describe('createPersonalizationLayer', () => {
    it('should create a personalization layer with default config', () => {
      // Call the method
      const layer = factory.createPersonalizationLayer()

      // Verify result is a PersonalizationService
      expect(layer).toBeDefined()
      expect(layer).toBeInstanceOf(PersonalizationServiceImpl)
    })

    it('should create a personalization layer with enhanced config', () => {
      // Call the method with enhanced type
      const layer = factory.createPersonalizationLayer({
        layerType: 'enhanced',
      })

      // Verify result is a PersonalizationService
      expect(layer).toBeDefined()
      expect(layer).toBeInstanceOf(PersonalizationServiceImpl)
    })

    it('should create a personalization layer with custom config', () => {
      // Call the method with custom config
      const layer = factory.createPersonalizationLayer({
        layerType: 'custom',
        enabledStrategies: ['preference-based', 'efficacy-based'],
        weights: {
          preference: 0.5,
          efficacy: 0.5,
          characteristics: 0,
          contextual: 0,
          learning: 0,
        },
      })

      // Verify result is a PersonalizationService
      expect(layer).toBeDefined()
      expect(layer).toBeInstanceOf(PersonalizationServiceImpl)
    })
  })

  describe('createOptimalPersonalizationLayer', () => {
    it('should create optimal layer based on client data', async () => {
      // Setup mocks
      const mockProfile = {
        clientId: 'test-client',
        preferences: {
          learningStyle: 'visual',
          preferredApproaches: ['cbt', 'mindfulness'],
        },
        characteristics: {
          cognitiveLevel: 'high',
        },
        demographic: {
          culture: 'western',
          age: 35,
        },
        history: {
          pastTechniques: [
            {
              techniqueId: 'tech-1',
              techniqueName: 'CBT Exercise',
              efficacy: 0.8,
              usageCount: 5,
              lastUsed: new Date(),
            },
          ],
        },
      }

      const mockEfficacyData = {
        sessionCount: 12,
        techniqueEfficacy: [{ techniqueId: 'tech-1', efficacy: 0.8 }],
      }

      mockRepository.getClientProfile.mockResolvedValue(mockProfile)
      mockEfficacyService.getClientEfficacyMetrics.mockResolvedValue(
        mockEfficacyData,
      )

      // Call the method
      const layer =
        await factory.createOptimalPersonalizationLayer('test-client')

      // Verify mocks were called
      expect(mockRepository.getClientProfile).toHaveBeenCalledWith(
        'test-client',
      )
      expect(mockEfficacyService.getClientEfficacyMetrics).toHaveBeenCalledWith(
        'test-client',
      )

      // Verify result is a PersonalizationService
      expect(layer).toBeDefined()
      expect(layer).toBeInstanceOf(PersonalizationServiceImpl)
    })

    it('should fall back to standard config if client profile not found', async () => {
      // Setup mock to return null profile
      mockRepository.getClientProfile.mockResolvedValue(null)

      // Call the method
      const layer =
        await factory.createOptimalPersonalizationLayer('unknown-client')

      // Verify mock was called
      expect(mockRepository.getClientProfile).toHaveBeenCalledWith(
        'unknown-client',
      )

      // Verify result is a PersonalizationService with default config
      expect(layer).toBeDefined()
      expect(layer).toBeInstanceOf(PersonalizationServiceImpl)
    })

    it('should handle errors gracefully', async () => {
      // Setup mock to throw error
      mockRepository.getClientProfile.mockRejectedValue(new Error('DB error'))

      // Call the method
      const layer =
        await factory.createOptimalPersonalizationLayer('test-client')

      // Verify mock was called
      expect(mockRepository.getClientProfile).toHaveBeenCalledWith(
        'test-client',
      )

      // Verify result is a PersonalizationService with default config
      expect(layer).toBeDefined()
      expect(layer).toBeInstanceOf(PersonalizationServiceImpl)
    })
  })
})
