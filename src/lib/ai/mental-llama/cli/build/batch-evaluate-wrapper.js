#!/usr/bin/env node

/**
 * MentalLLaMA Batch Prompt Evaluation CLI Wrapper
 *
 * This script provides a command-line interface for running batch evaluations
 * of multiple prompt templates against comprehensive test datasets.
 */

const { Command } = require('commander')
const path = require('path')
const fs = require('fs')

const { createLogger } = require('../../../../../utils/logger')
const { execSync, execFileSync } = require('child_process')

const logger = createLogger('mental-llama:batch-evaluate')

// Initialize commander program
const program = new Command()

program
  .name('mental-llama-batch-evaluate')
  .description('Batch evaluation for MentalLLaMA prompts')
  .version('0.1.0')

// Add evaluate command
program
  .command('run')
  .description('Run batch evaluation of prompts against test data')
  .option(
    '-c, --categories <categories>',
    'Mental health categories to evaluate (comma-separated)',
    'depression,anxiety,stress,suicidal,ptsd',
  )
  .option(
    '-t, --template-dir <path>',
    'Path to directory with prompt templates',
    './prompt-templates',
  )
  .option(
    '-d, --dataset <dataset>',
    'Dataset to use (comprehensive, targeted, minimal)',
    'comprehensive',
  )
  .option(
    '-o, --output <path>',
    'Path to save the results CSV',
    './evaluation-results.csv',
  )
  .option('-m, --model <model>', 'Model to use (7B or 13B)', '13B')
  .option(
    '-l, --limit <number>',
    'Maximum number of test cases per category',
    '5',
  )
  .option(
    '-r, --refinement-techniques <techniques>',
    'Refinement techniques to apply (comma-separated)',
    '',
  )
  .option('-b, --baseline', 'Include baseline templates in evaluation', false)
  .action((options) => {
    logger.info('Starting batch evaluation with options:', options)

    try {
      // Use ts-node to run the TypeScript implementation
      const args = [
        `--categories=${options.categories}`,
        `--template-dir=${options.templateDir}`,
        `--dataset=${options.dataset}`,
        `--output=${options.output}`,
        `--model=${options.model}`,
        `--limit=${options.limit}`,
      ]

      if (options.refinementTechniques) {
        args.push(`--refinement-techniques=${options.refinementTechniques}`)
      }

      if (options.baseline) {
        args.push('--baseline')
      }

      // Build the command to execute
      const tsNodePath = path.resolve(
        __dirname,
        '../../../../../../node_modules/.bin/ts-node',
      )
      const scriptPath = path.resolve(__dirname, '../batch-evaluate.ts')

      logger.info(
        `Executing ts-node batch-evaluate.ts run with args: ${args.join(' ')}`,
      )
      execFileSync(tsNodePath, [scriptPath, 'run', ...args], {
        stdio: 'inherit',
      })

      logger.info('Evaluation completed successfully!')
    } catch (error) {
      logger.error('Evaluation failed:', error.message)
      process.exit(1)
    }
  })

// Add compare command
program
  .command('compare')
  .description('Compare results from multiple evaluations')
  .option(
    '-f, --files <paths>',
    'Comma-separated paths to evaluation result files',
  )
  .option(
    '-o, --output <path>',
    'Path to save the comparison report',
    './comparison-report.json',
  )
  .option('-c, --chart', 'Generate chart visualization', false)
  .action((options) => {
    logger.info(`Comparing results from: ${options.files}`)

    try {
      // Use ts-node to run the TypeScript implementation
      const args = [`--files=${options.files}`, `--output=${options.output}`]

      if (options.chart) {
        args.push('--chart')
      }

      // Build the command to execute
      const tsNodePath = path.resolve(
        __dirname,
        '../../../../../../node_modules/.bin/ts-node',
      )
      const scriptPath = path.resolve(__dirname, '../batch-evaluate.ts')

      logger.info(
        `Executing ts-node batch-evaluate.ts compare with args: ${args.join(' ')}`,
      )
      execFileSync(tsNodePath, [scriptPath, 'compare', ...args], {
        stdio: 'inherit',
      })

      logger.info('Comparison completed successfully!')
    } catch (error) {
      logger.error('Comparison failed:', error.message)
      process.exit(1)
    }
  })

// Add recommend command
program
  .command('recommend')
  .description('Get recommendations for the best prompts for each category')
  .option('-f, --file <path>', 'Path to evaluation results CSV file')
  .option(
    '-o, --output <path>',
    'Path to save the recommendations',
    './prompt-recommendations.json',
  )
  .option('-w, --weights <json>', 'JSON string with metric weights')
  .action((options) => {
    logger.info(`Generating recommendations from: ${options.file}`)

    try {
      // Use ts-node to run the TypeScript implementation
      const args = [`--file=${options.file}`, `--output=${options.output}`]

      if (options.weights) {
        args.push(`--weights=${options.weights}`)
      }

      // Build the command to execute
      const tsNodePath = path.resolve(
        __dirname,
        '../../../../../../node_modules/.bin/ts-node',
      )
      const scriptPath = path.resolve(__dirname, '../batch-evaluate.ts')

      logger.info(
        `Executing ts-node batch-evaluate.ts recommend with args: ${args.join(' ')}`,
      )
      execFileSync(tsNodePath, [scriptPath, 'recommend', ...args], {
        stdio: 'inherit',
      })

      logger.info('Recommendation generation completed successfully!')
    } catch (error) {
      logger.error('Recommendation generation failed:', error.message)
      process.exit(1)
    }
  })

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
  process.exit(0)
}

program.parse(process.argv)
