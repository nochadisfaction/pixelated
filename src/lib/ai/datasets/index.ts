/**
 * AI Datasets Module
 *
 * Centralized access to dataset utilities and services
 */

// Existing dataset utilities
export { mergeAllDatasets } from './merge-datasets'
export {
  prepareForOpenAI,
  prepareForHuggingFace,
  prepareAllFormats,
  preparedDatasetsExist,
} from './prepare-fine-tuning'

// Patient-Psi Dataset Integration
export { PatientPsiParser } from './patient-psi-parser'
export { PatientPsiIndexer } from './patient-psi-indexer'
export { PatientPsiIntegration } from './patient-psi-integration'

// Types for Patient-Psi integration
export type { PatientPsiCognitiveModel } from './patient-psi-parser'

export type {
  ModelIndex,
  SearchCriteria,
  SearchResult,
} from './patient-psi-indexer'

export type {
  NormalizationResult,
  IntegrationConfig,
  ConversionStats,
} from './patient-psi-integration'

// Import types for the pipeline
import type { PatientPsiCognitiveModel } from './patient-psi-parser'
import type { ModelIndex } from './patient-psi-indexer'
import type {
  IntegrationConfig,
  ConversionStats,
  NormalizationResult,
} from './patient-psi-integration'
import type { CognitiveModel } from '../types/CognitiveModel'

// Dataset processing pipeline utilities
export const DATASET_PROCESSING_PIPELINE = {
  /**
   * Complete Patient-Psi dataset processing pipeline
   */
  async processPatientPsiDataset(
    rawData: unknown[],
    config?: {
      parsing?: Record<string, unknown>
      indexing?: Record<string, unknown>
      integration?: Partial<IntegrationConfig>
    },
  ) {
    const { PatientPsiParser } = await import('./patient-psi-parser')
    const { PatientPsiIndexer } = await import('./patient-psi-indexer')
    const { PatientPsiIntegration } = await import('./patient-psi-integration')

    const parser = new PatientPsiParser()
    const indexer = new PatientPsiIndexer()
    const integration = new PatientPsiIntegration(
      parser,
      indexer,
      config?.integration,
    )

    const results = {
      parsed: [] as CognitiveModel[],
      normalized: [] as NormalizationResult[],
      indexed: null as ModelIndex | null,
      stats: {
        parsing: {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: [] as string[],
        },
        normalization: null as ConversionStats | null,
        indexing: null as ReturnType<typeof indexer.getIndexStatistics> | null,
      },
    }

    // Step 1: Parse raw data
    for (const rawModel of rawData) {
      results.stats.parsing.processed++
      try {
        const parsed = await parser.parsePatientPsiModel(rawModel)
        if (parsed) {
          // Store the parsed result directly as CognitiveModel
          results.parsed.push(parsed)
        }
        results.stats.parsing.successful++
      } catch (error) {
        results.stats.parsing.failed++
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown parsing error'
        results.stats.parsing.errors.push(errorMessage)
      }
    }

    // Step 2: Normalize parsed models 
    if (results.parsed.length > 0) {
      try {
        // Convert the parsed CognitiveModels back to PatientPsiCognitiveModel type
        // This is necessary because integration.normalizeModels expects PatientPsiCognitiveModel[]
        const parsedPatientModels = results.parsed as unknown as PatientPsiCognitiveModel[]
        
        // Normalize the models using the integration service
        results.normalized = await integration.normalizeModels(parsedPatientModels)
        
        // Update stats from the integration service
        results.stats.normalization = integration.getStats()
      } catch (error) {
        console.error('Normalization failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown normalization error'
        
        // Set minimal stats if normalization fails
        results.stats.normalization = {
          totalProcessed: results.parsed.length,
          successful: 0,
          failed: results.parsed.length,
          warnings: 0,
          averageCompleteness: 0,
          conversionTime: 0,
        }
        
        // Add error info to the parsing errors for visibility
        results.stats.parsing.errors.push(`Normalization error: ${errorMessage}`)
      }
    }

    // Step 3: Index normalized models
    if (results.normalized.length > 0) {
      try {
        // Extract the cognitive models from the normalization results
        const modelsToIndex = results.normalized.map(result => result.model)
        
        // Build indices with the normalized models
        await indexer.buildIndices(modelsToIndex)
        
        // Set the indexed value to show we have created a successful index
        // We don't directly expose the internal index, so we'll create a basic model index for the result
        results.indexed = {
          totalModels: modelsToIndex.length,
          lastUpdated: new Date(),
          indexVersion: '1.0.0'
        } as ModelIndex
        
        // Get statistics about the created index
        results.stats.indexing = indexer.getIndexStatistics()
      } catch (error) {
        console.error('Indexing failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown indexing error'
        
        // Add error info to the parsing errors for visibility
        results.stats.parsing.errors.push(`Indexing error: ${errorMessage}`)
      }
    }

    return results
  },

  /**
   * Quick validation of Patient-Psi dataset structure
   */
  async validatePatientPsiDataset(rawData: unknown[]): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    suggestions: string[]
  }> {
    const { PatientPsiParser } = await import('./patient-psi-parser')
    const parser = new PatientPsiParser()

    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: [] as string[],
    }

    if (!Array.isArray(rawData)) {
      validation.isValid = false
      validation.errors.push('Dataset must be an array')
      return validation
    }

    if (rawData.length === 0) {
      validation.isValid = false
      validation.errors.push('Dataset is empty')
      return validation
    }

    // Sample validation on first few items
    const sampleSize = Math.min(5, rawData.length)
    for (let i = 0; i < sampleSize; i++) {
      try {
        await parser.parsePatientPsiModel(rawData[i])
      } catch (error) {
        validation.isValid = false
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        validation.errors.push(`Sample ${i + 1}: ${errorMessage}`)
      }
    }

    // Structure checks
    const hasRequiredFields = rawData.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        'id' in item &&
        'name' in item &&
        'cognitiveConceptualization' in item
    )

    if (!hasRequiredFields) {
      validation.warnings.push('Some models missing essential fields (id, name, and cognitiveConceptualization)')
    }

    // Provide suggestions
    if (rawData.length < 10) {
      validation.suggestions.push(
        'Consider adding more models for better training diversity',
      )
    }

    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      validation.suggestions.push('Dataset structure looks good for processing')
    }

    return validation
  },
}

