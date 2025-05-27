import type { WebSocket } from 'ws'
import { redis } from '@/lib/services/redis'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// Event type definitions
export enum EventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  THERAPY_SESSION = 'therapy_session',
  NOTIFICATION = 'notification',
  ERROR = 'error',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  CUSTOM = 'custom',
}

export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Schema definitions
const EventDataSchema = z.object({
  type: z.nativeEnum(EventType),
  priority: z.nativeEnum(EventPriority).default(EventPriority.NORMAL),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.number().default(() => Date.now()),
  properties: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
})

export type EventData = z.infer<typeof EventDataSchema>

const _EventSchema = EventDataSchema.extend({
  id: z.string(),
  processedAt: z.number().optional(),
  error: z.string().optional(),
})

export type Event = z.infer<typeof _EventSchema>

const MetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  timestamp: z.number().default(() => Date.now()),
  tags: z.record(z.string()).default({}),
})

export type Metric = z.infer<typeof MetricSchema>

/**
 * Analytics service for tracking events and metrics with HIPAA compliance
 */
export class AnalyticsService {
  private readonly wsClients: Map<string, WebSocket>
  private readonly retentionDays: number
  private readonly batchSize: number
  private readonly processingInterval: number

  constructor(
    options: {
      retentionDays?: number
      batchSize?: number
      processingInterval?: number
    } = {},
  ) {
    this.wsClients = new Map()
    this.retentionDays = options.retentionDays || 90 // Default 90 days retention
    this.batchSize = options.batchSize || 100
    this.processingInterval = options.processingInterval || 1000 // 1 second
  }

  /**
   * Track an event
   */
  async trackEvent(data: EventData): Promise<string> {
    try {
      // Validate event data
      const validatedData = EventDataSchema.parse(data)

      // Generate event ID
      const eventId = crypto.randomUUID()

      // Create event object
      const event: Event = {
        ...validatedData,
        id: eventId,
      }

      // Queue event for processing
      await redis.lpush('analytics:events:queue', JSON.stringify(event))

      // Store event in time series
      await this.storeEventInTimeSeries(event)

      // Notify real-time subscribers
      this.notifySubscribers(event)

      return eventId
    } catch (error) {
      logger.error('Error tracking event:', error)
      throw error
    }
  }

  /**
   * Track a metric
   */
  async trackMetric(data: Metric): Promise<void> {
    try {
      // Validate metric data
      const metric = MetricSchema.parse(data)

      // Store metric in time series
      await redis.zadd(
        `analytics:metrics:${metric.name}`,
        metric.timestamp,
        JSON.stringify(metric),
      )

      // Store metric tags for filtering
      if (Object.keys(metric.tags).length > 0) {
        await redis.hset(
          `analytics:metrics:tags:${metric.name}`,
          metric.timestamp.toString(),
          JSON.stringify(metric.tags),
        )
      }
    } catch (error) {
      logger.error('Error tracking metric:', error)
      throw error
    }
  }

  /**
   * Process queued events
   */
  async processEvents(): Promise<void> {
    try {
      // Process events in batches
      const events = await redis.lrange(
        'analytics:events:queue',
        0,
        this.batchSize - 1,
      )

      if (events.length === 0) {
        return
      }

      // Process each event
      for (const eventJson of events) {
        try {
          const event = JSON.parse(eventJson) as Event

          // Mark event as processed
          event.processedAt = Date.now()

          // Store processed event
          await redis.hset(
            `analytics:events:processed:${event.type}`,
            event.id,
            JSON.stringify(event),
          )

          // Remove from queue
          await redis.lrem('analytics:events:queue', 1, eventJson)
        } catch (error) {
          logger.error('Error processing event:', error)
        }
      }
    } catch (error) {
      logger.error('Error in event processing:', error)
      throw error
    }
  }

  /**
   * Get events by type and time range
   */
  async getEvents(options: {
    type: EventType
    startTime?: number
    endTime?: number
    limit?: number
    offset?: number
  }): Promise<Event[]> {
    const {
      type,
      startTime = Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      endTime = Date.now(),
      limit = 100,
      offset = 0,
    } = options

    try {
      // Get events from time series
      const eventJsons = await redis.zrangebyscore(
        `analytics:events:time:${type}`,
        startTime,
        endTime,
        'LIMIT',
        offset,
        limit,
      )

      return eventJsons.map((json) => JSON.parse(json) as Event)
    } catch (error) {
      logger.error('Error getting events:', error)
      throw error
    }
  }

  /**
   * Get metric values by name and time range
   */
  async getMetrics(options: {
    name: string
    startTime?: number
    endTime?: number
    tags?: Record<string, string>
  }): Promise<Metric[]> {
    const {
      name,
      startTime = Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      endTime = Date.now(),
      tags,
    } = options

    try {
      // Get metrics from time series
      const metricJsons = await redis.zrangebyscore(
        `analytics:metrics:${name}`,
        startTime,
        endTime,
      )

      let metrics = metricJsons.map((json) => JSON.parse(json) as Metric)

      // Filter by tags if provided
      if (tags) {
        metrics = metrics.filter((metric) => {
          return Object.entries(tags).every(
            ([key, value]) => metric.tags[key] === value,
          )
        })
      }

      return metrics
    } catch (error) {
      logger.error('Error getting metrics:', error)
      throw error
    }
  }

  /**
   * Register a WebSocket client for real-time updates
   */
  registerClient(userId: string, ws: WebSocket): void {
    this.wsClients.set(userId, ws)

    ws.on('close', () => {
      this.wsClients.delete(userId)
    })
  }

  /**
   * Check if a client is registered
   */
  hasClient(userId: string): boolean {
    return this.wsClients.has(userId)
  }

  /**
   * Clean up old events and metrics
   */
  async cleanup(): Promise<void> {
    try {
      const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000

      // Clean up events
      for (const type of Object.values(EventType)) {
        await redis.zremrangebyscore(`analytics:events:time:${type}`, 0, cutoff)
      }

      // Clean up metrics
      const metricKeys = await redis.keys('analytics:metrics:*')
      for (const key of metricKeys) {
        if (!key.includes(':tags:')) {
          await redis.zremrangebyscore(key, 0, cutoff)
        }
      }

      logger.info('Analytics cleanup completed')
    } catch (error) {
      logger.error('Error in analytics cleanup:', error)
      throw error
    }
  }

  /**
   * Store event in time series for efficient querying
   */
  private async storeEventInTimeSeries(event: Event): Promise<void> {
    await redis.zadd(
      `analytics:events:time:${event.type}`,
      event.timestamp,
      JSON.stringify(event),
    )
  }

  /**
   * Notify WebSocket subscribers of new events
   */
  private notifySubscribers(event: Event): void {
    if (event.userId) {
      const ws = this.wsClients.get(event.userId)
      if (ws) {
        ws.send(
          JSON.stringify({
            type: 'analytics_event',
            event,
          }),
        )
      }
    }
  }
}
