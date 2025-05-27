/**
 * @module ContextManager
 * Gathers and processes multi-factor context for AI decision-making.
 */

import { ContextFactor, ContextSnapshot } from './ContextTypes'
import {
  FactorNotFoundError,
  InvalidFactorIdError,
  InvalidFactorValueError,
  InvalidSnapshotIdentifierError,
} from './ContextErrors'
import { AIRepository } from '../../db/ai/repository'
import type { TherapySession } from '../interfaces/therapy'

/**
 * Parameters for initializing the ContextManager.
 */
export interface ContextManagerConfig {
  // Configuration options, e.g., default factors to track
  // For now, we'll keep it simple.
  logger?: (message: string, level?: 'info' | 'warn' | 'error') => void
}

/**
 * The ContextManager class is responsible for collecting, updating,
 * and providing access to various contextual factors.
 */
export class ContextManager {
  private currentContext: Map<string, ContextFactor<unknown>>
  private config: ContextManagerConfig

  /**
   * Constructs a new ContextManager instance.
   * @param {ContextManagerConfig} [config={}] - Configuration for the ContextManager.
   */
  constructor(config: ContextManagerConfig = {}) {
    this.currentContext = new Map<string, ContextFactor<unknown>>()
    this.config = config
    this.log('ContextManager initialized.')
  }

  private log(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
  ): void {
    if (this.config.logger) {
      this.config.logger(message, level)
    } else if (import.meta.env.DEV) {
      const logFunction = console[level] || console.info
      logFunction(`[ContextManager] ${level.toUpperCase()}: ${message}`)
    }
  }

