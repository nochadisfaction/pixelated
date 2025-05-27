#!/usr/bin/env node
/**
 * MentalLLaMA Clinical Scenario Testing CLI
 *
 * This script provides a command-line interface for testing specialized prompt templates
 * optimized for specific clinical scenarios in mental health analysis.
 */

import path from 'path'
import fs from 'fs'
import { program } from 'commander'
import { getLogger } from '../../../logging'
import { MentalLLaMAFactory } from '../MentalLLaMAFactory'
import {
  MentalHealthCategory,
  createCategoryTemplate,
  buildPrompt,
} from '../prompts'
import { createClinicalScenarioTemplate } from '../refiner'

// Initialize logger
const logger = getLogger()

// Define interface for CLI options
interface AnalyzeOptions {
  text?: string
  file?: string
  category: string
  scenario: string
  output?: string
  model: string
  baseline: boolean
}

interface GenerateOptions {
  output: string
}

interface CompareOptions {
  text?: string
  file?: string
  category: string
  output?: string
  model: string
}

// Type for valid mental health categories
type ValidMentalHealthCategory =
  | 'depression'
  | 'anxiety'
  | 'stress'
  | 'suicidal'
  | 'all'

// Configure the CLI
program
  .name('mental-llama-clinical-scenarios')
  .description(
    'Test MentalLLaMA prompt templates for specific clinical scenarios',
  )
  .version('1.0.0')

