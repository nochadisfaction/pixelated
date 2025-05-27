#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as globModule from 'glob'

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

const __filename = fileURLToPath(import.meta.url)

// Parse command line args
const args = process.argv.slice(2)
const checkOnly = args.includes('--check-only')
const verbose = args.includes('--verbose')
const specificFile = args.find((arg) => !arg.startsWith('--'))

console.log(
  `🔐 Starting sensitive data ${checkOnly ? 'check' : 'cleanup'} script...`,
)

// Files to exclude from processing
const excludePatterns = [
  'node_modules/**',
  'dist/**',
  '.git/**',
  'test-results/**',
  'coverage/**',
  '.vercel/**',
  'scripts/clean-credentials.js', // Don't modify this script itself
  'fix-credentials.js', // Don't modify the other credentials script
  'credential-scan-results.json',
]

// Files that should use example values rather than env vars
const exampleOnlyFiles = [
  'docs/**/*.md',
  'docs/**/*.mdx',
  'README.md',
  '**/*.example.ts',
  '**/*.example.js',
]

// Test files need special handling
const testFiles = [
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.js',
  'tests/**/*',
  'src/tests/**/*',
]

// TypeScript interface files and files with type definitions
const typeDefinitionFiles = ['**/types.ts', '**/interfaces/**', '**/types/**']

