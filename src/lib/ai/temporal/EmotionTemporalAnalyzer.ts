import type { EmotionAnalysis, TherapySession } from '../interfaces/therapy'
import { createLogger } from '../../../utils/logger'
import type { AIRepository } from '../../db/ai/repository'
import { TemporalAnalysisAlgorithm } from './TemporalAnalysisAlgorithm'
import { MultidimensionalEmotionMapper } from '../emotions/MultidimensionalEmotionMapper'
import type { DimensionalEmotionMap } from '../emotions/dimensionalTypes'
import type {
  MultidimensionalPattern,
  EmotionTrend,
  EmotionTransition,
  CriticalPoint,
  DimensionalRelationship,
  ProgressionAnalysis,
} from './types'
import type {
  EmotionAnalysis as TypedEmotionAnalysis,
  EmotionType,
} from '../emotions/types'

const logger = createLogger({ context: 'EmotionTemporalAnalyzer' })

/**
 * Analysis of emotional patterns over time
 */
export interface TemporalEmotionAnalysis {
  // Basic time-series metrics
  trendlines: {
    [emotionType: string]: {
      slope: number
      correlation: number
      significance: number
    }
  }

  // Volatility metrics
  volatility: {
    [emotionType: string]: number
  }

  // Emotional state transitions
  transitions: {
    from: string
    to: string
    frequency: number
    avgDuration: number
  }[]

  // Seasonal/periodic patterns
  patterns: {
    type: 'daily' | 'weekly' | 'session-phase'
    emotion: string
    strength: number
    description: string
  }[]

  // Critical emotion points
  criticalPoints: {
    emotion: string
    timestamp: Date
    intensity: number
    sessionId: string
    trigger?: string
  }[]

  // Overall progression metrics
  progression: {
    overallImprovement: number
    stabilityChange: number
    positiveEmotionChange: number
    negativeEmotionChange: number
  }

  // Multi-dimensional analysis
  dimensionalRelationships: {
    dimensions: string[]
    correlation: number
    description: string
  }[]

  // Multi-dimensional mapping of emotions
  dimensionalMaps?: DimensionalEmotionMap[]

  // Multi-dimensional patterns over time
  multidimensionalPatterns?: MultidimensionalPattern[]
}

/**
 * Options for temporal emotion analysis
 */
export interface TemporalAnalysisOptions {
  // Time range for analysis
  timeRange?: {
    startDate?: Date
    endDate?: Date
  }

  // Filter options
  filter?: {
    sessionTypes?: string[]
    minIntensity?: number
    emotionTypes?: string[]
  }

  // Analysis configuration
  config?: {
    significanceThreshold?: number
    volatilityWindowSize?: number
    includeDimensionalAnalysis?: boolean
    detectPatterns?: boolean
    includeMultidimensionalMapping?: boolean
  }
}

/**
 * Extended emotion analysis type with sessionId for internal use
 * This allows us to track which session each emotion belongs to
 */
interface EmotionAnalysisWithSession extends EmotionAnalysis {
  sessionId: string
}

/**
 * Service for analyzing emotional patterns over time across multiple therapy sessions
 */
export class EmotionTemporalAnalyzer {
  private repository: AIRepository
  private dimensionalMapper: MultidimensionalEmotionMapper

  /**
   * Create a new EmotionTemporalAnalyzer
   *
   * @param repository The repository to use for fetching emotion data
   */
  constructor(repository: AIRepository) {
    this.repository = repository
    this.dimensionalMapper = new MultidimensionalEmotionMapper()
  }

  /**
   * Analyze emotional patterns over time for a specific client
   *
   * @param clientId The client ID to analyze emotions for
   * @param options Options for the analysis
   * @returns Temporal emotion analysis results
   */
  async analyzeClientEmotions(
    clientId: string,
    options?: TemporalAnalysisOptions,
  ): Promise<TemporalEmotionAnalysis> {
    try {
      logger.info('Analyzing temporal emotions for client', { clientId })

      // 1. Retrieve client sessions
      const sessions = await this.getClientSessions(
        clientId,
        options?.timeRange,
      )

      // 2. Retrieve emotion data for each session
      const emotionsBySession = await this.getEmotionsForSessions(sessions)

      // 3. Perform temporal analysis
      return await this.performTemporalAnalysis(emotionsBySession, options)
    } catch (error) {
      logger.error('Error analyzing temporal emotions', { clientId, error })
      throw error
    }
  }

