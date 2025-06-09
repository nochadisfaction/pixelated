#!/usr/bin/env node

/**
 * Clean Vercel Cache Script
 * Removes Vite cache and node_modules cache that might cause build issues
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function cleanDirectory(dirPath) {
  try {
    await fs.access(dirPath)
    await fs.rm(dirPath, { recursive: true, force: true })
    console.log(`✅ Cleaned: ${dirPath}`)
  } catch (error) {
    console.log(`ℹ️  Not found or already clean: ${dirPath}`)
  }
}

async function cleanVercelCache() {
  console.log('🧹 Cleaning Vercel build cache...')
  
  const pathsToClean = [
    path.join(rootDir, 'node_modules/.vite'),
    path.join(rootDir, 'node_modules/.cache'),
    path.join(rootDir, '.astro'),
    path.join(rootDir, 'dist'),
    path.join(rootDir, '.vercel'),
  ]

  for (const dirPath of pathsToClean) {
    await cleanDirectory(dirPath)
  }

  console.log('✨ Cache cleaning complete!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanVercelCache().catch(console.error)
}

export default cleanVercelCache 