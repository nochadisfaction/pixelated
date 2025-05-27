import type { WebSocket } from 'ws'
import { config } from '@/config/env.config'
import { EmailService } from '@/lib/services/email/EmailService'
import { redis } from '@/lib/redis'
import { getLogger } from '@/lib/utils/logger'
import { z } from 'zod'
import { generateVAPIDKeys, sendNotification } from './pushUtils'
import type { PushSubscription } from './pushUtils'
import { sendSMS, isValidPhoneNumber } from './smsUtils'

// Create a logger instance
const logger = getLogger('NotificationService')

// Notification channel types
export const NotificationChannel = {
  IN_APP: 'in_app',
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
} as const

// Notification priority levels
export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

// Notification status types
export const NotificationStatus = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  READ: 'read',
} as const

// Notification template schema
const NotificationTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  channels: z.array(
    z.enum([
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]),
  ),
  priority: z.enum([
    NotificationPriority.LOW,
    NotificationPriority.NORMAL,
    NotificationPriority.HIGH,
    NotificationPriority.URGENT,
  ]),
  metadata: z.record(z.unknown()).optional(),
})

type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>

// Notification data schema
const NotificationDataSchema = z.object({
  userId: z.string(),
  templateId: z.string(),
  data: z.record(z.unknown()),
  channels: z
    .array(
      z.enum([
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ]),
    )
    .optional(),
  priority: z
    .enum([
      NotificationPriority.LOW,
      NotificationPriority.NORMAL,
      NotificationPriority.HIGH,
      NotificationPriority.URGENT,
    ])
    .optional(),
})

type NotificationData = z.infer<typeof NotificationDataSchema>

// Notification item schema
const NotificationItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()),
  channels: z.array(
    z.enum([
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]),
  ),
  priority: z.enum([
    NotificationPriority.LOW,
    NotificationPriority.NORMAL,
    NotificationPriority.HIGH,
    NotificationPriority.URGENT,
  ]),
  status: z.enum([
    NotificationStatus.PENDING,
    NotificationStatus.DELIVERED,
    NotificationStatus.FAILED,
    NotificationStatus.READ,
  ]),
  createdAt: z.number(),
  deliveredAt: z.number().nullable(),
  readAt: z.number().nullable(),
  error: z.string().nullable(),
})

type NotificationItem = z.infer<typeof NotificationItemSchema>

export class NotificationService {
  private emailService: EmailService
  private wsClients: Map<string, WebSocket>
  private templates: Map<string, NotificationTemplate>
  private queueKey = 'notification:queue'
  private processingKey = 'notification:processing'
  private isProcessing = false
  private subscriptionKey = 'push:subscriptions'
  private vapidKeys: { publicKey: string; privateKey: string } | null = null

  constructor() {
    this.emailService = new EmailService()
    this.wsClients = new Map()
    this.templates = new Map()
    this.initializeVAPIDKeys()
  }

  private async initializeVAPIDKeys() {
    // Try to get existing VAPID keys from config
    const publicKey = config.notifications.vapidPublicKey()
    const privateKey = config.notifications.vapidPrivateKey()

    if (publicKey && privateKey) {
      this.vapidKeys = { publicKey, privateKey }
    } else {
      // Generate new VAPID keys if not configured
      this.vapidKeys = await generateVAPIDKeys()
      logger.info('Generated new VAPID keys')
    }
  }

  /**
   * Register a WebSocket client for a user
   */
  registerClient(userId: string, ws: WebSocket): void {
    // Clean up any existing connection
    const existingWs = this.wsClients.get(userId)
    if (existingWs) {
      existingWs.close()
      this.wsClients.delete(userId)
    }

    // Register new connection
    this.wsClients.set(userId, ws)

    // Handle cleanup on close
    ws.on('close', () => {
      // Only delete if this is still the registered client
      if (this.wsClients.get(userId) === ws) {
        this.wsClients.delete(userId)
      }
    })
  }