  /**
   * Analyze emotional patterns between specific sessions
   *
   * @param sessionIds Array of session IDs to analyze
   * @param options Options for the analysis
   * @returns Temporal emotion analysis results
   */
  async analyzeSessionEmotions(
    sessionIds: string[],
    options?: TemporalAnalysisOptions,
  ): Promise<TemporalEmotionAnalysis> {
    try {
      logger.info('Analyzing temporal emotions across sessions', { sessionIds })

      // 1. Retrieve sessions
      const sessions = await this.getSessions(sessionIds)

      // 2. Retrieve emotion data for each session
      const emotionsBySession = await this.getEmotionsForSessions(sessions)

      // 3. Perform temporal analysis
      return await this.performTemporalAnalysis(emotionsBySession, options)
    } catch (error) {
      logger.error('Error analyzing temporal emotions', { sessionIds, error })
      throw error
    }
  }

  /**
   * Detect patterns in emotions over time
   *
   * @param clientId The client ID to analyze patterns for
   * @param timeRange Optional time range to limit the analysis to
   * @returns Detected patterns in emotions
   */
  async detectEmotionPatterns(
    clientId: string,
    timeRange?: { startDate?: Date; endDate?: Date },
  ): Promise<TemporalEmotionAnalysis['patterns']> {
    try {
      // 1. Get analysis with pattern detection enabled
      const analysis = await this.analyzeClientEmotions(clientId, {
        timeRange,
        config: {
          detectPatterns: true,
        },
      })

      // 2. Return just the patterns
      return analysis.patterns
    } catch (error) {
      logger.error('Error detecting emotion patterns', { clientId, error })
      throw error
    }
  }

