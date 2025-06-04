/**
 * Prepare merged datasets for fine-tuning
 *
 * This module converts the merged dataset into various formats suitable for fine-tuning
 * different types of models, such as OpenAI models (JSONL) or Hugging Face models.
 */

import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { appLogger as logger } from '../../logging'
import { getMergedDatasetPath, mergedDatasetExists } from './merge-datasets'

// Output paths for different formats
const OUTPUT_DIR = path.join(process.cwd(), 'datasets')
const OPENAI_FORMAT_PATH = path.join(OUTPUT_DIR, 'mental_health_openai.jsonl')
const HUGGINGFACE_FORMAT_PATH = path.join(
  OUTPUT_DIR,
  'mental_health_huggingface',
)

/**
 * Ensure the output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    logger.info(`Created output directory: ${OUTPUT_DIR}`)
  }

  // Create HuggingFace subdirectory
  const hfDir = path.join(OUTPUT_DIR, 'mental_health_huggingface')
  if (!fs.existsSync(hfDir)) {
    fs.mkdirSync(hfDir, { recursive: true })
  }
}

/**
 * Format the dataset for OpenAI fine-tuning (JSONL format)
 * See: https://platform.openai.com/docs/guides/fine-tuning
 */
export async function prepareForOpenAI(): Promise<string | null> {
  try {
    if (!mergedDatasetExists()) {
      logger.error(
        'Merged dataset not found. Please run mergeAllDatasets() first.',
      )
      return null
    }

    logger.info('Preparing dataset for OpenAI fine-tuning...')
    ensureOutputDir()

    // Create a Python script to convert the dataset to OpenAI format
    const pythonScript = `
import json
import os

# Paths
MERGED_DATASET_PATH = "${getMergedDatasetPath().replace(/\\/g, '/')}"
OPENAI_FORMAT_PATH = "${OPENAI_FORMAT_PATH.replace(/\\/g, '/')}"

# Load the merged dataset
with open(MERGED_DATASET_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Convert to OpenAI fine-tuning format
openai_format = []
for item in data:
    # Format each example as a chat completion
    openai_item = {
        "messages": [
            {"role": "system", "content": "You are a helpful mental health assistant."},
            {"role": "user", "content": item.get("input", "")},
            {"role": "assistant", "content": item.get("response", "")}
        ]
    }
    openai_format.append(openai_item)

# Write to JSONL format
with open(OPENAI_FORMAT_PATH, 'w', encoding='utf-8') as f:
    for item in openai_format:
        f.write(json.dumps(item) + '\\n')

print(f"Converted {len(openai_format)} examples to OpenAI format")
print(f"Saved to {OPENAI_FORMAT_PATH}")
`

    const scriptPath = path.join(OUTPUT_DIR, 'prepare_openai.py')
    fs.writeFileSync(scriptPath, pythonScript)

    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [scriptPath])

      pythonProcess.stdout.on('data', (data) => {
        logger.info(`Python stdout: ${data}`)
      })

      pythonProcess.stderr.on('data', (data) => {
        logger.error(`Python stderr: ${data}`)
      })

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('OpenAI dataset preparation completed successfully')
          resolve(OPENAI_FORMAT_PATH)
        } else {
          logger.error(`OpenAI dataset preparation failed with code ${code}`)
          resolve(null)
        }
      })
    })
  } catch (error) {
    logger.error(`Error preparing OpenAI dataset: ${error}`)
    return null
  }
}

/**
 * Format the dataset for Hugging Face Transformers fine-tuning
 */
export async function prepareForHuggingFace(): Promise<string | null> {
  try {
    if (!mergedDatasetExists()) {
      logger.error(
        'Merged dataset not found. Please run mergeAllDatasets() first.',
      )
      return null
    }

    logger.info('Preparing dataset for Hugging Face fine-tuning...')
    ensureOutputDir()

    // Create a Python script to convert the dataset to HuggingFace format
    const pythonScript = `
import json
import os
from datasets import Dataset

# Paths
MERGED_DATASET_PATH = "${getMergedDatasetPath().replace(/\\/g, '/')}"
HUGGINGFACE_FORMAT_DIR = "${HUGGINGFACE_FORMAT_PATH.replace(/\\/g, '/')}"

# Load the merged dataset
with open(MERGED_DATASET_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Convert to HuggingFace dataset format
hf_format = {
    "instruction": [],
    "input": [],
    "output": [],
    "source": [],
    "tags": []
}

for item in data:
    # Format instruction as a combination of a generic instruction and the user input
    instruction = "Respond to the following message in a helpful, supportive manner: "

    hf_format["instruction"].append(instruction)
    hf_format["input"].append(item.get("input", ""))
    hf_format["output"].append(item.get("response", ""))
    hf_format["source"].append(item.get("source", ""))
    hf_format["tags"].append(item.get("tags", []))

# Create a Hugging Face dataset
dataset = Dataset.from_dict(hf_format)

# Save dataset in Arrow format and as CSV for inspection
dataset.save_to_disk(HUGGINGFACE_FORMAT_DIR)
dataset.to_csv(os.path.join(HUGGINGFACE_FORMAT_DIR, "dataset.csv"))

print(f"Converted {len(dataset)} examples to Hugging Face format")
print(f"Saved to {HUGGINGFACE_FORMAT_DIR}")

# Create train/validation split (80/20)
splits = dataset.train_test_split(test_size=0.2, seed=42)
splits["train"].save_to_disk(os.path.join(HUGGINGFACE_FORMAT_DIR, "train"))
splits["test"].save_to_disk(os.path.join(HUGGINGFACE_FORMAT_DIR, "validation"))

print(f"Created train split with {len(splits['train'])} examples")
print(f"Created validation split with {len(splits['test'])} examples")
`

    const scriptPath = path.join(OUTPUT_DIR, 'prepare_huggingface.py')
    fs.writeFileSync(scriptPath, pythonScript)

    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [scriptPath])

      pythonProcess.stdout.on('data', (data) => {
        logger.info(`Python stdout: ${data}`)
      })

      pythonProcess.stderr.on('data', (data) => {
        logger.error(`Python stderr: ${data}`)
      })

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('Hugging Face dataset preparation completed successfully')
          resolve(HUGGINGFACE_FORMAT_PATH)
        } else {
          logger.error(
            `Hugging Face dataset preparation failed with code ${code}`,
          )
          resolve(null)
        }
      })
    })
  } catch (error) {
    logger.error(`Error preparing Hugging Face dataset: ${error}`)
    return null
  }
}

/**
 * Prepare datasets in all supported formats
 */
export async function prepareAllFormats(): Promise<{
  openai: string | null
  huggingface: string | null
}> {
  const openaiPath = await prepareForOpenAI()
  const huggingfacePath = await prepareForHuggingFace()

  return {
    openai: openaiPath,
    huggingface: huggingfacePath,
  }
}

/**
 * Check if prepared datasets exist
 */
export function preparedDatasetsExist(): {
  openai: boolean
  huggingface: boolean
} {
  return {
    openai: fs.existsSync(OPENAI_FORMAT_PATH),
    huggingface: fs.existsSync(HUGGINGFACE_FORMAT_PATH),
  }
}
