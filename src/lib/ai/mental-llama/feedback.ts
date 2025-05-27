/**
 * User Feedback System for MentalLLaMA
 *
 * This module provides functionality for collecting, storing, and analyzing
 * user feedback on mental health explanations and analyses.
 */

import { logger } from '../../logging'
import { MentalHealthCategory } from './prompts'

/**
 * Types of feedback that can be collected
 */
export enum FeedbackType {
  ACCURACY = 'accuracy',
  HELPFULNESS = 'helpfulness',
  CLARITY = 'clarity',
  EMPATHY = 'empathy',
  SAFETY = 'safety',
  OVERALL = 'overall',
}

/**
 * User roles for feedback
 */
export enum UserRole {
  CLIENT = 'client',
  CLINICIAN = 'clinician',
  RESEARCHER = 'researcher',
  GENERAL = 'general',
}

/**
 * User feedback data structure
 */
export interface UserFeedback {
  id: string
  timestamp: number
  sessionId?: string
  userId?: string
  userRole: UserRole

  // The analyzed text (anonymized if needed)
  analyzedText?: string

  // The category detected by the system
  detectedCategory: MentalHealthCategory

  // The explanation provided by the system
  explanation: string

  // Rating scores (1-5 scale)
  scores: {
    [key in FeedbackType]?: number
  }

  // Free-text comments
  comments?: string

  // Suggested corrections or improvements
  corrections?: string

  // User's expected or preferred category (if different from detected)
  expectedCategory?: MentalHealthCategory

  // Technical metadata
  metadata?: {
    modelVersion?: string
    promptVersion?: string
    analysisLatencyMs?: number
    device?: string
    browser?: string
  }
}

/**
 * Feedback submission options
 */
export interface FeedbackSubmissionOptions {
  // Whether to anonymize the analyzed text
  anonymizeText?: boolean

  // Whether to store user identifiers
  includeUserInfo?: boolean

  // Whether to include technical metadata
  includeMetadata?: boolean
}

/**
 * Feedback query parameters for retrieving stored feedback
 */
export interface FeedbackQueryParams {
  // Filter by feedback ID
  id?: string

  // Filter by session ID
  sessionId?: string

  // Filter by user ID
  userId?: string

  // Filter by user role
  userRole?: UserRole

  // Filter by detected category
  category?: MentalHealthCategory

  // Filter by date range
  startDate?: number
  endDate?: number

  // Filter by minimum overall score
  minOverallScore?: number

  // Filter by maximum overall score
  maxOverallScore?: number

  // Result limit
  limit?: number

  // Result offset for pagination
  offset?: number

  // Sorting field
  sortBy?: 'timestamp' | 'overallScore'

  // Sorting direction
  sortDirection?: 'asc' | 'desc'
}

/**
 * Feedback summary statistics
 */
export interface FeedbackSummary {
  // Total feedback count
  totalCount: number

  // Average scores by feedback type
  averageScores: {
    [key in FeedbackType]?: number
  }

  // Score distribution
  scoreDistribution: {
    [key in FeedbackType]?: {
      1: number
      2: number
      3: number
      4: number
      5: number
    }
  }

  // Category distribution
  categoryDistribution: {
    [key in MentalHealthCategory]?: number
  }

  // User role distribution
  userRoleDistribution: {
    [key in UserRole]?: number
  }

  // Time-based trends (average scores by day)
  trends?: {
    [date: string]: {
      [key in FeedbackType]?: number
    }
  }

  // Common feedback themes from comments
  commonThemes?: Array<{
    theme: string
    count: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
}

/**
 * Feedback storage interface
 */
export interface FeedbackStore {
  // Store new feedback
  storeFeedback(feedback: UserFeedback): Promise<string>

  // Retrieve feedback by ID
  getFeedback(id: string): Promise<UserFeedback | null>

  // Query feedback
  queryFeedback(params: FeedbackQueryParams): Promise<UserFeedback[]>

