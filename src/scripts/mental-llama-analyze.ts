#!/usr/bin/env ts-node
/**
 * MentalLLaMA Analysis Demo
 *
 * This script demonstrates how to use the MentalLLaMA integration
 * to analyze text for mental health indicators and provide
 * interpretable explanations.
 *
 * Usage:
 *   ts-node mental-llama-analyze.ts --text "Sample text to analyze" --output-path ./results.json
 */

import { program } from 'commander'
import { promises as fs } from 'fs'
import path from 'path'
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Parse command line arguments
program
  .option('-t, --text <text>', 'Text to analyze for mental health indicators')
  .option('-f, --file <path>', 'File containing text to analyze')
  .option(
    '-o, --output-path <path>',
    'Output path for results',
    './mental-llama-results.json',
  )
  .option(
    '-e, --evaluate-explanation',
    'Evaluate the quality of the generated explanation',
    false,
  )
  .option(
    '-p, --python-bridge',
    'Use Python bridge for advanced features',
    false,
  )
  .option('--expert', 'Use expert-guided explanations', false)
  .option(
    '--imhi',
    'Run IMHI benchmark evaluation (requires Python bridge)',
    false,
  )
  .option('--model-path <path>', 'Path to model for IMHI evaluation')
  .option(
    '--list-categories',
    'List all supported mental health categories',
    false,
  )
  .parse(process.argv)

const options = program.opts()

async function main() {
  console.log('🧠 MentalLLaMA Analysis')
  console.log('=======================')

  // Create MentalLLaMA adapter for listing categories
  if (options.listCategories) {
    console.log('Supported mental health categories:')
    console.log('- depression: Major depressive disorder')
    console.log('- anxiety: Generalized anxiety disorder')
    console.log('- ptsd: Post-traumatic stress disorder')
    console.log('- suicidality: Suicide risk')
    console.log('- bipolar_disorder: Bipolar disorder')
    console.log('- ocd: Obsessive-compulsive disorder')
    console.log('- eating_disorder: Various eating disorders')
    console.log('- social_anxiety: Social anxiety disorder')
    console.log('- panic_disorder: Panic disorder')
    process.exit(0)
  }

  // Validate arguments
  if (!options.text && !options.file) {
    console.error('❌ Error: Either --text or --file must be provided')
    process.exit(1)
  }

  try {
    // Create MentalLLaMA adapter
    console.log('Creating MentalLLaMA adapter...')
    const { adapter, pythonBridge } = await MentalLLaMAFactory.createFromEnv()

    // Get text to analyze
    let textToAnalyze: string
    if (options.text) {
      textToAnalyze = options.text
    } else {
      console.log(`Reading text from ${options.file}...`)
      textToAnalyze = await fs.readFile(options.file, 'utf-8')
    }

    // Check if we're running IMHI benchmark
    if (options.imhi) {
      if (!pythonBridge) {
        console.error('❌ Error: Python bridge is required for IMHI evaluation')
        process.exit(1)
      }

      if (!options.modelPath) {
        console.error('❌ Error: --model-path is required for IMHI evaluation')
        process.exit(1)
      }

      console.log('Running IMHI benchmark evaluation...')
      const result = await pythonBridge.runIMHIEvaluation({
        modelPath: options.modelPath,
        outputPath: options.outputPath,
        testDataset: 'IMHI',
        isLlama: true,
      })

      console.log('IMHI evaluation complete!')
      console.log(result)
      return
    }

    // Analyze text
    console.log('Analyzing text for mental health indicators...')

    let analysisResult
    if (options.expert) {
      console.log('Using expert-guided explanations...')
      analysisResult = await adapter.analyzeMentalHealthWithExpertGuidance(
        textToAnalyze,
        true,
      )
    } else {
      analysisResult = await adapter.analyzeMentalHealth(textToAnalyze)
    }

    console.log('\nAnalysis Result:')
    console.log(
      `Mental Health Issue Detected: ${analysisResult.hasMentalHealthIssue ? 'Yes' : 'No'}`,
    )
    console.log(
      `Category: ${analysisResult.mentalHealthCategory.replace('_', ' ')}`,
    )
    console.log(`Confidence: ${(analysisResult.confidence * 100).toFixed(2)}%`)
    if (options.expert && analysisResult.expertGuided) {
      console.log(`Explanation Type: Expert-guided`)
    }
    console.log(`\nExplanation: ${analysisResult.explanation}`)

    console.log('\nSupporting Evidence:')
    if (analysisResult.supportingEvidence.length > 0) {
      analysisResult.supportingEvidence.forEach((evidence, i) => {
        console.log(`${i + 1}. "${evidence}"`)
      })
    } else {
      console.log('No specific supporting evidence found.')
    }

    // Evaluate explanation quality if requested
    if (options.evaluateExplanation) {
      console.log('\nEvaluating explanation quality...')
      const qualityMetrics = await adapter.evaluateExplanationQuality(
        analysisResult.explanation,
      )

      console.log('\nQuality Metrics:')
      console.log(`Fluency: ${qualityMetrics.fluency.toFixed(2)}/5.00`)
      console.log(
        `Completeness: ${qualityMetrics.completeness.toFixed(2)}/5.00`,
      )
      console.log(`Reliability: ${qualityMetrics.reliability.toFixed(2)}/5.00`)
      console.log(`Overall: ${qualityMetrics.overall.toFixed(2)}/5.00`)

      // Add quality metrics to result
      analysisResult.qualityMetrics = qualityMetrics
    }

    // Save results
    console.log(`\nSaving results to ${options.outputPath}...`)
    const outputDir = path.dirname(options.outputPath)
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(
      options.outputPath,
      JSON.stringify(analysisResult, null, 2),
    )

    console.log('✅ Analysis complete!')
  } catch (error) {
    console.error('❌ Error analyzing text:', error)
    process.exit(1)
  }
}

main()
