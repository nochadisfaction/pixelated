#!/usr/bin/env node

/**
 * update-gantt-dates.js
 *
 * Updates the Mermaid Gantt chart in .notes/ai-tasks-template.mdx
 * using milestone/task data from .notes/gantt-milestones.json.
 *
 * Usage:
 *   node scripts/update-gantt-dates.js
 *
 * The JSON file should be an array of objects:
 * [
 *   { "section": "Core Systems", "task": "Task 1", "status": "active", "start": "2024-06-10", "duration": "5d" },
 *   ...
 * ]
 */

import fs from 'fs'
import path from 'path'

const mdxPath = path.join(process.cwd(), '.notes', 'ai-tasks-template.mdx')
const jsonPath = path.join(process.cwd(), '.notes', 'gantt-milestones.json')

function readMilestones(jsonFile) {
  if (!fs.existsSync(jsonFile)) {
    console.error('Milestone JSON file not found:', jsonFile)
    process.exit(1)
  }
  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
    if (!Array.isArray(data)) throw new Error('JSON root is not an array')
    // Validate milestone structure
    const requiredFields = ['section', 'task', 'start', 'duration']
    for (let i = 0; i < data.length; i++) {
      const milestone = data[i]
      for (const field of requiredFields) {
        if (!milestone[field]) {
          throw new Error(
            `Milestone at index ${i} is missing required field: ${field}`,
          )
        }
      }
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(milestone.start)) {
        throw new Error(
          `Invalid date format for milestone "${milestone.task}": ${milestone.start}`,
        )
      }
    }
    return data
  } catch (e) {
    console.error('Error parsing milestone JSON:', e.message)
    process.exit(1)
  }
}

function buildGantt(milestones) {
  let chart =
    '```mermaid\ngantt\n    title Implementation Schedule Template\n    dateFormat YYYY-MM-DD\n'
  let currentSection = ''
  for (const m of milestones) {
    if (m.section !== currentSection) {
      chart += `    section ${m.section}\n`
      currentSection = m.section
    }
    // status can be: active, done, or blank
    const status = m.status ? m.status + ', ' : ''
    chart += `    ${m.task}                :${status}${m.start}, ${m.duration}\n`
  }
  chart += '```\n'
  return chart
}

function updateMdxGantt(mdxFile, newGantt) {
  const content = fs.readFileSync(mdxFile, 'utf8')
  // Find the mermaid gantt block
  const ganttRegex = /```mermaid[\s\S]*?```/
  if (!ganttRegex.test(content)) {
    console.error('No Mermaid Gantt chart found in', mdxFile)
    process.exit(1)
  }
  const updated = content.replace(ganttRegex, newGantt)
  fs.writeFileSync(mdxFile, updated, 'utf8')
  console.log('Updated Mermaid Gantt chart in', mdxFile)
}

const milestones = readMilestones(jsonPath)
const newGantt = buildGantt(milestones)
updateMdxGantt(mdxPath, newGantt)
