#!/usr/bin/env node
/**
 * CLI tool for merging mental health datasets
 */

import { createInterface } from 'readline'
import {
  mergeAllDatasets,
  mergedDatasetExists,
  getMergedDatasetPath,
} from './merge-datasets'
import { getLogger } from '../../logging'

const logger = getLogger({ prefix: 'Dataset CLI' })

async function main() {
  console.log('=== Mental Health Dataset Merger ===')
  console.log(
    'This tool will download and merge various mental health datasets for AI training.',
  )

  if (mergedDatasetExists()) {
    console.log(
      `\nA merged dataset already exists at: ${getMergedDatasetPath()}`,
    )
    const answer = await askQuestion('Do you want to re-create it? (y/n): ')

    if (answer.toLowerCase() !== 'y') {
      console.log('Exiting without changes.')
      process.exit(0)
    }
  }

  console.log('\nStarting dataset merge process...')
  const stats = await mergeAllDatasets()

  if (stats) {
    console.log('\nDataset merge completed successfully!')
    console.log('=== Dataset Statistics ===')
    console.log(`Total items: ${stats.totalItems}`)

    console.log('\nSource Distribution:')
    Object.entries(stats.sourceStats).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} items`)
    })

    console.log('\nTag Distribution:')
    Object.entries(stats.tagStats)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count} items`)
      })

    console.log(`\nMerged dataset saved to: ${getMergedDatasetPath()}`)
  } else {
    console.error('\nDataset merge failed. Check the logs for details.')
    process.exit(1)
  }
}

function askQuestion(question: string): Promise<string> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    readline.question(question, (answer: string) => {
      readline.close()
      resolve(answer)
    })
  })
}

// Run the main function
main().catch((error) => {
  logger.error(`Error in CLI: ${error}`)
  console.error('An unexpected error occurred:', error)
  process.exit(1)
})