  /**
   * Unregister a WebSocket client for a user
   */
  unregisterClient(userId: string): void {
    const ws = this.wsClients.get(userId)
    if (ws) {
      ws.close()
      this.wsClients.delete(userId)
    }
  }

  /**
   * Register a notification template
   */
  async registerTemplate(template: NotificationTemplate): Promise<void> {
    // Validate template
    NotificationTemplateSchema.parse(template)

    // Store template
    this.templates.set(template.id, template)

    // If template includes email channel, register email template
    if (template.channels.includes(NotificationChannel.EMAIL)) {
      await this.emailService.upsertTemplate({
        alias: template.id,
        subject: template.title,
        htmlBody: template.body,
        from: config.email.from() || 'noreply@example.com',
      })
    }
  }

  /**
   * Queue a notification for delivery
   */
  async queueNotification(data: NotificationData): Promise<string> {
    // Validate notification data
    NotificationDataSchema.parse(data)

    // Get template
    const template = this.templates.get(data.templateId)
    if (!template) {
      throw new Error(`Template ${data.templateId} not found`)
    }

    // Create notification item
    const notification: NotificationItem = {
      id: crypto.randomUUID(),
      userId: data.userId,
      templateId: data.templateId,
      title: template.title,
      body: template.body,
      data: data.data,
      channels: data.channels || template.channels,
      priority: data.priority || template.priority,
      status: NotificationStatus.PENDING,
      createdAt: Date.now(),
      deliveredAt: null,
      readAt: null,
      error: null,
    }

    // Add to queue
    await redis.lpush(this.queueKey, JSON.stringify(notification))

    logger.info('Notification queued', {
      id: notification.id,
      userId: notification.userId,
      templateId: notification.templateId,
      channels: notification.channels,
    })

    return notification.id
  }

