#!/usr/bin/env node

/*
 * Fix Credentials Script
 *
 * This script:
 * 1. Replaces hardcoded credentials with environment variables across the codebase
 * 2. Generates an .env.example file with placeholders
 * 3. Creates a report of all changes made
 *
 * Usage:
 *   node scripts/fix-credentials.js           # Run in fix mode
 *   node scripts/fix-credentials.js --dry-run # Check without making changes
 *   node scripts/fix-credentials.js --check-only # Only check for hardcoded credentials
 *   node scripts/fix-credentials.js --verbose # Show detailed logs
 */

import fs from 'fs'
import path from 'path'
import * as globModule from 'glob'

// HIPAA Compliance: Initialize audit logging for PHI
const auditLogger = {
  info: (message, data = {}) => {
    console.log(`[PHI-AUDIT] ${message}`, data)
  },
  warn: (message, data = {}) => {
    console.warn(`[PHI-AUDIT] ${message}`, data)
  },
  error: (message, data = {}) => {
    console.error(`[PHI-AUDIT] ${message}`, data)
  },
}

// Log initialization for audit trail
auditLogger.info('Credential scanning process initiated', {
  timestamp: new Date().toISOString(),
  operation: 'credential-scan',
  containsPHI: true,
})

// Handle different glob module exports
const globSync =
  globModule.sync ||
  ((pattern, options) => {
    if (typeof globModule.glob === 'function') {
      return globModule.glob.sync(pattern, options)
    }
    if (typeof globModule.default === 'function') {
      return globModule.default.sync(pattern, options)
    }
    // Fallback to trying glob directly
    return globModule.glob?.sync?.(pattern, options) || []
  })

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run') || args.includes('--check-only')
const checkOnly = args.includes('--check-only')
const verbose = args.includes('--verbose')
const specificFile = args.find((arg) => !arg.startsWith('--'))

console.log(
  `🔐 ${dryRun ? 'Checking' : 'Fixing'} hardcoded credentials in codebase...`,
)

// Files to exclude from processing
const excludePatterns = [
  'node_modules/**',
  'dist/**',
  '.git/**',
  'test-results/**',
  'coverage/**',
  '.vercel/**',
  'scripts/clean-credentials.js',
  'fix-credentials.js',
  'credential-scan-results.json',
]

// File categories for different replacement strategies
const exampleFiles = [
  'docs/**/*.md',
  'docs/**/*.mdx',
  'README.md',
  '**/*.example.ts',
  '**/*.example.js',
  '**/*.example.env',
  '.env.example',
]

const testFiles = [
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.js',
  'tests/**/*',
  'src/tests/**/*',
]

const typeDefinitionFiles = ['**/types.ts', '**/interfaces/**', '**/types/**']

// Environment variables to collect for .env.example
const envVars = new Set()