// Patterns to replace and their replacements
const replacements = [
  // Replace hardcoded patient IDs with environment variables
  {
    pattern: /patientId:\s*["']([A-Za-z0-9-_]+)["']/g,
    replacement: 'patientId: process.env.PATIENT_ID || "example-patient-id"',
    exampleReplacement:
      'patientId: process.env.PATIENT_ID || "example-patient-id"',
    testReplacement:
      'patientId: process.env.PATIENT_ID || "example-patient-id"',
    typeReplacement: 'patientId: string',
    description: 'Patient ID hardcoded values',
  },
  // Replace hardcoded OAuth client IDs
  {
    pattern: /clientId:\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement: 'clientId: process.env.CLIENT_ID || "example-client-id"',
    exampleReplacement:
      'clientId: process.env.CLIENT_ID || "example-client-id"',
    testReplacement: 'clientId: process.env.CLIENT_ID || "example-client-id"',
    typeReplacement: 'clientId: string',
    description: 'OAuth Client ID hardcoded values',
  },
  // Handle clientId in parameters that should remain unchanged
  {
    pattern:
      /\(\s*{\s*(?:[a-zA-Z0-9_]+\s*,\s*)*clientId(?:\s*,\s*[a-zA-Z0-9_]+)*\s*}\s*\)|\(\s*clientId\s*(?:,\s*[a-zA-Z0-9_]+)*\s*\)/g,
    replacement: '$&', // Keep as is
    exampleReplacement: '$&',
    testReplacement: '$&',
    typeReplacement: '$&',
    description: 'Function parameter clientId',
    skip: true, // Skip replacement
  },
  // Replace clientId in function parameters
  {
    pattern: /clientId:\s*([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g,
    replacement: 'clientId: $1',
    exampleReplacement: 'clientId: exampleId',
    testReplacement: 'clientId: testId',
    typeReplacement: 'clientId: string',
    description: 'OAuth Client ID parameter',
    skip: false,
  },
  // Replace hardcoded OAuth client secrets
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
  },
  // Replace direct OAuth client ID assignments
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
  },
  // Replace API key assignments
  {
    pattern: /apiKey:\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    exampleReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    testReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    typeReplacement: 'apiKey: string',
    description: 'API Key hardcoded values',
  },
  // Handle special case with import.meta.env
  {
    pattern: /apiKey:\s*import\.meta\.env\.([A-Za-z0-9_]+)/g,
    replacement: 'apiKey: import.meta.env.$1 || "example-api-key"',
    exampleReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    testReplacement: 'apiKey: process.env.API_KEY || "example-api-key"',
    typeReplacement: 'apiKey: string',
    description: 'API Key with import.meta.env',
  },
  // Replace hardcoded credentials in documentation examples
  {
    pattern:
      /(ANTHROPIC_API_KEY|ELK_API_KEY|POSTMARK_API_KEY|TOGETHER_API_KEY|API_KEY)=([A-Za-z0-9-_.]+)/g,
    replacement: '$1=YOUR_API_KEY_HERE',
    exampleReplacement: '$1=YOUR_API_KEY_HERE',
    testReplacement: '$1=TEST_API_KEY',
    typeReplacement: '$1: string',
    description: 'API Keys in examples',
  },
  // Handle direct API key assignments
  {
    pattern: /const\s+apiKey\s*=\s*["']([A-Za-z0-9-_.]+)["']/g,
    replacement: 'const apiKey = process.env.API_KEY || "example-api-key"',
    exampleReplacement:
      'const apiKey = process.env.API_KEY || "example-api-key"',
    testReplacement: 'const apiKey = process.env.API_KEY || "example-api-key"',
    typeReplacement: 'const apiKey: string',
    description: 'Direct API Key assignments',
  },
  // Special case for extracting client ID from URL
  {
    pattern:
      /(const clientId = )(document\.location\.pathname\.split|url\.searchParams\.get)/g,
    // Don't modify these, they're safely getting the ID from the URL
    replacement: '$1$2',
    exampleReplacement: '$1$2',
    testReplacement: '$1$2',
    typeReplacement: '$1$2',
    description: 'URL-derived Client ID',
    skip: true, // Skip replacement for these matches
  },
]

// Function to determine if a file is a test file
function isTestFile(filePath) {
  return testFiles.some((pattern) => {
    const regexPattern = pattern.replace(/\*/g, '.*')
    return new RegExp(regexPattern).test(filePath)
  })
}

// Function to determine if file should use example values
function isExampleFile(filePath) {
  return exampleOnlyFiles.some((pattern) => {
    const regexPattern = pattern.replace(/\*/g, '.*')
    return new RegExp(regexPattern).test(filePath)
  })
}

// Function to determine if file is a type definition file
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

// Check if a file path should be excluded
function shouldExclude(filePath) {
  return excludePatterns.some((pattern) => {
    const regexPattern = pattern.replace(/\*/g, '.*')
    return new RegExp(regexPattern).test(filePath)
  })
}

// Function to process a file
async function processFile(filePath) {
  try {
    // Skip excluded files
    if (shouldExclude(filePath)) {
      if (verbose) {
        console.log(`Skipping excluded file: ${filePath}`)
      }
      return { changes: 0, findings: [] }
    }

    // Check if file is a directory
    const stats = await fs.promises.stat(filePath)
    if (stats.isDirectory()) {
      if (verbose) {
        console.log(`Skipping directory: ${filePath}`)
      }
      return { changes: 0, findings: [] }
    }

    // Read file content
    const content = await fs.promises.readFile(filePath, 'utf8')
    let newContent = content
    let changes = 0
    let findings = []

    const isTest = isTestFile(filePath)
    const isExample = isExampleFile(filePath)
    const isTypeDefinition = isTypeDefinitionFile(filePath)

    if (verbose) {
      console.log(
        `Processing ${filePath} (${isTest ? 'TEST' : ''}${isExample ? 'EXAMPLE' : ''}${isTypeDefinition ? 'TYPE' : ''})`,
      )
    }

    // Apply replacements
    for (const replacement of replacements) {
      // Skip if this pattern should be skipped
      if (replacement.skip) {
        continue
      }

      // Check for matches
      const matches = Array.from(newContent.matchAll(replacement.pattern))
      if (matches && matches.length > 0) {
        // If we're only checking, add to findings and continue
        if (checkOnly) {
          for (const match of matches) {
            findings.push({
              file: filePath,
              line: getLineNumber(content, match[0]),
              pattern: replacement.description,
              match: match[0],
            })
          }
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

        // Apply the replacement
        const originalContent = newContent
        newContent = newContent.replace(replacement.pattern, replacementText)

        if (originalContent !== newContent) {
          changes += matches.length
          if (verbose) {
            console.log(
              `  Applied ${matches.length} ${replacement.description} replacements`,
            )
          }
        }
      }
    }

    // If changes were made, write the file back
    if (changes > 0 && !checkOnly) {
      await fs.promises.writeFile(filePath, newContent, 'utf8')
      console.log(`✅ Updated ${filePath} (${changes} replacements)`)
    }

    return { changes, findings }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return { changes: 0, findings: [] }
  }
}

// Main function
async function main() {
  try {
    // Get all files to check
    const filePattern =
      specificFile || '**/*.{js,ts,jsx,tsx,astro,md,mdx,json,yaml,yml}'
    const ignorePattern = excludePatterns.map((p) => p.replace(/\*\*/g, '*'))
    const files = globSync(filePattern, { ignore: ignorePattern, nodir: true })

    console.log(`Found ${files.length} files to check`)

    // Process all files
    let totalChanges = 0
    let allFindings = []

    for (const file of files) {
      const { changes, findings } = await processFile(file)
      totalChanges += changes
      allFindings = allFindings.concat(findings)
    }

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

        // Save results to JSON
        const results = {
          totalFindings: allFindings.length,
          totalFiles: Object.keys(findingsByFile).length,
          findings: allFindings,
        }
        await fs.promises.writeFile(
          'credential-scan-results.json',
          JSON.stringify(results, null, 2),
        )
        console.log(
          `\n📊 Detailed report written to credential-scan-results.json`,
        )
      }
    } else {
      console.log(
        `\n✅ Completed credential cleanup: ${totalChanges} replacements in ${totalChanges > 0 ? files.filter((f) => fs.readFileSync(f, 'utf8') !== fs.readFileSync(f, 'utf8')).length : 0} files`,
      )

      if (totalChanges > 0) {
        console.log(`\n⚠️ IMPORTANT: Review the changes carefully before committing!
    Ensure that environment variables are properly set in your deployment environments
    For testing, you may need to set up a .env file with example values`)
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Example PHI audit logging - uncomment and customize as needed
// logger.info('Accessing PHI data', {
//   userId: 'user-id-here',
//   action: 'read',
//   dataType: 'patient-record',
//   recordId: 'record-id-here'
// });
