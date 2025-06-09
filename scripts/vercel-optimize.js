#!/usr/bin/env node
/**
 * Vercel Bundle Size Optimization Script
 * 
 * This script temporarily moves heavy files and directories during Vercel builds
 * to reduce the serverless function bundle size below the 300MB limit.
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Heavy directories and files to temporarily move
const HEAVY_PATHS = [
  'ai/',
  'public/models/',
  'public/test-results/',
  'performance-results/',
  'test-results/',
  'security-scan-artifacts/',
  'secret-scan-artifacts/',
  'reports/',
  'memory/',
  'patches/',
  'fixes/',
  'tests/',
  'docs/',
  'examples/',
  'demos/',
  'src/lib/ai/bias-detection/bias_detection_env/',
  'src/lib/ai/datasets/emotion_validation/',
  'public/css/',
  'public/fonts/',
  'public/js/',
  'public/katex/',
  'public/polyfills/',
  'public/styles/',
  'supabase/',
  'dbt-mcp/',
  'collections/',
  'types/',
  'src/@types/',
]

// Components with heavy dependencies to temporarily disable
const HEAVY_COMPONENTS = [
  'src/components/dashboard/MultidimensionalEmotionChart.tsx',
  'src/components/session/MultidimensionalEmotionChart.tsx',
  'src/components/ui/charts/',
  'src/components/three/',
  'src/components/ai/mental-llama/',
  'src/components/admin/bias-detection/',
]

async function pathExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function moveToTemp(relativePath) {
  const fullPath = path.join(projectRoot, relativePath)
  const tempPath = path.join(projectRoot, '.vercel-temp', relativePath)
  
  if (!(await pathExists(fullPath))) {
    console.log(`⚠️  Path does not exist: ${relativePath}`)
    return false
  }
  
  try {
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(tempPath), { recursive: true })
    
    // Move the file/directory
    await fs.rename(fullPath, tempPath)
    console.log(`✅ Moved to temp: ${relativePath}`)
    return true
  } catch (error) {
    console.warn(`⚠️  Failed to move ${relativePath}:`, error.message)
    return false
  }
}

async function restoreFromTemp(relativePath) {
  const fullPath = path.join(projectRoot, relativePath)
  const tempPath = path.join(projectRoot, '.vercel-temp', relativePath)
  
  if (!(await pathExists(tempPath))) {
    return false
  }
  
  try {
    // Ensure target directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    
    // Move back from temp
    await fs.rename(tempPath, fullPath)
    console.log(`✅ Restored from temp: ${relativePath}`)
    return true
  } catch (error) {
    console.warn(`⚠️  Failed to restore ${relativePath}:`, error.message)
    return false
  }
}

async function createStubs() {
  console.log('📝 Creating lightweight stubs...')
  
  // Create stub for heavy components
  const stubComponent = `
import React from 'react'

// Lightweight stub for Vercel deployment
export default function StubComponent(props: any) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <p className="text-gray-600 text-sm">
        Component temporarily disabled for optimal loading
      </p>
    </div>
  )
}
`

  for (const componentPath of HEAVY_COMPONENTS) {
    const fullPath = path.join(projectRoot, componentPath)
    const isDirectory = componentPath.endsWith('/')
    
    if (isDirectory) {
      if (await pathExists(fullPath)) {
        // Create a stub index file in the directory
        const stubPath = path.join(fullPath, 'index.tsx')
        if (!(await pathExists(stubPath))) {
          await fs.writeFile(stubPath, stubComponent, 'utf8')
          console.log(`✅ Created stub: ${componentPath}index.tsx`)
        }
      }
    } else if (await pathExists(fullPath)) {
      // Create stub file alongside original
      const stubPath = fullPath.replace('.tsx', '.vercel-stub.tsx')
      await fs.writeFile(stubPath, stubComponent, 'utf8')
      console.log(`✅ Created stub: ${componentPath}`)
    }
  }
}

async function optimize() {
  console.log('🚀 Starting Vercel bundle optimization...')
  
  // Create temp directory
  await fs.mkdir(path.join(projectRoot, '.vercel-temp'), { recursive: true })
  
  // Move heavy paths to temp
  console.log('📦 Moving heavy directories to temp...')
  for (const heavyPath of HEAVY_PATHS) {
    await moveToTemp(heavyPath)
  }
  
  // Create lightweight stubs
  await createStubs()
  
  console.log('✅ Bundle optimization complete!')
  console.log('💡 Run "node scripts/vercel-restore.js" after deployment to restore files')
}

async function restore() {
  console.log('🔄 Restoring files from temp...')
  
  // Restore heavy paths from temp
  for (const heavyPath of HEAVY_PATHS) {
    await restoreFromTemp(heavyPath)
  }
  
  // Remove temp directory
  try {
    await fs.rm(path.join(projectRoot, '.vercel-temp'), { recursive: true, force: true })
    console.log('✅ Temp directory cleaned up')
  } catch (error) {
    console.warn('⚠️  Failed to clean up temp directory:', error.message)
  }
  
  console.log('✅ Restoration complete!')
}

// Check command line argument
const command = process.argv[2]

if (command === 'restore') {
  restore().catch(console.error)
} else {
  optimize().catch(console.error)
} 