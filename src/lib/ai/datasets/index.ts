/**
 * Mental Health Datasets
 *
 * This module provides tools to download, merge, and prepare mental health datasets
 * for AI fine-tuning. It supports various dataset formats for different training platforms.
 */

// Re-export from merge-datasets.ts
export {
  mergeAllDatasets,
  getMergedDatasetPath,
  mergedDatasetExists,
} from './merge-datasets'

// Re-export from prepare-fine-tuning.ts
export {
  prepareForOpenAI,
  prepareForHuggingFace,
  prepareAllFormats,
  preparedDatasetsExist,
} from './prepare-fine-tuning'

// Export a unified interface for all dataset operations
export const MentalHealthDatasets = {
  merge: {
    mergeAllDatasets,
    getMergedDatasetPath,
    mergedDatasetExists,
  },
  prepare: {
    prepareForOpenAI,
    prepareForHuggingFace,
    prepareAllFormats,
    preparedDatasetsExist,
  },
}

// Import types from modules
import {
  mergeAllDatasets,
  getMergedDatasetPath,
  mergedDatasetExists,
} from './merge-datasets'
import {
  prepareForOpenAI,
  prepareForHuggingFace,
  prepareAllFormats,
  preparedDatasetsExist,
} from './prepare-fine-tuning'
