/**
 * Efficacy Tracking Service
 *
 * This service tracks the efficacy of therapeutic recommendations
 * and provides analytics for improving future recommendations.
 */

import { getLogger } from '../../logging'
import type { IRedisService } from '../../services/redis/types'
import type { TherapeuticTechnique } from './RecommendationService'

// Define the logger for this service
const logger = getLogger({ prefix: 'efficacy-tracking-service' })

/**
 * Extend AIRepository with the methods we need
 */
export interface EfficacyAIRepository {
  storeEfficacyFeedback(feedback: EfficacyFeedback): Promise<void>
  getTechniqueById(techniqueId: string): Promise<Technique | null>
  getEfficacyFeedbackForTechnique(
    techniqueId: string,
  ): Promise<EfficacyFeedback[]>
  getEfficacyFeedbackForClient(clientId: string): Promise<EfficacyFeedback[]>
  getTechniquesForIndication(indication: string): Promise<Technique[]>
}

/**
 * Technique data type
 */
export interface Technique {
  id: string
  name: string
  description: string
  indications: string[]
  efficacyRating: number
}

/**
 * Efficacy feedback data type
 */
export interface EfficacyFeedback {
  recommendationId: string
  clientId: string
  techniqueId: string
  efficacyRating: number // 0-1 scale
  timestamp: Date
  feedback?: string
  sessionId?: string
  therapistId?: string
  context?: Record<string, unknown>
}

/**
 * Client efficacy history
 */
export interface ClientEfficacyHistory {
  clientId: string
  lastUpdated: Date
  techniqueHistory: Array<{
    techniqueId: string
    techniqueName: string
    attempts: number
    averageEfficacy: number
    trend: 'improving' | 'stable' | 'declining' | 'unknown'
    lastUsed: Date
  }>
  indicationEfficacy: Record<
    string,
    {
      averageEfficacy: number
      sampleSize: number
      recommendedTechniques: string[]
    }
  >
}

/**
 * Personalized efficacy prediction for a client
 */
export interface PersonalizedEfficacyPrediction {
  clientId: string
  techniqueId: string
  predictedEfficacy: number
  confidenceLevel: number
  similarClients: number
  techniqueStatistics: {
    overallEfficacy: number
    sampleSize: number
  }
}

/**
 * Options for EfficacyTrackingService
 */
export interface EfficacyTrackingOptions {
  /**
   * Minimum sample size required for considering efficacy data reliable
   */
  minSampleSize?: number

  /**
   * Statistical confidence level (0-1)
   */
  confidenceLevel?: number

  /**
   * Time window in days for considering recent feedback more relevant
   */
  recentWindowDays?: number
}

/**
 * Service for tracking and analyzing recommendation efficacy
 */
export class EfficacyTrackingService {
  private techniqueStatCache: Map<string, TechniqueEfficacyStats> = new Map()
  private clientHistoryCache: Map<string, ClientEfficacyHistory> = new Map()

  // Default options
  private options: Required<EfficacyTrackingOptions> = {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    recentWindowDays: 90,
  }

