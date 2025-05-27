#!/usr/bin/env node

/**
 * Test MentalLLaMA-13B Model Integration
 *
 * This CLI tool allows testing the MentalLLaMA-chat-13B model integration
 * directly from the command line. It's useful for verifying the model setup
 * and testing the mental health analysis capabilities.
 *
 * Usage:
 *   node test-mental-llama-13b.js "I've been feeling really down lately"
 */

// Set environment variables for direct model integration
process.env.USE_MENTAL_LLAMA_13B_MODEL = 'true'

// Required imports
const { MentalLLaMAFactory } = require('../MentalLLaMAFactory')
const readline = require('readline')

// Initialize readline interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

/**
 * Run a test with the MentalLLaMA-13B model
 * @param {string} text Text to analyze
 */
async function runTest(text) {
  try {
    console.log(`\n🧠 MentalLLaMA-13B Model Test`)
    console.log(`───────────────────────────`)
    console.log(`Analyzing: "${text}"\n`)

    // Create adapter with factory
    const { adapter, modelProvider } = await MentalLLaMAFactory.createFromEnv()

    if (!modelProvider) {
      console.error(`❌ ERROR: Direct model integration is not available.`)
      console.error(
        `Please ensure you have configured the environment variables:`,
      )
      console.error(`  - USE_MENTAL_LLAMA_13B_MODEL=true`)
      console.error(`  - MENTAL_LLAMA_13B_API_URL=<api_url>`)
      console.error(`  - MENTAL_LLAMA_13B_API_KEY=<api_key>`)
      console.error(`  - MENTAL_LLAMA_13B_MODEL_NAME=<model_name>`)
      process.exit(1)
    }

    // Verify we're using the 13B model
    const modelTier = modelProvider.getModelTier()
    if (modelTier !== '13B') {
      console.error(
        `❌ ERROR: Not using the 13B model. Current model tier: ${modelTier}`,
      )
      process.exit(1)
    }

    console.log(`✅ Connected to MentalLLaMA-chat-13B model successfully`)

    // Analyze the text
    console.log(`🔍 Analyzing mental health indicators...`)
    const startTime = Date.now()
    const analysis = await adapter.analyzeMentalHealth(text)
    const duration = Date.now() - startTime

    // Display results
    console.log(`\n📊 Analysis Results (completed in ${duration}ms):`)
    console.log(`───────────────────────────`)
    console.log(
      `Mental Health Issue Detected: ${analysis.hasMentalHealthIssue ? 'Yes ⚠️' : 'No ✓'}`,
    )
    console.log(`Category: ${analysis.mentalHealthCategory}`)
    console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`)
    console.log(`\n📝 Explanation:`)
    console.log(`${analysis.explanation}`)

    if (analysis.supportingEvidence && analysis.supportingEvidence.length > 0) {
      console.log(`\n🔍 Supporting Evidence:`)
      analysis.supportingEvidence.forEach((evidence, i) => {
        console.log(`  ${i + 1}. "${evidence}"`)
      })
    }

    // Generate a more comprehensive explanation with expert guidance
    console.log(`\n🧠 Generating enhanced explanation with expert guidance...`)
    const enhancedAnalysis =
      await adapter.analyzeMentalHealthWithExpertGuidance(text, true)

    console.log(`\n📋 Enhanced Explanation:`)
    console.log(`${enhancedAnalysis.explanation}`)

    // Evaluate explanation quality
    console.log(`\n⭐ Evaluating explanation quality...`)
    const quality = await adapter.evaluateExplanationQuality(
      enhancedAnalysis.explanation,
    )

    console.log(`Quality Metrics:`)
    console.log(`  - Fluency: ${quality.fluency.toFixed(2)}/5`)
    console.log(`  - Completeness: ${quality.completeness.toFixed(2)}/5`)
    console.log(`  - Reliability: ${quality.reliability.toFixed(2)}/5`)
    console.log(`  - Overall: ${quality.overall.toFixed(2)}/5`)
    if (quality.bartScore) {
      console.log(`  - BART Score: ${quality.bartScore.toFixed(2)}`)
    }

    // Check for error fallback status
    if (quality.isErrorFallback) {
      console.log(
        '\nNote: The quality evaluation is using fallback values because of an error.',
      )
    }

    process.exit(0)
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`)
    if (error.stack) {
      console.error(`\nStack trace:\n${error.stack}`)
    }
    process.exit(1)
  }
}

/**
 * Run the tool in interactive mode
 */
function runInteractiveMode() {
  console.log(`\n🧠 MentalLLaMA-13B Model Interactive Test`)
  console.log(`────────────────────────────────────`)
  console.log(`Type your text for mental health analysis (or 'exit' to quit):`)

  rl.prompt()

  rl.on('line', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close()
      return
    }

    if (input.trim()) {
      await runTest(input)
      console.log(`\n────────────────────────────────────`)
      console.log(
        `Type your text for mental health analysis (or 'exit' to quit):`,
      )
    }

    rl.prompt()
  })

  rl.on('close', () => {
    console.log('Goodbye!')
    process.exit(0)
  })
}

// Main execution
;(async () => {
  // Get input from command line or run in interactive mode
  const input = process.argv[2]

  if (input) {
    await runTest(input)
  } else {
    runInteractiveMode()
  }
})().catch((error) => {
  console.error(`\n❌ ERROR: ${error.message}`)
  process.exit(1)
})
