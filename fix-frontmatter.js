import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const docsDir = path.join(__dirname, 'src', 'content', 'docs');

// Function to check if file has frontmatter
function hasFrontmatter(content) {
  return content.trim().startsWith('---');
}

// Function to generate frontmatter based on filename
function generateFrontmatter(filename, title) {
  const tags = ['documentation'];
  if (filename.includes('api')) tags.push('api');
  if (filename.includes('auth')) tags.push('authentication');
  if (filename.includes('security')) tags.push('security');
  if (filename.includes('redis')) tags.push('redis');
  if (filename.includes('analytics')) tags.push('analytics');
  if (filename.includes('testing')) tags.push('testing');
  if (filename.includes('component')) tags.push('components');
  
  return `---
title: "${title}"
description: "${title} documentation"
pubDate: 2024-01-15
author: "Pixelated Team"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
draft: false
toc: true
---

`;
}

// Function to extract title from markdown
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  return 'Documentation';
}

// Function to process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!hasFrontmatter(content)) {
      const filename = path.basename(filePath, path.extname(filePath));
      const title = extractTitle(content);
      const frontmatter = generateFrontmatter(filename, title);
      
      const newContent = frontmatter + content;
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Function to recursively process directory
function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

console.log('Starting frontmatter fix...');
processDirectory(docsDir);
console.log('Frontmatter fix completed!'); 