import type { FHEService } from '../../fhe'
import type { TherapyAIProvider } from '../interfaces/therapy'
import { MentalArenaAdapter } from './MentalArenaAdapter'
import {
  MentalArenaPythonBridge,
  type PythonBridgeConfig,
} from './PythonBridge'
import { getLogger } from '../../logging'

const logger = getLogger()

/**
 * Factory for creating MentalArena adapters
 * Provides convenient methods to create and configure adapters
 */
export class MentalArenaFactory {
  /**
   * Create a MentalArena adapter from environment variables
   */
  static async createFromEnv(
    provider: TherapyAIProvider,
    fheService: FHEService,
  ): Promise<MentalArenaAdapter> {
    // Read configuration from environment
    const baseUrl = process.env.EMOTION_LLAMA_API_URL || 'http://localhost:8000'
    const apiKey = process.env.EMOTION_LLAMA_API_KEY || ''
    const usePythonBridge =
      process.env.MENTAL_ARENA_USE_PYTHON_BRIDGE === 'true'

    logger.info('Creating MentalArena adapter from environment', {
      baseUrl,
      usePythonBridge,
    })

    // Initialize Python bridge if enabled
    if (usePythonBridge) {
      try {
        await MentalArenaFactory.getPythonBridge() // Initialize from env variables
        logger.info('Python bridge initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize Python bridge', { error })
        throw new Error(
          'Python bridge initialization failed: ' +
            (error instanceof Error ? error.message : String(error)),
        )
      }
    }

    // Create and return the adapter
    return new MentalArenaAdapter(
      provider,
      fheService,
      baseUrl,
      apiKey,
      usePythonBridge,
    )
  }

  /**
   * Create a MentalArena adapter with Python bridge
   */
  static async createWithPythonBridge(
    provider: TherapyAIProvider,
    fheService: FHEService,
    config: {
      baseUrl: string
      apiKey: string
      pythonPath: string
      mentalArenaPath: string
      venvName?: string
      outputDir?: string
    },
  ): Promise<MentalArenaAdapter> {
    const {
      baseUrl,
      apiKey,
      pythonPath,
      mentalArenaPath,
      venvName,
      outputDir,
    } = config

    logger.info('Creating MentalArena adapter with Python bridge', {
      baseUrl,
      pythonPath,
      mentalArenaPath,
    })

    // Initialize and cache Python bridge
    MentalArenaFactory.pythonBridgeInstance =
      await MentalArenaFactory.initializePythonBridge({
        pythonPath,
        mentalArenaPath,
        venvName,
        outputDir,
      })

    // Create and return the adapter
    return new MentalArenaAdapter(
      provider,
      fheService,
      baseUrl,
      apiKey,
      true, // Enable Python bridge
    )
  }

  /**
   * Initialize the Python bridge
   */
  static async initializePythonBridge(
    config: PythonBridgeConfig,
  ): Promise<MentalArenaPythonBridge> {
    logger.info('Initializing Python bridge', { ...config })

    const bridge = new MentalArenaPythonBridge(config)
    const success = await bridge.initialize()

    if (!success) {
      throw new Error('Failed to initialize Python bridge')
    }

    return bridge
  }

  /**
   * Create an adapter for a specific model
   */
  static async createForModel(
    modelName: string,
    provider: TherapyAIProvider,
    fheService: FHEService,
  ): Promise<MentalArenaAdapter> {
    // Different configurations based on model
    switch (modelName) {
      case 'gpt-3.5-turbo':
      case 'gpt-4':
        return new MentalArenaAdapter(
          provider,
          fheService,
          'https://api.openai.com/v1',
          process.env.OPENAI_API_KEY || '',
          false,
        )

      case 'llama-3-8b':
      case 'meta-llama/Meta-Llama-3-8B':
        // Use Python bridge for Llama models
        if (process.env.MENTAL_ARENA_PATH) {
          return MentalArenaFactory.createWithPythonBridge(
            provider,
            fheService,
            {
              baseUrl: 'https://api.together.xyz',
              apiKey: process.env.TOGETHER_API_KEY || '',
              pythonPath: process.env.PYTHON_PATH || 'python3',
              mentalArenaPath: process.env.MENTAL_ARENA_PATH,
              venvName: 'venv',
            },
          )
        } else {
          // Fallback without Python bridge
          return new MentalArenaAdapter(
            provider,
            fheService,
            'https://api.together.xyz',
            process.env.TOGETHER_API_KEY || '',
            false,
          )
        }

      default:
        // Default configuration
        return MentalArenaFactory.createFromEnv(provider, fheService)
    }
  }

  /**
   * Get a singleton instance of the Python bridge
   * This ensures we reuse the same bridge throughout the application
   */
  private static pythonBridgeInstance: MentalArenaPythonBridge | null = null

  static async getPythonBridge(
    config?: PythonBridgeConfig,
  ): Promise<MentalArenaPythonBridge> {
    if (!MentalArenaFactory.pythonBridgeInstance && config) {
      MentalArenaFactory.pythonBridgeInstance =
        await MentalArenaFactory.initializePythonBridge(config)
    } else if (!MentalArenaFactory.pythonBridgeInstance) {
      // Create from environment variables if not passed
      const mentalArenaPath = process.env.MENTAL_ARENA_PATH
      if (!mentalArenaPath) {
        throw new Error('MENTAL_ARENA_PATH environment variable is required')
      }

      MentalArenaFactory.pythonBridgeInstance =
        await MentalArenaFactory.initializePythonBridge({
          pythonPath: process.env.PYTHON_PATH || 'python3',
          mentalArenaPath,
          venvName: process.env.MENTAL_ARENA_VENV || 'venv',
        })
    }

    return MentalArenaFactory.pythonBridgeInstance
  }
}
