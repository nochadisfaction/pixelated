#!/usr/bin/env node

import chalk from 'chalk'
import { listTags } from './scripts/tag-manager.js'

async function isolatedValidateTagStructure() {
  console.log(chalk.cyan('\n📋 Validating tag structure...'))

  const allTags = await listTags()
  console.log('All tags:', allTags)

  const issues = []

  const patterns = {
    production:
      /^production-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}|\d{8}-\d{6}|v\d+\.\d+\.\d+|.*-metadata)$/,
    staging: /^staging-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/,
    version: /^v\d+\.\d+\.\d+/,
    rollback:
      /^rollback-(production|staging)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/,
    hotfix: /^hotfix-\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/,
  }

  const categorizedTags = {
    production: [],
    staging: [],
    version: [],
    rollback: [],
    hotfix: [],
    unknown: [],
  }

  // Categorize tags
  allTags.forEach((tag) => {
    let categorized = false
    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(tag)) {
        categorizedTags[category].push(tag)
        categorized = true
        break
      }
    }
    if (!categorized) {
      categorizedTags.unknown.push(tag)
    }
  })

  console.log('Categorized tags:', categorizedTags)

  // Report findings
  console.log(chalk.cyan('\n📋 Tag Structure Analysis:'))
  Object.entries(categorizedTags).forEach(([category, tags]) => {
    if (tags.length > 0) {
      console.log(`  ${category.toUpperCase()}: ${tags.length} tags`)
      if (category === 'unknown' && tags.length > 0) {
        console.log(
          chalk.yellow(
            `    Unknown tags: ${tags.slice(0, 5).join(', ')}${tags.length > 5 ? '...' : ''}`,
          ),
        )
        issues.push(`${tags.length} unknown tag format(s) found`)
      }
    }
  })

  console.log('About to check deployment tag patterns...')
  console.log('categorizedTags before forEach:', categorizedTags)

  // Check for deployment tag patterns
  const environments = ['production', 'staging']
  console.log('Environments to check:', environments)

  for (let i = 0; i < environments.length; i++) {
    const env = environments[i]
    console.log(`\nChecking environment: ${env}`)
    console.log(`categorizedTags type:`, typeof categorizedTags)
    console.log(`categorizedTags keys:`, Object.keys(categorizedTags))
    console.log(`env variable:`, env, typeof env)

    try {
      const tags = categorizedTags[env]
      console.log(`tags for ${env}:`, tags)
      console.log(`tags length:`, tags.length)

      if (tags.length === 0) {
        issues.push(`No ${env} deployment tags found`)
      } else if (tags.length === 1) {
        issues.push(
          `Only one ${env} deployment tag found - limited rollback capability`,
        )
      }
    } catch (error) {
      console.error(`Error processing ${env}:`, error.message)
      throw error
    }
  }

  console.log('Completed successfully!')
  return { categorizedTags, issues }
}

isolatedValidateTagStructure()
  .then((result) => {
    console.log('Final result:', result)
  })
  .catch((error) => {
    console.error('Error:', error)
    console.error('Stack:', error.stack)
  })
