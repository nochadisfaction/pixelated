import { createLogger } from '@utils/logger'
import { MentalLLaMAFactory } from '../MentalLLaMAFactory'

const logger = createLogger({ context: 'MentalLLaMAModelTest' })

/**
 * Test the MentalLLaMA model integration (7B or 13B)
 * This utility can be used to verify that the direct model integration is working correctly
 */
export async function testMentalLLaMAModelIntegration(
  modelTier: '7B' | '13B' = '7B',
): Promise<{
  success: boolean
  results?: {
    modelName: string
    modelTier: '7B' | '13B'
    classificationResult?: {
      category: string
      confidence: number
      explanation: string
    }
    explanationResult?: string
    evaluationResult?: {
      fluency: number
      completeness: number
      reliability: number
      overall: number
      isErrorFallback?: boolean
    }
  }
  error?: string
}> {
  try {
    logger.info(`Testing MentalLLaMA-chat-${modelTier} model integration`)

    // Create factory with environment variables
    const { modelProvider } = await MentalLLaMAFactory.createFromEnv()

    // Check if model provider is available
    if (!modelProvider) {
      logger.error('MentalLLaMA model provider not available')
      return {
        success: false,
        error: `MentalLLaMA-chat-${modelTier} model provider not available. Check environment variables.`,
      }
    }

    // Verify that we have the correct model tier
    const actualModelTier = modelProvider.getModelTier()
    if (actualModelTier !== modelTier) {
      logger.warn(
        `Requested ${modelTier} model but got ${actualModelTier} model`,
      )
    }

    // Get the model name being used
    const modelName =
      modelTier === '13B'
        ? process.env.MENTAL_LLAMA_13B_MODEL_NAME || 'MentalLLaMA-chat-13B'
        : process.env.MENTAL_LLAMA_7B_MODEL_NAME || 'MentalLLaMA-chat-7B'

    // Test text for classification
    const testText = `I've been feeling really down lately. It's hard to get out of bed in the morning, and I don't enjoy things I used to. I've been sleeping too much but still feel tired. Sometimes I wonder if life is worth living.`

    // Test classification
    logger.info(`Testing mental health classification with ${modelTier} model`)
    const classificationResponse =
      await modelProvider.classifyMentalHealth(testText)
    const firstChoice = classificationResponse.choices[0]
    const classification = firstChoice?.message?.classification

    if (!classification) {
      logger.error('No classification received in test')
      return {
        success: false,
        results: { modelName, modelTier },
        error: 'No classification received from model',
      }
    }

    // Test explanation generation
    logger.info(`Testing explanation generation with ${modelTier} model`)
    const explanationResponse = await modelProvider.generateExplanation(
      testText,
      classification.category,
    )
    const explanation = explanationResponse.choices[0]?.message.content

    if (!explanation) {
      logger.error('No explanation received in test')
      return {
        success: false,
        results: {
          modelName,
          modelTier,
          classificationResult: classification,
        },
        error: 'No explanation received from model',
      }
    }

    // Test explanation evaluation
    logger.info(`Testing explanation evaluation with ${modelTier} model`)
    const evaluation = await modelProvider.evaluateExplanation(explanation)

    logger.info('Model integration test completed successfully', {
      modelTier,
      classification: classification.category,
      confidenceScore: classification.confidence,
      explanationLength: explanation.length,
      evaluationScore: evaluation.overall,
    })

    return {
      success: true,
      results: {
        modelName,
        modelTier,
        classificationResult: classification,
        explanationResult: explanation,
        evaluationResult: evaluation,
      },
    }
  } catch (error) {
    logger.error('Error testing MentalLLaMA model integration', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Verify that the MentalLLaMA model is properly configured
 * Checks environment variables and connectivity for 7B or 13B model
 */
export async function verifyMentalLLaMAModelConfiguration(
  modelTier: '7B' | '13B' = '7B',
): Promise<{
  isConfigured: boolean
  configStatus: {
    envVarsPresent: boolean
    missingVars: string[]
    modelEndpointConfigured: boolean
    apiKeyConfigured: boolean
  }
  connectionStatus?: {
    canConnect: boolean
    errorMessage?: string
  }
}> {
  // Check required environment variables based on model tier
  const requiredVars =
    modelTier === '13B'
      ? ['USE_MENTAL_LLAMA_13B_MODEL', 'MENTAL_LLAMA_13B_API_URL']
      : ['USE_MENTAL_LLAMA_7B_MODEL', 'MENTAL_LLAMA_7B_API_URL']

  const missingVars = requiredVars.filter((v) => !process.env[v])
  const envVarsPresent = missingVars.length === 0

  // Check if model is enabled based on tier
  const modelEnabled =
    modelTier === '13B'
      ? process.env.USE_MENTAL_LLAMA_13B_MODEL === 'true'
      : process.env.USE_MENTAL_LLAMA_7B_MODEL === 'true'

  // Check if endpoint and API key are configured based on tier
  const modelEndpointConfigured =
    modelTier === '13B'
      ? !!process.env.MENTAL_LLAMA_13B_API_URL
      : !!process.env.MENTAL_LLAMA_7B_API_URL

  const apiKeyConfigured =
    modelTier === '13B'
      ? !!process.env.MENTAL_LLAMA_13B_API_KEY ||
        !!process.env.EMOTION_LLAMA_API_KEY
      : !!process.env.MENTAL_LLAMA_7B_API_KEY ||
        !!process.env.EMOTION_LLAMA_API_KEY

  // If not configured properly, return early
  if (!modelEnabled || !modelEndpointConfigured || !apiKeyConfigured) {
    return {
      isConfigured: false,
      configStatus: {
        envVarsPresent,
        missingVars,
        modelEndpointConfigured,
        apiKeyConfigured,
      },
    }
  }

  // Test connection to the API
  try {
    const { modelProvider } = await MentalLLaMAFactory.createFromEnv()

    if (!modelProvider) {
      return {
        isConfigured: false,
        configStatus: {
          envVarsPresent,
          missingVars,
          modelEndpointConfigured,
          apiKeyConfigured,
        },
        connectionStatus: {
          canConnect: false,
          errorMessage: 'Model provider could not be created',
        },
      }
    }

    // Verify that we have the correct model tier
    const actualModelTier = modelProvider.getModelTier()
    if (actualModelTier !== modelTier) {
      logger.warn(
        `Requested to verify ${modelTier} model but got ${actualModelTier} model`,
      )
    }

    // Simple test call to check connectivity
    await modelProvider.generateChatCompletion([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, are you operational?' },
    ])

    return {
      isConfigured: true,
      configStatus: {
        envVarsPresent,
        missingVars,
        modelEndpointConfigured,
        apiKeyConfigured,
      },
      connectionStatus: {
        canConnect: true,
      },
    }
  } catch (error) {
    return {
      isConfigured: false,
      configStatus: {
        envVarsPresent,
        missingVars,
        modelEndpointConfigured,
        apiKeyConfigured,
      },
      connectionStatus: {
        canConnect: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
