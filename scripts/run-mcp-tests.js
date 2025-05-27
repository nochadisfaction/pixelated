#!/usr/bin/env node

/**
 * Script to run Playwright tests with MCP integration
 *
 * This script runs the Playwright tests using the MCP configuration
 * defined in tests/mcp-e2e-config.ts.
 *
 * Usage:
 *   node scripts/run-mcp-tests.js
 *
 * Optional arguments:
 *   --project=chromium     Run tests only on Chromium (default: all projects)
 *   --debug                Run tests in debug mode
 *   --ui                   Run tests with Playwright UI
 */

const { execSync } = require('child_process')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const projectArg = args.find((arg) => arg.startsWith('--project='))
const project = projectArg ? projectArg.split('=')[1] : null
const debug = args.includes('--debug')
const ui = args.includes('--ui')

// Build the command
let command = 'pnpm playwright test'

// Add configuration file
command += ' --config=tests/mcp-e2e-config.ts'

// Add project if specified
if (project) {
  command += ` --project=${project}`
}

// Add debug flag if specified
if (debug) {
  command += ' --debug'
}

// Add UI flag if specified
if (ui) {
  command += ' --ui'
}

console.log(`Running MCP tests with command: ${command}`)

try {
  // Execute the command
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure MCP integration is enabled
      MCP_ENABLED: 'true',
      // Add any other environment variables needed for MCP
    },
  })

  console.log('MCP tests completed successfully!')
  process.exit(0)
} catch (error) {
  console.error('MCP tests failed:', error.message)
  process.exit(1)
}
