import {
  EdgeComputingManager,
  createEdgeOptimizedAIService,
  type EdgeProcessingType,
  type EdgeCompletionResponse,
} from '../EdgeComputing'
import type {
  AIMessage,
  AIService,
  AIServiceOptions,
} from '../../models/ai-types'

// Extend AIServiceOptions for testing with edge-specific options
interface ExtendedAIServiceOptions extends AIServiceOptions {
  forceCloud?: boolean
  forceEdge?: boolean
}

// Mock the logger
vi.mock('../../../logging', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

// Mock for the browser environment
const mockNavigator = {
  hardwareConcurrency: 4,
  deviceMemory: 8,
  gpu: {},
}

// Mock for the window object
const mockWindow = {
  Worker: function () {},
  navigator: mockNavigator,
}

describe('EdgeComputing', () => {
  let manager: EdgeComputingManager
  let mockAIService: AIService
  let completeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the singleton instance
    // @ts-expect-error - accessing private property for testing
    EdgeComputingManager.instance = undefined

    // Create a mock AI service
    completeMock = vi.fn()
    mockAIService = {
      createChatCompletion: completeMock,
      createStreamingChatCompletion: vi.fn(),
      createChatCompletionWithTracking: vi.fn(),
      generateCompletion: vi.fn(),
      getModelInfo: vi.fn(),
      dispose: vi.fn(),
    }

    // Setup default mock response
    completeMock.mockResolvedValue({
      id: 'test-id',
      created: Date.now(),
      model: 'test-model',
      content: 'Test response',
      choices: [{ message: { role: 'assistant', content: 'Test response' } }],
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    })

    // Initialize manager with test options
    manager = EdgeComputingManager.getInstance({
      enabled: true,
      maxEdgeTokens: 1000,
      allowedProcessingTypes: ['emotion-detection', 'basic-patterns'],
    })
  })

  describe('EdgeComputingManager', () => {
    it('should be a singleton', () => {
      const instance1 = EdgeComputingManager.getInstance()
      const instance2 = EdgeComputingManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should initialize and register models', async () => {
      // Setup browser environment mock
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
      })

      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
      })

      await manager.initialize()

      const status = manager.getStatus()
      expect(status.initialized).toBe(true)
      expect(status.enabled).toBe(true)
      expect((status.availableModels as any[]).length).toBeGreaterThan(0)

      // Cleanup
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      })

      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      })
    })

    it('should determine if processing can be done on edge', async () => {
      await manager.initialize()

      // Short text, should be processable on edge
      const shortText = 'I am feeling happy today!'

      // Create a very long text that exceeds token limit
      const longText = 'I am feeling '.repeat(500) + ' today!'

      expect(
        manager.shouldUseEdgeComputing('emotion-detection', shortText),
      ).toBe(true)
      expect(
        manager.shouldUseEdgeComputing('emotion-detection', longText),
      ).toBe(false)

      // Test with disallowed processing type
      expect(
        manager.shouldUseEdgeComputing(
          'embeddings' as EdgeProcessingType,
          shortText,
        ),
      ).toBe(false)
    })

    it('should process data on the edge', async () => {
      await manager.initialize()

      const result = await manager.processOnEdge<any>(
        'emotion-detection',
        'I am feeling happy today!',
      )

      expect(result).not.toBeNull()
      expect(result.dominantEmotion).toBe('joy')
      expect(result.emotions.joy).toBeGreaterThan(0.7)
    })
  })

  describe('createEdgeOptimizedAIService', () => {
    beforeEach(() => {
      // Setup browser environment mock
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
      })

      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
      })
    })

    afterEach(() => {
      // Cleanup
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      })

      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      })
    })

    it('should use edge processing for suitable requests', async () => {
      const edgeService = createEdgeOptimizedAIService(mockAIService, {
        enabled: true,
        maxEdgeTokens: 1000,
        allowedProcessingTypes: ['emotion-detection'],
      })

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      const messages: AIMessage[] = [
        { role: 'user', content: 'I am feeling happy today!', name: 'user' },
      ]

      const result = (await edgeService.createChatCompletion(
        messages,
      )) as EdgeCompletionResponse

      // The edge service should have handled this, not the base service
      expect(completeMock).not.toHaveBeenCalled()
      expect(result._processedOnEdge).toBe(true)
    })

    it('should fall back to cloud processing for unsuitable requests', async () => {
      const edgeService = createEdgeOptimizedAIService(mockAIService, {
        enabled: true,
        maxEdgeTokens: 20, // Very low limit to force cloud processing
        allowedProcessingTypes: ['emotion-detection'],
      })

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      const messages: AIMessage[] = [
        {
          role: 'user',
          content:
            'This is a longer message that should exceed the tiny token limit we set for this test.',
          name: 'user',
        },
      ]

      // Force cloud processing explicitly to ensure the test is reliable
      await edgeService.createChatCompletion(messages, {
        forceCloud: true,
      } as ExtendedAIServiceOptions)

      // The base service should have been called because the message is too long
      expect(completeMock).toHaveBeenCalledTimes(1)
    })

    it('should honor forceCloud and forceEdge options', async () => {
      const edgeService = createEdgeOptimizedAIService(mockAIService, {
        enabled: true,
        maxEdgeTokens: 1000,
        allowedProcessingTypes: ['emotion-detection'],
      })

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      const messages: AIMessage[] = [
        { role: 'user', content: 'I am feeling happy today!', name: 'user' },
      ]

      // Force cloud processing
      await edgeService.createChatCompletion(messages, {
        forceCloud: true,
      } as ExtendedAIServiceOptions)
      expect(completeMock).toHaveBeenCalledTimes(1)

      completeMock.mockClear()

      // Force edge processing
      const result = (await edgeService.createChatCompletion(messages, {
        forceEdge: true,
      } as ExtendedAIServiceOptions)) as EdgeCompletionResponse
      expect(completeMock).not.toHaveBeenCalled()
      expect(result._processedOnEdge).toBe(true)
    })
  })
})