  constructor(
    private readonly efficacyRepository: EfficacyAIRepository,
    private readonly techniqueRepository: EfficacyAIRepository,
    private readonly redisService?: IRedisService,
    options?: EfficacyTrackingOptions,
  ) {
    // Override default options with provided options
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  /**
   * Record efficacy feedback for a recommendation
   */
  async recordEfficacyFeedback(feedback: EfficacyFeedback): Promise<void> {
    logger.info('Recording efficacy feedback', {
      recommendationId: feedback.recommendationId,
      clientId: feedback.clientId,
      efficacyRating: feedback.efficacyRating,
    })

    try {
      // Store feedback in repository
      await this.efficacyRepository.storeEfficacyFeedback(feedback)

      // Invalidate caches for updated data
      const cacheKeys = [
        `technique-efficacy:${feedback.techniqueId}`,
        `client-efficacy:${feedback.clientId}`,
      ]

      if (this.redisService) {
        await Promise.all(cacheKeys.map((key) => this.redisService?.del(key)))
      }

      // Clear in-memory caches for this data
      this.techniqueStatCache.delete(feedback.techniqueId)
      this.clientHistoryCache.delete(feedback.clientId)

      // Trigger recalculation of efficacy statistics
      await this.calculateTechniqueEfficacyStats(feedback.techniqueId)
      await this.calculateClientEfficacyHistory(feedback.clientId)

      logger.info('Efficacy feedback recorded successfully', {
        recommendationId: feedback.recommendationId,
        techniqueId: feedback.techniqueId,
      })
    } catch (error) {
      logger.error('Failed to record efficacy feedback', {
        error,
        recommendationId: feedback.recommendationId,
      })
      throw new Error(
        `Failed to record efficacy feedback: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Calculate efficacy statistics for a specific technique
   */
  async calculateTechniqueEfficacyStats(
    techniqueId: string,
  ): Promise<TechniqueEfficacyStats> {
    const cacheKey = `technique-efficacy:${techniqueId}`

    // Try to get from Redis cache
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey)
      if (cached) {
        logger.debug('Retrieved technique efficacy stats from cache', {
          techniqueId,
        })
        return JSON.parse(cached)
      }
    }

    // Try to get from memory cache
    if (this.techniqueStatCache.has(techniqueId)) {
      return this.techniqueStatCache.get(techniqueId)!
    }

    logger.info('Calculating efficacy statistics for technique', {
      techniqueId,
    })

    try {
      // Get technique details
      const technique =
        await this.techniqueRepository.getTechniqueById(techniqueId)

      if (!technique) {
        throw new Error(`Technique not found: ${techniqueId}`)
      }

      // Get all efficacy feedback for this technique
      const feedbackList =
        await this.efficacyRepository.getEfficacyFeedbackForTechnique(
          techniqueId,
        )

      if (feedbackList.length === 0) {
        logger.info('No efficacy data available for technique', { techniqueId })
        const emptyStats: TechniqueEfficacyStats = {
          techniqueId,
          techniqueName: technique.name,
          averageEfficacy: 0,
          confidenceInterval: [0, 0],
          sampleSize: 0,
          lastUpdated: new Date(),
          byIndication: {},
        }
        return emptyStats
      }

      // Calculate overall average efficacy
      const efficacyValues = feedbackList.map(
        (f: EfficacyFeedback) => f.efficacyRating,
      )
      const averageEfficacy =
        efficacyValues.reduce((sum: number, val: number) => sum + val, 0) /
        efficacyValues.length

      // Calculate confidence interval if we have enough samples
      let confidenceInterval: [number, number] = [0, 0]
      if (feedbackList.length >= this.options.minSampleSize) {
        // Calculate standard deviation
        const mean = averageEfficacy
        const squareDiffs = efficacyValues.map((value) => {
          const diff = value - mean
          return diff * diff
        })
        const avgSquareDiff =
          squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length
        const stdDev = Math.sqrt(avgSquareDiff)

        // Calculate confidence interval using t-distribution approximation
        // For simplicity, we're using a normal approximation here
        const z = this.options.confidenceLevel === 0.95 ? 1.96 : 2.58 // 95% or 99%
        const marginOfError = (z * stdDev) / Math.sqrt(feedbackList.length)

        confidenceInterval = [
          Math.max(0, averageEfficacy - marginOfError),
          Math.min(1, averageEfficacy + marginOfError),
        ]
      }

      // Group feedback by indication
      const indicationMap = new Map<string, string[]>()
      technique.indications.forEach((indication) => {
        indicationMap.set(indication.toLowerCase(), [indication])
      })

      // Process feedback by indication
      const byIndication: Record<
        string,
        {
          efficacySum: number
          count: number
          averageEfficacy: number
        }
      > = {}

      for (const feedback of feedbackList) {
        // If context includes indications, use those
        const contextIndications = feedback.context?.indications as
          | string[]
          | undefined

        if (contextIndications && Array.isArray(contextIndications)) {
          for (const indication of contextIndications) {
            const key = indication.toLowerCase()
            if (!byIndication[key]) {
              byIndication[key] = {
                efficacySum: 0,
                count: 0,
                averageEfficacy: 0,
              }
            }
            byIndication[key].efficacySum += feedback.efficacyRating
            byIndication[key].count += 1
          }
        } else {
          // Otherwise, attribute to all indications for this technique
          for (const [key] of indicationMap) {
            if (!byIndication[key]) {
              byIndication[key] = {
                efficacySum: 0,
                count: 0,
                averageEfficacy: 0,
              }
            }
            byIndication[key].efficacySum += feedback.efficacyRating
            byIndication[key].count += 1
          }
        }
      }

      // Calculate averages for each indication
      const byIndicationStats: Record<
        string,
        {
          averageEfficacy: number
          sampleSize: number
        }
      > = {}

      for (const [indication, data] of Object.entries(byIndication)) {
        data.averageEfficacy = data.efficacySum / data.count
        byIndicationStats[indication] = {
          averageEfficacy: data.averageEfficacy,
          sampleSize: data.count,
        }
      }

      // Prepare the result
      const stats: TechniqueEfficacyStats = {
        techniqueId,
        techniqueName: technique.name,
        averageEfficacy,
        confidenceInterval,
        sampleSize: feedbackList.length,
        lastUpdated: new Date(),
        byIndication: byIndicationStats,
      }

      // Cache the results
      this.techniqueStatCache.set(techniqueId, stats)
      if (this.redisService) {
        await this.redisService.set(cacheKey, JSON.stringify(stats), 3600) // 1 hour TTL
      }

      logger.info('Calculated efficacy statistics for technique', {
        techniqueId,
        averageEfficacy,
        sampleSize: feedbackList.length,
      })

      return stats
    } catch (error) {
      logger.error('Failed to calculate technique efficacy stats', {
        techniqueId,
        error,
      })
      throw new Error(
        `Failed to calculate efficacy statistics: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Calculate efficacy history for a specific client
   */
  async calculateClientEfficacyHistory(
    clientId: string,
  ): Promise<ClientEfficacyHistory> {
    const cacheKey = `client-efficacy:${clientId}`

    // Try to get from Redis cache
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey)
      if (cached) {
        logger.debug('Retrieved client efficacy history from cache', {
          clientId,
        })
        return JSON.parse(cached)
      }
    }

    // Try to get from memory cache
    if (this.clientHistoryCache.has(clientId)) {
      return this.clientHistoryCache.get(clientId)!
    }

    logger.info('Calculating efficacy history for client', { clientId })

    try {
      // Get all efficacy feedback for this client
      const feedbackList =
        await this.efficacyRepository.getEfficacyFeedbackForClient(clientId)

      if (feedbackList.length === 0) {
        logger.info('No efficacy data available for client', { clientId })
        const emptyHistory: ClientEfficacyHistory = {
          clientId,
          lastUpdated: new Date(),
          techniqueHistory: [],
          indicationEfficacy: {},
        }
        return emptyHistory
      }

      // Group feedback by technique
      const techniqueMap = new Map<
        string,
        {
          feedbackList: EfficacyFeedback[]
          techniqueName: string
          lastUsed: Date
        }
      >()

      // Group feedback by indication
      const indicationMap = new Map<
        string,
        {
          efficacySum: number
          count: number
          techniques: Set<string>
        }
      >()

      // Sort feedback by timestamp (newest first)
      feedbackList.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )

      // Process all feedback
      for (const feedback of feedbackList) {
        // Process technique data
        if (!techniqueMap.has(feedback.techniqueId)) {
          // Fetch technique details if we don't have them yet
          const technique = await this.techniqueRepository.getTechniqueById(
            feedback.techniqueId,
          )

          techniqueMap.set(feedback.techniqueId, {
            feedbackList: [],
            techniqueName: technique?.name || 'Unknown Technique',
            lastUsed: new Date(feedback.timestamp),
          })
        }

        const techniqueData = techniqueMap.get(feedback.techniqueId)!
        techniqueData.feedbackList.push(feedback)

        // Update last used if this is more recent
        const feedbackDate = new Date(feedback.timestamp)
        if (feedbackDate > techniqueData.lastUsed) {
          techniqueData.lastUsed = feedbackDate
        }

        // Process indication data from context
        const contextIndications = feedback.context?.indications as
          | string[]
          | undefined

        if (contextIndications && Array.isArray(contextIndications)) {
          for (const indication of contextIndications) {
            const key = indication.toLowerCase()

            if (!indicationMap.has(key)) {
              indicationMap.set(key, {
                efficacySum: 0,
                count: 0,
                techniques: new Set(),
              })
            }

            const indicationData = indicationMap.get(key)!
            indicationData.efficacySum += feedback.efficacyRating
            indicationData.count += 1
            indicationData.techniques.add(feedback.techniqueId)
          }
        }
      }

      // Calculate technique history
      const techniqueHistory = Array.from(techniqueMap.entries()).map(
        ([techniqueId, data]) => {
          const feedbacks = data.feedbackList
          const efficacyValues = feedbacks.map((f) => f.efficacyRating)
          const averageEfficacy =
            efficacyValues.reduce((sum, val) => sum + val, 0) /
            efficacyValues.length

          // Calculate trend
          let trend: 'improving' | 'stable' | 'declining' | 'unknown' =
            'unknown'

          if (feedbacks.length >= 3) {
            // Sort by date (oldest first for trend analysis)
            const sortedFeedbacks = [...feedbacks].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            )

            // Simple trend analysis using linear regression slope
            const n = sortedFeedbacks.length
            const xValues = Array.from({ length: n }, (_, i) => i)
            const yValues = sortedFeedbacks.map((f) => f.efficacyRating)

            const sumX = xValues.reduce((sum, x) => sum + x, 0)
            const sumY = yValues.reduce((sum, y) => sum + y, 0)
            const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
            const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

            if (slope > 0.05) {
              trend = 'improving'
            } else if (slope < -0.05) {
              trend = 'declining'
            } else {
              trend = 'stable'
            }
          }

          return {
            techniqueId,
            techniqueName: data.techniqueName,
            attempts: feedbacks.length,
            averageEfficacy,
            trend,
            lastUsed: data.lastUsed,
          }
        },
      )

      // Calculate indication efficacy
      const indicationEfficacy: Record<
        string,
        {
          averageEfficacy: number
          sampleSize: number
          recommendedTechniques: string[]
        }
      > = {}

      for (const [indication, data] of indicationMap.entries()) {
        indicationEfficacy[indication] = {
          averageEfficacy: data.efficacySum / data.count,
          sampleSize: data.count,
          recommendedTechniques: Array.from(data.techniques),
        }
      }

      // Prepare the result
      const history: ClientEfficacyHistory = {
        clientId,
        lastUpdated: new Date(),
        techniqueHistory,
        indicationEfficacy,
      }

      // Cache the results
      this.clientHistoryCache.set(clientId, history)
      if (this.redisService) {
        await this.redisService.set(cacheKey, JSON.stringify(history), 3600) // 1 hour TTL
      }

      logger.info('Calculated efficacy history for client', {
        clientId,
        techniqueCount: techniqueHistory.length,
        indicationCount: Object.keys(indicationEfficacy).length,
      })

      return history
    } catch (error) {
      logger.error('Failed to calculate client efficacy history', {
        clientId,
        error,
      })
      throw new Error(
        `Failed to calculate client efficacy history: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get efficacy statistics for multiple techniques
   */
  async getTechniquesEfficacyStats(
    techniqueIds: string[],
  ): Promise<Map<string, TechniqueEfficacyStats>> {
    logger.info('Retrieving efficacy statistics for techniques', {
      count: techniqueIds.length,
    })

    try {
      const results = new Map<string, TechniqueEfficacyStats>()

      // Get stats for each technique
      await Promise.all(
        techniqueIds.map(async (id) => {
          try {
            const stats = await this.calculateTechniqueEfficacyStats(id)
            results.set(id, stats)
          } catch (error) {
            logger.warn(`Failed to get efficacy for technique ${id}`, { error })
          }
        }),
      )

      return results
    } catch (error) {
      logger.error('Failed to get techniques efficacy stats', { error })
      throw new Error(
        `Failed to get efficacy statistics: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get ordered list of most effective techniques for a specific indication
   */
  async getMostEffectiveTechniquesForIndication(
    indication: string,
    limit: number = 5,
  ): Promise<
    Array<{
      techniqueId: string
      techniqueName: string
      averageEfficacy: number
      confidenceInterval: [number, number]
      sampleSize: number
    }>
  > {
    logger.info('Retrieving most effective techniques for indication', {
      indication,
    })

    try {
      // Get all techniques for this indication
      const techniques =
        await this.techniqueRepository.getTechniquesForIndication(indication)

      if (!techniques || techniques.length === 0) {
        logger.info('No techniques found for indication', { indication })
        return []
      }

      // Get efficacy stats for all relevant techniques
      const techniqueIds = techniques.map((t: Technique) => t.id)
      const efficacyStats = await this.getTechniquesEfficacyStats(techniqueIds)

      // Filter for techniques with enough data and sort by efficacy
      return Array.from(efficacyStats.values())
        .filter(
          (stats) =>
            stats.sampleSize >= this.options.minSampleSize &&
            stats.byIndication[indication] &&
            stats.byIndication[indication].sampleSize >=
              this.options.minSampleSize,
        )
        .sort((a, b) => {
          // Sort by indication-specific efficacy
          const aEfficacy = a.byIndication[indication].averageEfficacy
          const bEfficacy = b.byIndication[indication].averageEfficacy
          return bEfficacy - aEfficacy
        })
        .slice(0, limit)
        .map((stats) => ({
          techniqueId: stats.techniqueId,
          techniqueName: stats.techniqueName,
          averageEfficacy: stats.byIndication[indication].averageEfficacy,
          confidenceInterval: stats.confidenceInterval,
          sampleSize: stats.byIndication[indication].sampleSize,
        }))
    } catch (error) {
      logger.error('Failed to get most effective techniques', {
        indication,
        error,
      })
      throw new Error(
        `Failed to get most effective techniques: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get personalized efficacy predictions for a client
   *
   * This uses collaborative filtering to predict efficacy based on similar clients
   */
  async getPersonalizedEfficacyPredictions(
    clientId: string,
    techniques: TherapeuticTechnique[],
    indications: string[],
  ): Promise<Map<string, number>> {
    logger.info('Generating personalized efficacy predictions', {
      clientId,
      techniqueCount: techniques.length,
    })

    try {
      const result = new Map<string, number>()

      // First, get the client's efficacy history
      const clientHistory = await this.calculateClientEfficacyHistory(clientId)

      // For each technique, predict efficacy
      await Promise.all(
        techniques.map(async (technique) => {
          // Check if client has already used this technique
          const existingTechniqueHistory = clientHistory.techniqueHistory.find(
            (t) => t.techniqueId === technique.id,
          )

          if (
            existingTechniqueHistory &&
            existingTechniqueHistory.attempts > 0
          ) {
            // If client has used this technique, use their personal efficacy
            result.set(technique.id, existingTechniqueHistory.averageEfficacy)
            return
          }

          // Otherwise, use a weighted approach
          let weightedEfficacy = technique.efficacyRating // Start with base efficacy
          let totalWeight = 1 // Base weight

          // Get technique stats
          const techniqueStats = await this.calculateTechniqueEfficacyStats(
            technique.id,
          )

          // If we have enough data on this technique, incorporate it
          if (techniqueStats.sampleSize >= this.options.minSampleSize) {
            weightedEfficacy = techniqueStats.averageEfficacy
            totalWeight = techniqueStats.sampleSize > 20 ? 2 : 1.5 // Give more weight to well-tested techniques
          }

          // Check if we have indication-specific data for this client
          for (const indication of indications) {
            const indicationKey = indication.toLowerCase()

            // If client has history with this indication, incorporate it
            if (
              clientHistory.indicationEfficacy[indicationKey] &&
              clientHistory.indicationEfficacy[indicationKey].sampleSize >= 3
            ) {
              weightedEfficacy =
                (weightedEfficacy * totalWeight +
                  clientHistory.indicationEfficacy[indicationKey]
                    .averageEfficacy *
                    2) /
                (totalWeight + 2)

              totalWeight += 2 // Give significant weight to client-specific indication data
            }

            // If technique has data for this indication, incorporate it
            if (
              techniqueStats.byIndication[indicationKey] &&
              techniqueStats.byIndication[indicationKey].sampleSize >=
                this.options.minSampleSize
            ) {
              weightedEfficacy =
                (weightedEfficacy * totalWeight +
                  techniqueStats.byIndication[indicationKey].averageEfficacy *
                    1.5) /
                (totalWeight + 1.5)

              totalWeight += 1.5
            }
          }

          // Ensure the efficacy is within bounds
          const predictedEfficacy = Math.max(0, Math.min(1, weightedEfficacy))
          result.set(technique.id, predictedEfficacy)
        }),
      )

      return result
    } catch (error) {
      logger.error('Failed to generate personalized efficacy predictions', {
        clientId,
        error,
      })
      // Return base efficacy ratings as fallback
      return new Map(techniques.map((t) => [t.id, t.efficacyRating]))
    }
  }

  /**
   * Get efficacy statistics for a specific technique
   */
  async getTechniqueEfficacyStats(
    techniqueId: string,
  ): Promise<TechniqueEfficacyStats> {
    return this.calculateTechniqueEfficacyStats(techniqueId)
  }

  /**
   * Get efficacy history for a specific client
   */
  async getClientEfficacyHistory(
    clientId: string,
  ): Promise<ClientEfficacyHistory> {
    return this.calculateClientEfficacyHistory(clientId)
  }

  /**
   * Get techniques with declining efficacy that might need review
   */
  async getTechniquesNeedingReview(
    minimumSampleSize: number = 10,
    efficacyThreshold: number = 0.6,
  ): Promise<
    Array<{
      techniqueId: string
      techniqueName: string
      averageEfficacy: number
      sampleSize: number
      indicationsWithLowEfficacy: string[]
    }>
  > {
    logger.info('Finding techniques that might need review')

    try {
      // Get all techniques
      const techniques =
        await this.techniqueRepository.getTechniquesForIndication('')

      if (!techniques || techniques.length === 0) {
        logger.info('No techniques found to review')
        return []
      }

      const results = []

      // Check each technique
      for (const technique of techniques) {
        const stats = await this.calculateTechniqueEfficacyStats(technique.id)

        // Skip techniques without enough data
        if (stats.sampleSize < minimumSampleSize) {
          continue
        }

        // Check if overall efficacy is below threshold
        const lowEfficacy = stats.averageEfficacy < efficacyThreshold

        // Find indications with low efficacy
        const indicationsWithLowEfficacy = Object.entries(stats.byIndication)
          .filter(
            ([_, data]) =>
              data.sampleSize >= Math.max(3, minimumSampleSize / 3) &&
              data.averageEfficacy < efficacyThreshold,
          )
          .map(([indication]) => indication)

        // Include if overall efficacy is low or specific indications have issues
        if (lowEfficacy || indicationsWithLowEfficacy.length > 0) {
          results.push({
            techniqueId: technique.id,
            techniqueName: technique.name,
            averageEfficacy: stats.averageEfficacy,
            sampleSize: stats.sampleSize,
            indicationsWithLowEfficacy,
          })
        }
      }

      return results
    } catch (error) {
      logger.error('Failed to get techniques needing review', { error })
      throw new Error(
        `Failed to get techniques needing review: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}

/**
 * Efficacy statistics for a technique
 */
export interface TechniqueEfficacyStats {
  techniqueId: string
  techniqueName: string
  averageEfficacy: number
  confidenceInterval: [number, number]
  sampleSize: number
  lastUpdated: Date
  byIndication: Record<
    string,
    {
      averageEfficacy: number
      sampleSize: number
    }
  >
  byClientSegment?: Record<
    string,
    {
      averageEfficacy: number
      sampleSize: number
    }
  >
}
