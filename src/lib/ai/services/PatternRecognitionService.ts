import type { EmotionAnalysis, TherapySession } from '../../ai/AIService'
import type { IRedisService } from '../../services/redis/types'
import { getLogger } from '../../logging'
import type { AIRepository } from '../../db/ai/repository'

// Extending the EmotionAnalysis interface to include sessionId
interface ExtendedEmotionAnalysis extends EmotionAnalysis {
  sessionId: string
}

import type {
  TrendPattern,
  CrossSessionPattern,
  RiskCorrelation,
  PatternRecognitionOps,
} from '../../fhe/pattern-recognition'

// Get logger instance
const logger = getLogger({ prefix: 'pattern-recognition-service' })

/**
 * Service for recognizing patterns in client data
 */
export class PatternRecognitionService {
  constructor(
    private readonly fheService: PatternRecognitionOps,
    private readonly config: {
      timeWindow: number
      minDataPoints: number
      confidenceThreshold: number
      riskFactorWeights: Record<string, number>
    },
    private readonly sessionRepository?: AIRepository,
    private readonly analysisRepository?: AIRepository,
    private readonly redisService?: IRedisService,
  ) {}

  /**
   * Analyze long-term trends in client data
   */
  async analyzeLongTermTrends(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendPattern[]> {
    const cacheKey = `trends:${clientId}:${startDate.toISOString()}:${endDate.toISOString()}`

    // Try to get from cache first
    const cached = await this.redisService?.get(cacheKey)
    if (cached) {
      logger.info('Retrieved trends from cache', { clientId })
      return JSON.parse(cached)
    }

    logger.info('Analyzing long-term trends', {
      clientId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })

    try {
      // Retrieve actual data for analysis
      const dataPoints = await this.getClientDataPoints(
        clientId,
        startDate,
        endDate,
      )

      // Process patterns using real data
      const encryptedPatterns = await this.fheService.processPatterns(
        dataPoints,
        {
          windowSize: this.config.timeWindow,
          minPoints: this.config.minDataPoints,
          threshold: this.config.confidenceThreshold,
        },
      )

      // Decrypt and filter results
      const results = await this.fheService.decryptPatterns(encryptedPatterns)

      // Cache the results
      await this.redisService?.set(cacheKey, JSON.stringify(results), 3600)
      logger.info('Cached trend analysis results', {
        clientId,
        patternCount: results.length,
      })

      return results
    } catch (error) {
      logger.error('Error analyzing long-term trends', { clientId, error })
      throw new Error(
        `Failed to analyze trends: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get client data points for analysis
   */
  private async getClientDataPoints(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<unknown[]> {
    try {
      // If we have a session repository, get real session data
      if (this.sessionRepository) {
        const sessions = await this.sessionRepository.getSessions({
          clientId,
          startDate,
          endDate,
        })

        // If we have analysis repository, get emotion analyses
        if (this.analysisRepository && sessions.length > 0) {
          // Get emotion analyses for each session
          const sessionEmotionPromises = sessions.map((session) =>
            this.analysisRepository?.getEmotionsForSession(session.sessionId),
          )

          const sessionEmotions = await Promise.all(sessionEmotionPromises)

          // Combine session data with emotion analyses for richer analysis
          return sessions.map((session, index) => {
            return {
              session,
              analyses: sessionEmotions[index] || [],
              timeframe: {
                start: session.startTime,
                end: session.endTime,
              },
            }
          })
        }

        // If no analysis repository, return session data only
        return sessions.map((session) => ({
          session,
          analyses: [],
          timeframe: {
            start: session.startTime,
            end: session.endTime,
          },
        }))
      }

      // No repositories available - generate sample data for development
      logger.warn('No repositories available, using sample data', { clientId })
      return this.generateSampleDataPoints(startDate, endDate)
    } catch (error) {
      logger.error('Error retrieving client data points', { clientId, error })
      throw new Error(
        `Data retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generate sample data points for development
   */
  private generateSampleDataPoints(startDate: Date, endDate: Date): unknown[] {
    const dataPoints: unknown[] = []
    const daySpan = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 3600 * 1000),
    )

    // Generate sample data for each day in the range
    for (let i = 0; i < daySpan; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 3600 * 1000)

      dataPoints.push({
        date,
        emotionValues: {
          valence: 0.3 + Math.random() * 0.6, // 0.3-0.9
          arousal: 0.2 + Math.random() * 0.7, // 0.2-0.9
          dominance: 0.4 + Math.random() * 0.5, // 0.4-0.9
        },
        keywords: ['anxiety', 'stress', 'work', 'sleep'].filter(
          () => Math.random() > 0.6,
        ),
        intensity: 0.3 + Math.random() * 0.6, // 0.3-0.9
      })
    }

    return dataPoints
  }

  /**
   * Detect patterns across multiple therapy sessions
   */
  async detectCrossSessionPatterns(
    clientId: string,
    sessions: TherapySession[],
  ): Promise<CrossSessionPattern[]> {
    const cacheKey = `patterns:${clientId}:${sessions.map((s) => s.sessionId).join(':')}`

    // Try to get from cache first
    const cached = await this.redisService?.get(cacheKey)
    if (cached) {
      logger.info('Retrieved cross-session patterns from cache', { clientId })
      return JSON.parse(cached)
    }

    logger.info('Detecting cross-session patterns', {
      clientId,
      sessionCount: sessions.length,
    })

    try {
      // Process patterns across sessions
      const encryptedAnalysis = await this.fheService.analyzeCrossSessions(
        sessions,
        this.config.confidenceThreshold,
      )

      // Decrypt the analysis
      const patterns =
        await this.fheService.decryptCrossSessionAnalysis(encryptedAnalysis)

      // Filter results by confidence threshold
      const results = patterns.filter(
        (pattern: CrossSessionPattern) =>
          pattern.confidence >= this.config.confidenceThreshold,
      )

      // Cache the results
      await this.redisService?.set(cacheKey, JSON.stringify(results), 3600)
      logger.info('Cached cross-session pattern results', {
        clientId,
        patternCount: results.length,
      })

      return results
    } catch (error) {
      logger.error('Error detecting cross-session patterns', {
        clientId,
        error,
      })
      throw new Error(
        `Failed to detect patterns: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Analyze risk factor correlations in client data
   */
  async analyzeRiskFactorCorrelations(
    clientId: string,
    analyses: ExtendedEmotionAnalysis[],
  ): Promise<RiskCorrelation[]> {
    const cacheKey = `correlations:${clientId}:${Date.now()}`

    // Try to get from cache first
    const cached = await this.redisService?.get(cacheKey)
    if (cached) {
      logger.info('Retrieved risk correlations from cache', { clientId })
      return JSON.parse(cached)
    }

    logger.info('Analyzing risk factor correlations', {
      clientId,
      analysesCount: analyses.length,
    })

    try {
      // Process risk correlations
      const encryptedCorrelations =
        await this.fheService.processRiskCorrelations(
          analyses,
          this.config.riskFactorWeights,
        )

      // Decrypt the results
      const results = await this.fheService.decryptRiskCorrelations(
        encryptedCorrelations,
      )

      // Cache the results
      await this.redisService?.set(cacheKey, JSON.stringify(results), 3600)
      logger.info('Cached risk correlation results', {
        clientId,
        correlationCount: results.length,
      })

      return results
    } catch (error) {
      logger.error('Error analyzing risk factor correlations', {
        clientId,
        error,
      })
      throw new Error(
        `Failed to analyze correlations: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
