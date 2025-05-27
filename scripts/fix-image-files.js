import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Problematic files identified from our previous script
const problematicFiles = [
  '/public/images/dashboard-preview-low.jpg',
  '/public/images/dashboard-preview.jpg',
  '/public/images/feature-emotion-analysis-low.jpg',
  '/public/images/feature-secure-training-low.jpg',
  '/public/images/testimonial-1-low.jpg',
  '/public/images/testimonial-2-low.jpg',
  '/public/images/testimonial-3.jpg',
]

// Path to a valid placeholder image we can use as a replacement
const placeholderImagePath = path.join(__dirname, '../public/favicon-32x32.png')

// Check if placeholder image exists
if (!fs.existsSync(placeholderImagePath)) {
  console.error(`❌ Placeholder image not found: ${placeholderImagePath}`)
  process.exit(1)
}

// Make sure the problematic-images-backup directory exists
const backupDir = path.join(__dirname, '../problematic-images-backup')
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

// Fix each problematic file
for (const relFilePath of problematicFiles) {
  const filePath = path.join(__dirname, '..', relFilePath)

  // Skip if file doesn't exist
  if (!fs.existsSync(filePath)) {
    console.log(`🔍 File does not exist: ${filePath}`)
    continue
  }

  // Check if file is problematic
  try {
    const fileInfo = execSync(`file "${filePath}"`, { encoding: 'utf8' })
    const isProblematic =
      fileInfo.includes('ASCII text') ||
      fileInfo.includes('empty') ||
      fileInfo.includes('HTML document') ||
      !fileInfo.includes('image data')

    if (isProblematic) {
      console.log(`🔧 Fixing problematic file: ${filePath}`)

      // Create backup if not already backed up
      const backupPath = path.join(backupDir, path.basename(filePath))
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath)
        console.log(`  📦 Backed up to ${backupPath}`)
      }

      // Replace with placeholder image
      fs.copyFileSync(placeholderImagePath, filePath)
      console.log(`  ✅ Replaced with placeholder image`)
    } else {
      console.log(`✓ File is a valid image: ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
  }
}

console.log('\n🎉 Image fixing complete!')
console.log(
  '▶ You should now be able to build the project without image format errors.',
)
console.log('📝 Note: The problematic files were backed up to:', backupDir)
