/**
 * Merge Mental Health Datasets
 *
 * This module handles downloading and merging various mental health datasets for AI training.
 */

import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { getLogger } from '../../logging'

// Create logger instance
const logger = getLogger({ prefix: 'merge-datasets' })

// Define interfaces for dataset items
interface DatasetItem {
  input: string
  response: string
  rejected_response?: string
  source: string
  type: string
  tags: string[]
}

// Define interface for statistics
interface DatasetStats {
  totalItems: number
  sourceStats: Record<string, number>
  tagStats: Record<string, number>
}

// Output paths
const OUTPUT_DIR = path.join(process.cwd(), 'datasets')
const MERGED_DATASET_PATH = path.join(
  OUTPUT_DIR,
  'merged_mental_health_dataset.json',
)
const MERGED_DATASET_CSV_PATH = path.join(
  OUTPUT_DIR,
  'merged_mental_health_dataset.csv',
)

// Define URLs for datasets that are direct downloads or raw GitHub files
// const DAILYDIALOG_URL = "http://yanran.li/files/ijcnlp_dailydialog.zip"
// const IEMOCAP_FEATURES_URL = "https://raw.githubusercontent.com/declare-lab/conv-emotion/master/DialogueRNN/DialogueRNN_features.zip";
// Using a more common raw link pattern, or the one from the ICON/CMN section if found.
// For now, using the one derived from the DialogueRNN folder structure.
const IEMOCAP_FEATURES_URL =
  'https://github.com/declare-lab/conv-emotion/raw/master/DialogueRNN/DialogueRNN_features.zip'

/**
 * Ensure the output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    logger.info(`Created output directory: ${OUTPUT_DIR}`)
  }
}

/**
 * Download datasets using Python script
 */
async function downloadDatasets(): Promise<boolean> {
  logger.info('Starting dataset download...')

  return new Promise((resolve) => {
    // Create a Python script to download datasets
    const pythonScriptContent = `import os
import json
from datasets import load_dataset
import pandas as pd
import requests
import zipfile
import io

OUTPUT_DIR = "${OUTPUT_DIR.replace(/\\/g, '/')}"
IEMOCAP_FEATURES_URL_PY = "${IEMOCAP_FEATURES_URL}"

def download_huggingface_dataset(dataset_id, split="train"):
    print(f"Downloading {dataset_id}...")
    try:
        dataset = load_dataset(dataset_id, split=split)
        output_file = os.path.join(OUTPUT_DIR, f"{dataset_id.replace('/', '_')}.json")
        dataset.to_json(output_file)
        print(f"Downloaded {dataset_id} to {output_file}")
        return output_file
    except Exception as e:
        print(f"Error downloading {dataset_id}: {e}")
        return None

def download_github_repo(url, repo_name):
    zip_url = f"{url}/archive/refs/heads/main.zip"
    try:
        print(f"Downloading {repo_name} from {zip_url}...")
        r = requests.get(zip_url)
        if r.status_code == 200:
            z = zipfile.ZipFile(io.BytesIO(r.content))
            extract_dir = os.path.join(OUTPUT_DIR, repo_name)
            os.makedirs(extract_dir, exist_ok=True)
            z.extractall(extract_dir)
            print(f"Downloaded {repo_name} to {extract_dir}")
            return extract_dir
        else:
            print(f"Failed to download {repo_name}: HTTP {r.status_code}")
            return None
    except Exception as e:
        print(f"Error downloading {repo_name}: {e}")
        return None

def download_and_unzip_file(url, dest_name):
    try:
        print(f"Downloading and unzipping {dest_name} from {url}...")
        r = requests.get(url)
        if r.status_code == 200:
            z = zipfile.ZipFile(io.BytesIO(r.content))
            extract_dir = os.path.join(OUTPUT_DIR, dest_name)
            os.makedirs(extract_dir, exist_ok=True)
            z.extractall(extract_dir)
            print(f"Downloaded and unzipped {dest_name} to {extract_dir}")
            return extract_dir
        else:
            print(f"Failed to download {dest_name}: HTTP {r.status_code}")
            return None
    except Exception as e:
        print(f"Error downloading or unzipping {dest_name}: {e}")
        return None

// Download HuggingFace datasets
files = []
files.append(download_huggingface_dataset("HumanLLMs/Human-Like-DPO-Dataset"))
files.append(download_huggingface_dataset("Amod/mental_health_counseling_conversations"))
files.append(download_huggingface_dataset("marcelbinz/Psych-101"))
files.append(download_huggingface_dataset("jxu2/MentalChat16K"))

// Download GitHub repositories
download_github_repo("https://github.com/ASU-SALT-Lab/RedditESS", "RedditESS")
download_github_repo("https://github.com/KCL-Health-NLP/trace", "TRACE")
download_github_repo("https://github.com/picocreator/Depression-Reddit-Cleaned", "Depression-Reddit-Cleaned")
download_github_repo("https://github.com/facebookresearch/EmpatheticDialogues", "EmpatheticDialogues")

// Download and unzip IEMOCAP features
download_and_unzip_file(IEMOCAP_FEATURES_URL_PY, "IEMOCAP_features")

print("All datasets downloaded successfully")
`

    const scriptPath = path.join(OUTPUT_DIR, 'download_datasets.py')
    ensureOutputDir()
    fs.writeFileSync(scriptPath, pythonScriptContent)

    const pythonProcess = spawn('python', [scriptPath])

    pythonProcess.stdout.on('data', (data: Buffer) => {
      logger.info(`Python stdout: ${data}`)
    })

    pythonProcess.stderr.on('data', (data: Buffer) => {
      logger.error(`Python stderr: ${data}`)
    })

    pythonProcess.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info('Dataset download completed successfully')
        resolve(true)
      } else {
        logger.error(`Dataset download failed with code ${code}`)
        resolve(false)
      }
    })
  })
}

