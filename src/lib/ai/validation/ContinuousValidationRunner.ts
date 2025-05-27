import { getLogger } from '../../logging'
import { createAuditLog, AuditEventType, AuditEventStatus } from '../../audit'
import { ValidationTestResult } from './ContinuousValidationPipeline'
import {
  emotionValidationPipeline,
  EMOTION_VALIDATION_TYPE,
  ValidationAlertData,
} from '../emotions/EmotionValidationPipeline'
import cron from 'node-cron'
import { Redis } from '@upstash/redis'

// Environment variables
const VALIDATION_REDIS_URL =
  import.meta.env.VALIDATION_REDIS_URL || import.meta.env.UPSTASH_REDIS_URL
const VALIDATION_REDIS_TOKEN =
  import.meta.env.VALIDATION_REDIS_TOKEN || import.meta.env.UPSTASH_REDIS_TOKEN

// Constants
const PIPELINE_LOCK_KEY = 'validation:pipeline:lock'
const PIPELINE_STATE_KEY = 'validation:pipeline:state'
const PIPELINE_HISTORY_KEY = 'validation:pipeline:history'
const PIPELINE_ALERT_KEY = 'validation:pipeline:alerts'
const LOCK_EXPIRY = 10 * 60 // 10 minutes in seconds

// Types
export interface ValidationRunHistoryEntry {
  runId: string
  timestamp: Date
  testType: string
  resultsCount: number
  passedCount: number
  success: boolean
  error?: string
}

export interface ValidationPipelineState {
  running: boolean
  lastRunTimestamp: Date | null
  lastRunId: string | null
  lastRunSuccess: boolean
  isScheduled: boolean
  nextScheduledRun: Date | null
  schedule: string | null
}

/**
 * Handles scheduling, running, and reporting for the continuous validation pipeline
 */
export class ContinuousValidationRunner {
  private static instance: ContinuousValidationRunner
  private logger = getLogger({ prefix: 'validation-runner' })
  private redis: Redis | null = null
  private scheduledTask: cron.ScheduledTask | null = null
  private state: ValidationPipelineState = {
    running: false,
    lastRunTimestamp: null,
    lastRunId: null,
    lastRunSuccess: false,
    isScheduled: false,
    nextScheduledRun: null,
    schedule: null,
  }

  private alertCallbacks: Array<(alert: ValidationAlertData) => Promise<void>> =
    []

  private constructor() {
    // Initialize Redis if credentials are available
    if (VALIDATION_REDIS_URL && VALIDATION_REDIS_TOKEN) {
      this.redis = new Redis({
        url: VALIDATION_REDIS_URL,
        token: VALIDATION_REDIS_TOKEN,
      })
      this.logger.info(
        'Redis connection initialized for validation pipeline runner',
      )
    } else {
      this.logger.warn(
        'Redis connection not initialized - state persistence unavailable',
      )
    }

    // Register for pipeline alerts
    emotionValidationPipeline.registerAlertCallback(this.handleAlert.bind(this))
  }

  /**
   * Get the singleton instance of the validation runner
   */
  public static getInstance(): ContinuousValidationRunner {
    if (!ContinuousValidationRunner.instance) {
      ContinuousValidationRunner.instance = new ContinuousValidationRunner()
    }
    return ContinuousValidationRunner.instance
  }

  /**
   * Initialize the validation runner
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize the emotion validation pipeline if not already initialized
      if (!emotionValidationPipeline.isInitialized) {
        await emotionValidationPipeline.initialize()
        this.logger.info('Emotion validation pipeline initialized')
      }

      // Load state from Redis if available
      await this.loadState()

      // Create audit log for successful initialization
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'validation-runner-init',
        'system',
        'validation-runner',
        {
          isScheduled: this.state.isScheduled,
          nextScheduledRun: this.state.nextScheduledRun,
        },
        AuditEventStatus.SUCCESS,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(
        `Failed to initialize validation runner: ${errorMessage}`,
      )

      // Create audit log for failed initialization
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'validation-runner-init',
        'system',
        'validation-runner',
        {
          error: errorMessage,
        },
        AuditEventStatus.FAILURE,
      )

      throw new Error(
        `Validation runner initialization failed: ${errorMessage}`,
      )
    }
  }

  /**
   * Schedule validation runs using cron
   * @param schedule Cron expression (e.g., '0 0 * * *' for daily at midnight)
   */
  public async scheduleValidationRuns(schedule: string): Promise<void> {
    try {
      // Stop any existing scheduled task
      this.stopScheduledRuns()

      // Validate cron expression
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron expression: ${schedule}`)
      }

      // Schedule new task
      this.scheduledTask = cron.schedule(schedule, async () => {
        await this.runValidationWithLock()
      })

      // Update state
      this.state.isScheduled = true
      this.state.schedule = schedule
      this.state.nextScheduledRun = this.getNextScheduledRunDate(schedule)

      // Save state
      await this.saveState()

      this.logger.info(
        `Scheduled validation runs with cron expression: ${schedule}`,
      )

      // Create audit log
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'validation-runner-schedule',
        'system',
        'validation-runner',
        {
          schedule,
          nextScheduledRun: this.state.nextScheduledRun,
        },
        AuditEventStatus.SUCCESS,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to schedule validation runs: ${errorMessage}`)

      // Create audit log for failed scheduling
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'validation-runner-schedule',
        'system',
        'validation-runner',
        {
          schedule,
          error: errorMessage,
        },
        AuditEventStatus.FAILURE,
      )