  /**
   * Deep clones a value. Supports primitive types, objects, arrays, and Date objects.
   * More complex types (like functions or Maps/Sets) might not be perfectly cloned.
   * @param value The value to clone.
   * @returns A deep copy of the value.
   */
  private deepClone<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value
    }

    if (value instanceof Date) {
      return new Date(value.getTime()) as T
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.deepClone(item)) as T
    }

    const clonedObject = {} as T
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        clonedObject[key] = this.deepClone(value[key])
      }
    }
    return clonedObject
  }

  /**
   * Adds or updates a contextual factor.
   * The provided factor object will be deep cloned before being stored.
   * @template T
   * @param {Omit<ContextFactor<T>, 'timestamp'> & { timestamp?: Date }} factor - The contextual factor to add or update.
   *   The `id` must be a non-empty string. The `value` must not be undefined.
   * @throws {InvalidFactorIdError} If the factor ID is invalid.
   * @throws {InvalidFactorValueError} If the factor value is undefined.
   */
  public addOrUpdateFactor<T>(
    factor: Omit<ContextFactor<T>, 'timestamp'> & { timestamp?: Date },
  ): void {
    if (
      !factor.id ||
      typeof factor.id !== 'string' ||
      factor.id.trim() === ''
    ) {
      this.log(
        'Attempted to add factor with invalid ID. Throwing error.',
        'error',
      )
      throw new InvalidFactorIdError(String(factor.id))
    }
    if (factor.value === undefined) {
      this.log(
        `Attempted to add factor '${factor.id}' with undefined value. Throwing error.`,
        'error',
      )
      throw new InvalidFactorValueError(factor.id, factor.value)
    }

    const newFactor: ContextFactor<T> = {
      id: factor.id,
      value: this.deepClone(factor.value), // Deep clone the value
      source: factor.source,
      timestamp: factor.timestamp
        ? new Date(factor.timestamp.getTime())
        : new Date(), // Clone date or create new
      confidence: factor.confidence,
      metadata: factor.metadata ? this.deepClone(factor.metadata) : undefined,
    }

    this.currentContext.set(newFactor.id, newFactor as ContextFactor<unknown>)
    this.log(`Factor '${newFactor.id}' added/updated.`)
  }

  /**
   * Retrieves a specific contextual factor by its ID.
   * The returned factor is a deep clone of the stored factor to ensure immutability.
   * @template T
   * @param {string} factorId - The ID of the factor to retrieve.
   * @returns {ContextFactor<T>} The contextual factor if found.
   * @throws {InvalidFactorIdError} If the factorId is not a non-empty string.
   * @throws {FactorNotFoundError} If the factor with the given ID is not found.
   */
  public getFactor<T>(factorId: string): ContextFactor<T> {
    if (!factorId || typeof factorId !== 'string' || factorId.trim() === '') {
      throw new InvalidFactorIdError(
        factorId,
        'Factor ID for retrieval cannot be empty.',
      )
    }
    const factor = this.currentContext.get(factorId)
    if (!factor) {
      throw new FactorNotFoundError(factorId)
    }
    // Return a deep clone to prevent modification of internal state
    return this.deepClone(factor) as ContextFactor<T>
  }

  /**
   * Removes a contextual factor by its ID.
   * @param {string} factorId - The ID of the factor to remove.
   * @returns {boolean} True if the factor was removed, false otherwise.
   * @throws {InvalidFactorIdError} If the factorId is not a non-empty string.
   */
  public removeFactor(factorId: string): boolean {
    if (!factorId || typeof factorId !== 'string' || factorId.trim() === '') {
      this.log(
        'Attempted to remove factor with invalid ID. Throwing error.',
        'error',
      )
      throw new InvalidFactorIdError(
        factorId,
        'Factor ID for removal cannot be empty.',
      )
    }
    const result = this.currentContext.delete(factorId)
    if (result) {
      this.log(`Factor '${factorId}' removed.`)
    }
    return result
  }

  /**
   * Gathers a snapshot of the current context.
   * All factors within the snapshot are deep cloned.
   * @param {string} sessionId - The current session ID. Must be a non-empty string.
   * @param {string} userId - The current user ID. Must be a non-empty string.
   * @returns {ContextSnapshot} A ContextSnapshot object containing deep clones of current factors.
   * @throws {InvalidSnapshotIdentifierError} If sessionId or userId are invalid.
   */
  public getContextSnapshot(
    sessionId: string,
    userId: string,
  ): ContextSnapshot {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim() === ''
    ) {
      this.log(
        'Invalid sessionId provided for getContextSnapshot. Throwing error.',
        'error',
      )
      throw new InvalidSnapshotIdentifierError('sessionId', sessionId)
    }
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      this.log(
        'Invalid userId provided for getContextSnapshot. Throwing error.',
        'error',
      )
      throw new InvalidSnapshotIdentifierError('userId', userId)
    }

    const factorsSnapshot = Array.from(this.currentContext.values()).map(
      (factor) => this.deepClone(factor),
    )

    const snapshot: ContextSnapshot = {
      sessionId,
      userId,
      timestamp: new Date(),
      factors: factorsSnapshot as ContextFactor<unknown>[],
    }
    this.log('Context snapshot generated.')
    return snapshot
  }

  /**
   * Clears all current contextual factors.
   */
  public clearContext(): void {
    this.currentContext.clear()
    this.log('All contextual factors cleared.')
  }

  /**
   * Returns the number of currently tracked factors.
   */
  public getFactorCount(): number {
    return this.currentContext.size
  }

  /**
   * Loads session history for a client and adds it as a contextual factor.
   * Only non-sensitive metadata is included for privacy.
   * @param clientId The client/user ID whose session history to load
   * @param options Optional filters: limit, startDate, endDate
   * @throws Error if retrieval fails or clientId is invalid
   */
  public async loadSessionHistory(
    clientId: string,
    options?: { limit?: number; startDate?: Date; endDate?: Date },
  ): Promise<void> {
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      this.log('Invalid clientId provided for loadSessionHistory.', 'error')
      throw new Error('Invalid clientId for session history.')
    }
    try {
      const repository = new AIRepository()
      const sessions: TherapySession[] = await repository.getSessions({
        clientId,
        startDate: options?.startDate,
        endDate: options?.endDate,
        status: 'completed', // Only completed sessions for history
      })
      // Optionally limit the number of sessions
      const limitedSessions = options?.limit
        ? sessions.slice(0, options.limit)
        : sessions
      // Only include non-sensitive metadata
      const sessionSummaries = limitedSessions.map((s) => ({
        sessionId: s.sessionId,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        securityLevel: s.securityLevel,
        emotionAnalysisEnabled: s.emotionAnalysisEnabled,
      }))
      this.addOrUpdateFactor({
        id: 'sessionHistory',
        value: sessionSummaries,
        source: 'SessionHistoryService',
        timestamp: new Date(),
        metadata: {
          count: sessionSummaries.length,
          range: sessionSummaries.length
            ? {
                start: sessionSummaries[sessionSummaries.length - 1].startTime,
                end:
                  sessionSummaries[0].endTime || sessionSummaries[0].startTime,
              }
            : undefined,
        },
      })
      this.log(`Session history loaded for clientId: ${clientId}`)
    } catch (error: unknown) {
      this.log(
        `Failed to load session history for clientId: ${clientId}. Error: ${(error as Error).message}`,
        'error',
      )
      throw new Error('Failed to load session history.')
    }
  }

  /**
   * Loads the latest client state (emotion, risk, engagement) as a contextual factor.
   * Aggregates the most recent emotion analysis and risk factors from the latest completed session.
   * @param clientId The client/user ID whose state to load
   * @throws Error if retrieval fails or clientId is invalid
   */
  public async loadClientState(clientId: string): Promise<void> {
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      this.log('Invalid clientId provided for loadClientState.', 'error')
      throw new Error('Invalid clientId for client state.')
    }
    try {
      const repository = new AIRepository()
      // Get the latest completed session for the client
      const sessions = await repository.getSessions({
        clientId,
        status: 'completed',
      })
      if (!sessions.length) {
        this.log(`No completed sessions found for clientId: ${clientId}`)
        return
      }
      // Use the most recent session
      const latestSession = sessions[0]
      // Get emotion analyses for the session
      const emotions = await repository.getEmotionsForSession(
        latestSession.sessionId,
      )
      const latestEmotion = emotions.length
        ? emotions[emotions.length - 1]
        : null
      // Aggregate client state
      const clientState = {
        sessionId: latestSession.sessionId,
        timestamp:
          latestEmotion?.timestamp || latestSession.endTime || new Date(),
        status: latestSession.status,
        securityLevel: latestSession.securityLevel,
        emotionAnalysisEnabled: latestSession.emotionAnalysisEnabled,
        emotion: latestEmotion
          ? {
              overallSentiment: latestEmotion.overallSentiment,
              dominantEmotion: latestEmotion.emotions?.[0]?.type || null,
              intensity: latestEmotion.emotions?.[0]?.intensity || null,
              riskFactors: latestEmotion.riskFactors || [],
              requiresAttention: latestEmotion.requiresAttention || false,
              mentalHealth: latestEmotion.mentalHealth || null,
            }
          : null,
      }
      this.addOrUpdateFactor({
        id: 'clientState',
        value: clientState,
        source: 'ClientStateAggregator',
        timestamp: new Date(),
        metadata: {
          sessionId: latestSession.sessionId,
          hasEmotion: !!latestEmotion,
        },
      })
      this.log(`Client state loaded for clientId: ${clientId}`)
    } catch (error: unknown) {
      this.log(
        `Failed to load client state for clientId: ${clientId}. Error: ${(error as Error).message}`,
        'error',
      )
      throw new Error('Failed to load client state.')
    }
  }
}

