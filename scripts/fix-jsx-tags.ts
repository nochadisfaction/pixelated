#!/usr/bin/env tsx

import { promises as fs } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

const commonJsxTags = new Map([
  ['selec', 'select'],
  ['inpu', 'input'],
  ['tex', 'text'],
  ['bu', 'button'],
  ['spli', 'split'],
  ['layou', 'layout'],
  ['scrip', 'script'],
  ['heade', 'header'],
  ['foote', 'footer'],
  ['conten', 'content'],
  ['impor', 'import'],
  ['implemen', 'implement'],
  ['componen', 'component'],
  ['expor', 'export'],
  ['oupu', 'output'],
  ['taile', 'tailent'],
  ['artical', 'article'],
  ['aler', 'alert'],
  ['forma', 'format'],
  ['inser', 'insert'],
  ['targe', 'target'],
])

async function fixFile(filePath: string): Promise<boolean> {
  const content = await fs.readFile(filePath, 'utf8')
  let newContent = content

  // Fix opening tags
  for (const [broken, fixed] of commonJsxTags) {
    const openTagRegex = new RegExp(`<${broken}(\\s|>|$)`, 'g')
    newContent = newContent.replace(openTagRegex, `<${fixed}$1`)

    // Fix closing tags
    const closeTagRegex = new RegExp(`</${broken}>`, 'g')
    newContent = newContent.replace(closeTagRegex, `</${fixed}>`)

    // Fix self-closing tags
    const selfClosingRegex = new RegExp(`<${broken}\\s+([^>]*?)/>`, 'g')
    newContent = newContent.replace(selfClosingRegex, `<${fixed} $1/>`)
  }

  // Fix helperText typo
  newContent = newContent.replace(/helperTex(?!t\b)/g, 'helperText')

  if (newContent !== content) {
    await fs.writeFile(filePath, newContent, 'utf8')
    return true
  }

  return false
}

async function processDirectory(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  let fixedFiles = 0

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.next'].includes(entry.name)) {
        fixedFiles += await processDirectory(fullPath)
      }
    } else if (
      (entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.jsx') ||
        entry.name.endsWith('.astro')) &&
      (await fixFile(fullPath))
    ) {
      console.log(chalk.green(`✓ Fixed JSX tags in: ${fullPath}`))
      fixedFiles++
    }
  }

  return fixedFiles
}

// Add this script to package.json scripts
async function addScriptToPackageJson() {
  const pkgPath = 'package.json'
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))

  if (!pkg.scripts['fix:jsx']) {
    pkg.scripts['fix:jsx'] = 'tsx scripts/fix-jsx-tags.ts'
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
    console.log(chalk.blue('Added fix:jsx script to package.json'))
  }
}

async function main() {
  console.log(chalk.blue('Scanning for mangled JSX tags...'))
  const fixedFiles = await processDirectory('src')
  console.log(chalk.green(`\nFixed ${fixedFiles} files`))
  await addScriptToPackageJson()
}

main().catch(console.error)
