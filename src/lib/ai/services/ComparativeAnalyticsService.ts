/**
 * Comparative Analytics Service
 *
 * This service implements comparative analysis of therapeutic approaches
 * by creating anonymized benchmarks, technique effectiveness databases,
 * and insight generation systems.
 */

import { getLogger } from '../../logging'
import type { IRedisService } from '../../services/redis/types'
import type {
  EfficacyTrackingService,
  // TechniqueEfficacyStats,
} from './EfficacyTrackingService'
import type { PatternRecognitionService } from './PatternRecognitionService'
// import type { TherapeuticTechnique } from './RecommendationService'

// Define the logger for this service
const logger = getLogger({ prefix: 'comparative-analytics-service' })

/**
 * Interface for accessing anonymous benchmark data
 */
export interface BenchmarkRepository {
  // Store anonymized benchmark data
  storeBenchmark(benchmark: AnonymizedBenchmark): Promise<void>

  // Retrieve anonymized benchmarks by criteria
  getBenchmarksByIndication(indication: string): Promise<AnonymizedBenchmark[]>
  getBenchmarksByTechnique(techniqueId: string): Promise<AnonymizedBenchmark[]>

  // Get all techniques in the effectiveness database
  getAllTechniques(): Promise<TechniqueWithEffectiveness[]>

  // Get techniques by indication
  getTechniquesByIndication(
    indication: string,
  ): Promise<TechniqueWithEffectiveness[]>

  // Get insights for a specific pattern or technique
  getInsightsForPattern(patternType: string): Promise<EffectivenessInsight[]>
  getInsightsForTechnique(techniqueId: string): Promise<EffectivenessInsight[]>

  // Store effectiveness insights
  storeInsight(insight: EffectivenessInsight): Promise<void>
}

/**
 * Interface for anonymized benchmark data
 */
export interface AnonymizedBenchmark {
  id: string
  timestamp: Date

  // General categorization (no identifying info)
  demographicSegment?: string
  contextualFactors?: string[]

  // Pattern information
  patternType: string
  patternConfidence: number

  // Treatment information
  techniqueIds: string[]

  // Effectiveness metrics
  effectivenessRatings: Record<string, number> // techniqueId -> effectiveness
  timeToImprovement?: number // in days
  adherenceRate?: number // 0-1

  // Trend information
  progressionTrend?: 'improving' | 'stable' | 'declining'

  // Metadata
  dataPointCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface for technique with effectiveness data
 */
export interface TechniqueWithEffectiveness {
  id: string
  name: string
  description: string
  indications: string[]
  contraindications: string[]

  // Effectiveness metrics
  overallEffectiveness: number
  confidenceInterval: [number, number]
  sampleSize: number

  // Effectiveness by indication
  effectivenessByIndication: Record<
    string,
    {
      effectiveness: number
      sampleSize: number
      confidenceInterval: [number, number]
    }
  >

  // Effectiveness by demographic segment (anonymized)
  effectivenessBySegment?: Record<
    string,
    {
      effectiveness: number
      sampleSize: number
    }
  >

  // Evidence base
  evidenceLevel: 'high' | 'moderate' | 'low' | 'anecdotal'
  lastUpdated: Date
}

/**
 * Interface for effectiveness insights
 */
export interface EffectivenessInsight {
  id: string

  // What the insight relates to
  relatedPatternTypes?: string[]
  relatedTechniqueIds?: string[]

  // The actual insight
  insightText: string
  confidenceLevel: number

  // Supporting data
  supportingDataPoints: number

  // Relevance and impact
  clinicalRelevance: 'high' | 'moderate' | 'low'
  actionability: 'high' | 'moderate' | 'low'

  // Metadata
  generatedAt: Date
  expiresAt?: Date