// Example Usage (optional, for testing or demonstration)
if (import.meta.env.DEV) {
  const contextManager = new ContextManager({
    logger: (message, level) =>
      console.log(`[CustomLogger] ${level?.toUpperCase()}]: ${message}`),
  })

  console.log('--- ContextManager DEV Example Usage ---')

  // Adding factors
  try {
    contextManager.addOrUpdateFactor({
      id: 'currentMood',
      value: { intensity: 7, type: 'positive' },
      source: 'UserSelfReport',
      metadata: { reportTime: new Date().toISOString() },
    })
    contextManager.addOrUpdateFactor({
      id: 'timeOfDay',
      value: new Date().getHours(),
      source: 'SystemClock',
      confidence: 0.9,
    })
    console.log('Factors added successfully.')
  } catch (e: unknown) {
    console.error('Error adding factors:', (e as Error).message)
  }

  // Retrieving a factor
  try {
    const moodFactor = contextManager.getFactor<{
      intensity: number
      type: string
    }>('currentMood')
    console.log('Current mood factor:', moodFactor)
    // Attempt to modify the retrieved factor (should not affect internal state)
    if (moodFactor) {
      ;(moodFactor.value as { intensity: number }).intensity = 10
      const moodFactorAgain = contextManager.getFactor('currentMood')
      console.log(
        'Current mood factor after attempted modification:',
        moodFactorAgain,
      )
    }
  } catch (e: unknown) {
    console.error('Error retrieving factor:', (e as Error).message)
  }

  // Getting a snapshot
  try {
    const snapshot = contextManager.getContextSnapshot('session123', 'user456')
    console.log('Context snapshot:', snapshot)
    // Attempt to modify a factor in the snapshot (should not affect internal state)
    if (snapshot.factors.length > 0) {
      ;(snapshot.factors[0].value as { intensity: number }).intensity = 0
      const moodFactorAfterSnapshotMod = contextManager.getFactor('currentMood')
      console.log(
        'Current mood factor after snapshot modification attempt:',
        moodFactorAfterSnapshotMod,
      )
    }
  } catch (e: unknown) {
    console.error('Error getting snapshot:', (e as Error).message)
  }

  // Test invalid factor ID for getFactor
  try {
    contextManager.getFactor('')
  } catch (e: unknown) {
    console.error(
      'Expected error for empty factor ID (getFactor):',
      (e as Error).message,
    )
  }

  // Test factor not found
  try {
    contextManager.getFactor('nonExistentFactor')
  } catch (e: unknown) {
    console.error(
      'Expected error for non-existent factor:',
      (e as Error).message,
    )
  }

  // Removing a factor
  try {
    const removed = contextManager.removeFactor('timeOfDay')
    console.log(`Factor 'timeOfDay' removed: ${removed}`)
    console.log('Factor count after removal:', contextManager.getFactorCount())
    // Try removing again
    const removedAgain = contextManager.removeFactor('timeOfDay')
    console.log(`Factor 'timeOfDay' removed again: ${removedAgain}`)
  } catch (e: unknown) {
    console.error('Error removing factor:', (e as Error).message)
  }

  // Clearing context
  contextManager.clearContext()
  console.log('Factor count after clearing:', contextManager.getFactorCount())

  // Example of adding factor with invalid ID (should throw error)
  try {
    contextManager.addOrUpdateFactor({
      id: '',
      value: 'test',
      source: 'TestInvalidId',
    })
  } catch (e: unknown) {
    console.error(
      'Expected error for invalid ID (addOrUpdateFactor):',
      (e as Error).message,
    )
  }

  // Example of adding factor with undefined value (should throw error)
  try {
    contextManager.addOrUpdateFactor({
      id: 'validIdUndefinedValue',
      value: undefined as unknown as string, // Cast to unknown then specific type for testing
      source: 'TestUndefinedValue',
    })
  } catch (e: unknown) {
    console.error(
      'Expected error for undefined value (addOrUpdateFactor):',
      (e as Error).message,
    )
  }

  // Example of invalid session ID for snapshot
  try {
    contextManager.getContextSnapshot('', 'user789')
  } catch (e: unknown) {
    console.error(
      'Expected error for invalid session ID (getContextSnapshot):',
      (e as Error).message,
    )
  }

  console.log('--- ContextManager DEV Example Usage End ---')
}