  /**
   * Process the notification queue
   */
  async processQueue(): Promise<void> {
    while (true) {
      // Move item from queue to processing
      const item = await redis.rpoplpush(this.queueKey, this.processingKey)
      if (!item) {
        break
      }

      const notification = NotificationItemSchema.parse(JSON.parse(item))

      try {
        // Process each channel
        for (const channel of notification.channels) {
          switch (channel) {
            case NotificationChannel.IN_APP:
              await this.deliverInApp(notification)
              break
            case NotificationChannel.PUSH:
              await this.deliverPush(notification)
              break
            case NotificationChannel.EMAIL:
              await this.deliverEmail(notification)
              break
            case NotificationChannel.SMS:
              await this.deliverSMS(notification)
              break
          }
        }

        // Update status
        notification.status = NotificationStatus.DELIVERED
        notification.deliveredAt = Date.now()

        // Store delivered notification
        await redis.hset(
          `notifications:${notification.userId}`,
          notification.id,
          JSON.stringify(notification),
        )

        // Remove from processing queue
        await redis.lrem(this.processingKey, 1, item)

        logger.info('Notification delivered', {
          id: notification.id,
          userId: notification.userId,
          templateId: notification.templateId,
          channels: notification.channels,
        })
      } catch (error) {
        // Update status and error
        notification.status = NotificationStatus.FAILED
        notification.error =
          error instanceof Error ? error.message : String(error)

        // Store failed notification
        await redis.hset(
          `notifications:${notification.userId}`,
          notification.id,
          JSON.stringify(notification),
        )

        // Remove from processing queue
        await redis.lrem(this.processingKey, 1, item)

        logger.error('Notification delivery failed', {
          id: notification.id,
          userId: notification.userId,
          templateId: notification.templateId,
          channels: notification.channels,
          error: notification.error,
        })
      }
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await redis.hget(
      `notifications:${userId}`,
      notificationId,
    )
    if (!notification) {
      throw new Error('Notification not found')
    }

    const parsed = NotificationItemSchema.parse(JSON.parse(notification))
    parsed.status = NotificationStatus.READ
    parsed.readAt = Date.now()

    await redis.hset(
      `notifications:${userId}`,
      notificationId,
      JSON.stringify(parsed),
    )
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<NotificationItem[]> {
    const notifications = await redis.hgetall(`notifications:${userId}`)
    if (!notifications) {
      return []
    }

    return Object.values(notifications)
      .map((n) => NotificationItemSchema.parse(JSON.parse(n as string)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit)
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await redis.hgetall(`notifications:${userId}`)
    if (!notifications) {
      return 0
    }

    return Object.values(notifications)
      .map((n) => NotificationItemSchema.parse(JSON.parse(n as string)))
      .filter((n) => n.status !== NotificationStatus.READ).length
  }

  /**
   * Start queue processing
   */
  async startProcessing(interval = 1000): Promise<void> {
    this.isProcessing = true
    while (this.isProcessing) {
      await this.processQueue()
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    this.isProcessing = false
  }

  /**
   * Deliver notification via WebSocket
   */
  private async deliverInApp(notification: NotificationItem): Promise<void> {
    const ws = this.wsClients.get(notification.userId)
    if (!ws) {
      return
    }

    ws.send(
      JSON.stringify({
        type: 'notification',
        data: notification,
      }),
    )
  }

  /**
   * Store a push subscription for a user
   */
  async storePushSubscription(
    userId: string,
    subscription: PushSubscription,
  ): Promise<void> {
    await redis.hset(this.subscriptionKey, userId, JSON.stringify(subscription))
    logger.info('Push subscription stored', { userId })
  }

  /**
   * Remove a push subscription for a user
   */
  async removePushSubscription(userId: string): Promise<void> {
    await redis.hdel(this.subscriptionKey, userId)
    logger.info('Push subscription removed', { userId })
  }

  /**
   * Get a user's push subscription
   */
  private async getPushSubscription(
    userId: string,
  ): Promise<PushSubscription | null> {
    const subscription = await redis.hget(this.subscriptionKey, userId)
    if (!subscription) {
      return null
    }
    return JSON.parse(subscription)
  }

  /**
   * Deliver notification via Web Push
   */
  private async deliverPush(notification: NotificationItem): Promise<void> {
    if (!this.vapidKeys) {
      logger.warn('Push notification skipped - VAPID keys not initialized')
      return
    }

    const subscription = await this.getPushSubscription(notification.userId)
    if (!subscription) {
      logger.info('No push subscription found for user', {
        userId: notification.userId,
      })
      return
    }

    try {
      const payload = {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        timestamp: notification.createdAt,
        notificationId: notification.id,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: notification.id,
      }

      await sendNotification(subscription, payload, this.vapidKeys)

      logger.info('Push notification sent', {
        userId: notification.userId,
        notificationId: notification.id,
      })
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ExpiredSubscriptionError') {
        await this.removePushSubscription(notification.userId)
        logger.info('Removed expired push subscription', {
          userId: notification.userId,
        })
      } else {
        logger.error('Failed to send push notification', {
          userId: notification.userId,
          notificationId: notification.id,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  }

  /**
   * Deliver notification via Email
   */
  private async deliverEmail(notification: NotificationItem): Promise<void> {
    await this.emailService.queueEmail({
      to: notification.userId, // Assuming userId is email address
      templateAlias: notification.templateId,
      templateModel: notification.data,
    })
  }

  /**
   * Deliver notification via SMS
   */
  private async deliverSMS(notification: NotificationItem): Promise<void> {
    // Validate phone number format (assuming userId is the phone number for SMS)
    if (!isValidPhoneNumber(notification.userId)) {
      throw new Error('Invalid phone number format')
    }

    // Construct the message
    const message = `${notification.title}\n\n${notification.body}`

    // Send the SMS
    await sendSMS(notification.userId, message)

    logger.info('SMS notification sent', {
      to: notification.userId,
      notificationId: notification.id,
    })
  }
}