  // Tags for categorization
  tags: string[]
}

/**
 * Options for the ComparativeAnalyticsService
 */
export interface ComparativeAnalyticsOptions {
  minSampleSizeForInsights?: number
  minConfidenceForBenchmarks?: number
  insightGenerationFrequency?: number // in hours
  benchmarkRefreshFrequency?: number // in hours
  anonymizationLevel?: 'high' | 'medium' | 'standard'
}

/**
 * Service for comparative analytics of therapeutic approaches
 */
export class ComparativeAnalyticsService {
  // Default options
  private options: Required<ComparativeAnalyticsOptions> = {
    minSampleSizeForInsights: 10,
    minConfidenceForBenchmarks: 0.7,
    insightGenerationFrequency: 24, // Daily
    benchmarkRefreshFrequency: 168, // Weekly
    anonymizationLevel: 'high',
  }

  // Cache for frequently accessed data
  private techniqueCache: Map<string, TechniqueWithEffectiveness> = new Map()
  private insightCache: Map<string, EffectivenessInsight[]> = new Map()
  private benchmarkCache: Map<string, AnonymizedBenchmark[]> = new Map()

  constructor(
    private readonly efficacyService: EfficacyTrackingService,
    private readonly patternService: PatternRecognitionService,
    private readonly benchmarkRepository: BenchmarkRepository,
    private readonly redisService?: IRedisService,
    options?: ComparativeAnalyticsOptions,
  ) {
    // Override default options with provided options
    if (options) {
      this.options = { ...this.options, ...options }
    }

    // Schedule regular updates of benchmarks and insights
    this.scheduleBenchmarkUpdates()
    this.scheduleInsightGeneration()
  }

