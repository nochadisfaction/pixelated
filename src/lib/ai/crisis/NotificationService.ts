import { appLogger as logger } from '../../logging'
import type { CrisisAlertLevel, CrisisNotification, NotificationChannel } from './types'

/**
 * NotificationService - Service for sending crisis alerts to staff
 * 
 * This service handles the delivery of crisis notifications through multiple channels
 * (email, SMS, app notifications, etc.) with priority, fallback, and escalation logic.
 */
export class NotificationService {
  private static instance: NotificationService
  private channels: Map<string, NotificationChannel> = new Map()
  private levelChannelMap: Map<CrisisAlertLevel, string[]> = new Map()
  private fallbackChannels: string[] = []
  private isInitialized: boolean = false
  
  /**
   * Private constructor - use getInstance() to get the singleton instance
   */
  private constructor() {
    // Initialize with empty maps
  }
  
  /**
   * Get the singleton instance of NotificationService
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }
  
  /**
   * Initialize the notification service with channels and mappings
   */
  public initialize(config: {
    channels: NotificationChannel[]
    levelChannelMap: Record<CrisisAlertLevel, string[]>
    fallbackChannels: string[]
  }): void {
    // Set up channels
    config.channels.forEach(channel => {
      this.channels.set(channel.id, channel)
    })
    
    // Set up level-to-channel mappings
    Object.entries(config.levelChannelMap).forEach(([level, channelIds]) => {
      this.levelChannelMap.set(level as CrisisAlertLevel, channelIds)
    })
    
    // Set up fallback channels
    this.fallbackChannels = config.fallbackChannels
    
    this.isInitialized = true
    logger.info('NotificationService initialized', {
      channelCount: this.channels.size,
      levelMappings: this.levelChannelMap.size,
      fallbackChannels: this.fallbackChannels.length
    })
  }
  