// Patterns to replace and their replacements
const replacements = [
  // Patient IDs
  {
    pattern: /patientId:\s*["']([A-Za-z0-9-_]+)["']/g,
    replacement: 'patientId: process.env.PATIENT_ID || "example-patient-id"',
    exampleReplacement:
      'patientId: process.env.PATIENT_ID || "example-patient-id"',
    testReplacement:
      'patientId: process.env.PATIENT_ID || "example-patient-id"',
    typeReplacement: 'patientId: string',
    description: 'Patient ID hardcoded values',
    envVar: 'PATIENT_ID',
    containsPHI: true,
  },
  // OAuth Client IDs
  {
    pattern: /clientId:\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement: 'clientId: process.env.CLIENT_ID || "example-client-id"',
    exampleReplacement:
      'clientId: process.env.CLIENT_ID || "example-client-id"',
    testReplacement: 'clientId: process.env.CLIENT_ID || "example-client-id"',
    typeReplacement: 'clientId: string',
    description: 'OAuth Client ID hardcoded values',
    envVar: 'CLIENT_ID',
  },
  // clientId parameters in function definitions
  {
    pattern: /clientId:\s*([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g,
    replacement: 'clientId: $1',
    exampleReplacement: 'clientId: exampleId',
    testReplacement: 'clientId: testId',
    typeReplacement: 'clientId: string',
    description: 'OAuth Client ID parameter',
    skip: true, // Skip replacements for parameter definitions
  },
  // OAuth Client Secrets
  {
    pattern: /clientSecret:\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement:
      'clientSecret: process.env.CLIENT_SECRET || "example-client-secret"',
    exampleReplacement:
      'clientSecret: process.env.CLIENT_SECRET || "example-client-secret"',
    testReplacement:
      'clientSecret: process.env.CLIENT_SECRET || "example-client-secret"',
    typeReplacement: 'clientSecret: string',
    description: 'OAuth Client Secret hardcoded values',
    envVar: 'CLIENT_SECRET',
  },
  // Direct Client ID assignments
  {
    pattern: /const\s+clientId\s*=\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement:
      'const clientId = process.env.CLIENT_ID || "example-client-id"',
    exampleReplacement:
      'const clientId = process.env.CLIENT_ID || "example-client-id"',
    testReplacement:
      'const clientId = process.env.CLIENT_ID || "example-client-id"',
    typeReplacement: 'const clientId: string',
    description: 'Direct OAuth Client ID assignments',
    envVar: 'CLIENT_ID',
  },
  // API Keys
  {
    pattern: /apiKey:\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    exampleReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    testReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    typeReplacement: 'apiKey: string',
    description: 'API Key hardcoded values',
    envVar: 'API_KEY',
  },
  // API Keys with import.meta.env
  {
    pattern: /apiKey:\s*import\.meta\.env\.([A-Za-z0-9_]+)/g,
    replacement: 'apiKey: import.meta.env.$1 || "example-api-key"',
    exampleReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    testReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    typeReplacement: 'apiKey: string',
    description: 'API Key with import.meta.env',
    astroEnvVar: true,
  },
  // Specific API Keys in configs or docs
  {
    pattern:
      /(ANTHROPIC_API_KEY|ELK_API_KEY|POSTMARK_API_KEY|TOGETHER_API_KEY|API_KEY)=([A-Za-z0-9-_.]+)/g,
    replacement: '$1=YOUR_API_KEY_HERE',
    exampleReplacement: '$1=YOUR_API_KEY_HERE',
    testReplacement: '$1=TEST_API_KEY',
    typeReplacement: '$1: string',
    description: 'API Keys in examples',
    externalEnvVar: true,
  },
  // URL-derived Client IDs (safe, should be skipped)
  {
    pattern:
      /(const clientId = )(document\.location\.pathname\.split|url\.searchParams\.get)/g,
    replacement: '$1$2',
    exampleReplacement: '$1$2',
    testReplacement: '$1$2',
    typeReplacement: '$1$2',
    description: 'URL-derived Client ID',
    skip: true,
  },
]

// Helper function to check if a file should be excluded
function shouldExcludeFile(filePath) {
  return excludePatterns.some((pattern) => {
    const regexPattern = pattern.replace(/\*/g, '.*')
    return new RegExp(regexPattern).test(filePath)
  })
}

// Helper functions for file categorization
function isTestFile(filePath) {
  return testFiles.some((pattern) => {
    const regexPattern = pattern.replace(/\*/g, '.*')
    return new RegExp(regexPattern).test(filePath)
  })
}

function isExampleFile(filePath) {
  return exampleFiles.some((pattern) => {
    const regexPattern = pattern.replace(/\*/g, '.*')
    return new RegExp(regexPattern).test(filePath)
  })
}

function isTypeDefinitionFile(filePath) {
  return (
    typeDefinitionFiles.some((pattern) => {
      const regexPattern = pattern.replace(/\*/g, '.*')
      return new RegExp(regexPattern).test(filePath)
    }) ||
    filePath.includes('interface') ||
    filePath.includes('types')
  )
}

// Helper function to get line number for a match
function getLineNumber(content, match) {
  const index = content.indexOf(match)
  if (index === -1) {
    return -1
  }

  const lines = content.substring(0, index).split('\n')
  return lines.length
}

// Process an individual file
async function processFile(filePath) {
  try {
    // Check if file should be excluded
    if (shouldExcludeFile(filePath)) {
      if (verbose) {
        console.log(`Skipping excluded file: ${filePath}`)
      }
      return { changes: 0, findings: [] }
    }

    // Skip directories
    try {
      const stats = await fs.promises.stat(filePath)
      if (stats.isDirectory()) {
        if (verbose) {
          console.log(`Skipping directory: ${filePath}`)
        }
        return { changes: 0, findings: [] }
      }
    } catch (error) {
      console.error(`Error checking file stats for ${filePath}:`, error.message)
      return { changes: 0, findings: [] }
    }

    // Read file content
    let content
    try {
      content = await fs.promises.readFile(filePath, 'utf8')
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message)
      return { changes: 0, findings: [] }
    }

    let updatedContent = content
    let changes = 0
    const findings = []

    const isTest = isTestFile(filePath)
    const isExample = isExampleFile(filePath)
    const isTypeDefinition = isTypeDefinitionFile(filePath)

    if (verbose) {
      console.log(
        `Processing ${filePath} (${isTest ? 'TEST' : ''}${isExample ? 'EXAMPLE' : ''}${isTypeDefinition ? 'TYPE' : ''})`,
      )
    }

    // Process each replacement pattern
    for (const replacement of replacements) {
      // Skip if pattern should be skipped
      if (replacement.skip) {
        continue
      }

      const { pattern, description, containsPHI } = replacement

      // Create a new instance of the RegExp for each use to avoid lastIndex issues
      const regexPattern = new RegExp(pattern.source, pattern.flags)

      let match
      // Find all matches with the new regex instance
      while ((match = regexPattern.exec(content)) !== null) {
        const original = match[0]
        const credential = match[1]
        const lineNumber = getLineNumber(content, original)

        // Log finding to findings array
        findings.push({
          pattern: description,
          value: credential,
          file: filePath,
          line: lineNumber,
        })

        // HIPAA Compliance: Audit log for finding PHI
        if (containsPHI) {
          auditLogger.info('PHI credential pattern detected', {
            file: filePath,
            line: lineNumber,
            pattern: description,
            containsPHI: true,
          })
        }

        // Collect env vars for .env.example
        if (replacement.envVar) {
          envVars.add(replacement.envVar)
        }

        if (replacement.astroEnvVar && match[1]) {
          envVars.add(match[1])
        }

        if (replacement.externalEnvVar && match[1]) {
          envVars.add(match[1])
        }

        // If we're just checking, don't apply replacements
        if (dryRun) {
          continue
        }

        // Apply the appropriate replacement based on file type
        let replacementText
        if (isExample) {
          replacementText = replacement.exampleReplacement
        } else if (isTest) {
          replacementText = replacement.testReplacement
        } else if (isTypeDefinition) {
          replacementText = replacement.typeReplacement
        } else {
          replacementText = replacement.replacement
        }

        try {
          // Apply the replacement - use the original pattern for replacement
          updatedContent = updatedContent.replace(original, replacementText)
          changes += 1

          if (verbose) {
            console.log(`  Applied ${changes} ${description} replacements`)
          }
        } catch (error) {
          console.error(
            `Error applying replacement in ${filePath}:`,
            error.message,
          )
        }

        // HIPAA Compliance: Audit log for fixing PHI
        if (containsPHI && !dryRun) {
          auditLogger.info('PHI credential pattern fixed', {
            file: filePath,
            line: lineNumber,
            pattern: description,
            containsPHI: true,
          })
        }
      }
    }

    // If changes were made or we're in check mode, return the results
    if (dryRun) {
      return { changes, findings }
    }

    // Write the updated file if changes were made
    if (changes > 0) {
      try {
        await fs.promises.writeFile(filePath, updatedContent, 'utf8')
        console.log(`✅ Updated ${filePath} (${changes} replacements)`)
      } catch (error) {
        console.error(`Error writing updated file ${filePath}:`, error.message)
      }
    }

    return { changes, findings }
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`)
    // HIPAA Compliance: Audit log for errors
    auditLogger.error(`Error processing file ${filePath}`, {
      error: error.message,
      stack: error.stack,
    })
    return { changes: 0, findings: [] }
  }
}

async function generateEnvExample() {
  // HIPAA Compliance: Audit log for generating env example
  auditLogger.info('Generating .env.example file', {
    containsPHI: false,
  })

  // Basic content for .env.example
  let content = `# Environment Variables for Pixelated Empathy
# Copy this file to .env and fill in your values

# TOGETHER_API_KEY - Required for authentication/API access
TOGETHER_API_KEY=your_together_api_key_here

# API Keys for External Services
`

  // Add environment variables found during processing
  const sortedVars = Array.from(envVars).sort()
  for (const envVar of sortedVars) {
    content += `${envVar}=YOUR_API_KEY_HERE\n`
  }

  // Add additional standard variables
  content += `
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/pixelated

# Runtime Configuration
NODE_ENV=development
PUBLIC_URL=http://localhost:3000
`

  try {
    await fs.promises.writeFile('.env.example', content, 'utf8')
    if (!dryRun) {
      console.log('✅ Generated .env.example file')
    }
  } catch (error) {
    console.error('❌ Error generating .env.example:', error.message)
  }
}

async function main() {
  const startTime = Date.now()
  let totalFiles = 0
  let totalFindings = 0
  let totalFixed = 0
  const allFindings = []

  try {
    // Get all files to process
    let files
    if (specificFile) {
      files = [specificFile]
    } else {
      const filePattern = '**/*.{js,ts,jsx,tsx,astro,md,mdx,json,yaml,yml}'
      const ignorePattern = excludePatterns.map((p) => p.replace(/\*\*/g, '*'))

      files = globSync(filePattern, {
        ignore: ignorePattern,
        nodir: true,
      })
    }

    console.log(`Found ${files.length} files to check`)

    // HIPAA Compliance: Audit log for files to scan
    auditLogger.info('Starting credential scan', {
      fileCount: files.length,
      operation: 'credential-scan',
    })

    // Setup progress reporting
    const totalFileCount = files.length
    let processedFiles = 0
    let lastProgressReport = Date.now()
    const PROGRESS_REPORT_INTERVAL = 1000 // 1 second (faster updates)

    // Process all files
    for (const file of files) {
      try {
        const { changes, findings } = await processFile(file)

        if (changes > 0) {
          totalFixed += changes
          totalFiles++
        }

        if (findings.length > 0) {
          totalFindings += findings.length
          allFindings.push(...findings)
        }

        // Update processed count
        processedFiles++

        // Show progress periodically
        const now = Date.now()
        if (now - lastProgressReport > PROGRESS_REPORT_INTERVAL) {
          const percent = Math.round((processedFiles / totalFileCount) * 100)
          console.log(
            `Processing: ${percent}% complete (${processedFiles}/${totalFileCount} files)`,
          )
          if (!dryRun) {
            console.log(
              `Fixed ${totalFixed} credential(s) in ${totalFiles} file(s) so far`,
            )
          } else {
            console.log(`Found ${totalFindings} potential credential(s) so far`)
          }
          lastProgressReport = now
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message)
      }
    }

    // Generate environment examples
    await generateEnvExample()

    // HIPAA Compliance: Audit log for scan completion
    auditLogger.info('Credential scan completed', {
      totalFiles,
      totalFindings,
      totalFixed,
      operation: 'credential-scan',
      durationMs: Date.now() - startTime,
    })

    // If we're just checking, report findings
    if (checkOnly) {
      // Group findings by file
      const findingsByFile = {}
      for (const finding of allFindings) {
        if (!findingsByFile[finding.file]) {
          findingsByFile[finding.file] = []
        }
        findingsByFile[finding.file].push(finding)
      }

      console.log(`\n🔍 Credential Check Results:`)
      console.log(
        `Found ${allFindings.length} potential credential(s) in ${Object.keys(findingsByFile).length} file(s)`,
      )

      if (allFindings.length > 0) {
        console.log(`\nFiles with hardcoded credentials:\n`)

        for (const [file, fileFindings] of Object.entries(findingsByFile)) {
          console.log(`${file}:`)
          fileFindings.forEach((finding) => {
            console.log(`  - Line ${finding.line}: ${finding.pattern}`)
          })
        }

        // Write findings to JSON
        const results = {
          totalFindings: allFindings.length,
          totalFiles: Object.keys(findingsByFile).length,
          findings: allFindings,
          scanDate: new Date().toISOString(),
        }

        await fs.promises.writeFile(
          'credential-scan-results.json',
          JSON.stringify(results, null, 2),
        )
        console.log(
          `\n📊 Detailed report written to credential-scan-results.json`,
        )

        if (!process.env.CI) {
          console.log(
            `\n⚠️ To fix these issues, run: node scripts/fix-credentials.js`,
          )
        }

        // Exit with error code in CI environments if findings exist
        if (process.env.CI) {
          process.exit(1)
        }
      } else {
        console.log('✅ No hardcoded credentials found!')
      }
    } else if (totalFixed > 0) {
      console.log(`\n✅ Credential Fix Results:`)
      console.log(`Fixed ${totalFixed} credential references`)
    } else {
      console.log(`\n✅ Credential Fix Results:`)
      console.log(`No credential issues to fix`)
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    // HIPAA Compliance: Audit log for errors
    auditLogger.error('Credential scan failed', {
      error: error.message,
      stack: error.stack,
    })
    process.exit(1)
  }
}

// Execute main function
main().catch((error) => {
  console.error(`❌ Unhandled error: ${error.message}`)
  // HIPAA Compliance: Audit log for unhandled errors
  auditLogger.error('Unhandled error in credential scan', {
    error: error.message,
    stack: error.stack,
  })
  process.exit(1)
})
