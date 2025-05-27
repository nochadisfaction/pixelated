import type { Session } from '../types/Session'
import type { InterventionContext } from '../types/Intervention'
import { createHash } from 'crypto'
import { getLogger } from '../../utils/logger'

const logger = getLogger('session-history')

/**
 * Configuration options for session history management
 */
export interface SessionHistoryConfig {
  /**
   * Maximum number of sessions to include in history
   */
  maxSessions?: number

  /**
   * Privacy level for session data
   * - high: Anonymize all identifiable information
   * - medium: Retain session structure but anonymize sensitive content
   * - standard: Apply basic anonymization to identifiers only
   */
  privacyLevel?: 'high' | 'medium' | 'standard'

  /**
   * Whether to include session metadata
   */
  includeMetadata?: boolean

  /**
   * Whether to include emotional analysis
   */
  includeEmotionalAnalysis?: boolean

  /**
   * Whether to include intervention history
   */
  includeInterventions?: boolean

  /**
   * Whether to include progress metrics
   */
  includeProgressMetrics?: boolean
}

/**
 * Default configuration for session history
 */
const DEFAULT_CONFIG: SessionHistoryConfig = {
  maxSessions: 5,
  privacyLevel: 'standard',
  includeMetadata: true,
  includeEmotionalAnalysis: true,
  includeInterventions: true,
  includeProgressMetrics: true,
}

/**
 * Manages session history for AI context building
 */
export class SessionHistoryManager {
  private config: SessionHistoryConfig = DEFAULT_CONFIG
  private sessionCache: Map<string, Session[]> = new Map()

  /**
   * Creates a new SessionHistoryManager
   * @param config Configuration options
   */
  constructor(config: Partial<SessionHistoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Set up cache cleanup interval
    setInterval(() => this.cleanupCache(), 3600000) // Clean every hour
  }

