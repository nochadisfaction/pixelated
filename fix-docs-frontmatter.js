#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DOCS_DIR = path.join(__dirname, 'src/content/docs')
const DEFAULT_AUTHOR = 'Pixelated Empathy Team'
const DEFAULT_PUB_DATE = '2025-01-01'

// Utility functions
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return {
      frontmatter: '',
      content: content,
      hasFrontmatter: false
    }
  }

  return {
    frontmatter: match[1],
    content: match[2],
    hasFrontmatter: true
  }
}

function parseFrontmatterFields(frontmatterStr) {
  const fields = {}
  const lines = frontmatterStr.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue
    
    const key = trimmed.substring(0, colonIndex).trim()
    let value = trimmed.substring(colonIndex + 1).trim()
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    fields[key] = value
  }
  
  return fields
}

function buildFrontmatter(fields) {
  const orderedKeys = [
    'title',
    'description', 
    'pubDate',
    'author',
    'category',
    'tags',
    'order',
    'draft',
    'slug',
    'toc',
    'share',
    'ogImage'
  ]
  
  let frontmatter = ''
  
  function formatValue(value) {
    if (Array.isArray(value)) {
      return `[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')}]`
    } else if (typeof value === 'boolean') {
      return value
    } else if (typeof value === 'number') {
      return value
    } else {
      // For strings, escape single quotes and use double quotes if needed
      const stringValue = String(value)
      if (stringValue.includes("'") || stringValue.includes('"') || stringValue.includes(':')) {
        return `"${stringValue.replace(/"/g, '\\"')}"`
      } else {
        return `'${stringValue}'`
      }
    }
  }
  
  // Add fields in preferred order
  for (const key of orderedKeys) {
    if (fields[key] !== undefined) {
      frontmatter += `${key}: ${formatValue(fields[key])}\n`
    }
  }
  
  // Add any remaining fields not in the ordered list
  for (const [key, value] of Object.entries(fields)) {
    if (!orderedKeys.includes(key)) {
      frontmatter += `${key}: ${formatValue(value)}\n`
    }
  }
  
  return frontmatter.trim()
}

function fixFrontmatter(content, filePath) {
  const { frontmatter, content: bodyContent, hasFrontmatter } = parseFrontmatter(content)
  
  let fields = {}
  let needsUpdate = false
  
  if (hasFrontmatter) {
    fields = parseFrontmatterFields(frontmatter)
  } else {
    // No frontmatter exists, create new one
    needsUpdate = true
    console.log(`  ❌ No frontmatter found, creating new frontmatter`)
  }
  
  // Check for required fields and add if missing
  if (!fields.pubDate) {
    fields.pubDate = DEFAULT_PUB_DATE
    needsUpdate = true
    console.log(`  ❌ Missing pubDate, adding: ${DEFAULT_PUB_DATE}`)
  } else {
    console.log(`  ✅ pubDate found: ${fields.pubDate}`)
  }
  
  if (!fields.author) {
    fields.author = DEFAULT_AUTHOR
    needsUpdate = true
    console.log(`  ❌ Missing author, adding: ${DEFAULT_AUTHOR}`)
  } else {
    console.log(`  ✅ author found: ${fields.author}`)
  }
  
  // Add some sensible defaults for other fields if they don't exist
  if (!fields.draft) {
    fields.draft = false
  }
  
  if (!fields.toc) {
    fields.toc = true
  }
  
  if (!fields.share) {
    fields.share = true
  }
  
  if (needsUpdate) {
    const newFrontmatter = buildFrontmatter(fields)
    const newContent = `---\n${newFrontmatter}\n---\n\n${bodyContent}`
    return { content: newContent, changed: true }
  }
  
  return { content, changed: false }
}

function getAllMarkdownFiles(dir) {
  const files = []
  
  function traverseDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        traverseDir(fullPath)
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        files.push(fullPath)
      }
    }
  }
  
  traverseDir(dir)
  return files
}

// Main execution
async function main() {
  console.log('🔧 Fixing frontmatter in docs files...\n')
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`❌ Docs directory not found: ${DOCS_DIR}`)
    process.exit(1)
  }
  
  const markdownFiles = getAllMarkdownFiles(DOCS_DIR)
  
  if (markdownFiles.length === 0) {
    console.log('ℹ️  No markdown files found in docs directory')
    return
  }
  
  console.log(`📁 Found ${markdownFiles.length} markdown files\n`)
  
  let totalFixed = 0
  
  for (const filePath of markdownFiles) {
    const relativePath = path.relative(process.cwd(), filePath)
    console.log(`📄 Processing: ${relativePath}`)
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const { content: newContent, changed } = fixFrontmatter(content, filePath)
      
      if (changed) {
        fs.writeFileSync(filePath, newContent, 'utf-8')
        console.log(`  ✅ Fixed and saved\n`)
        totalFixed++
      } else {
        console.log(`  ✅ No changes needed\n`)
      }
    } catch (error) {
      console.error(`  ❌ Error processing file: ${error.message}\n`)
    }
  }
  
  console.log(`🎉 Completed! Fixed ${totalFixed} out of ${markdownFiles.length} files`)
  
  if (totalFixed > 0) {
    console.log('\n💡 Tip: Run your development server to verify the fixes work correctly')
  }
}

// Run the script
main().catch(console.error) 