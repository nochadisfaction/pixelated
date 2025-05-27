/**
 * Comparative Analytics Repository
 *
 * This module provides a repository implementation for storing and retrieving
 * benchmark data, technique effectiveness information, and insights.
 */

import { getLogger } from '../../logging'
import type {
  BenchmarkRepository,
  AnonymizedBenchmark,
  TechniqueWithEffectiveness,
  EffectivenessInsight,
} from './ComparativeAnalyticsService'
import { redis as redisInstance } from '../../services/redis'

// Get logger instance
const logger = getLogger({ prefix: 'comparative-analytics-repository' })

/**
 * Implementation of BenchmarkRepository interface
 */
export class BenchmarkRepositoryImpl implements BenchmarkRepository {
  // In-memory storage for development/testing
  private benchmarks: AnonymizedBenchmark[] = []
  private techniques: TechniqueWithEffectiveness[] = []
  private insights: EffectivenessInsight[] = []

  /**
   * Create a new repository instance
   */
  constructor(
    private readonly redisClient = redisInstance,
    private readonly usePersistentStorage = true,
  ) {}

  /**
   * Initialize the repository with data from Redis if available
   */
  async initialize(): Promise<void> {
    logger.info('Initializing comparative analytics repository')

    if (this.usePersistentStorage && this.redisClient) {
      try {
        // Load benchmarks from Redis
        const benchmarkKeys = await this.redisClient.keys('benchmark:*')
        if (benchmarkKeys.length > 0) {
          logger.info(
            `Found ${benchmarkKeys.length} benchmarks in Redis storage`,
          )

          // Get all benchmark data
          const benchmarkValues = await Promise.all(
            benchmarkKeys.map((key) => this.redisClient.get(key)),
          )

          // Parse and add to in-memory storage
          for (const value of benchmarkValues) {
            if (value) {
              try {
                const benchmark = JSON.parse(value) as AnonymizedBenchmark

                // Convert string dates back to Date objects
                benchmark.timestamp = new Date(benchmark.timestamp)
                benchmark.createdAt = new Date(benchmark.createdAt)
                benchmark.updatedAt = new Date(benchmark.updatedAt)

                this.benchmarks.push(benchmark)
              } catch (parseError) {
                logger.error('Error parsing benchmark from Redis', {
                  error: parseError,
                })
              }
            }
          }
        } else {
          logger.info('No benchmarks found in Redis storage')
        }

        // Load techniques and insights with similar approach
        const techniqueKeys = await this.redisClient.keys('technique:*')
        if (techniqueKeys.length > 0) {
          const techniqueValues = await Promise.all(
            techniqueKeys.map((key) => this.redisClient.get(key)),
          )

          for (const value of techniqueValues) {
            if (value) {
              try {
                const technique = JSON.parse(
                  value,
                ) as TechniqueWithEffectiveness
                technique.lastUpdated = new Date(technique.lastUpdated)
                this.techniques.push(technique)
              } catch (parseError) {
                logger.error('Error parsing technique from Redis', {
                  error: parseError,
                })
              }
            }
          }
        }

        const insightKeys = await this.redisClient.keys('insight:*')
        if (insightKeys.length > 0) {
          const insightValues = await Promise.all(
            insightKeys.map((key) => this.redisClient.get(key)),
          )

          for (const value of insightValues) {
            if (value) {
              try {
                const insight = JSON.parse(value) as EffectivenessInsight
                insight.generatedAt = new Date(insight.generatedAt)
                if (insight.expiresAt) {
                  insight.expiresAt = new Date(insight.expiresAt)
                }
                this.insights.push(insight)
              } catch (parseError) {
                logger.error('Error parsing insight from Redis', {
                  error: parseError,
                })
              }
            }
          }
        }

        logger.info('Repository initialization from Redis complete', {
          benchmarks: this.benchmarks.length,
          techniques: this.techniques.length,
          insights: this.insights.length,
        })
      } catch (error) {
        logger.error('Error initializing repository from Redis', { error })
        logger.info('Falling back to in-memory storage only')
        this.usePersistentStorage = false
      }
    }
  }

