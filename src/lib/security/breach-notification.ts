import { Auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'
import { fheService } from '@/lib/fhe'

// Create an interface to extend Auth with getUserById method
interface ExtendedAuth extends Auth {
  getUserById(userId: string): Promise<{
    id: string
    email: string
    name: string | null
  }>
}

// Create a mock sendEmail function since it doesn't exist
interface EmailOptions {
  to: string
  subject: string
  body: string
  priority?: 'normal' | 'urgent'
  metadata?: Record<string, any>
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Mock implementation
  logger.info('Email sent', { to: options.to, subject: options.subject })
  return Promise.resolve()
}

// Create auth instance and cast to extended interface
const auth = new Auth() as ExtendedAuth

// We need to add a getUserById method to Auth class if it doesn't exist
if (!auth.getUserById) {
  auth.getUserById = async function (userId: string) {
    // Mock implementation that returns definite string values
    return {
      id: userId,
      email: `user-${userId}@example.com`, // Definitely a string
      name: `User ${userId}`, // Definitely a string
    }
  }
}

interface BreachDetails {
  id: string
  timestamp: number
  type: 'unauthorized_access' | 'data_leak' | 'system_compromise' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedUsers: string[]
  affectedData: string[]
  detectionMethod: string
  remediation: string
  notificationStatus: 'pending' | 'in_progress' | 'completed'
}

interface NotificationTemplate {
  subject: string
  body: string
  priority: 'normal' | 'urgent'
}

// Implement proper mock for HHS_NOTIFICATION_EMAIL
// Make sure process.env values are handled safely
const ENV = {
  ORGANIZATION_NAME: process.env.ORGANIZATION_NAME || 'Pixelated Empathy Health',
  SECURITY_CONTACT: process.env.SECURITY_CONTACT || 'security@example.com',
  ORGANIZATION_ADDRESS:
    process.env.ORGANIZATION_ADDRESS || '123 Health St, MedCity',
  HHS_NOTIFICATION_EMAIL:
    process.env.HHS_NOTIFICATION_EMAIL || 'hhs-notifications@example.gov',
  SECURITY_STAKEHOLDERS: (
    process.env.SECURITY_STAKEHOLDERS || 'admin@example.com'
  ).split(','),
}

export class BreachNotificationSystem {
  private static readonly BREACH_KEY_PREFIX = 'breach:'
  private static readonly NOTIFICATION_WINDOW = 60 * 60 * 24 // 24 hours in seconds
  private static readonly DOCUMENTATION_RETENTION = 60 * 60 * 24 * 365 * 6 // 6 years in seconds
  private static readonly METRICS_KEY_PREFIX = 'metrics:breach:'
  private static readonly TRAINING_KEY_PREFIX = 'training:breach:'

  private static getBreachKey(id: string): string {
    return `${this.BREACH_KEY_PREFIX}${id}`
  }

  static async reportBreach(
    details: Omit<BreachDetails, 'id' | 'timestamp' | 'notificationStatus'>,
  ): Promise<string> {
    try {
      const id = `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const breach: BreachDetails = {
        ...details,
        id,
        timestamp: Date.now(),
        notificationStatus: 'pending',
      }

      // Store breach details
      await redis.set(
        this.getBreachKey(id),
        JSON.stringify(breach),
        'EX',
        60 * 60 * 24 * 30, // 30 days retention
      )

      // Log the breach
      logger.error('Security breach detected:', {
        id,
        type: breach.type,
        severity: breach.severity,
        description: breach.description,
        affectedUsers: breach.affectedUsers.length,
      })

      // Start notification process
      await this.initiateNotificationProcess(breach)

      return id
    } catch (error) {
      logger.error('Failed to report breach:', error)
      throw error
    }
  }

  private static async initiateNotificationProcess(
    breach: BreachDetails,
  ): Promise<void> {
    try {
      // Update status
      const updatedBreach = { ...breach, notificationStatus: 'in_progress' }
      await redis.set(
        this.getBreachKey(breach.id),
        JSON.stringify(updatedBreach),
      )

      // Prepare notifications
      const template = this.getNotificationTemplate(breach)

      // Notify affected users
      await this.notifyAffectedUsers(breach, template)

      // Notify authorities if required by HIPAA
      if (this.requiresAuthorityNotification(breach)) {
        await this.notifyAuthorities(breach)
      }

      // Notify internal stakeholders
      await this.notifyInternalStakeholders(breach)

      // Update status to completed
      const completedBreach = {
        ...updatedBreach,
        notificationStatus: 'completed',
      }
      await redis.set(
        this.getBreachKey(breach.id),
        JSON.stringify(completedBreach),
      )
    } catch (error) {
      logger.error('Failed to process breach notifications:', error)
      throw error
    }
  }

  private static getNotificationTemplate(
    breach: BreachDetails,
  ): NotificationTemplate {
    const isUrgent =
      breach.severity === 'critical' || breach.severity === 'high'

    return {
      subject: `Important Security Notice - ${breach.severity.toUpperCase()} Security Event`,
      body: `
Dear [User],

We are writing to inform you about a security incident that may have affected your account.

Incident Details:
- Type: ${breach.type}
- Date Detected: ${new Date(breach.timestamp).toLocaleDateString()}
- Affected Information: ${breach.affectedData.join(', ')}

Actions Taken:
${breach.remediation}

Steps You Should Take:
1. Change your password immediately
2. Review your account activity
3. Enable two-factor authentication if not already enabled
4. Monitor your accounts for suspicious activity

We take your privacy and security seriously and are working diligently to prevent such incidents in the future.

If you notice any suspicious activity or have questions, please contact our support team immediately.

Best regards,
Security Team
      `.trim(),
      priority: isUrgent ? 'urgent' : 'normal',
    }
  }

  private static async notifyAffectedUsers(
    breach: BreachDetails,
    template: NotificationTemplate,
  ): Promise<void> {
    const notifications = breach.affectedUsers.map(async (userId) => {
      try {
        const user = await auth.getUserById(userId)

        // Since our getUserById returns confirmed strings, we don't need to check
        // but keeping the pattern here for robustness in case implementation changes
        if (!user || !user.email) {
          logger.warn(`User ${userId} has no email, skipping notification`)
          return
        }

        // Encrypt notification details using FHE
        const encryptedDetails = await fheService.encrypt(
          JSON.stringify({
            breachId: breach.id,
            timestamp: breach.timestamp,
            type: breach.type,
          }),
        )

        await sendEmail({
          to: user.email, // This is guaranteed to be a string from our implementation
          subject: template.subject,
          body: template.body.replace('[User]', user.name || 'Valued User'),
          priority: template.priority,
          metadata: {
            type: 'security_breach',
            breachId: breach.id,
            encryptedDetails,
          },
        })
      } catch (error) {
        logger.error('Failed to notify user:', {
          userId,
          breachId: breach.id,
          error,
        })
      }
    })

    await Promise.all(notifications)
  }

  private static requiresAuthorityNotification(breach: BreachDetails): boolean {
    // HIPAA requires notification for breaches affecting 500 or more individuals
    return breach.affectedUsers.length >= 500 || breach.severity === 'critical'
  }

  private static async notifyAuthorities(breach: BreachDetails): Promise<void> {
    try {
      // Prepare HIPAA-compliant notification
      const notification = {
        breachId: breach.id,
        organizationInfo: {
          name: ENV.ORGANIZATION_NAME,
          contact: ENV.SECURITY_CONTACT,
          address: ENV.ORGANIZATION_ADDRESS,
        },
        breach: {
          type: breach.type,
          discoveryDate: new Date(breach.timestamp).toISOString(),
          description: breach.description,
          affectedIndividuals: breach.affectedUsers.length,
          affectedData: breach.affectedData,
          remediation: breach.remediation,
        },
      }

      // Send to HHS (Health and Human Services)
      await sendEmail({
        to: ENV.HHS_NOTIFICATION_EMAIL,
        subject: `HIPAA Breach Notification - ${breach.id}`,
        body: JSON.stringify(notification, null, 2),
        priority: 'urgent',
        metadata: {
          type: 'hipaa_breach_notification',
          breachId: breach.id,
        },
      })

      // Log the notification
      logger.info('Authority notification sent:', {
        breachId: breach.id,
        timestamp: Date.now(),
      })
    } catch (error) {
      logger.error('Failed to notify authorities:', error)
      throw error
    }
  }

  private static async notifyInternalStakeholders(
    breach: BreachDetails,
  ): Promise<void> {
    try {
      const notifications = ENV.SECURITY_STAKEHOLDERS.map((email) =>
        sendEmail({
          to: email,
          subject: `Security Breach Alert - ${breach.severity.toUpperCase()} - ${breach.id}`,
          body: `
Security Breach Details:
- ID: ${breach.id}
- Type: ${breach.type}
- Severity: ${breach.severity}
- Description: ${breach.description}
- Affected Users: ${breach.affectedUsers.length}
- Affected Data: ${breach.affectedData.join(', ')}
- Detection Method: ${breach.detectionMethod}
- Remediation: ${breach.remediation}

Timeline:
- Detected: ${new Date(breach.timestamp).toISOString()}
- Notification Status: ${breach.notificationStatus}

Please review the incident and take necessary actions.
          `.trim(),
          priority: 'urgent',
          metadata: {
            type: 'internal_breach_notification',
            breachId: breach.id,
          },
        }),
      )

      await Promise.all(notifications)
    } catch (error) {
      logger.error('Failed to notify internal stakeholders:', error)
      throw error
    }
  }

  static async getBreachStatus(id: string): Promise<BreachDetails | null> {
    try {
      const breach = await redis.get(this.getBreachKey(id))
      return breach ? JSON.parse(breach) : null
    } catch (error) {
      logger.error('Failed to get breach status:', error)
      throw error
    }
  }

  static async listRecentBreaches(): Promise<BreachDetails[]> {
    try {
      const keys = await redis.keys(`${this.BREACH_KEY_PREFIX}*`)
      const breaches = await Promise.all(
        keys.map(async (key: string) => {
          const breach = await redis.get(key)
          return breach ? JSON.parse(breach) : null
        }),
      )

      return breaches.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      logger.error('Failed to list recent breaches:', error)
      throw error
    }
  }

  static async runTestScenario(scenario: {
    type: BreachDetails['type']
    severity: BreachDetails['severity']
    affectedUsers: number
  }): Promise<string> {
    try {
      // Generate test data
      const testUsers = Array.from(
        { length: scenario.affectedUsers },
        (_, i) => `test_user_${i}`,
      )

      const breachDetails = {
        type: scenario.type,
        severity: scenario.severity,
        description: `Test scenario: ${scenario.type} breach with ${scenario.affectedUsers} affected users`,
        affectedUsers: testUsers,
        affectedData: ['test_data'],
        detectionMethod: 'test_scenario',
        remediation: 'Test remediation steps',
      }

      // Run the test scenario
      const breachId = await this.reportBreach(breachDetails)

      // Log test execution
      await this.recordTestExecution(breachId, scenario)

      return breachId
    } catch (error) {
      logger.error('Failed to run test scenario:', error)
      throw error
    }
  }

  private static async recordTestExecution(
    breachId: string,
    scenario: any,
  ): Promise<void> {
    const testRecord = {
      breachId,
      scenario,
      timestamp: Date.now(),
      result: 'completed',
    }

    await redis.set(
      `${this.BREACH_KEY_PREFIX}test:${breachId}`,
      JSON.stringify(testRecord),
      'EX',
      this.DOCUMENTATION_RETENTION,
    )
  }

  static async updateMetrics(breach: BreachDetails): Promise<void> {
    try {
      const date = new Date(breach.timestamp)
      const monthKey = `${this.METRICS_KEY_PREFIX}${date.getFullYear()}-${date.getMonth() + 1}`

      const metrics = {
        totalBreaches: 1,
        byType: { [breach.type]: 1 },
        bySeverity: { [breach.severity]: 1 },
        totalAffectedUsers: breach.affectedUsers.length,
        averageNotificationTime:
          await this.calculateAverageNotificationTime(breach),
        notificationEffectiveness:
          await this.calculateNotificationEffectiveness(breach),
      }

      // Update monthly metrics
      await redis.hset(monthKey, {
        ...metrics,
        lastUpdated: Date.now(),
      })

      // Set retention period
      await redis.expire(monthKey, this.DOCUMENTATION_RETENTION)
    } catch (error) {
      logger.error('Failed to update metrics:', error)
    }
  }

  private static async calculateAverageNotificationTime(
    breach: BreachDetails,
  ): Promise<number> {
    const breachData = await this.getBreachStatus(breach.id)
    if (!breachData || breachData.notificationStatus !== 'completed') {
      return 0
    }

    // Calculate time from detection to completion
    return Date.now() - breach.timestamp
  }

  private static async calculateNotificationEffectiveness(
    breach: BreachDetails,
  ): Promise<number> {
    const totalNotifications = breach.affectedUsers.length
    const deliveredNotifications = await this.countDeliveredNotifications()

    return totalNotifications > 0
      ? deliveredNotifications / totalNotifications
      : 0
  }

  private static async countDeliveredNotifications(): Promise<number> {
    // Implementation would track email delivery status
    return 0 // Placeholder
  }

  static async getTrainingMaterials(): Promise<any> {
    try {
      const materials = {
        procedures: {
          title: 'Breach Notification Procedures',
          content: await this.getBreachProcedures(),
          lastUpdated: Date.now(),
        },
        guidelines: {
          title: 'HIPAA Compliance Guidelines',
          content: await this.getHIPAAGuidelines(),
          lastUpdated: Date.now(),
        },
        templates: {
          title: 'Notification Templates',
          content: await this.getNotificationTemplates(),
          lastUpdated: Date.now(),
        },
      }

      // Store training materials with retention period
      await redis.set(
        `${this.TRAINING_KEY_PREFIX}current`,
        JSON.stringify(materials),
        'EX',
        this.DOCUMENTATION_RETENTION,
      )

      return materials
    } catch (error) {
      logger.error('Failed to get training materials:', error)
      throw error
    }
  }

  private static async getBreachProcedures(): Promise<string> {
    return `
1. Immediate Response
   - Assess breach severity and scope
   - Identify affected users and data
   - Document initial findings

2. Notification Process
   - Prepare notifications for affected users
   - Determine if authority notification is required
   - Send notifications within required timeframes

3. Documentation Requirements
   - Record all breach details
   - Maintain notification records
   - Track remediation efforts

4. Follow-up Actions
   - Monitor for additional impacts
   - Update security measures
   - Review and update procedures
    `.trim()
  }

  private static async getHIPAAGuidelines(): Promise<string> {
    return `
HIPAA Breach Notification Requirements:

1. Timing Requirements
   - 60 days for breaches affecting 500+ individuals
   - Annual report for smaller breaches

2. Content Requirements
   - Description of breach
   - Types of information involved
   - Steps individuals should take
   - What the organization is doing
   - Contact information

3. Documentation
   - Maintain records for 6 years
   - Include all notifications sent
   - Record notification methods used
    `.trim()
  }

  private static async getNotificationTemplates(): Promise<string> {
    return `
1. User Notification Template
2. Authority Notification Template
3. Internal Stakeholder Template
4. Media Notification Template (if required)
    `.trim()
  }
}
