import { fheService } from '@lib/fhe'
import { EmotionLlamaProvider } from '../providers/EmotionLlamaProvider'
import { createLogger } from '@utils/logger'
import { MentalLLaMAAdapter } from './MentalLLaMAAdapter'
import {
  MentalLLaMAPythonBridge,
  MentalLLaMAPythonBridgeConfig,
} from './PythonBridge'
import { MentalLLaMAModelProvider } from './MentalLLaMAModelProvider'

const logger = createLogger({ context: 'MentalLLaMAFactory' })

export interface MentalLLaMAConfig {
  baseUrl: string
  apiKey: string
  fheConfig: {
    keyPath: string
    certPath: string
  }
  providerConfig: {
    useExistingProvider?: boolean
    providerUrl?: string
    providerApiKey?: string
  }
  pythonConfig?: {
    pythonPath?: string
    mentalLLaMAPath?: string
    venvName?: string
    outputDir?: string
    logLevel?: 'debug' | 'info' | 'warning' | 'error'
    securityOptions?: {
      allowedCommands?: string[]
      disallowedArgs?: string[]
      sanitizeInput?: boolean
    }
  }
  modelConfig?: {
    useDirect7BModel?: boolean
    model7BApiUrl?: string
    model7BApiKey?: string
    model7BName?: string
    useDirect13BModel?: boolean
    model13BApiUrl?: string
    model13BApiKey?: string
    model13BName?: string
  }
}

export class MentalLLaMAFactory {
  /**
   * Create a MentalLLaMA adapter with all required dependencies
   */
  static async create(config: MentalLLaMAConfig): Promise<{
    adapter: MentalLLaMAAdapter
    pythonBridge?: MentalLLaMAPythonBridge
    modelProvider?: MentalLLaMAModelProvider
  }> {
    try {
      // Use the stub FHE service
      const fheServiceInstance = fheService

      // Create or use existing provider
      let provider: EmotionLlamaProvider

      if (
        config.providerConfig.useExistingProvider &&
        config.providerConfig.providerUrl &&
        config.providerConfig.providerApiKey
      ) {
        // Use existing provider
        provider = new EmotionLlamaProvider(
          config.providerConfig.providerUrl,
          config.providerConfig.providerApiKey,
          fheServiceInstance,
        )
      } else {
        // Create new provider
        provider = new EmotionLlamaProvider(
          config.baseUrl,
          config.apiKey,
          fheServiceInstance,
        )
      }

      // Create direct model provider if configured
      let modelProvider: MentalLLaMAModelProvider | undefined

      // Check for 13B model first (prefer larger model if both are configured)
      if (
        config.modelConfig?.useDirect13BModel &&
        config.modelConfig.model13BApiUrl
      ) {
        logger.info('Creating direct MentalLLaMA-chat-13B model provider')

        modelProvider = new MentalLLaMAModelProvider(
          config.modelConfig.model13BApiUrl,
          config.modelConfig.model13BApiKey || config.apiKey,
          config.modelConfig.model13BName || 'MentalLLaMA-chat-13B',
        )

        logger.info('MentalLLaMA-chat-13B model provider created successfully')
      }
      // Fall back to 7B model if 13B is not configured
      else if (
        config.modelConfig?.useDirect7BModel &&
        config.modelConfig.model7BApiUrl
      ) {
        logger.info('Creating direct MentalLLaMA-chat-7B model provider')

        modelProvider = new MentalLLaMAModelProvider(
          config.modelConfig.model7BApiUrl,
          config.modelConfig.model7BApiKey || config.apiKey,
          config.modelConfig.model7BName || 'MentalLLaMA-chat-7B',
        )

        logger.info('MentalLLaMA-chat-7B model provider created successfully')
      }

      // Create and initialize Python bridge if configured
      let pythonBridge: MentalLLaMAPythonBridge | undefined

      if (config.pythonConfig?.mentalLLaMAPath) {
        const pythonBridgeConfig: MentalLLaMAPythonBridgeConfig = {
          mentalLLaMAPath: config.pythonConfig.mentalLLaMAPath,
          pythonPath: config.pythonConfig.pythonPath,
          venvName: config.pythonConfig.venvName,
          outputDir: config.pythonConfig.outputDir,
          logLevel: config.pythonConfig.logLevel,
          securityOptions: {
            allowedCommands: ['python', 'python3'],
            disallowedArgs: ['--', '-c', 'import', 'eval', 'exec'],
            sanitizeInput: true,
            ...(config.pythonConfig.securityOptions || {}),
          },
        }

        logger.info('Creating MentalLLaMA Python bridge with configuration', {
          config: pythonBridgeConfig,
        })

        // Use the new async factory method
        pythonBridge = await MentalLLaMAPythonBridge.create(
          pythonBridgeConfig.mentalLLaMAPath,
          pythonBridgeConfig.pythonPath,
          pythonBridgeConfig, // Pass the full config object as the third argument
        )

        // Initialize but don't wait (fire and forget as before)
        // The bridge instance itself is now created, initialization is a separate step.
        if (pythonBridge) {
          pythonBridge.initialize().catch((error) => {
            logger.error('Failed to initialize Python bridge (non-blocking)', {
              error,
            })
          })
        }
      }

      const adapter = new MentalLLaMAAdapter(
        provider,
        fheServiceInstance,
        config.baseUrl,
        config.apiKey,
        modelProvider,
        pythonBridge,
      )

      return { adapter, pythonBridge, modelProvider }
    } catch (error) {
      logger.error('Failed to create MentalLLaMA adapter', { error })
      throw error
    }
  }