  // Get summary statistics
  getSummary(params?: FeedbackQueryParams): Promise<FeedbackSummary>

  // Update existing feedback
  updateFeedback(id: string, updates: Partial<UserFeedback>): Promise<boolean>

  // Delete feedback
  deleteFeedback(id: string): Promise<boolean>
}

/**
 * In-memory implementation of feedback storage
 */
export class InMemoryFeedbackStore implements FeedbackStore {
  private feedbackItems: Map<string, UserFeedback> = new Map()

  async storeFeedback(feedback: UserFeedback): Promise<string> {
    // Generate ID if not provided
    if (!feedback.id) {
      feedback.id = `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }

    // Set timestamp if not provided
    if (!feedback.timestamp) {
      feedback.timestamp = Date.now()
    }

    this.feedbackItems.set(feedback.id, feedback)
    logger?.info(`Stored feedback with ID: ${feedback.id}`)

    return feedback.id
  }

  async getFeedback(id: string): Promise<UserFeedback | null> {
    const feedback = this.feedbackItems.get(id)
    return feedback || null
  }

  async queryFeedback(params: FeedbackQueryParams): Promise<UserFeedback[]> {
    let results = Array.from(this.feedbackItems.values())

    // Apply filters
    if (params.id) {
      results = results.filter((item) => item.id === params.id)
    }

    if (params.sessionId) {
      results = results.filter((item) => item.sessionId === params.sessionId)
    }

    if (params.userId) {
      results = results.filter((item) => item.userId === params.userId)
    }

    if (params.userRole) {
      results = results.filter((item) => item.userRole === params.userRole)
    }

    if (params.category) {
      results = results.filter(
        (item) => item.detectedCategory === params.category,
      )
    }

    if (params.startDate) {
      results = results.filter((item) => item.timestamp >= params.startDate!)
    }

    if (params.endDate) {
      results = results.filter((item) => item.timestamp <= params.endDate!)
    }

    if (params.minOverallScore !== undefined) {
      results = results.filter(
        (item) => (item.scores.overall || 0) >= params.minOverallScore!,
      )
    }

    if (params.maxOverallScore !== undefined) {
      results = results.filter(
        (item) => (item.scores.overall || 5) <= params.maxOverallScore!,
      )
    }

    // Apply sorting
    const sortField = params.sortBy || 'timestamp'
    const sortDir = params.sortDirection === 'asc' ? 1 : -1

    results.sort((a, b) => {
      if (sortField === 'timestamp') {
        return (a.timestamp - b.timestamp) * sortDir
      } else {
        // Sort by overall score
        const scoreA = a.scores.overall || 0
        const scoreB = b.scores.overall || 0
        return (scoreA - scoreB) * sortDir
      }
    })

    // Apply pagination
    const offset = params.offset || 0
    const limit = params.limit || results.length

    return results.slice(offset, offset + limit)
  }

  async getSummary(params?: FeedbackQueryParams): Promise<FeedbackSummary> {
    // Get filtered feedback items
    const items = params
      ? await this.queryFeedback(params)
      : Array.from(this.feedbackItems.values())

    // Initialize summary
    const summary: FeedbackSummary = {
      totalCount: items.length,
      averageScores: {} as { [key in FeedbackType]?: number },
      scoreDistribution: {} as {
        [key in FeedbackType]?: {
          1: number
          2: number
          3: number
          4: number
          5: number
        }
      },
      categoryDistribution: {} as { [key in MentalHealthCategory]?: number },
      userRoleDistribution: {} as { [key in UserRole]?: number },
    }

    // No items case
    if (items.length === 0) {
      return summary
    }

    // Calculate average scores
    const scoreTypes = Object.values(FeedbackType)

    scoreTypes.forEach((type) => {
      // Initialize score distribution
      summary.scoreDistribution[type] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

      // Calculate average and distribution
      let totalScore = 0
      let count = 0

      items.forEach((item) => {
        const score = item.scores[type]
        if (score !== undefined) {
          totalScore += score
          count++

          // Update distribution
          summary.scoreDistribution[type]![score as 1 | 2 | 3 | 4 | 5]++
        }
      })

      summary.averageScores[type] = count > 0 ? totalScore / count : undefined
    })

    // Calculate category distribution
    items.forEach((item) => {
      const category = item.detectedCategory
      summary.categoryDistribution[category] =
        (summary.categoryDistribution[category] || 0) + 1
    })

    // Calculate user role distribution
    items.forEach((item) => {
      const role = item.userRole
      summary.userRoleDistribution[role] =
        (summary.userRoleDistribution[role] || 0) + 1
    })

    // Calculate time-based trends
    if (items.length >= 5) {
      // Only calculate trends with sufficient data
      summary.trends = {}

      // Group items by day
      const itemsByDay: Record<string, UserFeedback[]> = {}

      items.forEach((item) => {
        const date = new Date(item.timestamp).toISOString().split('T')[0]
        if (!itemsByDay[date]) {
          itemsByDay[date] = []
        }
        itemsByDay[date].push(item)
      })

      // Calculate average scores by day
      Object.entries(itemsByDay).forEach(([date, dayItems]) => {
        summary.trends![date] = {}

        scoreTypes.forEach((type) => {
          let totalScore = 0
          let count = 0

          dayItems.forEach((item) => {
            const score = item.scores[type]
            if (score !== undefined) {
              totalScore += score
              count++
            }
          })

          if (count > 0) {
            summary.trends![date][type] = totalScore / count
          }
        })
      })
    }

    return summary
  }

  async updateFeedback(
    id: string,
    updates: Partial<UserFeedback>,
  ): Promise<boolean> {
    const existing = this.feedbackItems.get(id)

    if (!existing) {
      return false
    }

    // Apply updates
    const updated = {
      ...existing,
      ...updates,
      // Don't overwrite these fields
      id: existing.id,
      timestamp: existing.timestamp,
    }

    this.feedbackItems.set(id, updated)
    return true
  }

  async deleteFeedback(id: string): Promise<boolean> {
    return this.feedbackItems.delete(id)
  }
}

/**
 * Create feedback object from user input
 */
export function createFeedback(
  params: {
    sessionId?: string
    userId?: string
    userRole: UserRole
    analyzedText?: string
    detectedCategory: MentalHealthCategory
    explanation: string
    scores: {
      [key in FeedbackType]?: number
    }
    comments?: string
    corrections?: string
    expectedCategory?: MentalHealthCategory
    metadata?: {
      modelVersion?: string
      promptVersion?: string
      analysisLatencyMs?: number
      device?: string
      browser?: string
    }
  },
  options: FeedbackSubmissionOptions = {},
): UserFeedback {
  // Generate unique ID
  const id = `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Process text anonymization if needed
  let processedText = params.analyzedText
  if (options.anonymizeText && processedText) {
    processedText = anonymizeText(processedText)
  }

  // Create feedback object
  const feedback: UserFeedback = {
    id,
    timestamp: Date.now(),
    userRole: params.userRole,
    detectedCategory: params.detectedCategory,
    explanation: params.explanation,
    scores: params.scores,
    analyzedText: processedText,
    comments: params.comments,
    corrections: params.corrections,
    expectedCategory: params.expectedCategory,
  }

  // Include user info if specified
  if (options.includeUserInfo) {
    feedback.sessionId = params.sessionId
    feedback.userId = params.userId
  }

  // Include metadata if specified
  if (options.includeMetadata) {
    feedback.metadata = params.metadata
  }

  return feedback
}

/**
 * Anonymize text by removing potential identifiers
 */
function anonymizeText(text: string): string {
  // Replace names (words starting with capital letters not at the beginning of a sentence)
  let anonymized = text.replace(
    /(?<![.!?]\s)(?<!\n)(?<!\t)\b[A-Z][a-z]+\b/g,
    '[NAME]',
  )

  // Replace dates
  anonymized = anonymized.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[DATE]')
  anonymized = anonymized.replace(/\b\d{1,2}-\d{1,2}-\d{2,4}\b/g, '[DATE]')
  anonymized = anonymized.replace(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    '[DATE]',
  )

  // Replace phone numbers
  anonymized = anonymized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')

  // Replace emails
  anonymized = anonymized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[EMAIL]',
  )

  // Replace addresses
  anonymized = anonymized.replace(
    /\b\d+\s+[A-Za-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)\b/gi,
    '[ADDRESS]',
  )

  // Replace ages
  anonymized = anonymized.replace(
    /\b(?:I am|I'm)\s+(\d{1,2})\s+years old\b/gi,
    'I am [AGE] years old',
  )
  anonymized = anonymized.replace(/\baged?\s+(\d{1,2})\b/gi, 'age [AGE]')

  return anonymized
}

/**
 * Extract common themes from feedback comments
 */
export function extractFeedbackThemes(feedbackItems: UserFeedback[]): Array<{
  theme: string
  count: number
  sentiment: 'positive' | 'negative' | 'neutral'
}> {
  // Get all comments
  const comments = feedbackItems
    .map((item) => item.comments)
    .filter((comment) => !!comment) as string[]

  if (comments.length === 0) {
    return []
  }

  // Simple theme extraction based on keyword frequency
  const keywords = {
    positive: [
      'helpful',
      'useful',
      'accurate',
      'clear',
      'good',
      'excellent',
      'precise',
      'insightful',
      'informative',
      'relevant',
      'appreciate',
      'like',
      'helped',
      'beneficial',
      'impressive',
      'compassionate',
    ],
    negative: [
      'unhelpful',
      'inaccurate',
      'unclear',
      'vague',
      'wrong',
      'poor',
      'confusing',
      'misleading',
      'irrelevant',
      'useless',
      'missing',
      'insufficient',
      'oversimplified',
      'offensive',
      'insensitive',
    ],
    neutral: [
      'suggestion',
      'recommend',
      'consider',
      'additional',
      'include',
      'expand',
      'more detail',
      'context',
      'specific',
      'example',
    ],
  }

  // Count occurrences and sentiment
  const themeCounts: Record<
    string,
    {
      count: number
      sentiment: 'positive' | 'negative' | 'neutral'
    }
  > = {}

  // Process each comment
  comments.forEach((comment) => {
    const lowerComment = comment.toLowerCase()

    // Check for positive keywords
    keywords.positive.forEach((keyword) => {
      if (lowerComment.includes(keyword)) {
        themeCounts[keyword] = themeCounts[keyword] || {
          count: 0,
          sentiment: 'positive',
        }
        themeCounts[keyword].count++
      }
    })

    // Check for negative keywords
    keywords.negative.forEach((keyword) => {
      if (lowerComment.includes(keyword)) {
        themeCounts[keyword] = themeCounts[keyword] || {
          count: 0,
          sentiment: 'negative',
        }
        themeCounts[keyword].count++
      }
    })

    // Check for neutral keywords
    keywords.neutral.forEach((keyword) => {
      if (lowerComment.includes(keyword)) {
        themeCounts[keyword] = themeCounts[keyword] || {
          count: 0,
          sentiment: 'neutral',
        }
        themeCounts[keyword].count++
      }
    })
  })

  // Convert to array and sort by count
  return Object.entries(themeCounts)
    .map(([theme, { count, sentiment }]) => ({ theme, count, sentiment }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Return top 10 themes
}

// Default feedback store instance
let defaultFeedbackStore: FeedbackStore | null = null

/**
 * Get the default feedback store
 */
export function getDefaultFeedbackStore(): FeedbackStore {
  if (!defaultFeedbackStore) {
    defaultFeedbackStore = new InMemoryFeedbackStore()
  }
  return defaultFeedbackStore
}

/**
 * Set the default feedback store
 */
export function setDefaultFeedbackStore(store: FeedbackStore): void {
  defaultFeedbackStore = store
}