      throw new Error(`Failed to schedule validation runs: ${errorMessage}`)
    }
  }

  /**
   * Stop scheduled validation runs
   */
  public stopScheduledRuns(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop()
      this.scheduledTask = null
      this.state.isScheduled = false
      this.state.schedule = null
      this.state.nextScheduledRun = null
      this.saveState().catch((error) => {
        this.logger.error(
          `Failed to save state after stopping scheduled runs: ${error.message}`,
        )
      })

      this.logger.info('Stopped scheduled validation runs')
    }
  }

  /**
   * Run validation with distributed lock to prevent concurrent runs
   */
  public async runValidationWithLock(): Promise<ValidationTestResult[] | null> {
    if (!this.redis) {
      // Without Redis, we can't guarantee distributed locking
      // Just run validation directly
      return await this.runValidation()
    }

    // Try to acquire lock
    const lockAcquired = await this.acquireLock()
    if (!lockAcquired) {
      this.logger.info(
        'Failed to acquire lock for validation run - another run may be in progress',
      )
      return null
    }

    try {
      // Run validation
      return await this.runValidation()
    } finally {
      // Release lock
      await this.releaseLock()
    }
  }

  /**
   * Run validation immediately
   */
  public async runValidation(): Promise<ValidationTestResult[]> {
    const runId = `run-${Date.now()}`

    try {
      // Update state
      this.state.running = true
      this.state.lastRunId = runId
      await this.saveState()

      this.logger.info(`Starting validation run ${runId}`)

      // Initialize pipeline if needed
      if (!emotionValidationPipeline.isInitialized) {
        await emotionValidationPipeline.initialize()
      }

      // Run validation
      const results = await emotionValidationPipeline.runValidation()

      // Update state
      this.state.running = false
      this.state.lastRunTimestamp = new Date()
      this.state.lastRunSuccess = true

      // If scheduled, update next run time
      if (this.state.isScheduled && this.state.schedule) {
        this.state.nextScheduledRun = this.getNextScheduledRunDate(
          this.state.schedule,
        )
      }

      await this.saveState()

      // Record run history
      await this.recordRunHistory({
        runId,
        timestamp: new Date(),
        testType: EMOTION_VALIDATION_TYPE,
        resultsCount: results.length,
        passedCount: results.filter((r) => r.passed).length,
        success: true,
      })

      this.logger.info(`Validation run ${runId} completed successfully`)

      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Validation run ${runId} failed: ${errorMessage}`)

      // Update state
      this.state.running = false
      this.state.lastRunTimestamp = new Date()
      this.state.lastRunSuccess = false
      await this.saveState()

      // Record run history
      await this.recordRunHistory({
        runId,
        timestamp: new Date(),
        testType: EMOTION_VALIDATION_TYPE,
        resultsCount: 0,
        passedCount: 0,
        success: false,
        error: errorMessage,
      })

      // Create audit log for failed run
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'validation-runner-run',
        'system',
        'validation-runner',
        {
          runId,
          error: errorMessage,
        },
        AuditEventStatus.FAILURE,
      )

      throw error
    }
  }

  /**
   * Get the current state of the validation runner
   */
  public getState(): ValidationPipelineState {
    return { ...this.state }
  }

  /**
   * Get validation run history
   */
  public async getRunHistory(limit = 20): Promise<ValidationRunHistoryEntry[]> {
    if (!this.redis) {
      return []
    }

    try {
      // Get history from Redis
      const history = await this.redis.lrange(
        PIPELINE_HISTORY_KEY,
        0,
        limit - 1,
      )

      // Parse JSON entries
      return history.map((entry) =>
        JSON.parse(entry),
      ) as ValidationRunHistoryEntry[]
    } catch (error) {
      this.logger.error(`Failed to get run history: ${error.message}`)
      return []
    }
  }

  /**
   * Register an alert callback
   */
  public registerAlertCallback(
    callback: (alert: ValidationAlertData) => Promise<void>,
  ): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * Create a GitHub Actions compatible webhook endpoint
   * This allows triggering validation runs from CI/CD
   */
  public async handleWebhook(
    payload: any,
    signature: string,
    event: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate webhook signature (implementation depends on your GitHub webhook setup)
    const isValid = this.validateWebhookSignature(payload, signature)
    if (!isValid) {
      this.logger.warn('Invalid webhook signature received')
      return { success: false, message: 'Invalid webhook signature' }
    }

    // Check event type
    if (event === 'workflow_run' && payload.action === 'completed') {
      // Run validation after successful workflow
      this.logger.info(
        'Received webhook for completed workflow run, triggering validation',
      )

      try {
        await this.runValidationWithLock()
        return {
          success: true,
          message: 'Validation run triggered successfully',
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        return {
          success: false,
          message: `Failed to trigger validation: ${errorMessage}`,
        }
      }
    }

    // Not a relevant event
    return { success: false, message: `Event not handled: ${event}` }
  }

  /**
   * Private methods
   */

  private async handleAlert(alert: ValidationAlertData): Promise<void> {
    try {
      // Store alert in Redis
      if (this.redis) {
        const alertJson = JSON.stringify(alert)
        await this.redis.lpush(PIPELINE_ALERT_KEY, alertJson)
        await this.redis.ltrim(PIPELINE_ALERT_KEY, 0, 49) // Keep last 50 alerts
      }

      // Call registered callbacks
      for (const callback of this.alertCallbacks) {
        try {
          await callback(alert)
        } catch (error) {
          this.logger.error(`Alert callback error: ${error.message}`)
        }
      }

      // Create audit log for alert
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'validation-alert',
        'system',
        'validation-runner',
        {
          testType: alert.testType,
          overallAccuracy: alert.overallAccuracy,
          modelsBelow: alert.modelsBelow.length,
          runId: alert.runId,
        },
        AuditEventStatus.WARNING,
      )

      this.logger.info(`Processed validation alert for run ${alert.runId}`)
    } catch (error) {
      this.logger.error(`Failed to process validation alert: ${error.message}`)
    }
  }

  private async loadState(): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      const stateJson = await this.redis.get(PIPELINE_STATE_KEY)
      if (stateJson) {
        this.state = JSON.parse(stateJson as string) as ValidationPipelineState

        // If was scheduled before, restart schedule
        if (this.state.isScheduled && this.state.schedule) {
          // Don't await to avoid blocking initialization
          this.scheduleValidationRuns(this.state.schedule).catch((error) => {
            this.logger.error(
              `Failed to reschedule validation runs: ${error.message}`,
            )
          })
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load state from Redis: ${error.message}`)
    }
  }

  private async saveState(): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      const stateJson = JSON.stringify(this.state)
      await this.redis.set(PIPELINE_STATE_KEY, stateJson)
    } catch (error) {
      this.logger.error(`Failed to save state to Redis: ${error.message}`)
    }
  }

  private async recordRunHistory(
    entry: ValidationRunHistoryEntry,
  ): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      const entryJson = JSON.stringify(entry)
      await this.redis.lpush(PIPELINE_HISTORY_KEY, entryJson)
      await this.redis.ltrim(PIPELINE_HISTORY_KEY, 0, 99) // Keep last 100 runs
    } catch (error) {
      this.logger.error(`Failed to record run history: ${error.message}`)
    }
  }

  private async acquireLock(): Promise<boolean> {
    if (!this.redis) {
      return true
    }

    try {
      // Try to set lock key with NX (only if it doesn't exist)
      const result = await this.redis.set(
        PIPELINE_LOCK_KEY,
        new Date().toISOString(),
        {
          nx: true,
          ex: LOCK_EXPIRY,
        },
      )

      return result === 'OK'
    } catch (error) {
      this.logger.error(`Failed to acquire lock: ${error.message}`)
      return false
    }
  }

  private async releaseLock(): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      await this.redis.del(PIPELINE_LOCK_KEY)
    } catch (error) {
      this.logger.error(`Failed to release lock: ${error.message}`)
    }
  }

  private getNextScheduledRunDate(cronExpression: string): Date {
    // Parse cron expression to get next occurrence
    const interval = cron.schedule(cronExpression, () => {})
    const nextDate = new Date(interval.nextDate().valueOf())
    interval.stop()
    return nextDate
  }

  private validateWebhookSignature(payload: any, signature: string): boolean {
    // In a real implementation, this would verify the HMAC signature
    // using your GitHub webhook secret
    // For now, we'll return true for the demonstration
    return true
  }
}

// Export singleton instance
export const validationRunner = ContinuousValidationRunner.getInstance()