  /**
   * Calculate emotion progression over time
   *
   * @param clientId The client ID to analyze progression for
   * @param startDate Starting date for the progression (defaults to first session)
   * @param endDate Ending date for the progression (defaults to latest session)
   * @returns Progression metrics between the time periods
   */
  async calculateEmotionProgression(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TemporalEmotionAnalysis['progression']> {
    try {
      // Get analysis with focus on progression
      const analysis = await this.analyzeClientEmotions(clientId, {
        timeRange: {
          startDate,
          endDate,
        },
      })

      // Return just the progression
      return analysis.progression
    } catch (error) {
      logger.error('Error calculating emotion progression', { clientId, error })
      throw error
    }
  }

  /**
   * Get critical emotional moments across sessions
   *
   * @param clientId The client ID to find critical moments for
   * @param options Options for filtering critical moments
   * @returns Array of critical emotion points
   */
  async getCriticalEmotionalMoments(
    clientId: string,
    options?: {
      emotionTypes?: string[]
      minIntensity?: number
      maxResults?: number
    },
  ): Promise<TemporalEmotionAnalysis['criticalPoints']> {
    try {
      // Get analysis with focus on critical points
      const analysis = await this.analyzeClientEmotions(clientId, {
        filter: {
          emotionTypes: options?.emotionTypes,
          minIntensity: options?.minIntensity,
        },
      })

      // Return critical points, possibly limited by maxResults
      const { criticalPoints } = analysis
      if (options?.maxResults && options.maxResults > 0) {
        return criticalPoints.slice(0, options.maxResults)
      }

      return criticalPoints
    } catch (error) {
      logger.error('Error getting critical emotion moments', {
        clientId,
        error,
      })
      throw error
    }
  }

  /**
   * Find correlations between different emotion dimensions
   *
   * @param clientId The client ID to analyze
   * @returns Dimensional relationships between emotions
   */
  async findEmotionCorrelations(
    clientId: string,
  ): Promise<TemporalEmotionAnalysis['dimensionalRelationships']> {
    try {
      // Get analysis with dimensional analysis enabled
      const analysis = await this.analyzeClientEmotions(clientId, {
        config: {
          includeDimensionalAnalysis: true,
        },
      })

      // Return just the dimensional relationships
      return analysis.dimensionalRelationships
    } catch (error) {
      logger.error('Error finding emotion correlations', { clientId, error })
      throw error
    }
  }

  /**
   * Analyze multi-dimensional emotion patterns for a client
   *
   * @param clientId The client ID to analyze
   * @returns Multi-dimensional emotion patterns
   */
  async analyzeMultidimensionalPatterns(
    clientId: string,
  ): Promise<MultidimensionalPattern[]> {
    try {
      logger.info('Analyzing multidimensional emotion patterns', { clientId })

      // Get all emotion data for the client
      const emotionData = await this.getAllClientEmotionData(clientId)

      if (emotionData.length < 5) {
        logger.warn('Insufficient data for multidimensional pattern analysis', {
          dataPointCount: emotionData.length,
        })
        return []
      }

      // Map emotions to multi-dimensional space
      const dimensionalMaps = emotionData.map(
        (emotion: EmotionAnalysisWithSession) =>
          this.dimensionalMapper.mapEmotionsToDimensions(
            emotion as unknown as TypedEmotionAnalysis,
          ),
      )

      // Analyze patterns
      return TemporalAnalysisAlgorithm.analyzeMultidimensionalPatterns(
        emotionData as unknown as TypedEmotionAnalysis[],
        dimensionalMaps,
      )
    } catch (error) {
      logger.error('Error analyzing multidimensional patterns', {
        clientId,
        error,
      })
      throw error
    }
  }

  /**
   * Map client emotions to dimensional space
   *
   * @param clientId The client ID to analyze
   * @returns Array of dimensional emotion maps
   */
  async getClientEmotionDimensions(
    clientId: string,
  ): Promise<DimensionalEmotionMap[]> {
    try {
      logger.info('Mapping client emotions to dimensions', { clientId })

      // Get all emotion data for the client
      const emotionData = await this.getAllClientEmotionData(clientId)

      // Map emotions to multi-dimensional space
      return emotionData.map((emotion: EmotionAnalysisWithSession) =>
        this.dimensionalMapper.mapEmotionsToDimensions(
          emotion as unknown as TypedEmotionAnalysis,
        ),
      )
    } catch (error) {
      logger.error('Error mapping client emotions to dimensions', {
        clientId,
        error,
      })
      throw error
    }
  }

  /**
   * Get all emotion data for a client across all sessions
   *
   * @param clientId The client ID to get emotion data for
   * @returns All emotion analysis data for the client
   */
  private async getAllClientEmotionData(
    clientId: string,
  ): Promise<EmotionAnalysisWithSession[]> {
    try {
      logger.info('Getting all emotion data for client', { clientId })

      // 1. Get all sessions for the client
      const sessions = await this.getClientSessions(clientId)

      // 2. Get emotions for each session
      const emotionsBySession = await this.getEmotionsForSessions(sessions)

      // 3. Flatten the emotion data into a single array
      const allEmotions: EmotionAnalysisWithSession[] = []
      for (const [, emotions] of emotionsBySession.entries()) {
        for (const emotion of emotions) {
          // Cast to our internal emotion type with sessionId
          allEmotions.push(emotion as EmotionAnalysisWithSession)
        }
      }

      // 4. Sort by timestamp
      allEmotions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      logger.info('Retrieved all client emotion data', {
        clientId,
        emotionCount: allEmotions.length,
        sessionCount: emotionsBySession.size,
      })

      return allEmotions
    } catch (error) {
      logger.error('Error getting all client emotion data', { clientId, error })
      throw error
    }
  }

  // Private methods

  /**
   * Get therapy sessions for a client
   */
  private async getClientSessions(
    clientId: string,
    timeRange?: { startDate?: Date; endDate?: Date },
  ): Promise<TherapySession[]> {
    try {
      logger.info('Getting sessions for client', { clientId })

      // Build query object for repository
      const query: Record<string, unknown> = { clientId }
      if (timeRange?.startDate) {
        query.startDate = timeRange.startDate
      }
      if (timeRange?.endDate) {
        query.endDate = timeRange.endDate
      }

      // Fetch sessions from repository
      const sessions = await this.repository.getSessions(query)

      // Log result
      logger.info('Retrieved client sessions', {
        clientId,
        count: sessions.length,
        timeRange: timeRange
          ? `${timeRange.startDate} to ${timeRange.endDate}`
          : 'all',
      })

      return sessions
    } catch (error) {
      logger.error('Error getting client sessions', { clientId, error })
      throw error
    }
  }

  /**
   * Get specific therapy sessions by IDs
   */
  private async getSessions(sessionIds: string[]): Promise<TherapySession[]> {
    try {
      logger.info('Getting sessions by IDs', { sessionIds })

      // Fetch sessions by IDs from repository
      const sessions = await this.repository.getSessionsByIds(sessionIds)

      // Log result
      logger.info('Retrieved sessions by IDs', {
        requestedCount: sessionIds.length,
        retrievedCount: sessions.length,
      })

      return sessions
    } catch (error) {
      logger.error('Error getting sessions by IDs', { sessionIds, error })
      throw error
    }
  }

  /**
   * Get emotion data for multiple sessions
   */
  private async getEmotionsForSessions(
    sessions: TherapySession[],
  ): Promise<Map<string, EmotionAnalysisWithSession[]>> {
    try {
      logger.info('Getting emotions for sessions', {
        count: sessions.length,
      })

      const emotionsBySession = new Map<string, EmotionAnalysisWithSession[]>()

      // Fetch emotions for each session from repository
      await Promise.all(
        sessions.map(async (session) => {
          const emotions = await this.repository.getEmotionsForSession(
            session.sessionId,
          )

          // Convert to our internal emotion type with sessionId
          const emotionsWithSession = emotions.map((emotion) => ({
            ...emotion,
            sessionId: session.sessionId,
          })) as EmotionAnalysisWithSession[]

          // Only add sessions with emotion data
          if (emotionsWithSession.length > 0) {
            emotionsBySession.set(session.sessionId, emotionsWithSession)
          }
        }),
      )

      // Log result
      logger.info('Retrieved emotions for sessions', {
        requestedSessionCount: sessions.length,
        sessionsWithEmotions: emotionsBySession.size,
        totalEmotionDataPoints: Array.from(emotionsBySession.values()).reduce(
          (sum, emotions) => sum + emotions.length,
          0,
        ),
      })

      return emotionsBySession
    } catch (error) {
      logger.error('Error getting emotions for sessions', { error })
      throw error
    }
  }

  /**
   * Perform temporal analysis on emotion data
   */
  private async performTemporalAnalysis(
    emotionsBySession: Map<string, EmotionAnalysisWithSession[]>,
    options?: TemporalAnalysisOptions,
  ): Promise<TemporalEmotionAnalysis> {
    try {
      logger.info('Performing temporal analysis', {
        sessionCount: emotionsBySession.size,
        options,
      })

      // Skip analysis if no data
      if (emotionsBySession.size === 0) {
        logger.warn('No emotion data available for analysis')
        return {
          trendlines: {},
          volatility: {},
          transitions: [],
          patterns: [],
          criticalPoints: [],
          progression: {
            overallImprovement: 0,
            stabilityChange: 0,
            positiveEmotionChange: 0,
            negativeEmotionChange: 0,
          },
          dimensionalRelationships: [],
        }
      }

      // Flatten all emotion data and sort by timestamp
      const allEmotions: EmotionAnalysisWithSession[] = []
      const sessionIds: string[] = []

      for (const [sessionId, emotions] of emotionsBySession.entries()) {
        allEmotions.push(...emotions)
        // Add session ID for each emotion data point
        sessionIds.push(...Array(emotions.length).fill(sessionId))
      }

      // Sort emotions by timestamp
      const sortedIndices = allEmotions
        .map((_, index) => index)
        .sort(
          (a, b) =>
            allEmotions[a].timestamp.getTime() -
            allEmotions[b].timestamp.getTime(),
        )

      const sortedEmotions = sortedIndices.map((i) => allEmotions[i])
      const sortedSessionIds = sortedIndices.map((i) => sessionIds[i])

      // Apply filters if provided
      let filteredEmotions = sortedEmotions

      if (options?.filter) {
        if (
          options.filter.emotionTypes &&
          options.filter.emotionTypes.length > 0
        ) {
          // Filter to include only specified emotion types
          filteredEmotions = filteredEmotions.map((data) => ({
            ...data,
            emotions: data.emotions.filter((e) =>
              options.filter?.emotionTypes?.includes(e.type),
            ),
          }))
        }

        if (options.filter.minIntensity) {
          // Filter to include only emotions above intensity threshold
          filteredEmotions = filteredEmotions.map((data) => ({
            ...data,
            emotions: data.emotions.filter(
              (e) => e.intensity >= (options.filter?.minIntensity || 0),
            ),
          }))
        }
      }

      // Divide data into start and end periods for progression analysis
      const midPoint = Math.floor(filteredEmotions.length / 2)
      const startData = filteredEmotions.slice(0, midPoint)
      const endData = filteredEmotions.slice(midPoint)

      // Cast the emotion data to the expected type for TemporalAnalysisAlgorithm methods
      const typedEmotions =
        filteredEmotions as unknown as TypedEmotionAnalysis[]
      const typedStartData = startData as unknown as TypedEmotionAnalysis[]
      const typedEndData = endData as unknown as TypedEmotionAnalysis[]

      // Get the results from TemporalAnalysisAlgorithm
      const trendlinesResult: Record<EmotionType, EmotionTrend> =
        TemporalAnalysisAlgorithm.calculateTrendlines(typedEmotions)

      const volatilityResult: Record<EmotionType, number> =
        TemporalAnalysisAlgorithm.calculateVolatility(
          typedEmotions,
          options?.config?.volatilityWindowSize || 5,
        )

      const transitionsResult: EmotionTransition[] =
        TemporalAnalysisAlgorithm.detectTransitions(typedEmotions)

      const criticalPointsResult: CriticalPoint[] =
        TemporalAnalysisAlgorithm.findCriticalPoints(
          typedEmotions,
          sortedSessionIds,
          90, // Default to 90th percentile for critical points
        )

      const progressionResult: ProgressionAnalysis =
        TemporalAnalysisAlgorithm.calculateProgression(
          typedStartData,
          typedEndData,
        )

      // Transform the results to match the TemporalEmotionAnalysis interface
      const analysis: TemporalEmotionAnalysis = {
        // Add significance to each trendline
        trendlines: Object.entries(trendlinesResult).reduce(
          (acc, [key, value]) => {
            acc[key] = {
              slope: value.slope,
              correlation: value.correlation,
              significance:
                Math.abs(value.correlation) * 0.8 + Math.abs(value.slope) * 0.2,
            }
            return acc
          },
          {} as {
            [emotionType: string]: {
              slope: number
              correlation: number
              significance: number
            }
          },
        ),

        // Volatility needs no transformation
        volatility: volatilityResult,

        // Transform transitions to match expected format
        transitions: transitionsResult.map((t) => ({
          from: t.emotionType,
          to: t.emotionType,
          frequency: 1,
          avgDuration: (t.endTime.getTime() - t.startTime.getTime()) / 1000,
        })),

        // Transform critical points to match expected format
        criticalPoints: criticalPointsResult.map((cp) => ({
          emotion: cp.emotionType,
          timestamp: cp.timestamp,
          intensity: cp.intensity,
          sessionId: cp.sessionId,
        })),

        // Progression needs no transformation
        progression: progressionResult,

        // Initialize patterns (will be filled if requested)
        patterns: [],

        // Initialize dimensional relationships (will be filled if requested)
        dimensionalRelationships: [],
      }

      // Optionally detect patterns
      if (options?.config?.detectPatterns) {
        // Pattern detection would be implemented here
        // This is a placeholder that would integrate with a more sophisticated
        // pattern detection algorithm than we currently have in TemporalAnalysisAlgorithm
        analysis.patterns = []
      }

      // Optionally calculate dimensional relationships
      if (options?.config?.includeDimensionalAnalysis) {
        // Transform dimensional relationships to match expected format
        const dimensionalRelationshipsResult: DimensionalRelationship[] =
          TemporalAnalysisAlgorithm.analyzeDimensionalRelationships(
            typedEmotions,
          )

        analysis.dimensionalRelationships = dimensionalRelationshipsResult.map(
          (dr) => ({
            dimensions: [dr.emotion1, dr.emotion2],
            correlation: dr.correlationStrength,
            description: dr.description,
          }),
        )
      }

      // Optionally generate multi-dimensional emotion maps
      if (options?.config?.includeMultidimensionalMapping) {
        // Map each emotion to multi-dimensional space
        analysis.dimensionalMaps = filteredEmotions.map(
          (emotion: EmotionAnalysisWithSession) =>
            this.dimensionalMapper.mapEmotionsToDimensions(
              emotion as unknown as TypedEmotionAnalysis,
            ),
        )

        // If we have dimensional maps, analyze multi-dimensional patterns
        if (analysis.dimensionalMaps.length > 0) {
          analysis.multidimensionalPatterns =
            TemporalAnalysisAlgorithm.analyzeMultidimensionalPatterns(
              typedEmotions,
              analysis.dimensionalMaps,
            )
        }
      }

      return analysis
    } catch (error) {
      logger.error('Error performing temporal analysis', { error })
      throw error
    }
  }
}