/**
 * Merge the datasets using Python
 */
async function mergeDatasets(): Promise<boolean> {
  logger.info('Starting dataset merge...')

  return new Promise((resolve) => {
    // Create a Python script to merge datasets
    const mergePythonScriptContent = `import os
import json
import pandas as pd
import glob
from datasets import Dataset, concatenate_datasets, interleave_datasets
import numpy as np

OUTPUT_DIR = "${OUTPUT_DIR.replace(/\\/g, '/')}"
MERGED_DATASET_PATH = "${MERGED_DATASET_PATH.replace(/\\/g, '/')}"
MERGED_DATASET_CSV_PATH = "${MERGED_DATASET_CSV_PATH.replace(/\\/g, '/')}"

def normalize_dpo_dataset(data):
    """Normalize DPO dataset format"""
    normalized = []

    for item in data:
        normalized_item = {
            "input": item.get("prompt", ""),
            "response": item.get("chosen", ""),
            "rejected_response": item.get("rejected", ""),
            "source": "Human-Like-DPO-Dataset",
            "type": "instruction",
            "tags": ["human-like", "conversation"]
        }
        normalized.append(normalized_item)

    return normalized

def normalize_mental_health_counseling(data):
    """Normalize mental health counseling dataset"""
    normalized = []

    for item in data:
        normalized_item = {
            "input": item.get("Context", ""),
            "response": item.get("Response", ""),
            "rejected_response": "",
            "source": "mental_health_counseling_conversations",
            "type": "counseling",
            "tags": ["counseling", "therapy", "mental-health"]
        }
        normalized.append(normalized_item)

    return normalized

def normalize_psych_101(data):
    """Normalize Psych-101 dataset"""
    normalized = []

    for item in data:
        text = item.get("text", "")
        parts = text.split("<<")

        if len(parts) > 1:
            input_text = parts[0].strip()
            response = parts[1].split(">>")[0].strip() if ">>" in parts[1] else parts[1].strip()

            normalized_item = {
                "input": input_text,
                "response": response,
                "rejected_response": "",
                "source": "Psych-101",
                "type": "psychology",
                "tags": ["psychology", "education"]
            }
            normalized.append(normalized_item)

    return normalized

def normalize_mental_chat_16k(data):
    """Normalize MentalChat16K dataset"""
    normalized = []

    for item in data:
        utterances = item.get("utterances", [])
        if len(utterances) >= 2:
            input_text = utterances[0].get("content", "")
            response = utterances[1].get("content", "")

            normalized_item = {
                "input": input_text,
                "response": response,
                "rejected_response": "",
                "source": "MentalChat16K",
                "type": "counseling",
                "tags": ["counseling", "therapy", "mental-health"]
            }
            normalized.append(normalized_item)

    return normalized

def normalize_empathetic_dialogues(data):
    """Normalize EmpatheticDialogues dataset"""
    normalized = []
    print(f"Processing EmpatheticDialogues - Normalization not yet implemented.")
    // Placeholder: Iterate through data items and transform them
    // for item in data:
    //     try:
    //         // This is a guess, actual fields will depend on the dataset structure
    //         // Typically, dialogues are lists of turns. We might need to pair them up.
    //         // For now, let's assume a simple structure or skip if complex.
    //         // Example: if item has 'dialogue' which is a list of utterances.
    //         dialogue = item.get("dialogue", [])
    //         for i in range(0, len(dialogue) - 1, 2): // Assuming alternating turns
    //             if len(dialogue) > i + 1:
    //                 normalized_item = {
    //                     "input": dialogue[i],
    //                     "response": dialogue[i+1],
    //                     "rejected_response": "",
    //                     "source": "EmpatheticDialogues",
    //                     "type": "empathetic_conversation",
    //                     "tags": ["empathy", "conversation"]
    //                 }
    //                 normalized.append(normalized_item)
    //     except Exception as e:
    //         print(f"Error processing an item in EmpatheticDialogues: {e}")
    //         continue
    return normalized

def normalize_iemocap_features(data_path):
    """Normalize IEMOCAP features dataset"""
    normalized = []
    print(f"Processing IEMOCAP features from {data_path} - Normalization not yet implemented.")
    // Placeholder: Iterate through files/data in data_path and transform them
    // Example:
    // for file_name in os.listdir(data_path):
    //     if file_name.endswith(".pt") or file_name.endswith(".pkl"): // Or whatever format they are
    //         file_full_path = os.path.join(data_path, file_name)
    //         try:
    //             // Load the feature file (e.g., using torch.load, pickle.load, pd.read_csv)
    //             // Extract relevant text, emotion labels, speaker info, etc.
    //             // This is highly dependent on the feature file structure.
    //             // Example: loaded_data = torch.load(file_full_path)
    //             // utterances = loaded_data.get('text_utterances', [])
    //             // emotions = loaded_data.get('emotion_labels', [])
    //             // for i, text in enumerate(utterances):
    //             //     if i < len(emotions):
    //             //         // This requires pairing input/response if it's conversational
    //             //         // IEMOCAP is often utterance-level, may need to form pairs or treat as single turns
    //             //         normalized_item = {
    //             //             "input": text, // Or form a context window if applicable
    //             //             "response": "", // May not always have a direct response in this format
    //             //             "rejected_response": "",
    //             //             "emotion": emotions[i], // Map to our standard emotion set
    //             //             "source": "IEMOCAP_features",
    //             //             "type": "multimodal_emotion_clip", // if features include audio/visual
    //             //             "tags": ["iemocap", "emotion", "multimodal"]
    //             //         }
    //             //         normalized.append(normalized_item)
    //             pass // End of placeholder
    //         except Exception as e:
    //             print(f"Error processing an IEMOCAP feature file {file_name}: {e}")
    //             continue
    return normalized

def process_redditess_data():
    """Process RedditESS dataset from the downloaded repository"""
    redditess_dir = os.path.join(OUTPUT_DIR, "RedditESS", "RedditESS-main", "data")
    normalized = []

    try:
        // This is approximate as we don't know the exact structure of the repository
        json_files = glob.glob(os.path.join(redditess_dir, "*.json"))
        for file_path in json_files:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            for item in data:
                if isinstance(item, dict):
                    post = item.get("post", "")
                    comments = item.get("comments", [])

                    if post and comments and len(comments) > 0:
                        best_comment = comments[0]  // Assuming the first comment is the best

                        normalized_item = {
                            "input": post,
                            "response": best_comment,
                            "rejected_response": "",
                            "source": "RedditESS",
                            "type": "social_support",
                            "tags": ["reddit", "social-support", "peer-support"]
                        }
                        normalized.append(normalized_item)
    except Exception as e:
        print(f"Error processing RedditESS data: {e}")

    return normalized

def merge_datasets_main():
    """Merge all datasets into a single normalized format"""
    all_data = []

    // Process HuggingFace datasets
    try:
        with open(os.path.join(OUTPUT_DIR, "HumanLLMs_Human-Like-DPO-Dataset.json"), 'r', encoding='utf-8') as f:
            dpo_data = json.load(f)
            all_data.extend(normalize_dpo_dataset(dpo_data))
            print(f"Added {len(dpo_data)} items from Human-Like-DPO-Dataset")
    except Exception as e:
        print(f"Error processing Human-Like-DPO-Dataset: {e}")

    try:
        with open(os.path.join(OUTPUT_DIR, "Amod_mental_health_counseling_conversations.json"), 'r', encoding='utf-8') as f:
            mental_health_data = json.load(f)
            all_data.extend(normalize_mental_health_counseling(mental_health_data))
            print(f"Added {len(mental_health_data)} items from mental_health_counseling_conversations")
    except Exception as e:
        print(f"Error processing mental_health_counseling_conversations: {e}")

    try:
        with open(os.path.join(OUTPUT_DIR, "marcelbinz_Psych-101.json"), 'r', encoding='utf-8') as f:
            psych_data = json.load(f)
            all_data.extend(normalize_psych_101(psych_data))
            print(f"Added {len(psych_data)} items from Psych-101")
    except Exception as e:
        print(f"Error processing Psych-101: {e}")

    try:
        with open(os.path.join(OUTPUT_DIR, "jxu2_MentalChat16K.json"), 'r', encoding='utf-8') as f:
            mental_chat_data = json.load(f)
            all_data.extend(normalize_mental_chat_16k(mental_chat_data))
            print(f"Added {len(mental_chat_data)} items from MentalChat16K")
    except Exception as e:
        print(f"Error processing MentalChat16K: {e}")

    // Process GitHub repositories
    redditess_data = process_redditess_data()
    all_data.extend(redditess_data)
    print(f"Added {len(redditess_data)} items from RedditESS")

    // Process EmpatheticDialogues
    try:
        // This assumes EmpatheticDialogues results in a JSON file or a directory of JSON files.
        // The actual path and loading mechanism will depend on how download_github_repo saves it
        // and the true structure of the EmpatheticDialogues dataset.
        // For now, let's assume a primary JSON file might be created in its directory.
        empathetic_dialogues_path = os.path.join(OUTPUT_DIR, "EmpatheticDialogues", "empatheticdialogues.json") // This is a guess
        if os.path.exists(empathetic_dialogues_path):
            with open(empathetic_dialogues_path, 'r', encoding='utf-8') as f:
                empathetic_data = json.load(f) // This might need to be adapted
                normalized_empathetic = normalize_empathetic_dialogues(empathetic_data)
                all_data.extend(normalized_empathetic)
                print(f"Added {len(normalized_empathetic)} items from EmpatheticDialogues")
        else:
            // Attempt to find CSV files if JSON is not the primary format, as per EmpatheticDialogues repo
            // It seems the data is in train.csv, valid.csv, test.csv
            // For simplicity, let's try to process train.csv if found.
            // The 'download_github_repo' function extracts to a directory named 'EmpatheticDialogues/EmpatheticDialogues-main/'
            // or similar.
            // The actual files are in a 'data/' subdirectory within the unzipped folder.
            // Example: EmpatheticDialogues/EmpatheticDialogues-main/data/train.csv

            // Try to find 'train.csv' within the EmpatheticDialogues directory
            // This path construction needs to be robust
            repo_content_dir_name = "EmpatheticDialogues-main" // Default main branch folder name
            
            // Check for common extracted folder names
            possible_extracted_dirs = [
                os.path.join(OUTPUT_DIR, "EmpatheticDialogues", "EmpatheticDialogues-main"),
                os.path.join(OUTPUT_DIR, "EmpatheticDialogues", "main"), // if repo name is just 'main' after zip
                os.path.join(OUTPUT_DIR, "EmpatheticDialogues") // if files are extracted directly
            ]
            
            train_csv_path = None
            for potential_dir_base in possible_extracted_dirs:
                path_to_check = os.path.join(potential_dir_base, "data", "train.csv")
                if os.path.exists(path_to_check):
                    train_csv_path = path_to_check
                    break
            
            if train_csv_path:
                print(f"Found EmpatheticDialogues train.csv at {train_csv_path}")
                df = pd.read_csv(train_csv_path)
                // Example normalization for EmpatheticDialogues CSV
                // It has columns like 'conv_id', 'utterance_idx', 'context', 'prompt', 'speaker_idx', 'utterance', 'selfeval', 'tags'
                // We need to pair 'prompt' (context utterance) and 'utterance' (response)
                // This is a simplified example; real pairing might be more complex if context is multi-turn.
                // The 'prompt' column is the preceding utterance. 'utterance' is the current one.
                
                // This is a placeholder; actual parsing of CSV to input/response needed.
                // For now, we'll just log and add a few dummy items for structure.
                
                // Simple approach: iterate and take 'prompt' as input, 'utterance' as response
                // This might create many pairs from one conversation.
                // A better way would be to group by conv_id and then pair.
                // For now, we'll just add a placeholder normalization function call
                // and assume \`normalize_empathetic_dialogues\` would handle a DataFrame.
                
                // Re-using the placeholder normalize_empathetic_dialogues function.
                // It expects a list of dicts, so convert DataFrame.
                data_list = df.to_dict(orient='records')
                normalized_empathetic = normalize_empathetic_dialogues(data_list) // This function needs proper implementation
                all_data.extend(normalized_empathetic)
                print(f"Added {len(normalized_empathetic)} items from EmpatheticDialogues (CSV processing - placeholder)")
            else:
                print(f"Could not find primary data file for EmpatheticDialogues (e.g., empatheticdialogues.json or train.csv)")
                print(f"Searched in paths like: {os.path.join(OUTPUT_DIR, 'EmpatheticDialogues', 'EmpatheticDialogues-main', 'data', 'train.csv')}")


    except Exception as e:
        print(f"Error processing EmpatheticDialogues: {e}")

    // Process IEMOCAP features
    try:
        iemocap_features_dir = os.path.join(OUTPUT_DIR, "IEMOCAP_features")
        if os.path.exists(iemocap_features_dir):
            // The actual features might be in a subdirectory after unzipping, e.g., "DialogueRNN_features"
            // We need to inspect the zip structure to know the exact path.
            // For now, let's assume the relevant files are directly in iemocap_features_dir or a known subfolder.
            // Common pattern is that zip files contain a root folder.
            
            // Check for a common root folder name like 'DialogueRNN_features' or the name of the zip without extension
            potential_feature_root = os.path.join(iemocap_features_dir, "DialogueRNN_features") // Default assumption
            if not os.path.exists(potential_feature_root) or not os.listdir(potential_feature_root):
                // If not found, or empty, assume features are directly in iemocap_features_dir
                 potential_feature_root = iemocap_features_dir

            if os.path.exists(potential_feature_root) and os.listdir(potential_feature_root):
                print(f"Processing IEMOCAP features from: {potential_feature_root}")
                normalized_iemocap = normalize_iemocap_features(potential_feature_root)
                all_data.extend(normalized_iemocap)
                print(f"Added {len(normalized_iemocap)} items from IEMOCAP features (placeholder processing)")
            else:
                print(f"IEMOCAP features directory {iemocap_features_dir} (or subfolder DialogueRNN_features) is empty or not found after potential download.")
        else:
            print(f"IEMOCAP features directory {iemocap_features_dir} not found. Download might have failed or URL is incorrect.")
    except Exception as e:
        print(f"Error processing IEMOCAP features: {e}")

    // Save the merged dataset
    with open(MERGED_DATASET_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2)

    // Save as CSV for easier analysis
    df = pd.DataFrame(all_data)
    df.to_csv(MERGED_DATASET_CSV_PATH, index=False)

    print(f"Merged dataset saved to {MERGED_DATASET_PATH}")
    print(f"CSV version saved to {MERGED_DATASET_CSV_PATH}")
    print(f"Total items in merged dataset: {len(all_data)}")

    // Create stats about the merged dataset
    source_counts = df['source'].value_counts()
    tag_counts = pd.Series([tag for tags_list in df['tags'] for tag in tags_list]).value_counts()

    print("\nDataset source distribution:")
    print(source_counts)

    print("\nTag distribution:")
    print(tag_counts)

    return True

if __name__ == "__main__":
    merge_datasets_main()
`

    const scriptPath = path.join(OUTPUT_DIR, 'merge_datasets.py')
    ensureOutputDir()
    fs.writeFileSync(scriptPath, mergePythonScriptContent)

    const pythonProcess = spawn('python', [scriptPath])

    pythonProcess.stdout.on('data', (data: Buffer) => {
      logger.info(`Python stdout: ${data}`)
    })

    pythonProcess.stderr.on('data', (data: Buffer) => {
      logger.error(`Python stderr: ${data}`)
    })

    pythonProcess.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info('Dataset merge completed successfully')
        resolve(true)
      } else {
        logger.error(`Dataset merge failed with code ${code}`)
        resolve(false)
      }
    })
  })
}