  /**
   * Retrieves session history for a client
   * @param clientId Client identifier
   * @param currentSessionId Current session ID to exclude from history
   * @returns Context object with session history
   */
  public async getSessionHistory(
    clientId: string,
    currentSessionId?: string,
  ): Promise<InterventionContext> {
    try {
      // Check cache first
      const cachedSessions = this.sessionCache.get(this.anonymizeId(clientId))

      // If not in cache, fetch from database
      let sessions: Session[] = cachedSessions || []

      // Filter out current session if provided
      if (currentSessionId) {
        sessions = sessions.filter((session) => session.id !== currentSessionId)
      }

      // Apply privacy controls based on configuration
      const processedSessions = this.applyPrivacyControls(sessions)

      // Sort by date descending (newest first)
      processedSessions.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )

      // Limit to max sessions
      const limitedSessions = processedSessions.slice(
        0,
        this.config.maxSessions,
      )

      // Build context object
      const context: InterventionContext = {
        sessionHistory: limitedSessions,
        patterns: this.extractPatterns(limitedSessions),
      }

      // Add optional context elements based on configuration
      if (this.config.includeProgressMetrics) {
        context.progressMetrics = this.calculateProgressMetrics(limitedSessions)
      }

      if (this.config.includeEmotionalAnalysis) {
        context.emotionalTrend = this.calculateEmotionalTrend(limitedSessions)
      }

      return context
    } catch (error) {
      logger.error('Error retrieving session history:', error)
      // Return minimal context to avoid breaking the application
      return { sessionHistory: [], patterns: [] }
    }
  }

  /**
   * Applies privacy controls to session data based on configuration
   * @param sessions Sessions to process
   * @returns Privacy-controlled sessions
   */
  private applyPrivacyControls(sessions: Session[]): Session[] {
    if (!sessions || sessions.length === 0) {
      return []
    }

    return sessions.map((session) => {
      // Create a copy to avoid modifying the original
      const processedSession = { ...session }

      switch (this.config.privacyLevel) {
        case 'high':
          // Anonymize all identifiable information
          processedSession.id = this.anonymizeId(session.id)
          processedSession.clientId = this.anonymizeId(session.clientId)
          processedSession.therapistId = this.anonymizeId(session.therapistId)

          // Redact specific content but preserve structure
          if (processedSession.transcript) {
            processedSession.transcript = processedSession.transcript.map(
              (entry) => ({
                ...entry,
                content: this.redactSensitiveContent(entry.content),
              }),
            )
          }
          break

        case 'medium':
          // Anonymize identifiers
          processedSession.id = this.anonymizeId(session.id)
          processedSession.clientId = this.anonymizeId(session.clientId)
          processedSession.therapistId = this.anonymizeId(session.therapistId)

          // Keep content but remove names and specific identifiers
          if (processedSession.transcript) {
            processedSession.transcript = processedSession.transcript.map(
              (entry) => ({
                ...entry,
                content: this.removeNames(entry.content),
              }),
            )
          }
          break

        case 'standard':
        default:
          // Just anonymize IDs
          processedSession.id = this.anonymizeId(session.id)
          processedSession.clientId = this.anonymizeId(session.clientId)
          processedSession.therapistId = this.anonymizeId(session.therapistId)
          break
      }

      return processedSession
    })
  }

  /**
   * Redacts sensitive content while preserving structure
   * @param content Content to redact
   * @returns Redacted content
   */
  private redactSensitiveContent(content: string): string {
    // Replace specific details with placeholders
    return content
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]') // Names
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]') // Phone numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]') // Emails
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // IP addresses
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]') // IP addresses alternative format
      .replace(/\b\d{5}(?:[-\s]\d{4})?\b/g, '[ZIP]') // ZIP codes
  }

  /**
   * Removes names from content
   * @param content Content to process
   * @returns Content with names removed
   */
  private removeNames(content: string): string {
    // Replace likely names with generic placeholders
    return content.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
  }

  /**
   * Anonymizes an ID for privacy purposes
   * @param id The ID to anonymize
   * @returns Anonymized ID
   */
  private anonymizeId(id: string): string {
    return createHash('sha256').update(id).digest('hex').substring(0, 10)
  }

  /**
   * Extracts patterns from session history
   * @param sessions Sessions to analyze
   * @returns Array of identified patterns
   */
  private extractPatterns(sessions: Session[]): string[] {
    if (sessions.length < 2) {
      return []
    }

    const patterns: string[] = []

    // Check for emotional patterns
    const emotionalPattern = this.identifyEmotionalPatterns(sessions)
    if (emotionalPattern) {
      patterns.push(emotionalPattern)
    }

    // Check for topic repetition
    const topicPattern = this.identifyRepeatedTopics(sessions)
    if (topicPattern) {
      patterns.push(topicPattern)
    }

    // Check for intervention response patterns
    const interventionPattern = this.identifyInterventionPatterns(sessions)
    if (interventionPattern) {
      patterns.push(interventionPattern)
    }

    return patterns
  }

  /**
   * Identifies emotional patterns across sessions
   * @param sessions Sessions to analyze
   * @returns Pattern description or null if none found
   */
  private identifyEmotionalPatterns(sessions: Session[]): string | null {
    // Extract emotional data from sessions
    const emotionalData = sessions
      .filter((session) => session.emotionalState?.dominantEmotion)
      .map((session) => ({
        emotion: session.emotionalState?.dominantEmotion || '',
        intensity: session.emotionalState?.intensity || 0,
        timestamp: new Date(session.timestamp).getTime(),
      }))

    if (emotionalData.length < 2) {
      return null
    }

    // Check for consistent emotions
    const emotions = emotionalData.map((data) => data.emotion)
    const dominantEmotion = this.findMostFrequent(emotions)
    const emotionCount = emotions.filter((e) => e === dominantEmotion).length

    if (emotionCount >= Math.ceil(emotions.length * 0.6)) {
      return `Consistent ${dominantEmotion} across ${emotionCount} of ${emotions.length} sessions`
    }

    // Check for emotional progression
    const sortedByTime = [...emotionalData].sort(
      (a, b) => a.timestamp - b.timestamp,
    )
    const firstIntensity = sortedByTime[0].intensity
    const lastIntensity = sortedByTime[sortedByTime.length - 1].intensity
    const intensityDiff = lastIntensity - firstIntensity

    if (Math.abs(intensityDiff) >= 2) {
      const direction = intensityDiff > 0 ? 'increasing' : 'decreasing'
      return `Emotional intensity ${direction} over time (${Math.abs(intensityDiff)} points)`
    }

    return null
  }

  /**
   * Identifies repeated topics across sessions
   * @param sessions Sessions to analyze
   * @returns Pattern description or null if none found
   */
  private identifyRepeatedTopics(sessions: Session[]): string | null {
    // Extract topics from session summaries
    const allTopics: string[] = []

    sessions.forEach((session) => {
      if (session.summary) {
        // Extract key topics using simple keyword extraction
        const keywords = this.extractKeywords(session.summary)
        allTopics.push(...keywords)
      }
    })

    if (allTopics.length === 0) {
      return null
    }

    // Find repeated topics
    const topicCounts = allTopics.reduce(
      (counts, topic) => {
        counts[topic] = (counts[topic] || 0) + 1
        return counts
      },
      {} as Record<string, number>,
    )

    // Identify topics that appear in more than one session
    const repeatedTopics = Object.entries(topicCounts)
      .filter(([_, count]) => count > 1)
      .map(([topic]) => topic)

    if (repeatedTopics.length > 0) {
      return `Repeated topics: ${repeatedTopics.join(', ')}`
    }

    return null
  }

  /**
   * Extracts keywords from a given text
   * @param text Text to extract keywords from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction logic (can be improved with NLP techniques)
    const words = text.split(/\W+/).filter((word) => word.length > 3)
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'if',
      'then',
      'else',
      'when',
      'at',
      'by',
      'for',
      'with',
      'about',
      'against',
      'between',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'to',
      'from',
      'up',
      'down',
      'in',
      'out',
      'on',
      'off',
      'over',
      'under',
      'again',
      'further',
      'then',
      'once',
      'here',
      'there',
      'where',
      'why',
      'how',
      'all',
      'any',
      'both',
      'each',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      's',
      't',
      'can',
      'will',
      'just',
      'don',
      'should',
      'now',
    ])
    return words.filter((word) => !stopWords.has(word.toLowerCase()))
  }

  /**
   * Identifies intervention response patterns across sessions
   * @param sessions Sessions to analyze
   * @returns Pattern description or null if none found
   */
  private identifyInterventionPatterns(sessions: Session[]): string | null {
    if (sessions.length < 2) {
      return null
    }

    // Extract intervention data from session transcripts and metadata
    const interventionData = this.extractInterventionData(sessions)

    if (interventionData.length < 2) {
      return null
    }

    // Analyze effectiveness patterns
    const effectivenessPattern =
      this.analyzeInterventionEffectiveness(interventionData)
    if (effectivenessPattern) {
      return effectivenessPattern
    }

    // Analyze technique response patterns
    const techniquePattern =
      this.analyzeInterventionTechniqueResponses(interventionData)
    if (techniquePattern) {
      return techniquePattern
    }

    // Analyze consistency patterns
    const consistencyPattern =
      this.analyzeInterventionConsistency(interventionData)
    if (consistencyPattern) {
      return consistencyPattern
    }

    return null
  }

  /**
   * Extracts intervention data from sessions
   * @param sessions Sessions to analyze
   * @returns Array of intervention data objects
   */
  private extractInterventionData(sessions: Session[]): Array<{
    sessionId: string
    timestamp: Date
    interventionType?: string
    effectiveness?: number
    engagement?: number
    clientResponse?: string
  }> {
    const interventionData: Array<{
      sessionId: string
      timestamp: Date
      interventionType?: string
      effectiveness?: number
      engagement?: number
      clientResponse?: string
    }> = []

    // Extract intervention data from each session
    sessions.forEach((session) => {
      // Session must have transcript and outcomes to extract meaningful intervention data
      if (!session.transcript || !session.outcomes) {
        return
      }

      // Basic intervention data
      const data = {
        sessionId: session.id,
        timestamp: new Date(session.timestamp),
        effectiveness: session.outcomes.improvement,
        engagement: session.outcomes.engagement,
      }

      // Try to identify intervention types from transcript
      if (session.transcript && session.transcript.length > 0) {
        // Look for therapist messages that contain intervention techniques
        const therapistMessages = session.transcript.filter(
          (entry) =>
            entry.role === 'therapist' ||
            entry.role === 'assistant' ||
            entry.speaker === 'therapist',
        )

        // Get client responses that follow therapist interventions
        const clientResponses = session.transcript.filter(
          (entry) =>
            entry.role === 'client' ||
            entry.role === 'user' ||
            entry.speaker === 'client',
        )

        if (therapistMessages.length > 0) {
          // Simple heuristic to detect intervention types from content
          const interventionTypes =
            this.detectInterventionTypes(therapistMessages)
          if (interventionTypes.length > 0) {
            // Add each detected intervention as a separate data point
            interventionTypes.forEach((type) => {
              interventionData.push({
                ...data,
                interventionType: type,
                clientResponse:
                  clientResponses.length > 0
                    ? clientResponses[0].content
                    : undefined,
              })
            })
          } else {
            // If no specific type detected, add generic entry
            interventionData.push(data)
          }
        }
      } else {
        // Add session without transcript data
        interventionData.push(data)
      }
    })

    return interventionData
  }

  /**
   * Detect intervention types from therapist messages
   * @param messages Array of therapist message objects
   * @returns Array of detected intervention types
   */
  private detectInterventionTypes(
    messages: Array<{ content: string; [key: string]: unknown }>,
  ): string[] {
    const interventionKeywords: Record<string, string[]> = {
      'cognitive-restructuring': [
        'cognitive distortion',
        'negative thought',
        'thought record',
        'evidence for',
        'evidence against',
        'alternative perspective',
        'reframe',
        'balance thought',
      ],
      'validation': [
        'understand',
        'valid',
        'makes sense',
        'I hear you',
        'that sounds',
        'difficult',
        'challenging',
      ],
      'mindfulness': [
        'present moment',
        'awareness',
        'attention',
        'mindful',
        'observe',
        'notice',
        'breath',
        'meditation',
      ],
      'behavioral-activation': [
        'activity',
        'engage',
        'schedule',
        'plan',
        'behavior',
        'action',
        'step',
        'task',
        'homework',
      ],
      'emotion-regulation': [
        'emotion',
        'regulate',
        'cope',
        'skill',
        'strategy',
        'manage feeling',
        'intensity',
        'response',
      ],
      'socratic-questioning': [
        'what do you think',
        'how would you',
        'what might happen',
        "what's the evidence",
        'alternative view',
        'what if',
      ],
      'motivational-interviewing': [
        'motivation',
        'value',
        'goal',
        'change',
        'ambivalence',
        'commitment',
        'confidence',
        'importance',
      ],
    }

    const detectedTypes = new Set<string>()

    messages.forEach((message) => {
      const content = message.content.toLowerCase()

      Object.entries(interventionKeywords).forEach(([type, keywords]) => {
        for (const keyword of keywords) {
          if (content.includes(keyword.toLowerCase())) {
            detectedTypes.add(type)
            break
          }
        }
      })
    })

    return Array.from(detectedTypes)
  }

  /**
   * Analyzes intervention effectiveness patterns
   * @param interventionData Array of intervention data objects
   * @returns Pattern description or null if none found
   */
  private analyzeInterventionEffectiveness(
    interventionData: Array<{
      sessionId: string
      timestamp: Date
      interventionType?: string
      effectiveness?: number
      engagement?: number
      clientResponse?: string
    }>,
  ): string | null {
    // Group by intervention type
    const typeEffectiveness: Record<string, number[]> = {}

    interventionData.forEach((data) => {
      if (data.interventionType && data.effectiveness !== undefined) {
        if (!typeEffectiveness[data.interventionType]) {
          typeEffectiveness[data.interventionType] = []
        }
        typeEffectiveness[data.interventionType].push(data.effectiveness)
      }
    })

    // Calculate average effectiveness per type
    const typeAverages: Record<string, number> = {}
    Object.entries(typeEffectiveness).forEach(([type, scores]) => {
      if (scores.length > 0) {
        const sum = scores.reduce((acc, val) => acc + val, 0)
        typeAverages[type] = sum / scores.length
      }
    })

    // Find most and least effective interventions
    let mostEffectiveType: string | null = null
    let highestEffectiveness = 0
    let leastEffectiveType: string | null = null
    let lowestEffectiveness = Number.MAX_VALUE

    Object.entries(typeAverages).forEach(([type, avg]) => {
      if (avg > highestEffectiveness) {
        mostEffectiveType = type
        highestEffectiveness = avg
      }
      if (avg < lowestEffectiveness) {
        leastEffectiveType = type
        lowestEffectiveness = avg
      }
    })

    // Generate pattern description
    if (mostEffectiveType && Object.keys(typeAverages).length > 1) {
      if (highestEffectiveness >= 7) {
        // Assuming 1-10 scale
        return `Strong positive response to ${this.formatInterventionType(mostEffectiveType)} interventions (effectiveness: ${highestEffectiveness.toFixed(1)}/10)`
      } else if (highestEffectiveness >= 5) {
        return `Moderate positive response to ${this.formatInterventionType(mostEffectiveType)} interventions`
      }
    }

    if (leastEffectiveType && lowestEffectiveness < 4) {
      return `Limited response to ${this.formatInterventionType(leastEffectiveType)} interventions`
    }

    return null
  }

  /**
   * Analyzes intervention technique response patterns
   * @param interventionData Array of intervention data objects
   * @returns Pattern description or null if none found
   */
  private analyzeInterventionTechniqueResponses(
    interventionData: Array<{
      sessionId: string
      timestamp: Date
      interventionType?: string
      effectiveness?: number
      engagement?: number
      clientResponse?: string
    }>,
  ): string | null {
    // Look for patterns in client responses to specific techniques
    const responsePatterns: Record<
      string,
      {
        positive: number
        negative: number
        neutral: number
        total: number
      }
    > = {}

    // Initialize counters for each intervention type
    interventionData.forEach((data) => {
      if (data.interventionType && !responsePatterns[data.interventionType]) {
        responsePatterns[data.interventionType] = {
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
        }
      }
    })

    // Analyze client responses
    interventionData.forEach((data) => {
      if (!data.interventionType || !data.clientResponse) {
        return
      }

      responsePatterns[data.interventionType].total++

      // Simple sentiment analysis using keywords
      const response = data.clientResponse.toLowerCase()

      // Positive indicators
      const positiveKeywords = [
        'yes',
        'agree',
        'helpful',
        'better',
        'good',
        'thank',
        'appreciate',
        'useful',
        'makes sense',
        'understand',
        'like',
      ]

      // Negative indicators
      const negativeKeywords = [
        'no',
        'disagree',
        'not helpful',
        'worse',
        'bad',
        'difficult',
        "don't understand",
        'confused',
        "doesn't work",
        'not sure',
      ]

      let positiveMatches = 0
      let negativeMatches = 0

      positiveKeywords.forEach((keyword) => {
        if (response.includes(keyword)) {
          positiveMatches++
        }
      })

      negativeKeywords.forEach((keyword) => {
        if (response.includes(keyword)) {
          negativeMatches++
        }
      })

      if (positiveMatches > negativeMatches) {
        responsePatterns[data.interventionType].positive++
      } else if (negativeMatches > positiveMatches) {
        responsePatterns[data.interventionType].negative++
      } else {
        responsePatterns[data.interventionType].neutral++
      }
    })

    // Look for significant patterns
    for (const [type, pattern] of Object.entries(responsePatterns)) {
      if (pattern.total < 2) {
        continue // Need at least 2 instances for a pattern
      }

      const positiveRatio = pattern.positive / pattern.total
      const negativeRatio = pattern.negative / pattern.total

      // Strong positive pattern
      if (positiveRatio >= 0.7) {
        return `Consistently positive responses to ${this.formatInterventionType(type)} (${Math.round(positiveRatio * 100)}% positive)`
      }

      // Strong negative pattern
      if (negativeRatio >= 0.7) {
        return `Consistently negative responses to ${this.formatInterventionType(type)} (${Math.round(negativeRatio * 100)}% negative)`
      }
    }

    return null
  }

  /**
   * Analyzes intervention consistency patterns
   * @param interventionData Array of intervention data objects
   * @returns Pattern description or null if none found
   */
  private analyzeInterventionConsistency(
    interventionData: Array<{
      sessionId: string
      timestamp: Date
      interventionType?: string
      effectiveness?: number
      engagement?: number
    }>,
  ): string | null {
    // Sort data by timestamp
    const sortedData = [...interventionData].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    )

    // Track intervention types across sessions
    const sessionInterventions: Record<string, Set<string>> = {}

    // Group interventions by session
    sortedData.forEach((data) => {
      if (!data.interventionType) {
        return
      }

      if (!sessionInterventions[data.sessionId]) {
        sessionInterventions[data.sessionId] = new Set()
      }

      sessionInterventions[data.sessionId].add(data.interventionType)
    })

    // Count intervention type frequency across sessions
    const interventionFrequency: Record<string, number> = {}

    Object.values(sessionInterventions).forEach((interventions) => {
      interventions.forEach((type) => {
        interventionFrequency[type] = (interventionFrequency[type] || 0) + 1
      })
    })

    const sessionCount = Object.keys(sessionInterventions).length

    // Identify consistent interventions (used in majority of sessions)
    const consistentInterventions = Object.entries(interventionFrequency)
      .filter(([_, count]) => count >= Math.ceil(sessionCount * 0.6))
      .map(([type, _]) => type)

    if (consistentInterventions.length > 0) {
      const formattedTypes = consistentInterventions
        .map((type) => this.formatInterventionType(type))
        .join(' and ')

      return `Consistent use of ${formattedTypes} techniques across sessions`
    }

    // Check for intervention diversity
    const uniqueInterventionCount = Object.keys(interventionFrequency).length
    const averageInterventionsPerSession = sortedData.length / sessionCount

    if (uniqueInterventionCount >= 4 && averageInterventionsPerSession >= 2) {
      return 'Diverse intervention approaches used across sessions'
    }

    return null
  }

  /**
   * Formats intervention type for display
   * @param type Raw intervention type string
   * @returns Formatted intervention type
   */
  private formatInterventionType(type: string): string {
    // Convert kebab-case to readable format
    return type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Finds the most frequent item in an array
   * @param items Array of items
   * @returns Most frequent item
   */
  private findMostFrequent(items: string[]): string {
    const frequencyMap: Record<string, number> = {}
    items.forEach((item) => {
      frequencyMap[item] = (frequencyMap[item] || 0) + 1
    })
    return Object.keys(frequencyMap).reduce((a, b) =>
      frequencyMap[a] > frequencyMap[b] ? a : b,
    )
  }

  /**
   * Cleans up the session cache
   */
  private cleanupCache(): void {
    // Implement cache cleanup logic here
    // For example, remove sessions older than a certain threshold
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // Remove sessions older than 30 days

    this.sessionCache.forEach((sessions, clientId) => {
      const filteredSessions = sessions.filter(
        (session) => new Date(session.timestamp) > cutoffDate,
      )
      if (filteredSessions.length === 0) {
        this.sessionCache.delete(clientId)
      } else {
        this.sessionCache.set(clientId, filteredSessions)
      }
    })

    logger.info('Session cache cleaned up')
  }

  /**
   * Calculates emotional trend across sessions
   * @param sessions Sessions to analyze
   * @returns Emotional trend description
   */
  private calculateEmotionalTrend(sessions: Session[]): string | null {
    // Extract emotional states from each session
    const emotionalStates = sessions
      .filter(
        (session) =>
          session.outcomes?.emotionalState !== undefined &&
          session.outcomes.emotionalState !== null,
      )
      .map((session) => session.outcomes?.emotionalState as number)

    if (emotionalStates.length < 2) {
      return null
    }

    // Calculate average emotional state
    const totalEmotion = emotionalStates.reduce(
      (sum, emotion) => sum + emotion,
      0,
    )
    const averageEmotion = totalEmotion / emotionalStates.length

    // Determine trend direction
    const firstEmotion = emotionalStates[0]
    const lastEmotion = emotionalStates[emotionalStates.length - 1]

    if (lastEmotion > firstEmotion) {
      return `Emotional trend: Improving (from ${firstEmotion.toFixed(2)} to ${lastEmotion.toFixed(2)})`
    } else if (lastEmotion < firstEmotion) {
      return `Emotional trend: Declining (from ${firstEmotion.toFixed(2)} to ${lastEmotion.toFixed(2)})`
    } else {
      return `Emotional trend: Stable (at ${averageEmotion.toFixed(2)})`
    }
  }

  /**
   * Calculates progress metrics from historical sessions
   * @param sessions Array of sessions to analyze
   * @returns Progress metrics
   */
  private calculateProgressMetrics(sessions: Session[]): {
    improvement: number
    consistency: number
    engagement: number
  } {
    if (sessions.length < 2) {
      return { improvement: 0, consistency: 0, engagement: 0 }
    }

    let totalImprovement = 0
    let totalConsistency = 0
    let totalEngagement = 0

    sessions.forEach((session) => {
      if (session.outcomes?.improvement) {
        totalImprovement += session.outcomes.improvement
      }
      if (session.outcomes?.consistency) {
        totalConsistency += session.outcomes.consistency
      }
      if (session.outcomes?.engagement) {
        totalEngagement += session.outcomes.engagement
      }
    })

    const improvement = totalImprovement / sessions.length
    const consistency = totalConsistency / sessions.length
    const engagement = totalEngagement / sessions.length

    return { improvement, consistency, engagement }
  }
} // End of SessionHistoryManager class