  /**
   * Create anonymized benchmarks from efficacy data
   */
  async createAnonymizedBenchmarks(): Promise<number> {
    logger.info('Creating anonymized benchmarks')

    try {
      // Get techniques with enough data for benchmarking
      const allTechniques =
        await this.efficacyService.getTechniquesEfficacyStats([])
      const eligibleTechniques = Array.from(allTechniques.values()).filter(
        (tech) => tech.sampleSize >= this.options.minSampleSizeForInsights,
      )

      logger.info(
        `Found ${eligibleTechniques.length} techniques with sufficient data for benchmarking`,
      )

      let benchmarksCreated = 0

      // Process each eligible technique
      for (const technique of eligibleTechniques) {
        // Create benchmarks for each indication with sufficient data
        for (const [indication, stats] of Object.entries(
          technique.byIndication,
        )) {
          if (stats.sampleSize >= this.options.minSampleSizeForInsights) {
            const benchmark: AnonymizedBenchmark = {
              id: `benchmark-${technique.techniqueId}-${indication}-${Date.now()}`,
              timestamp: new Date(),
              patternType: indication,
              patternConfidence: stats.averageEfficacy >= 0.7 ? 0.9 : 0.7, // Simplified confidence calc
              techniqueIds: [technique.techniqueId],
              effectivenessRatings: {
                [technique.techniqueId]: stats.averageEfficacy,
              },
              dataPointCount: stats.sampleSize,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            // Store the benchmark
            await this.benchmarkRepository.storeBenchmark(benchmark)
            benchmarksCreated++
          }
        }
      }

      // Clear relevant caches
      if (this.redisService) {
        await this.redisService.deletePattern('benchmarks:*')
      }
      this.benchmarkCache.clear()

      logger.info(`Created ${benchmarksCreated} anonymized benchmarks`)

      return benchmarksCreated
    } catch (error) {
      logger.error('Error creating anonymized benchmarks', { error })
      throw new Error(
        `Failed to create benchmarks: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Build or update the approach effectiveness database
   */
  async updateEffectivenessDatabase(): Promise<number> {
    logger.info('Updating approach effectiveness database')

    try {
      // Get all techniques with efficacy data
      const allTechniques =
        await this.efficacyService.getTechniquesEfficacyStats([])
      let updatedCount = 0

      // Process each technique to update effectiveness data
      for (const [techniqueId, stats] of allTechniques.entries()) {
        const existingTechniques =
          await this.benchmarkRepository.getTechniquesByIndication('')
        const existingTechniqueMap = new Map(
          existingTechniques.map((t) => [t.id, t]),
        )

        // Create or update effectiveness data
        const techniqueWithEffectiveness: TechniqueWithEffectiveness = {
          id: techniqueId,
          name: stats.techniqueName,
          description: '', // Would need to be populated from source data
          indications: Object.keys(stats.byIndication),
          contraindications: [], // Would need to be populated from source data

          overallEffectiveness: stats.averageEfficacy,
          confidenceInterval: stats.confidenceInterval,
          sampleSize: stats.sampleSize,

          effectivenessByIndication: {},

          evidenceLevel: this.determineEvidenceLevel(
            stats.sampleSize,
            stats.averageEfficacy,
          ),
          lastUpdated: new Date(),
        }

        // Populate effectiveness by indication
        for (const [indication, indicationStats] of Object.entries(
          stats.byIndication,
        )) {
          techniqueWithEffectiveness.effectivenessByIndication[indication] = {
            effectiveness: indicationStats.averageEfficacy,
            sampleSize: indicationStats.sampleSize,
            confidenceInterval: this.calculateConfidenceInterval(
              indicationStats.averageEfficacy,
              indicationStats.sampleSize,
            ),
          }
        }

        // Store the updated technique
        await this.benchmarkRepository.storeBenchmark({
          id: `technique-effectiveness-${techniqueId}`,
          timestamp: new Date(),
          patternType: 'technique-effectiveness',
          patternConfidence: 1.0,
          techniqueIds: [techniqueId],
          effectivenessRatings: {
            [techniqueId]: stats.averageEfficacy,
          },
          dataPointCount: stats.sampleSize,
          createdAt: existingTechniqueMap.has(techniqueId)
            ? existingTechniqueMap.get(techniqueId)!.lastUpdated
            : new Date(),
          updatedAt: new Date(),
        })

        updatedCount++

        // Update cache
        this.techniqueCache.set(techniqueId, techniqueWithEffectiveness)
      }

      logger.info(
        `Updated ${updatedCount} techniques in effectiveness database`,
      )

      // Clear relevant caches
      if (this.redisService) {
        await this.redisService.deletePattern('effectiveness:*')
      }

      return updatedCount
    } catch (error) {
      logger.error('Error updating effectiveness database', { error })
      throw new Error(
        `Failed to update effectiveness database: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generate insights based on pattern and technique data
   */
  async generateInsights(): Promise<EffectivenessInsight[]> {
    logger.info('Generating effectiveness insights')

    try {
      const insights: EffectivenessInsight[] = []

      // Get effectiveness data
      const techniques = await this.benchmarkRepository.getAllTechniques()

      // Generate comparative insights
      insights.push(...(await this.generateComparativeInsights(techniques)))

      // Generate pattern-specific insights
      insights.push(...(await this.generatePatternSpecificInsights(techniques)))

      // Generate trend insights
      insights.push(...(await this.generateTrendInsights()))

      // Store new insights
      for (const insight of insights) {
        await this.benchmarkRepository.storeInsight(insight)
      }

      // Clear caches
      if (this.redisService) {
        await this.redisService.deletePattern('insights:*')
      }
      this.insightCache.clear()

      logger.info(`Generated ${insights.length} new insights`)

      return insights
    } catch (error) {
      logger.error('Error generating insights', { error })
      throw new Error(
        `Failed to generate insights: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get comparative analytics for a specific indication
   */
  async getComparativeAnalyticsForIndication(indication: string): Promise<{
    techniques: TechniqueWithEffectiveness[]
    insights: EffectivenessInsight[]
    benchmarks: AnonymizedBenchmark[]
  }> {
    logger.info('Retrieving comparative analytics for indication', {
      indication,
    })

    try {
      const cacheKey = `comparative:${indication}`

      // Try to get from cache
      if (this.redisService) {
        const cached = await this.redisService.get(cacheKey)
        if (cached) {
          logger.debug('Retrieved comparative analytics from cache', {
            indication,
          })
          return JSON.parse(cached)
        }
      }

      // Get data from repositories
      const techniques =
        await this.benchmarkRepository.getTechniquesByIndication(indication)
      const insights =
        await this.benchmarkRepository.getInsightsForPattern(indication)
      const benchmarks =
        await this.benchmarkRepository.getBenchmarksByIndication(indication)

      const result = {
        techniques,
        insights,
        benchmarks,
      }

      // Cache the result
      if (this.redisService) {
        await this.redisService.set(cacheKey, JSON.stringify(result), 3600) // 1 hour cache
      }

      return result
    } catch (error) {
      logger.error('Error retrieving comparative analytics', {
        indication,
        error,
      })
      throw new Error(
        `Failed to retrieve comparative analytics: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get comparative analytics for a specific technique
   */
  async getComparativeAnalyticsForTechnique(techniqueId: string): Promise<{
    technique: TechniqueWithEffectiveness
    insights: EffectivenessInsight[]
    benchmarks: AnonymizedBenchmark[]
    alternatives: TechniqueWithEffectiveness[]
  }> {
    logger.info('Retrieving comparative analytics for technique', {
      techniqueId,
    })

    try {
      const cacheKey = `technique-comparison:${techniqueId}`

      // Try to get from cache
      if (this.redisService) {
        const cached = await this.redisService.get(cacheKey)
        if (cached) {
          logger.debug('Retrieved technique comparison from cache', {
            techniqueId,
          })
          return JSON.parse(cached)
        }
      }

      // Get technique data
      const techniques = await this.benchmarkRepository.getAllTechniques()
      const technique = techniques.find((t) => t.id === techniqueId)

      if (!technique) {
        throw new Error(`Technique not found: ${techniqueId}`)
      }

      // Get related data
      const insights =
        await this.benchmarkRepository.getInsightsForTechnique(techniqueId)
      const benchmarks =
        await this.benchmarkRepository.getBenchmarksByTechnique(techniqueId)

      // Find alternative techniques (those sharing indications)
      const alternatives = techniques.filter(
        (t) =>
          t.id !== techniqueId &&
          t.indications.some((ind) => technique.indications.includes(ind)),
      )

      const result = {
        technique,
        insights,
        benchmarks,
        alternatives,
      }

      // Cache the result
      if (this.redisService) {
        await this.redisService.set(cacheKey, JSON.stringify(result), 3600) // 1 hour cache
      }

      return result
    } catch (error) {
      logger.error('Error retrieving technique comparison', {
        techniqueId,
        error,
      })
      throw new Error(
        `Failed to retrieve technique comparison: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Schedule automatic updates of benchmark data
   */
  private scheduleBenchmarkUpdates(): void {
    const refreshHours = this.options.benchmarkRefreshFrequency
    const msInterval = refreshHours * 60 * 60 * 1000

    // Run immediately on startup
    setTimeout(() => {
      this.createAnonymizedBenchmarks()
        .then((count) =>
          logger.info(
            `Initial benchmark creation complete: ${count} benchmarks created`,
          ),
        )
        .catch((err) =>
          logger.error('Error in initial benchmark creation', { error: err }),
        )

      // Then set up recurring interval
      setInterval(() => {
        this.createAnonymizedBenchmarks()
          .then((count) =>
            logger.info(
              `Scheduled benchmark update complete: ${count} benchmarks created`,
            ),
          )
          .catch((err) =>
            logger.error('Error in scheduled benchmark update', { error: err }),
          )
      }, msInterval)
    }, 1000) // Small delay on startup to allow other initialization to complete
  }

  /**
   * Schedule automatic generation of insights
   */
  private scheduleInsightGeneration(): void {
    const generationHours = this.options.insightGenerationFrequency
    const msInterval = generationHours * 60 * 60 * 1000

    // Run immediately on startup with a slight delay to allow benchmarks to be created first
    setTimeout(() => {
      this.generateInsights()
        .then((insights) =>
          logger.info(
            `Initial insight generation complete: ${insights.length} insights generated`,
          ),
        )
        .catch((err) =>
          logger.error('Error in initial insight generation', { error: err }),
        )

      // Then set up recurring interval
      setInterval(() => {
        this.generateInsights()
          .then((insights) =>
            logger.info(
              `Scheduled insight generation complete: ${insights.length} insights generated`,
            ),
          )
          .catch((err) =>
            logger.error('Error in scheduled insight generation', {
              error: err,
            }),
          )
      }, msInterval)
    }, 5000) // Small delay on startup to allow benchmark creation to complete first
  }

  /**
   * Calculate confidence interval for effectiveness metrics
   */
  private calculateConfidenceInterval(
    averageEffectiveness: number,
    sampleSize: number,
  ): [number, number] {
    if (sampleSize < 2) {
      return [0, 1] // Cannot calculate CI with less than 2 samples
    }

    // Simple CI calculation using normal approximation
    // In a real implementation, this would use more sophisticated statistics
    const z = 1.96 // For 95% confidence
    const marginOfError =
      z *
      Math.sqrt(
        (averageEffectiveness * (1 - averageEffectiveness)) / sampleSize,
      )

    return [
      Math.max(0, averageEffectiveness - marginOfError),
      Math.min(1, averageEffectiveness + marginOfError),
    ]
  }

  /**
   * Determine evidence level based on sample size and effect size
   */
  private determineEvidenceLevel(
    sampleSize: number,
    effectivenessScore: number,
  ): 'high' | 'moderate' | 'low' | 'anecdotal' {
    if (sampleSize >= 50 && effectivenessScore >= 0.7) {
      return 'high'
    } else if (sampleSize >= 20 || effectivenessScore >= 0.8) {
      return 'moderate'
    } else if (sampleSize >= 10) {
      return 'low'
    } else {
      return 'anecdotal'
    }
  }

  /**
   * Generate comparative insights across techniques
   */
  private async generateComparativeInsights(
    techniques: TechniqueWithEffectiveness[],
  ): Promise<EffectivenessInsight[]> {
    const insights: EffectivenessInsight[] = []

    // Group techniques by indication
    const techniquesByIndication = new Map<
      string,
      TechniqueWithEffectiveness[]
    >()

    for (const technique of techniques) {
      for (const indication of technique.indications) {
        const existing = techniquesByIndication.get(indication) || []
        techniquesByIndication.set(indication, [...existing, technique])
      }
    }

    // Generate insights for each indication with multiple techniques
    for (const [
      indication,
      indicationTechniques,
    ] of techniquesByIndication.entries()) {
      if (indicationTechniques.length < 2) {
        continue
      }

      // Sort by effectiveness for this indication
      const sortedTechniques = [...indicationTechniques].sort((a, b) => {
        const aEff = a.effectivenessByIndication[indication]?.effectiveness || 0
        const bEff = b.effectivenessByIndication[indication]?.effectiveness || 0
        return bEff - aEff
      })

      // If we have clear winners and losers, generate insight
      if (sortedTechniques.length >= 2) {
        const topTechnique = sortedTechniques[0]
        const runnerUp = sortedTechniques[1]

        const topEff =
          topTechnique.effectivenessByIndication[indication]?.effectiveness || 0
        const runnerEff =
          runnerUp.effectivenessByIndication[indication]?.effectiveness || 0

        if (topEff - runnerEff > 0.1 && topEff > 0.7) {
          insights.push({
            id: `comparative-${indication}-${Date.now()}`,
            relatedPatternTypes: [indication],
            relatedTechniqueIds: sortedTechniques.slice(0, 2).map((t) => t.id),
            insightText: `For ${indication}, ${topTechnique.name} (${(topEff * 100).toFixed(1)}%) shows significantly better outcomes than ${runnerUp.name} (${(runnerEff * 100).toFixed(1)}%).`,
            confidenceLevel: Math.min(0.95, topEff),
            supportingDataPoints:
              topTechnique.effectivenessByIndication[indication]?.sampleSize ||
              0,
            clinicalRelevance: topEff > 0.8 ? 'high' : 'moderate',
            actionability: 'high',
            generatedAt: new Date(),
            tags: ['comparative', 'effectiveness', indication],
          })
        }

        // If there's a clear group of effective vs ineffective techniques
        if (sortedTechniques.length >= 4) {
          const effectiveThreshold = 0.7
          const effectiveTechniques = sortedTechniques.filter(
            (t) =>
              (t.effectivenessByIndication[indication]?.effectiveness || 0) >=
              effectiveThreshold,
          )

          if (
            effectiveTechniques.length >= 2 &&
            effectiveTechniques.length < sortedTechniques.length
          ) {
            insights.push({
              id: `effective-group-${indication}-${Date.now()}`,
              relatedPatternTypes: [indication],
              relatedTechniqueIds: effectiveTechniques.map((t) => t.id),
              insightText: `For ${indication}, a group of ${effectiveTechniques.length} techniques consistently shows effectiveness above ${effectiveThreshold * 100}%: ${effectiveTechniques
                .slice(0, 3)
                .map((t) => t.name)
                .join(', ')}${effectiveTechniques.length > 3 ? '...' : ''}.`,
              confidenceLevel: 0.85,
              supportingDataPoints: effectiveTechniques.reduce(
                (sum, t) =>
                  sum +
                  (t.effectivenessByIndication[indication]?.sampleSize || 0),
                0,
              ),
              clinicalRelevance: 'high',
              actionability: 'high',
              generatedAt: new Date(),
              tags: ['grouping', 'effectiveness', indication],
            })
          }
        }
      }
    }

    return insights
  }

  /**
   * Generate pattern-specific insights
   */
  private async generatePatternSpecificInsights(
    techniques: TechniqueWithEffectiveness[],
  ): Promise<EffectivenessInsight[]> {
    const insights: EffectivenessInsight[] = []

    // Get benchmarks to analyze patterns
    const benchmarks = await this.getAllBenchmarks()

    // Group benchmarks by pattern type
    const benchmarksByPattern = new Map<string, AnonymizedBenchmark[]>()

    for (const benchmark of benchmarks) {
      const existing = benchmarksByPattern.get(benchmark.patternType) || []
      benchmarksByPattern.set(benchmark.patternType, [...existing, benchmark])
    }

    // For each pattern with sufficient data
    for (const [
      patternType,
      patternBenchmarks,
    ] of benchmarksByPattern.entries()) {
      if (patternBenchmarks.length < this.options.minSampleSizeForInsights) {
        continue
      }

      // Analyze most effective techniques for this pattern
      const techniqueEffectiveness = new Map<
        string,
        {
          total: number
          count: number
          techniqueId: string
        }
      >()

      for (const benchmark of patternBenchmarks) {
        for (const [techniqueId, rating] of Object.entries(
          benchmark.effectivenessRatings,
        )) {
          const current = techniqueEffectiveness.get(techniqueId) || {
            total: 0,
            count: 0,
            techniqueId,
          }

          techniqueEffectiveness.set(techniqueId, {
            total: current.total + rating,
            count: current.count + 1,
            techniqueId,
          })
        }
      }

      // Calculate averages and sort
      const averageEffectiveness = Array.from(techniqueEffectiveness.values())
        .map((data) => ({
          techniqueId: data.techniqueId,
          average: data.total / data.count,
          sampleSize: data.count,
        }))
        .filter((data) => data.sampleSize >= 3) // Minimum sample size for reliable data
        .sort((a, b) => b.average - a.average)

      // Generate insights for top techniques
      if (averageEffectiveness.length > 0) {
        const topTechnique = averageEffectiveness[0]
        const techniqueName =
          techniques.find((t) => t.id === topTechnique.techniqueId)?.name ||
          'Unknown'

        insights.push({
          id: `top-technique-${patternType}-${Date.now()}`,
          relatedPatternTypes: [patternType],
          relatedTechniqueIds: [topTechnique.techniqueId],
          insightText: `For ${patternType} patterns, ${techniqueName} shows the highest effectiveness (${(topTechnique.average * 100).toFixed(1)}%) based on ${topTechnique.sampleSize} data points.`,
          confidenceLevel: Math.min(0.9, topTechnique.average),
          supportingDataPoints: topTechnique.sampleSize,
          clinicalRelevance: topTechnique.average > 0.8 ? 'high' : 'moderate',
          actionability: 'high',
          generatedAt: new Date(),
          tags: ['top-performer', patternType],
        })
      }

      // If we have enough data, provide insights on pattern-specific technique combinations
      if (patternBenchmarks.length >= 10) {
        // This would analyze combinations of techniques that work well together
        // Simplified implementation for now
        insights.push({
          id: `pattern-insight-${patternType}-${Date.now()}`,
          relatedPatternTypes: [patternType],
          relatedTechniqueIds: averageEffectiveness
            .slice(0, 3)
            .map((a) => a.techniqueId),
          insightText: `Analysis of ${patternBenchmarks.length} cases shows consistent response to specific intervention approaches for ${patternType} patterns.`,
          confidenceLevel: 0.8,
          supportingDataPoints: patternBenchmarks.length,
          clinicalRelevance: 'moderate',
          actionability: 'moderate',
          generatedAt: new Date(),
          tags: ['pattern-analysis', patternType],
        })
      }
    }

    return insights
  }

  /**
   * Generate trend insights from benchmark data
   */
  private async generateTrendInsights(): Promise<EffectivenessInsight[]> {
    const insights: EffectivenessInsight[] = []

    // Get all benchmarks
    const benchmarks = await this.getAllBenchmarks()

    // Group by technique to analyze trends
    const benchmarksByTechnique = new Map<string, AnonymizedBenchmark[]>()

    for (const benchmark of benchmarks) {
      for (const techniqueId of benchmark.techniqueIds) {
        const existing = benchmarksByTechnique.get(techniqueId) || []
        benchmarksByTechnique.set(techniqueId, [...existing, benchmark])
      }
    }

    // Analyze trends for each technique with sufficient data
    for (const [
      techniqueId,
      techniqueBenchmarks,
    ] of benchmarksByTechnique.entries()) {
      if (techniqueBenchmarks.length < 10) {
        continue // Need enough data for trend analysis
      }

      // Sort benchmarks by date
      const sortedBenchmarks = [...techniqueBenchmarks].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      )

      // Perform linear regression to identify trend
      const dataPoints = sortedBenchmarks.map((b) => ({
        x: b.timestamp.getTime(),
        y: b.effectivenessRatings[techniqueId] || 0,
      }))

      const result = this.performLinearRegression(dataPoints)

      // Determine if trend is significant
      const oldestTime = dataPoints[0].x
      const newestTime = dataPoints[dataPoints.length - 1].x
      const oldestPredicted = result.slope * oldestTime + result.intercept
      const newestPredicted = result.slope * newestTime + result.intercept
      const totalChange = newestPredicted - oldestPredicted

      // Generate insight if trend slope is significant (trend shows meaningful change)
      if (Math.abs(totalChange) > 0.05 && Math.abs(result.slope) > 0.00000001) {
        // Small threshold due to large timestamp values
        const trend = result.slope > 0 ? 'improving' : 'declining'
        const techniqueName =
          (await this.benchmarkRepository.getTechniquesByIndication('')).find(
            (t) => t.id === techniqueId,
          )?.name || 'Unknown'

        // Calculate metrics for insight
        const oldestPredictedPercent = (oldestPredicted * 100).toFixed(1)
        const newestPredictedPercent = (newestPredicted * 100).toFixed(1)
        const confidence = result.r2 > 0.7 ? 0.85 : result.r2 > 0.5 ? 0.7 : 0.6

        insights.push({
          id: `trend-${techniqueId}-${Date.now()}`,
          relatedTechniqueIds: [techniqueId],
          insightText: `${techniqueName} shows a ${trend} trend in effectiveness (${oldestPredictedPercent}% → ${newestPredictedPercent}%) with correlation strength of ${(result.r2 * 100).toFixed(1)}% based on ${sortedBenchmarks.length} data points.`,
          confidenceLevel: confidence,
          supportingDataPoints: sortedBenchmarks.length,
          clinicalRelevance: Math.abs(totalChange) > 0.1 ? 'high' : 'moderate',
          actionability: trend === 'declining' ? 'high' : 'moderate',
          generatedAt: new Date(),
          tags: ['trend', trend, techniqueId],
        })

        // If trend is strong, add specific recommendation
        if (result.r2 > 0.7 && trend === 'declining') {
          insights.push({
            id: `trend-recommendation-${techniqueId}-${Date.now()}`,
            relatedTechniqueIds: [techniqueId],
            insightText: `RECOMMENDATION: Review implementation of ${techniqueName} as data suggests declining effectiveness over time. Consider refresher training or technique modifications.`,
            confidenceLevel: confidence,
            supportingDataPoints: sortedBenchmarks.length,
            clinicalRelevance: 'high',
            actionability: 'high',
            generatedAt: new Date(),
            tags: ['recommendation', 'declining-trend', techniqueId],
          })
        }
      }
    }

    return insights
  }

  /**
   * Perform linear regression on a set of data points
   */
  private performLinearRegression(data: { x: number; y: number }[]): {
    slope: number
    intercept: number
    r2: number
  } {
    const n = data.length

    // Calculate means
    let sumX = 0
    let sumY = 0
    for (const point of data) {
      sumX += point.x
      sumY += point.y
    }
    const meanX = sumX / n
    const meanY = sumY / n

    // Calculate slope and intercept
    let numerator = 0
    let denominator = 0
    for (const point of data) {
      const xDiff = point.x - meanX
      const yDiff = point.y - meanY
      numerator += xDiff * yDiff
      denominator += xDiff * xDiff
    }

    const slope = denominator === 0 ? 0 : numerator / denominator
    const intercept = meanY - slope * meanX

    // Calculate R-squared (coefficient of determination)
    let ssRes = 0
    let ssTot = 0
    for (const point of data) {
      const predictedY = slope * point.x + intercept
      ssRes += (point.y - predictedY) ** 2
      ssTot += (point.y - meanY) ** 2
    }

    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

    return { slope, intercept, r2 }
  }

  /**
   * Get all benchmarks with pagination
   * @param page Page number (starting from 0)
   * @param pageSize Number of benchmarks per page
   */
  private async getAllBenchmarks(
    page = 0,
    pageSize = 100,
  ): Promise<AnonymizedBenchmark[]> {
    // Use the cache if possible
    const cacheKey = `all-benchmarks-${page}-${pageSize}`

    if (this.benchmarkCache.has(cacheKey)) {
      return this.benchmarkCache.get(cacheKey) || []
    }

    // Get all benchmarks for all indications
    const allBenchmarks =
      await this.benchmarkRepository.getBenchmarksByIndication('')

    // Apply pagination
    const startIndex = page * pageSize
    const endIndex = startIndex + pageSize
    const paginatedBenchmarks = allBenchmarks.slice(startIndex, endIndex)

    // Cache the results
    this.benchmarkCache.set(cacheKey, paginatedBenchmarks)

    // If this is the first page, also cache all benchmarks for efficiency in some operations
    if (page === 0 && allBenchmarks.length <= pageSize) {
      this.benchmarkCache.set('all-benchmarks', allBenchmarks)
    }

    return paginatedBenchmarks
  }
}