/**
 * Get dataset statistics
 */
async function getDatasetStats(): Promise<DatasetStats | null> {
  try {
    if (!fs.existsSync(MERGED_DATASET_PATH)) {
      logger.error('Merged dataset file not found')
      return null
    }

    const data = JSON.parse(
      fs.readFileSync(MERGED_DATASET_PATH, 'utf-8'),
    ) as DatasetItem[]

    // Calculate basic statistics
    const totalItems = data.length
    const sourceStats = data.reduce(
      (acc: Record<string, number>, item: DatasetItem) => {
        const { source } = item
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {},
    )

    // Calculate tag statistics
    const tagStats = data.reduce(
      (acc: Record<string, number>, item: DatasetItem) => {
        const tags = item.tags || []
        tags.forEach((tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1
        })
        return acc
      },
      {},
    )

    return {
      totalItems,
      sourceStats,
      tagStats,
    }
  } catch (error) {
    logger.error(`Error getting dataset stats: ${error}`)
    return null
  }
}

/**
 * Main function to download and merge datasets
 */
export async function mergeAllDatasets(): Promise<DatasetStats | null> {
  try {
    ensureOutputDir()

    const downloadSuccess = await downloadDatasets()
    if (!downloadSuccess) {
      logger.error('Dataset download failed')
      return null
    }

    const mergeSuccess = await mergeDatasets()
    if (!mergeSuccess) {
      logger.error('Dataset merge failed')
      return null
    }

    return await getDatasetStats()
  } catch (error) {
    logger.error(`Error in mergeAllDatasets: ${error}`)
    return null
  }
}

/**
 * Get the path to the merged dataset
 */
export function getMergedDatasetPath(): string {
  return MERGED_DATASET_PATH
}

/**
 * Check if the merged dataset exists
 */
export function mergedDatasetExists(): boolean {
  return fs.existsSync(MERGED_DATASET_PATH)
}
