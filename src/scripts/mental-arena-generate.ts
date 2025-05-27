#!/usr/bin/env ts-node
/**
 * MentalArena Data Generation Script
 *
 * This script demonstrates how to use the MentalArena integration
 * to generate synthetic therapeutic conversations.
 *
 * Usage:
 *   ts-node mental-arena-generate.ts --num-sessions 10 --output-path ./data/synthetic.jsonl
 */

import path from 'path'
import { program } from 'commander'
import { promises as fs } from 'fs'
import {
  MentalArenaPythonBridge,
  MentalArenaAdapter,
} from '../lib/ai/mental-arena'

// Parse command line arguments
program
  .option('-n, --num-sessions <number>', 'Number of sessions to generate', '10')
  .option(
    '-o, --output-path <path>',
    'Output path for generated data',
    './data/mental-arena-synthetic.jsonl',
  )
  .option('-m, --model <name>', 'Base model to use', 'llama-3-8b-instruct')
  .option('-p, --python-path <path>', 'Path to Python executable', 'python')
  .option(
    '--use-python-bridge',
    'Use Python bridge instead of TypeScript implementation',
    false,
  )
  .parse(process.argv)

const options = program.opts()

async function main() {
  console.log('🧠 MentalArena Data Generation')
  console.log('============================')
  console.log(
    `Generating ${options['num-sessions']} synthetic therapy sessions`,
  )
  console.log(`Output path: ${options['output-path']}`)
  console.log(`Using model: ${options.model}`)

  try {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(options['output-path'])
    await fs.mkdir(outputDir, { recursive: true })

    if (options['use-python-bridge']) {
      // Use Python bridge approach
      console.log('Using Python bridge implementation')

      const mentalArenaPath = path.join(process.cwd(), 'mental-arena')
      const pythonBridge = new MentalArenaPythonBridge({
        mentalArenaPath,
        pythonPath: options['python-path'],
      })

      // Initialize (clone repo if needed)
      console.log('Initializing MentalArena Python environment...')
      await pythonBridge.initialize()

      // Generate data
      console.log('Generating data with arena_med.py...')
      await pythonBridge.generateData({
        baseModel: options.model,
        outputFile: options['output-path'],
        numSessions: parseInt(options['num-sessions']),
      })

      console.log('Data generation complete!')
    } else {
      // Use TypeScript implementation
      console.log('Using TypeScript implementation')

      // Create a minimal mock provider with type assertion
      const mockProvider = {
        analyzeEmotions: async () => ({
          dominant: 'neutral',
          emotions: { neutral: 1.0 },
          confidence: 0.9,
          timestamp: new Date().toISOString(),
          overallSentiment: 'neutral',
          riskFactors: [],
          contextualFactors: [],
          requiresAttention: false,
        }),
        generateIntervention: async () => ({
          content: 'This is a synthetic response for testing purposes.',
          techniques: ['reflection'],
        }),
        createChatCompletion: async () => ({
          content: 'Synthetic chat completion',
        }),
        assessRisk: async () => ({
          riskLevel: 'low',
          reasoning: 'This is a mock assessment',
        }),
        handleEmergency: async () => ({ response: 'Mock emergency response' }),
        generateText: async () => 'Generated mock text',
      }

      // Create a minimal mock FHE service with type assertion
      const mockFHE = {
        encrypt: async (value: any) => ({
          data: 'encrypted',
          originalType: typeof value,
        }),
        decrypt: async () => 'decrypted',
        encryptText: async (text: string) => 'encrypted:' + text,
        decryptText: async (encrypted: string) =>
          encrypted.replace('encrypted:', ''),
        generateHash: async (_data: any) => 'hash',
        setEncryptionMode: () => {},
        scheme: { supportsOperation: () => true },
        isInitialized: () => true,
        initialize: async () => {},
        generateKeys: async () => ({ publicKey: 'mock', privateKey: 'mock' }),
        supportsOperation: () => true,
      }

      // Create adapter with type assertions to satisfy TypeScript
      const adapter = new MentalArenaAdapter(
        mockProvider as any,
        mockFHE as any,
        'http://localhost:8000', // baseUrl
        'test-api-key', // apiKey
        false, // pythonBridgeEnabled
      )

      // Generate synthetic data
      console.log('Generating synthetic therapeutic conversations...')
      const syntheticData = await adapter.generateSyntheticData({
        numSessions: parseInt(options['num-sessions']),
        maxTurns: 5,
        disorders: ['anxiety', 'depression', 'ptsd', 'adhd', 'ocd'],
        outputPath: options['output-path'],
      })

      // Save data to file
      const jsonlData = syntheticData
        .map((session) => JSON.stringify(session))
        .join('\n')
      await fs.writeFile(options['output-path'], jsonlData)

      console.log(
        `Generated ${syntheticData.length} synthetic therapy sessions`,
      )
      console.log(`Data saved to ${options['output-path']}`)
    }

    console.log('✅ Data generation complete')
  } catch (error) {
    console.error('❌ Error generating data:', error)
    process.exit(1)
  }
}

main()