  /**
   * Send a crisis notification to appropriate channels based on alert level
   */
  public async sendCrisisAlert(
    notification: CrisisNotification
  ): Promise<{
    success: boolean
    sentCount: number
    failedCount: number
    sentChannels: string[]
    failedChannels: string[]
  }> {
    if (!this.isInitialized) {
      throw new Error('NotificationService has not been initialized. Call initialize() first.')
    }
    
    logger.info('Sending crisis notification', {
      alertLevel: notification.alertLevel,
      caseId: notification.caseId
    })
    
    // Get channels for this alert level
let channelIds = this.levelChannelMap.get(notification.alertLevel) || [];
channelIds = [...channelIds]; // ensure it's a mutable array
    
    if (channelIds.length === 0) {
      logger.warn('No channels configured for alert level', { alertLevel: notification.alertLevel })
      // Use fallback channels if no specific channels are configured
      channelIds = [...this.fallbackChannels];      
      if (channelIds.length === 0) {
        logger.error('No channels available for notification', { alertLevel: notification.alertLevel })
        return {
          success: false,
          sentCount: 0,
          failedCount: 0,
          sentChannels: [],
          failedChannels: []
        }
      }
    }
    
    // Track successful and failed deliveries
    const sentChannels: string[] = []
    const failedChannels: string[] = []
    
    // Send to all channels for this level
    for (const channelId of channelIds) {
      const channel = this.channels.get(channelId)
      
      if (!channel || !channel.active) {
        logger.warn('Channel not available or inactive', { channelId })
        failedChannels.push(channelId)
        continue
      }
      
      try {
        await this.sendToChannel(channel, notification)
        sentChannels.push(channelId)
      } catch (error) {
        logger.error('Failed to send notification to channel', { 
          error, 
          channelId, 
          channelType: channel.type 
        })
        failedChannels.push(channelId)
      }
    }
    
    // If all primary channels failed, try fallbacks
    if (sentChannels.length === 0 && failedChannels.length > 0) {
      logger.warn('All primary channels failed, trying fallbacks', { 
        failedChannels,
        fallbacksAvailable: this.fallbackChannels.length
      })
      
      // Only try fallbacks that weren't already tried
      const unusedFallbacks = this.fallbackChannels.filter(id => !failedChannels.includes(id))
      
      for (const channelId of unusedFallbacks) {
        const channel = this.channels.get(channelId)
        
        if (!channel || !channel.active) {
          continue
        }
        
        try {
          await this.sendToChannel(channel, notification)
          sentChannels.push(channelId)
          
          // Break after first successful fallback
          break
        } catch (error) {
          logger.error('Fallback channel also failed', { error, channelId })
          failedChannels.push(channelId)
        }
      }
    }
    
    const success = sentChannels.length > 0
    
    // Log the final outcome
    if (success) {
      logger.info('Crisis notification sent successfully', {
        alertLevel: notification.alertLevel,
        sentChannels,
        failedChannels
      })
    } else {
      logger.error('Failed to send crisis notification to any channel', {
        alertLevel: notification.alertLevel,
        failedChannels
      })
    }
    
    return {
      success,
      sentCount: sentChannels.length,
      failedCount: failedChannels.length,
      sentChannels,
      failedChannels
    }
  }
  
  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    notification: CrisisNotification
  ): Promise<void> {
    // Format message appropriately for the channel type
    const formattedMessage = this.formatMessageForChannel(
      channel.type,
      notification,
    )
    
    // In production, this would integrate with actual notification services
    // For now, we'll just log the notification
    
    logger.info(`[SIMULATION] Sending ${channel.type} notification`, {
      recipients: channel.recipients,
      title: notification.title,
      alertLevel: notification.alertLevel,
      message: formattedMessage,
    })
    
    // Simulate channel-specific sending logic
    switch (channel.type) {
      case 'email':
        // await emailService.send({
        //   to: channel.recipients,
        //   subject: `URGENT: ${notification.title}`,
        //   body: formattedMessage,
        //   priority: 'high'
        // })
        break
        
      case 'sms':
        // await smsService.send({
        //   to: channel.recipients,
        //   message: formattedMessage
        // })
        break
        
      case 'app':
        // await pushNotificationService.send({
        //   users: channel.recipients,
        //   title: notification.title,
        //   body: formattedMessage,
        //   data: {
        //     caseId: notification.caseId,
        //     actionLink: notification.actionLink,
        //     alertLevel: notification.alertLevel
        //   },
        //   priority: 'high'
        // })
        break
        
      case 'slack':
        // await slackService.sendMessage({
        //   channels: channel.recipients,
        //   text: formattedMessage,
        //   blocks: [
        //     {
        //       type: 'header',
        //       text: {
        //         type: 'plain_text',
        //         text: notification.title
        //       }
        //     },
        //     {
        //       type: 'section',
        //       text: {
        //         type: 'mrkdwn',
        //         text: formattedMessage
        //       }
        //     },
        //     {
        //       type: 'actions',
        //       elements: [
        //         {
        //           type: 'button',
        //           text: {
        //             type: 'plain_text',
        //             text: 'View Case'
        //           },
        //           url: notification.actionLink,
        //           style: 'primary'
        //         }
        //       ]
        //     }
        //   ]
        // })
        break
        
      case 'teams':
        // await teamsService.sendMessage({
        //   webhook: channel.recipients[0],
        //   title: notification.title,
        //   text: formattedMessage,
        //   actions: [
        //     {
        //       type: 'OpenUrl',
        //       name: 'View Case',
        //       value: notification.actionLink
        //     }
        //   ]
        // })
        break
        
      case 'phone':
        // await phoneCallService.makeCall({
        //   to: channel.recipients,
        //   message: formattedMessage,
        //   priority: 'emergency'
        // })
        break
        
      case 'pager':
        // await pagerService.page({
        //   recipients: channel.recipients,
        //   message: `${notification.title}: ${formattedMessage.substring(0, 100)}...`
        // })
        break
        
      default:
        logger.warn('Unknown channel type', { type: channel.type })
        throw new Error(`Unsupported channel type: ${channel.type}`)
    }
    
    // For simulation purposes, we'll just return success
    return Promise.resolve()
  }
  
  /**
   * Format message appropriately for different channel types
   */
  private formatMessageForChannel(
    channelType: string,
    notification: CrisisNotification
  ): string {
    const alertEmoji = {
      concern: '⚠️',
      moderate: '🟠',
      severe: '🔴',
      emergency: '🚨'
    }
    
    const emoji = alertEmoji[notification.alertLevel] || '⚠️'
    
    // Create a base message that works for most channels
    let baseMessage = `${emoji} CRISIS ALERT: ${notification.alertLevel.toUpperCase()} LEVEL\n\n`
    baseMessage += notification.body
    baseMessage += `\n\nCase ID: ${notification.caseId}`
    baseMessage += `\nPatient ID: ${notification.patientId}`
    baseMessage += `\nSession ID: ${notification.sessionId}`
    baseMessage += `\nTimestamp: ${notification.timestamp}`
    
    // Add action info
    baseMessage += `\n\nURGENT: Please respond to this crisis according to protocol.`
    baseMessage += `\nView case: ${notification.actionLink}`
    
    // Format differently based on channel type
    switch (channelType) {
      case 'sms':
        // SMS needs to be shorter
        return `${emoji} CRISIS ALERT (${notification.alertLevel}): ${notification.title}. Patient: ${notification.patientId}. View: ${notification.actionLink}`
      
      case 'pager':
        // Pager needs to be very short
        return `CRISIS ${notification.alertLevel}: ${notification.patientId}. ${notification.actionLink}`
      
      case 'slack':
      case 'teams':
        // Rich formatting for Slack/Teams
        return baseMessage.replace(/\n/g, '\n\n')
      
      case 'phone':
        // Script for phone calls
        return `This is an automated crisis alert from the mental health system. A ${notification.alertLevel} level crisis has been detected for patient ID ${notification.patientId}. Please check your secure messaging system immediately for details and respond according to protocol.`
      
      default:
        // Default formatting works for email, app, etc.
        return baseMessage
    }
  }
  
  /**
   * Create a notification object from crisis data
   */
  public createNotification(params: {
    alertLevel: CrisisAlertLevel
    caseId: string
    patientId: string
    sessionId: string
    textSample: string
    detectedRisks: string[]
    actionLink?: string
  }): CrisisNotification {
    const alertEmoji = {
      concern: '⚠️',
      moderate: '🟠',
      severe: '🔴',
      emergency: '🚨'
    }
    
    const emoji = alertEmoji[params.alertLevel] || '⚠️'
    const title = `${emoji} ${params.alertLevel.toUpperCase()} Crisis Alert: Patient ${params.patientId}`
    
    // Format body with appropriate details
    let body = `A ${params.alertLevel} level crisis has been detected in session ${params.sessionId} for patient ${params.patientId}.\n\n`
    
    if (params.detectedRisks && params.detectedRisks.length > 0) {
      body += `Detected risks: ${params.detectedRisks.join(', ')}\n\n`
    }
    
    if (params.textSample) {
      const truncatedSample = params.textSample.length > 200 
        ? params.textSample.substring(0, 200) + '...' 
        : params.textSample
      
      body += `Sample content: "${truncatedSample}"\n\n`
    }
    
    // Add appropriate response options based on level
    const responseOptions = this.getResponseOptionsForLevel(params.alertLevel)
    
    // Create action link if not provided
    const actionLink = params.actionLink || 
      `https://app.example.com/crisis/${params.caseId}?patient=${params.patientId}`
    
    return {
      title,
      body,
      alertLevel: params.alertLevel,
      caseId: params.caseId,
      patientId: params.patientId,
      sessionId: params.sessionId,
      timestamp: new Date().toISOString(),
      actionLink,
      responseOptions
    }
  }
  
  /**
   * Get appropriate response options based on alert level
   */
  private getResponseOptionsForLevel(level: CrisisAlertLevel): string[] {
    switch (level) {
      case 'emergency':
        return [
          'Acknowledge and respond immediately',
          'Contact emergency services',
          'Attempt direct contact with patient',
          'Escalate to supervisor'
        ]
        
      case 'severe':
        return [
          'Acknowledge and respond',
          'Review case details',
          'Contact patient within 30 minutes',
          'Consult with clinical team'
        ]
        
      case 'moderate':
        return [
          'Acknowledge alert',
          'Review case details',
          'Schedule follow-up',
          'Assign to clinical team'
        ]
        
      case 'concern':
        return [
          'Acknowledge alert',
          'Review at next availability',
          'Flag for monitoring'
        ]
        
      default:
        return ['Acknowledge alert', 'Review case']
    }
  }
} 