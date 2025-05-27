#!/usr/bin/env node

/**
 * update-mdx-frontmatter-date.js
 *
 * Updates the 'updated' field in the frontmatter of .notes/ai-tasks-template.mdx
 * to the current date in ISO format (YYYY-MM-DD).
 *
 * Usage:
 *   node scripts/update-mdx-frontmatter-date.js
 *
 * This script should be run before release to ensure the 'updated' field is current.
 */

import fs from 'fs'
import path from 'path'

const targetFile = path.join(process.cwd(), '.notes', 'ai-tasks-template.mdx')

function updateFrontmatterDate(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  // Match the frontmatter block
  const frontmatterMatch = content.match(/^---[\s\S]*?---/)
  if (!frontmatterMatch) {
    console.error('No frontmatter found in', filePath)
    process.exit(1)
  }
  const frontmatter = frontmatterMatch[0]
  // Match the updated field
  const updatedMatch = frontmatter.match(/updated:\s*['"]?([0-9Xx\-]+)['"]?/)
  if (!updatedMatch) {
    console.warn("No 'updated:' field found in frontmatter. No changes made.")
    return
  }
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const newFrontmatter = frontmatter.replace(
    /updated:\s*['"]?([0-9Xx\-]+)['"]?/,
    `updated: '${today}'`,
  )
  if (newFrontmatter === frontmatter) {
    console.log('No change needed; already up to date.')
    return
  }
  const newContent = content.replace(frontmatter, newFrontmatter)
  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`Updated 'updated:' field in ${filePath} to ${today}`)
}

updateFrontmatterDate(targetFile)