  /**
   * Create from environment variables
   */
  static async createFromEnv(): Promise<{
    adapter: MentalLLaMAAdapter
    pythonBridge?: MentalLLaMAPythonBridge
    modelProvider?: MentalLLaMAModelProvider
  }> {
    const requiredEnvVars = [
      'EMOTION_LLAMA_API_URL',
      'EMOTION_LLAMA_API_KEY',
      'FHE_KEY_PATH',
      'FHE_CERT_PATH',
    ]

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    )
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      )
    }

    // MentalLLaMA Python bridge configuration
    const mentalLLaMAPath = process.env.MENTAL_LLAMA_PATH || '/tmp/MentalLLaMA'
    const pythonPath = process.env.PYTHON_PATH || 'python'
    const venvName = process.env.MENTAL_LLAMA_VENV_NAME
    const outputDir = process.env.MENTAL_LLAMA_OUTPUT_DIR
    const logLevel = process.env.MENTAL_LLAMA_LOG_LEVEL as
      | 'debug'
      | 'info'
      | 'warning'
      | 'error'
      | undefined

    // Check for direct model integration environment variables
    // 7B model configuration
    const useDirect7BModel = process.env.USE_MENTAL_LLAMA_7B_MODEL === 'true'
    const model7BApiUrl = process.env.MENTAL_LLAMA_7B_API_URL
    const model7BApiKey = process.env.MENTAL_LLAMA_7B_API_KEY
    const model7BName =
      process.env.MENTAL_LLAMA_7B_MODEL_NAME || 'MentalLLaMA-chat-7B'

    // 13B model configuration (NEW)
    const useDirect13BModel = process.env.USE_MENTAL_LLAMA_13B_MODEL === 'true'
    const model13BApiUrl = process.env.MENTAL_LLAMA_13B_API_URL
    const model13BApiKey = process.env.MENTAL_LLAMA_13B_API_KEY
    const model13BName =
      process.env.MENTAL_LLAMA_13B_MODEL_NAME || 'MentalLLaMA-chat-13B'

    // Calls the now async MentalLLaMAFactory.create
    return MentalLLaMAFactory.create({
      baseUrl: process.env.EMOTION_LLAMA_API_URL!,
      apiKey: process.env.EMOTION_LLAMA_API_KEY!,
      fheConfig: {
        keyPath: process.env.FHE_KEY_PATH!,
        certPath: process.env.FHE_CERT_PATH!,
      },
      providerConfig: {
        useExistingProvider: false,
      },
      pythonConfig: {
        mentalLLaMAPath,
        pythonPath,
        venvName,
        outputDir,
        logLevel,
        securityOptions: {
          // Default secure settings from environment variables
          allowedCommands: process.env.MENTAL_LLAMA_ALLOWED_COMMANDS?.split(
            ',',
          ) || ['python', 'python3'],
          disallowedArgs: process.env.MENTAL_LLAMA_DISALLOWED_ARGS?.split(
            ',',
          ) || ['--', '-c', 'import', 'eval', 'exec'],
          sanitizeInput: process.env.MENTAL_LLAMA_SANITIZE_INPUT !== 'false', // Default to true
        },
      },
      modelConfig: {
        // 7B model configuration
        useDirect7BModel,
        model7BApiUrl: model7BApiUrl || '',
        model7BApiKey,
        model7BName,
        // 13B model configuration (NEW)
        useDirect13BModel,
        model13BApiUrl: model13BApiUrl || '',
        model13BApiKey,
        model13BName,
      },
    })
  }

  /**
   * Create for testing purposes
   */
  static async createForTesting(): Promise<{
    adapter: MentalLLaMAAdapter
    pythonBridge?: MentalLLaMAPythonBridge
    modelProvider?: MentalLLaMAModelProvider
  }> {
    // Use the stub FHE service
    const mockFHE = fheService

    const mockProvider = new EmotionLlamaProvider(
      'http://localhost:8080',
      'test-api-key',
      mockFHE,
    )

    // Create a mock model provider for testing
    const mockModelProvider = new MentalLLaMAModelProvider(
      'http://localhost:8090',
      'test-model-api-key',
      'MentalLLaMA-chat-7B-test',
    )

    const adapter = new MentalLLaMAAdapter(
      mockProvider,
      mockFHE,
      'http://localhost:8080',
      'test-api-key',
      mockModelProvider, // Pass mock model provider
      undefined, // No Python bridge for testing
    )

    return { adapter, modelProvider: mockModelProvider }
  }
}