  /**
   * Store anonymized benchmark data
   */
  async storeBenchmark(benchmark: AnonymizedBenchmark): Promise<void> {
    logger.debug('Storing benchmark', { benchmarkId: benchmark.id })

    try {
      // Remove existing benchmark with same ID if it exists
      const existingIndex = this.benchmarks.findIndex(
        (b) => b.id === benchmark.id,
      )
      if (existingIndex !== -1) {
        this.benchmarks.splice(existingIndex, 1)
      }

      // Add the new benchmark
      this.benchmarks.push(benchmark)

      // Store in Redis if persistent storage is enabled
      if (this.usePersistentStorage && this.redisClient) {
        const key = `benchmark:${benchmark.id}`
        await this.redisClient.set(key, JSON.stringify(benchmark))
      }

      logger.debug('Benchmark stored successfully', {
        benchmarkId: benchmark.id,
      })
    } catch (error) {
      logger.error('Error storing benchmark', {
        benchmarkId: benchmark.id,
        error,
      })
      throw new Error(
        `Failed to store benchmark: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Retrieve anonymized benchmarks by indication
   */
  async getBenchmarksByIndication(
    indication: string,
  ): Promise<AnonymizedBenchmark[]> {
    logger.debug('Retrieving benchmarks by indication', { indication })

    try {
      // If indication is empty, return all benchmarks
      if (!indication) {
        return [...this.benchmarks]
      }

      // Filter benchmarks by indication
      return this.benchmarks.filter(
        (benchmark) =>
          benchmark.patternType.toLowerCase() === indication.toLowerCase(),
      )
    } catch (error) {
      logger.error('Error retrieving benchmarks by indication', {
        indication,
        error,
      })
      throw new Error(
        `Failed to retrieve benchmarks: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Retrieve anonymized benchmarks by technique
   */
  async getBenchmarksByTechnique(
    techniqueId: string,
  ): Promise<AnonymizedBenchmark[]> {
    logger.debug('Retrieving benchmarks by technique', { techniqueId })

    try {
      // Filter benchmarks by technique ID
      return this.benchmarks.filter((benchmark) =>
        benchmark.techniqueIds.includes(techniqueId),
      )
    } catch (error) {
      logger.error('Error retrieving benchmarks by technique', {
        techniqueId,
        error,
      })
      throw new Error(
        `Failed to retrieve benchmarks: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get all techniques in the effectiveness database
   */
  async getAllTechniques(): Promise<TechniqueWithEffectiveness[]> {
    logger.debug('Retrieving all techniques')

    try {
      return [...this.techniques]
    } catch (error) {
      logger.error('Error retrieving all techniques', { error })
      throw new Error(
        `Failed to retrieve techniques: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get techniques by indication
   */
  async getTechniquesByIndication(
    indication: string,
  ): Promise<TechniqueWithEffectiveness[]> {
    logger.debug('Retrieving techniques by indication', { indication })

    try {
      // If indication is empty, return all techniques
      if (!indication) {
        return [...this.techniques]
      }

      // Filter techniques by indication
      return this.techniques.filter((technique) =>
        technique.indications.some(
          (ind) => ind.toLowerCase() === indication.toLowerCase(),
        ),
      )
    } catch (error) {
      logger.error('Error retrieving techniques by indication', {
        indication,
        error,
      })
      throw new Error(
        `Failed to retrieve techniques: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get insights for a specific pattern
   */
  async getInsightsForPattern(
    patternType: string,
  ): Promise<EffectivenessInsight[]> {
    logger.debug('Retrieving insights for pattern', { patternType })

    try {
      // Filter insights by pattern type
      return this.insights.filter((insight) =>
        insight.relatedPatternTypes?.some(
          (pattern) => pattern.toLowerCase() === patternType.toLowerCase(),
        ),
      )
    } catch (error) {
      logger.error('Error retrieving insights for pattern', {
        patternType,
        error,
      })
      throw new Error(
        `Failed to retrieve insights: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get insights for a specific technique
   */
  async getInsightsForTechnique(
    techniqueId: string,
  ): Promise<EffectivenessInsight[]> {
    logger.debug('Retrieving insights for technique', { techniqueId })

    try {
      // Filter insights by technique ID
      return this.insights.filter((insight) =>
        insight.relatedTechniqueIds?.includes(techniqueId),
      )
    } catch (error) {
      logger.error('Error retrieving insights for technique', {
        techniqueId,
        error,
      })
      throw new Error(
        `Failed to retrieve insights: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Store effectiveness insight
   */
  async storeInsight(insight: EffectivenessInsight): Promise<void> {
    logger.debug('Storing insight', { insightId: insight.id })

    try {
      // Remove existing insight with same ID if it exists
      const existingIndex = this.insights.findIndex((i) => i.id === insight.id)
      if (existingIndex !== -1) {
        this.insights.splice(existingIndex, 1)
      }

      // Add the new insight
      this.insights.push(insight)

      // Store in Redis if persistent storage is enabled
      if (this.usePersistentStorage && this.redisClient) {
        const key = `insight:${insight.id}`
        await this.redisClient.set(key, JSON.stringify(insight))
      }

      logger.debug('Insight stored successfully', { insightId: insight.id })
    } catch (error) {
      logger.error('Error storing insight', { insightId: insight.id, error })
      throw new Error(
        `Failed to store insight: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Add or update a technique in the effectiveness database
   */
  async storeTechnique(technique: TechniqueWithEffectiveness): Promise<void> {
    logger.debug('Storing technique', { techniqueId: technique.id })

    try {
      // Remove existing technique with same ID if it exists
      const existingIndex = this.techniques.findIndex(
        (t) => t.id === technique.id,
      )
      if (existingIndex !== -1) {
        this.techniques.splice(existingIndex, 1)
      }

      // Add the new technique
      this.techniques.push(technique)

      // Store in Redis if persistent storage is enabled
      if (this.usePersistentStorage && this.redisClient) {
        const key = `technique:${technique.id}`
        await this.redisClient.set(key, JSON.stringify(technique))
      }

      logger.debug('Technique stored successfully', {
        techniqueId: technique.id,
      })
    } catch (error) {
      logger.error('Error storing technique', {
        techniqueId: technique.id,
        error,
      })
      throw new Error(
        `Failed to store technique: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Load sample data for development/testing
   */
  async loadSampleData(): Promise<void> {
    logger.info('Loading sample data for comparative analytics repository')

    // Sample techniques
    const sampleTechniques: TechniqueWithEffectiveness[] = [
      {
        id: 'tech-001',
        name: 'Cognitive Restructuring',
        description: 'Identifying and challenging negative thought patterns',
        indications: ['anxiety', 'depression', 'stress'],
        contraindications: ['active psychosis', 'severe cognitive impairment'],
        overallEffectiveness: 0.85,
        confidenceInterval: [0.78, 0.92],
        sampleSize: 45,
        effectivenessByIndication: {
          anxiety: {
            effectiveness: 0.87,
            sampleSize: 28,
            confidenceInterval: [0.79, 0.95],
          },
          depression: {
            effectiveness: 0.83,
            sampleSize: 35,
            confidenceInterval: [0.76, 0.9],
          },
          stress: {
            effectiveness: 0.89,
            sampleSize: 22,
            confidenceInterval: [0.81, 0.97],
          },
        },
        evidenceLevel: 'high',
        lastUpdated: new Date(),
      },
      {
        id: 'tech-002',
        name: 'Mindfulness Meditation',
        description: 'Present-moment awareness practice',
        indications: ['anxiety', 'stress', 'emotion regulation'],
        contraindications: [
          'trauma-related dissociation without stabilization',
        ],
        overallEffectiveness: 0.78,
        confidenceInterval: [0.71, 0.85],
        sampleSize: 38,
        effectivenessByIndication: {
          'anxiety': {
            effectiveness: 0.76,
            sampleSize: 25,
            confidenceInterval: [0.68, 0.84],
          },
          'stress': {
            effectiveness: 0.82,
            sampleSize: 30,
            confidenceInterval: [0.74, 0.9],
          },
          'emotion regulation': {
            effectiveness: 0.79,
            sampleSize: 18,
            confidenceInterval: [0.7, 0.88],
          },
        },
        evidenceLevel: 'high',
        lastUpdated: new Date(),
      },
      {
        id: 'tech-003',
        name: 'Exposure Therapy',
        description: 'Gradual exposure to feared stimuli',
        indications: ['phobias', 'ptsd', 'ocd'],
        contraindications: ['active suicidality', 'unmanaged psychosis'],
        overallEffectiveness: 0.82,
        confidenceInterval: [0.74, 0.9],
        sampleSize: 32,
        effectivenessByIndication: {
          phobias: {
            effectiveness: 0.88,
            sampleSize: 20,
            confidenceInterval: [0.8, 0.96],
          },
          ptsd: {
            effectiveness: 0.79,
            sampleSize: 15,
            confidenceInterval: [0.7, 0.88],
          },
          ocd: {
            effectiveness: 0.81,
            sampleSize: 18,
            confidenceInterval: [0.73, 0.89],
          },
        },
        evidenceLevel: 'high',
        lastUpdated: new Date(),
      },
    ]

    // Sample benchmarks
    const sampleBenchmarks: AnonymizedBenchmark[] = [
      {
        id: 'benchmark-anxiety-001',
        timestamp: new Date(),
        patternType: 'anxiety',
        patternConfidence: 0.85,
        techniqueIds: ['tech-001', 'tech-002'],
        effectivenessRatings: {
          'tech-001': 0.87,
          'tech-002': 0.76,
        },
        dataPointCount: 25,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        updatedAt: new Date(),
      },
      {
        id: 'benchmark-depression-001',
        timestamp: new Date(),
        patternType: 'depression',
        patternConfidence: 0.82,
        techniqueIds: ['tech-001'],
        effectivenessRatings: {
          'tech-001': 0.83,
        },
        dataPointCount: 35,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        updatedAt: new Date(),
      },
      {
        id: 'benchmark-ptsd-001',
        timestamp: new Date(),
        patternType: 'ptsd',
        patternConfidence: 0.78,
        techniqueIds: ['tech-003'],
        effectivenessRatings: {
          'tech-003': 0.79,
        },
        dataPointCount: 15,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        updatedAt: new Date(),
      },
    ]

    // Sample insights
    const sampleInsights: EffectivenessInsight[] = [
      {
        id: 'insight-anxiety-001',
        relatedPatternTypes: ['anxiety'],
        relatedTechniqueIds: ['tech-001', 'tech-002'],
        insightText:
          'For anxiety, Cognitive Restructuring (87.0%) shows significantly better outcomes than Mindfulness Meditation (76.0%).',
        confidenceLevel: 0.85,
        supportingDataPoints: 25,
        clinicalRelevance: 'high',
        actionability: 'high',
        generatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        tags: ['comparative', 'effectiveness', 'anxiety'],
      },
      {
        id: 'insight-ptsd-001',
        relatedPatternTypes: ['ptsd'],
        relatedTechniqueIds: ['tech-003'],
        insightText:
          'For PTSD patterns, Exposure Therapy shows a consistent effectiveness rate of 79% across 15 clinical cases.',
        confidenceLevel: 0.78,
        supportingDataPoints: 15,
        clinicalRelevance: 'moderate',
        actionability: 'moderate',
        generatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        tags: ['effectiveness', 'ptsd'],
      },
    ]

    // Store sample data
    this.techniques = sampleTechniques
    this.benchmarks = sampleBenchmarks
    this.insights = sampleInsights

    logger.info('Sample data loaded successfully')
  }
}

/**
 * Create a default benchmark repository with sample data
 */
export async function createDefaultBenchmarkRepository(): Promise<BenchmarkRepositoryImpl> {
  const repository = new BenchmarkRepositoryImpl()

  try {
    // First try to load data from Redis if available
    await repository.initialize()

    // If no data in Redis, load sample data
    if (repository['benchmarks'].length === 0) {
      await repository.loadSampleData()
    }
  } catch (error) {
    logger.error('Error creating benchmark repository', { error })
    // Ensure we at least have sample data
    await repository.loadSampleData()
  }

  return repository
}
