import type { TherapyAIProvider } from '../../interfaces/therapy';
import type { FHEService } from '../../../fhe';
import { MentalArenaAdapter } from '../MentalArenaAdapter';
import { MentalArenaFactory } from '../MentalArenaFactory';
import { MentalArenaPythonBridge } from '../PythonBridge'; // Assuming this is the class for `as unknown as MentalArenaPythonBridge`

// Mock dependencies
vi.mock('../../../logging', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('../MentalArenaFactory', () => ({
  MentalArenaFactory: {
    getPythonBridge: vi.fn(),
  },
}))

describe('MentalArenaAdapter', () => {
  // Mock provider and FHE service
  const mockProvider = {
    generateIntervention: vi.fn(),
    analyzeEmotions: vi.fn().mockResolvedValue({
      emotions: [{ name: 'neutral', score: 0.8 }],
      dominantEmotion: 'neutral',
    }),
  }

  const mockFHEService = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  }

  // Mock Python bridge
  const mockPythonBridge = {
    initialize: vi.fn().mockResolvedValue(true),
    createJsonInputFile: vi.fn().mockImplementation((data: unknown, filename: string) => {
      return Promise.resolve(`/tmp/${filename}`)
    }),
    fineTuneModel: vi.fn().mockResolvedValue(
      JSON.stringify({
        model_path: '/tmp/models/test-model',
        training_time: 120.5,
        status: 'success',
      }),
    ),
  }

  let adapter: MentalArenaAdapter

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup adapter with Python bridge enabled
    adapter = new MentalArenaAdapter(
      mockProvider as unknown as TherapyAIProvider,
      mockFHEService as unknown as FHEService,
      'http://localhost:8000',
      'test-api-key',
      true, // Enable Python bridge
    )

    // Mock isPythonBridgeAvailable to return true
    ;(vi as any).spyOn(adapter, 'isPythonBridgeAvailable' as any).mockReturnValue(true)

    // Setup Python bridge mock
    ;(vi as any).mocked(MentalArenaFactory.getPythonBridge).mockResolvedValue(
      mockPythonBridge as unknown as MentalArenaPythonBridge,
    )
  })

  afterEach(() => {
    (vi as any).resetAllMocks()
  })

  describe('fineTuneModelWithPythonBridge', () => {
    it('should throw an error if Python bridge is not available', async () => {
      // Mock isPythonBridgeAvailable to return false for this test
      (vi as any).spyOn(adapter, 'isPythonBridgeAvailable' as any).mockReturnValueOnce(
        false,
      )

      const testData = [
        {
          patientText: 'I feel anxious',
          therapistText: 'Tell me more about your anxiety',
        },
      ]

      const modelConfig = {
        baseModel: 'llama-3-8b',
        newModelName: 'test-model',
        epochs: 3,
      }

      await expect(
        (adapter as any).fineTuneModelWithPythonBridge(testData, modelConfig),
      ).rejects.toThrow('Python bridge required but not available')
    })

    it('should format data and call Python bridge for fine-tuning', async () => {
      const testData = [
        {
          patientText: 'I feel anxious all the time',
          therapistText:
            'That sounds difficult. When did you first notice this anxiety?',
          encodedSymptoms: [
            {
              name: 'anxiety',
              severity: 0.8,
              duration: '2 months',
              manifestations: [],
              cognitions: [],
            },
          ],
          decodedSymptoms: ['anxiety'],
        },
        {
          patientText: 'I have trouble sleeping',
          therapistText: 'How long have you been experiencing sleep issues?',
          encodedSymptoms: [
            {
              name: 'insomnia',
              severity: 0.7,
              duration: '3 weeks',
              manifestations: [],
              cognitions: [],
            },
          ],
          decodedSymptoms: ['insomnia'],
        },
      ]

      const modelConfig = {
        baseModel: 'llama-3-8b',
        newModelName: 'therapy-model-v1',
        epochs: 3,
        outputPath: '/custom/output/path',
      }

      // Execute the method
      await (adapter as any).fineTuneModelWithPythonBridge(
        testData,
        modelConfig,
      )

      // Verify Python bridge interactions
      expect(MentalArenaFactory.getPythonBridge).toHaveBeenCalled()

      // Verify data formatting and file creation
      expect(mockPythonBridge.createJsonInputFile).toHaveBeenCalledTimes(1)
      expect(mockPythonBridge.createJsonInputFile.mock.calls[0][0]).toEqual([
        {
          instruction: 'I feel anxious all the time',
          response:
            'That sounds difficult. When did you first notice this anxiety?',
        },
        {
          instruction: 'I have trouble sleeping',
          response: 'How long have you been experiencing sleep issues?',
        },
      ])
      expect(mockPythonBridge.createJsonInputFile.mock.calls[0][1]).toMatch(
        /finetune_dataset_\d+\.jsonl/,
      )

      // Verify fine-tune process execution
      expect(mockPythonBridge.fineTuneModel).toHaveBeenCalledTimes(1)
      expect(mockPythonBridge.fineTuneModel.mock.calls[0][0]).toMatchObject({
        baseModel: 'llama-3-8b',
        newName: 'therapy-model-v1',
        nepoch: 3,
      })
    })

    it('should handle fine-tuning errors properly', async () => {
      // Mock Python bridge to throw an error
      (vi as any).mocked(mockPythonBridge.fineTuneModel).mockRejectedValueOnce(
        new Error('CUDA out of memory'),
      )

      const testData = [
        {
          patientText: 'I feel sad',
          therapistText: 'I understand that must be difficult',
        },
      ]

      const modelConfig = {
        baseModel: 'llama-3-8b',
        newModelName: 'test-model',
        epochs: 3,
      }

      // Execute and verify error handling
      await expect(
        (adapter as any).fineTuneModelWithPythonBridge(testData, modelConfig),
      ).rejects.toThrow('Fine-tuning failed: CUDA out of memory')
    })

    it('should handle non-JSON results from Python bridge', async () => {
      // Mock Python bridge to return a non-JSON string
      (vi as any).mocked(mockPythonBridge.fineTuneModel).mockResolvedValueOnce(
        'Training progress: 100%. Model saved to /tmp/models/test-model',
      )

      const testData = [
        {
          patientText: 'I feel sad',
          therapistText: 'I understand that must be difficult',
        },
      ]

      const modelConfig = {
        baseModel: 'llama-3-8b',
        newModelName: 'test-model',
        epochs: 3,
      }

      // Execute the method, should not throw
      await (adapter as any).fineTuneModelWithPythonBridge(
        testData,
        modelConfig,
      )

      // Verification would check logs, which we're not testing here
      // But the function should complete without throwing
    })
  })
})