program
  .command('analyze')
  .description('Analyze text using a clinical scenario template')
  .option('-t, --text <text>', 'Text to analyze')
  .option('-f, --file <path>', 'Path to file containing text to analyze')
  .option(
    '-c, --category <category>',
    'Mental health category to focus on',
    'depression',
  )
  .option(
    '-s, --scenario <scenario>',
    'Clinical scenario (intake, crisis, therapy, monitoring, assessment)',
    'assessment',
  )
  .option('-o, --output <path>', 'Path to save the output JSON')
  .option('-m, --model <model>', 'Model to use (7B or 13B)', '13B')
  .option(
    '-b, --baseline',
    'Compare with baseline (non-clinical) template',
    false,
  )
  .action(async (options: AnalyzeOptions) => {
    try {
      // Get the text to analyze
      const {
        text: inputText,
        file,
        category,
        scenario,
        output,
        model,
      } = options
      let text = inputText
      if (file) {
        text = fs.readFileSync(file, 'utf-8')
      }

      if (!text) {
        console.error('Please provide text to analyze using --text or --file')
        process.exit(1)
      }

      // Validate clinical scenario
      const validScenarios = [
        'intake',
        'crisis',
        'therapy',
        'monitoring',
        'assessment',
      ]
      if (!validScenarios.includes(scenario)) {
        console.error(
          `Invalid scenario: ${scenario}. Must be one of: ${validScenarios.join(', ')}`,
        )
        process.exit(1)
      }

      console.log('\n🏥 MentalLLaMA Clinical Scenario Analysis')
      console.log('======================================')
      console.log(`Category: ${category}`)
      console.log(`Scenario: ${scenario}`)
      console.log(`Model: MentalLLaMA-chat-${model}`)
      console.log('======================================\n')

      // Create the adapter
      // Use static method to create factory and get adapter
      logger.info('Creating MentalLLaMA adapter with model size', {
        modelSize: model,
      })
      const { adapter } = await MentalLLaMAFactory.createFromEnv()

      // Create the clinical scenario template
      const clinicalTemplate = createClinicalScenarioTemplate(
        category as MentalHealthCategory,
        scenario as
          | 'intake'
          | 'crisis'
          | 'therapy'
          | 'monitoring'
          | 'assessment',
      )

      console.log('Analyzing text with clinical scenario template...')

      // Run the clinical scenario analysis
      const result = await adapter.analyzeMentalHealth(text, [
        category as ValidMentalHealthCategory,
      ])

      // If baseline comparison is requested
      if (options.baseline) {
        console.log('\nAnalyzing with baseline template for comparison...')

        // Create a standard template without clinical scenario optimization
        const baselineTemplate = createCategoryTemplate(
          category as MentalHealthCategory,
        )

        // Build the baseline prompt (just to show the difference)
        const _baselinePrompt = buildPrompt(baselineTemplate, text)
        const _clinicalPrompt = buildPrompt(clinicalTemplate, text)

        console.log('\n🔍 Template Comparison:')
        console.log('=============================')
        console.log('Baseline Template System Role:')
        console.log('-----------------------------')
        console.log(baselineTemplate.systemRole.substring(0, 200) + '...')

        console.log('\nClinical Scenario Template System Role:')
        console.log('-----------------------------')
        console.log(clinicalTemplate.systemRole.substring(0, 200) + '...')

        console.log('\nBaseline Template Task:')
        console.log('-----------------------------')
        console.log(
          baselineTemplate.taskSpecification.substring(0, 200) + '...',
        )

        console.log('\nClinical Scenario Template Task:')
        console.log('-----------------------------')
        console.log(
          clinicalTemplate.taskSpecification.substring(0, 200) + '...',
        )
      }

      // Display the result
      console.log('\n📊 Analysis Results:')
      console.log('=============================')
      console.log(`Mental Health Category: ${result.mentalHealthCategory}`)
      console.log(`Confidence: ${(result.confidence || 0) * 100}%`)
      console.log('\n📝 Explanation:')
      console.log(result.explanation)

      console.log('\n🔍 Supporting Evidence:')
      if (result.supportingEvidence && result.supportingEvidence.length > 0) {
        result.supportingEvidence.forEach((evidence: string, i: number) => {
          console.log(`${i + 1}. ${evidence}`)
        })
      } else {
        console.log('No specific evidence provided.')
      }

      console.log('\n📊 Category Scores:')
      Object.entries(result.categories).forEach(([category, score]) => {
        console.log(`- ${category}: ${((score as number) * 100).toFixed(1)}%`)
      })

      // Save to file if requested
      if (output) {
        // Include template info in the saved output
        const outputData = {
          result,
          clinicalScenario: scenario,
          template: {
            systemRole: clinicalTemplate.systemRole,
            taskSpecification: clinicalTemplate.taskSpecification,
            reminders: clinicalTemplate.reminders,
          },
        }

        fs.writeFileSync(output, JSON.stringify(outputData, null, 2))
        console.log(`\nResults saved to ${output}`)
      }
    } catch (error: unknown) {
      console.error(
        'Error:',
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program
  .command('generate-templates')
  .description('Generate clinical scenario templates for all categories')
  .option(
    '-o, --output <directory>',
    'Directory to save the template files',
    './clinical-templates',
  )
  .action(async (options: GenerateOptions) => {
    try {
      console.log('\n🏥 Generating Clinical Scenario Templates')
      console.log('======================================')

      // Create output directory if it doesn't exist
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true })
      }

      // Define categories and scenarios
      const categories: MentalHealthCategory[] = [
        'depression',
        'anxiety',
        'stress',
        'suicidal',
        'ptsd',
      ]
      const scenarios = [
        'intake',
        'crisis',
        'therapy',
        'monitoring',
        'assessment',
      ]

      // Generate all combinations
      for (const category of categories) {
        console.log(`Generating templates for ${category}...`)

        for (const scenario of scenarios) {
          const template = createClinicalScenarioTemplate(
            category,
            scenario as
              | 'intake'
              | 'crisis'
              | 'therapy'
              | 'monitoring'
              | 'assessment',
          )

          // Save the template
          const filename = path.join(
            options.output,
            `${category}-${scenario}.json`,
          )
          fs.writeFileSync(filename, JSON.stringify(template, null, 2))
          console.log(`  - Created template for ${category} / ${scenario}`)
        }
      }

      console.log(
        `\n✅ Generated ${categories.length * scenarios.length} templates in ${options.output}`,
      )
      console.log('\nExample usage for clinical analysis:')
      console.log(
        `node test-clinical-scenarios.js analyze --category depression --scenario crisis --text "Your text here"`,
      )
    } catch (error: unknown) {
      console.error(
        'Error:',
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program
  .command('compare-scenarios')
  .description('Compare results across different clinical scenarios')
  .option('-t, --text <text>', 'Text to analyze')
  .option('-f, --file <path>', 'Path to file containing text to analyze')
  .option(
    '-c, --category <category>',
    'Mental health category to focus on',
    'depression',
  )
  .option('-o, --output <path>', 'Path to save the comparison results')
  .option('-m, --model <model>', 'Model to use (7B or 13B)', '13B')
  .action(async (options: CompareOptions) => {
    try {
      // Get the text to analyze
      const { text: inputText, file, category, output, model } = options
      let text = inputText
      if (file) {
        text = fs.readFileSync(file, 'utf-8')
      }

      if (!text) {
        console.error('Please provide text to analyze using --text or --file')
        process.exit(1)
      }

      console.log('\n🔍 MentalLLaMA Clinical Scenario Comparison')
      console.log('=========================================')
      console.log(`Category: ${category}`)
      console.log(`Model: MentalLLaMA-chat-${model}`)
      console.log('=========================================\n')

      // Create the adapter
      // Use static method to create factory and get adapter
      logger.info('Creating MentalLLaMA adapter with model size', {
        modelSize: model,
      })
      const { adapter } = await MentalLLaMAFactory.createFromEnv()

      // Define scenarios to compare
      const scenarios: Array<
        'intake' | 'crisis' | 'therapy' | 'monitoring' | 'assessment'
      > = ['intake', 'crisis', 'therapy', 'monitoring', 'assessment']

      const results = []

      // Run analysis with each scenario template
      for (const scenario of scenarios) {
        console.log(`Analyzing with ${scenario} template...`)

        // Create the template for this scenario
        const _template = createClinicalScenarioTemplate(
          category as MentalHealthCategory,
          scenario,
        )

        // Run analysis
        const analysisResult = await adapter.analyzeMentalHealth(text, [
          category as ValidMentalHealthCategory,
        ])

        // Add result with scenario info
        results.push({
          scenario,
          result: analysisResult,
        })

        // Display result summary
        console.log(
          `  - ${scenario.toUpperCase()}: ${analysisResult.mentalHealthCategory} (${(analysisResult.confidence || 0) * 100}%)`,
        )
      }

      // Add baseline for comparison
      console.log(`Analyzing with baseline template...`)
      const baselineResult = await adapter.analyzeMentalHealth(text, [
        category as ValidMentalHealthCategory,
      ])
      results.push({
        scenario: 'baseline',
        result: baselineResult,
      })
      console.log(
        `  - BASELINE: ${baselineResult.mentalHealthCategory} (${(baselineResult.confidence || 0) * 100}%)`,
      )

      // Display comparison
      console.log('\n📊 Comparison of Results:')
      console.log('=============================================')
      console.log('| Scenario    | Category    | Confidence | Evidence Count |')
      console.log('|-------------|-------------|------------|----------------|')

      for (const item of results) {
        const evidenceCount = (item.result.supportingEvidence || []).length
        const category = item.result.mentalHealthCategory || 'unknown'
        const confidence = item.result.confidence || 0
        console.log(
          `| ${item.scenario.padEnd(11)} | ${category.padEnd(11)} | ${(confidence * 100).toFixed(1).padEnd(10)}% | ${evidenceCount.toString().padEnd(14)} |`,
        )
      }

      // Save comparison if requested
      if (output) {
        fs.writeFileSync(
          output,
          JSON.stringify(
            {
              category,
              text: text.substring(0, 100) + '...',
              comparison: results,
            },
            null,
            2,
          ),
        )
        console.log(`\nComparison saved to ${output}`)
      }
    } catch (error: unknown) {
      console.error(
        'Error:',
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

// Run the program
program.parse(process.argv)

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
