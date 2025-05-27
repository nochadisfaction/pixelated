#!/usr/bin/env node

/**
 * Command-line tool for testing the MentalLLaMA model integration (7B or 13B)
 *
 * Usage:
 *   node test-model.js [--model 7B|13B] [--text "your text to analyze"]
 *
 * Environment variables:
 *   For 7B model:
 *     USE_MENTAL_LLAMA_7B_MODEL=true
 *     MENTAL_LLAMA_7B_API_URL=https://api.example.com
 *     MENTAL_LLAMA_7B_API_KEY=your-api-key
 *     MENTAL_LLAMA_7B_MODEL_NAME=MentalLLaMA-chat-7B
 *
 *   For 13B model:
 *     USE_MENTAL_LLAMA_13B_MODEL=true
 *     MENTAL_LLAMA_13B_API_URL=https://api.example.com
 *     MENTAL_LLAMA_13B_API_KEY=your-api-key
 *     MENTAL_LLAMA_13B_MODEL_NAME=MentalLLaMA-chat-13B
 */

import {
  testMentalLLaMAModelIntegration,
  verifyMentalLLaMAModelConfiguration,
} from '../utils/testModelIntegration'

// Parse command line arguments
const args = process.argv.slice(2)
const textArg = args.findIndex((arg) => arg === '--text')
const _textToAnalyze =
  textArg >= 0 && args.length > textArg + 1 ? args[textArg + 1] : undefined

// Check for model tier argument
const modelArg = args.findIndex((arg) => arg === '--model')
const modelTier =
  modelArg >= 0 &&
  args.length > modelArg + 1 &&
  (args[modelArg + 1] === '7B' || args[modelArg + 1] === '13B')
    ? (args[modelArg + 1] as '7B' | '13B')
    : '7B' // Default to 7B if not specified or invalid

async function main() {
  console.log(`MentalLLaMA-chat-${modelTier} Model Integration Test`)
  console.log('==========================================\n')

  // Check configuration
  console.log(`Verifying ${modelTier} model configuration...`)
  const configResult = await verifyMentalLLaMAModelConfiguration(modelTier)

  if (!configResult.isConfigured) {
    console.log('\n❌ Configuration issues detected:')

    if (!configResult.configStatus.envVarsPresent) {
      console.log(
        `  Missing environment variables: ${configResult.configStatus.missingVars.join(', ')}`,
      )
    }

    if (!configResult.configStatus.modelEndpointConfigured) {
      console.log(
        `  Model endpoint not configured (MENTAL_LLAMA_${modelTier}_API_URL)`,
      )
    }

    if (!configResult.configStatus.apiKeyConfigured) {
      console.log(
        `  API key not configured (MENTAL_LLAMA_${modelTier}_API_KEY)`,
      )
    }

    if (
      configResult.connectionStatus &&
      !configResult.connectionStatus.canConnect
    ) {
      console.log(
        `  Connection failed: ${configResult.connectionStatus.errorMessage}`,
      )
    }

    console.log(
      '\nPlease set the required environment variables and try again.',
    )
    process.exit(1)
  }

  console.log('✅ Configuration verified successfully\n')

  // Run the test
  console.log(`Testing ${modelTier} model integration...`)
  const testResult = await testMentalLLaMAModelIntegration(modelTier)

  if (!testResult.success) {
    console.log(`\n❌ Test failed: ${testResult.error}`)
    process.exit(1)
  }

  // Display results
  console.log('\n✅ Model integration test successful!')
  console.log(`\nModel: ${testResult.results!.modelName}`)
  console.log(`Model Tier: ${testResult.results!.modelTier}`)

  console.log('\nClassification result:')
  console.log(
    `  Category: ${testResult.results!.classificationResult!.category}`,
  )
  console.log(
    `  Confidence: ${testResult.results!.classificationResult!.confidence}`,
  )

  console.log('\nExplanation excerpt:')
  const explanationExcerpt =
    testResult.results!.explanationResult!.substring(0, 150) + '...'
  console.log(`  ${explanationExcerpt}`)

  console.log('\nQuality evaluation:')
  console.log(
    `  Fluency: ${testResult.results!.evaluationResult!.fluency.toFixed(2)} / 5.0`,
  )
  console.log(
    `  Completeness: ${testResult.results!.evaluationResult!.completeness.toFixed(2)} / 5.0`,
  )
  console.log(
    `  Reliability: ${testResult.results!.evaluationResult!.reliability.toFixed(2)} / 5.0`,
  )
  console.log(
    `  Overall score: ${testResult.results!.evaluationResult!.overall.toFixed(2)} / 5.0`,
  )

  console.log(
    `\nMentalLLaMA-chat-${modelTier} model integration is working correctly! 🎉`,
  )
}

main().catch((error) => {
  console.error('Error running test:', error)
  process.exit(1)
})