// Default configurations for common use cases
export const DEFAULT_CONFIGS = {
  // Configuration for therapeutic training scenarios
  THERAPEUTIC_TRAINING: {
    parsing: {
      strictValidation: false,
      requireCompleteness: 0.6,
      enhanceWithDefaults: true,
      logValidationDetails: true,
    },
    indexing: {
      enableFullTextSearch: true,
      maxIndexSize: 10000,
      optimizeForSpeed: true,
      includeStatistics: true,
    },
    integration: {
      strictValidation: false,
      preserveOriginalIds: true,
      requireCompleteness: 0.6,
      enableDataEnrichment: true,
      logConversions: true,
    },
  },

  // Configuration for research and analysis
  RESEARCH_ANALYSIS: {
    parsing: {
      strictValidation: true,
      requireCompleteness: 0.8,
      enhanceWithDefaults: false,
      logValidationDetails: true,
    },
    indexing: {
      enableFullTextSearch: true,
      maxIndexSize: 50000,
      optimizeForSpeed: false,
      includeStatistics: true,
    },
    integration: {
      strictValidation: true,
      preserveOriginalIds: true,
      requireCompleteness: 0.8,
      enableDataEnrichment: false,
      logConversions: true,
    },
  },

  // Configuration for development and testing
  DEVELOPMENT: {
    parsing: {
      strictValidation: false,
      requireCompleteness: 0.4,
      enhanceWithDefaults: true,
      logValidationDetails: true,
    },
    indexing: {
      enableFullTextSearch: false,
      maxIndexSize: 1000,
      optimizeForSpeed: true,
      includeStatistics: true,
    },
    integration: {
      strictValidation: false,
      preserveOriginalIds: true,
      requireCompleteness: 0.4,
      enableDataEnrichment: true,
      logConversions: true,
    },
  },
}

// Utility functions for dataset management
export const DATASET_UTILS = {
  /**
   * Get dataset processing recommendations based on data characteristics
   */
  getProcessingRecommendations(
    datasetSize: number,
    purpose: 'training' | 'research' | 'development',
  ): {
    config: (typeof DEFAULT_CONFIGS)[keyof typeof DEFAULT_CONFIGS]
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let config = DEFAULT_CONFIGS.DEVELOPMENT

    switch (purpose) {
      case 'training':
        config = DEFAULT_CONFIGS.THERAPEUTIC_TRAINING
        recommendations.push('Use balanced validation for training stability')
        break
      case 'research':
        config = DEFAULT_CONFIGS.RESEARCH_ANALYSIS
        recommendations.push('Enable strict validation for research accuracy')
        break
      case 'development':
        config = DEFAULT_CONFIGS.DEVELOPMENT
        recommendations.push('Use relaxed validation for faster iteration')
        break
    }

    if (datasetSize > 10000) {
      recommendations.push('Consider using batch processing for large datasets')
      recommendations.push('Enable indexing optimization for faster queries')
    }

    if (datasetSize < 100) {
      recommendations.push(
        'Small dataset - consider data augmentation techniques',
      )
      recommendations.push(
        'Use lower completeness requirements to maximize usable data',
      )
    }

    return { config, recommendations }
  },

  /**
   * Estimate processing time and resources
   */
  estimateProcessingRequirements(datasetSize: number): {
    estimatedTime: string
    memoryRequirement: string
    diskSpace: string
    recommendations: string[]
  } {
    const recommendations: string[] = []

    // Rough estimates based on dataset size
    let timeMinutes = Math.ceil(datasetSize * 0.1) // ~0.1 minute per model
    let memoryMB = Math.ceil(datasetSize * 2) // ~2MB per model
    let diskMB = Math.ceil(datasetSize * 5) // ~5MB per model (including indices)

    if (datasetSize > 5000) {
      recommendations.push(
        'Consider processing in batches to manage memory usage',
      )
      timeMinutes *= 1.5 // Overhead for large datasets
    }

    if (datasetSize > 10000) {
      recommendations.push(
        'Recommend dedicated processing server for large datasets',
      )
      recommendations.push('Consider distributed processing if available')
    }

    return {
      estimatedTime:
        timeMinutes < 60
          ? `${timeMinutes} minutes`
          : `${Math.ceil(timeMinutes / 60)} hours`,
      memoryRequirement:
        memoryMB < 1024 ? `${memoryMB} MB` : `${Math.ceil(memoryMB / 1024)} GB`,
      diskSpace:
        diskMB < 1024 ? `${diskMB} MB` : `${Math.ceil(diskMB / 1024)} GB`,
      recommendations,
    }
  },
}
