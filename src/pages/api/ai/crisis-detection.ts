import type { APIRoute } from 'astro'
import { CrisisDetectionService } from '../../../lib/ai/services/crisis-detection'
import { getAIServiceByProvider } from '../../../lib/ai/providers'
import { getSession } from '../../../lib/auth/session'
import type { SessionData } from '../../../lib/auth/session'
import { getLogger } from '../../../lib/logging'
import {
  createAuditLog,
  AuditEventType,
  AuditEventStatus,
  type AuditDetails,
} from '../../../lib/audit'
import type { AuditResource } from '../../../lib/audit/types'
import { CrisisProtocol } from '../../../lib/ai/crisis/CrisisProtocol'
import { recordCrisisEventToDb } from '../../../services/crisisEventDb'

import type { AlertConfiguration } from '../../../lib/ai/crisis/types' // Import AlertConfiguration

// Initialize logger first
const logger = getLogger({ prefix: 'api-crisis-detection' })

// --- BEGIN CrisisProtocol Initialization ---

// Basic Alert Configurations (customize as needed)
// Ensure this matches the AlertConfiguration interface from ../../../lib/ai/crisis/types.ts
const alertConfigurations: AlertConfiguration[] = [
  {
    level: 'concern',
    name: 'Concern Level Alert',
    description: 'Initial level of concern, requires monitoring.',
    thresholdScore: 0.3, // Score threshold that triggers this alert level
    triggerTerms: ['sad', 'lonely', 'worried', 'stressed'], // Terms that can trigger this alert
    autoEscalateAfterMs: 1000 * 60 * 60 * 2, // 2 hours
    requiredActions: ['Log event', 'Monitor user activity'],
    responseTemplate:
      'We notice you might be feeling {triggerTerms}. We are here to help.',
    escalationTimeMs: 1000 * 60 * 30, // 30 minutes for escalation review if not addressed
  },
  {
    level: 'moderate',
    name: 'Moderate Level Alert',
    description: 'Moderate level of concern, requires active review.',
    thresholdScore: 0.5, // Score threshold that triggers this alert level
    triggerTerms: ['depressed', 'hopeless', 'anxious', 'grief'], // Terms that can trigger this alert
    autoEscalateAfterMs: 1000 * 60 * 60 * 1, // 1 hour
    requiredActions: [
      'Log event',
      'Notify support staff',
      'Review user history',
    ],
    responseTemplate:
      'It sounds like you are going through a tough time with {triggerTerms}. A support member will reach out.',
    escalationTimeMs: 1000 * 60 * 15, // 15 minutes
  },
  {
    level: 'severe',
    name: 'Severe Level Alert',
    description: 'Severe level of concern, requires immediate attention.',
    thresholdScore: 0.7, // Score threshold that triggers this alert level
    triggerTerms: ['self-harm', 'suicidal thoughts', 'hurting myself'], // Terms that can trigger this alert
    autoEscalateAfterMs: 1000 * 60 * 30, // 30 minutes
    requiredActions: [
      'Log event',
      'Immediate notification to crisis team',
      'Engage safety protocol',
    ],
    responseTemplate:
      'We are very concerned about your safety regarding {triggerTerms}. Our crisis team is being notified immediately.',
    escalationTimeMs: 1000 * 60 * 5, // 5 minutes
  },
  {
    level: 'emergency',
    name: 'Emergency Level Alert',
    description:
      'Emergency situation, requires immediate intervention and possibly external services.',
    thresholdScore: 0.9, // Score threshold that triggers this alert level
    triggerTerms: ['suicide plan', 'immediate danger', 'want to die'], // Terms that can trigger this alert
    autoEscalateAfterMs: 1000 * 60 * 10, // 10 minutes
    requiredActions: [
      'Log event',
      'Activate emergency response plan',
      'Contact emergency services if necessary',
    ],
    responseTemplate:
      'This is an emergency concerning {triggerTerms}. We are taking immediate action to ensure your safety.',
    escalationTimeMs: 0, // Immediate escalation
  },
]

// Staff Channels - Using a special identifier for Slack.
// Add other channels (email, SMS) as needed.
const staffChannels = {
  concern: ['SLACK_WEBHOOK_CHANNEL'], // Send 'concern' level to Slack
  moderate: ['SLACK_WEBHOOK_CHANNEL'], // Send 'moderate' level to Slack
  severe: ['SLACK_WEBHOOK_CHANNEL'], // Send 'severe' level to Slack
  emergency: ['SLACK_WEBHOOK_CHANNEL'], // Send 'emergency' level to Slack
}

// Retrieve Slack Webhook URL from environment variables
// Make sure SLACK_WEBHOOK_URL is available in your deployment environment.
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

if (!slackWebhookUrl) {
  logger.warn(
    'SLACK_WEBHOOK_URL is not set in environment variables. Slack notifications for crisis alerts will be disabled.',
  )
}

const crisisProtocolInstance = CrisisProtocol.getInstance()
crisisProtocolInstance.initialize({
  alertConfigurations: alertConfigurations,
  staffChannels: staffChannels,
  crisisEventRecorder: recordCrisisEventToDb as unknown as (
    eventData: Record<string, any>,
  ) => Promise<void>,
  slackWebhookUrl: slackWebhookUrl, // Pass the retrieved URL
  // alertTimeoutMs: 300000, // Optional: 5 minutes default
})
// --- END CrisisProtocol Initialization ---

/**
 * API route for crisis detection
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now()
  let crisisDetected = false
  let session: SessionData | null = null

  try {
    // Get session for authentication
    session = await getSession(request)

    // Check if user is authenticated
    if (!session) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You must be logged in to access this endpoint',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      text,
      batch,
      sensitivityLevel = 'medium',
      provider = 'anthropic',
    } = body

    // Validate required fields
    if (!text && (!batch || !Array.isArray(batch))) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Either text or batch must be provided',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Get the appropriate AI service
    const aiService = getAIServiceByProvider(provider)
    if (!aiService) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: `Provider ${provider} is not supported`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Create crisis detection service
    const crisisService = new CrisisDetectionService({
      aiService,
      sensitivityLevel: sensitivityLevel as 'low' | 'medium' | 'high',
    })

    // Process request (either single text or batch)
    let result

    if (batch) {
      result = await crisisService.detectBatch(batch, {
        sensitivityLevel: sensitivityLevel as 'low' | 'medium' | 'high',
        userId: session.user.id,
        source: 'api-batch-request',
      })

      // Store each result in the database (now handled by the risk assessment system)
      // Check if any crisis was detected
      for (const detection of result) {
        if (detection.isCrisis) {
          crisisDetected = true // General flag
          // Call CrisisProtocol for each detected crisis in the batch
          try {
            await crisisProtocolInstance.handleCrisis(
              session.user.id,
              session.session?.access_token?.substring(0, 8) ||
                `batch-item-session-${crypto.randomUUID()}`, // Use part of access token or generate UUID
              detection.content, // Text sample from CrisisDetectionResult
              detection.confidence, // Detection score from CrisisDetectionResult
              detection.category ? [detection.category] : [], // Detected risks from CrisisDetectionResult
            )
          } catch (error) {
            logger.error('Error handling crisis event in batch:', {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              detection,
            })
          }
        }
      }
    } else {
      result = await crisisService.detectCrisis(text, {
        sensitivityLevel: sensitivityLevel as 'low' | 'medium' | 'high',
        userId: session.user.id,
        source: 'api-request',
      })

      // Check if crisis was detected
      if (result?.isCrisis) {
        crisisDetected = true
        // Call CrisisProtocol for the detected crisis
        try {
          await CrisisProtocol.getInstance().handleCrisis(
            session.user.id,
            session.session?.access_token?.substring(0, 8) ||
              `single-item-session-${crypto.randomUUID()}`, // Use part of access token or generate UUID
            result.content, // Text sample from CrisisDetectionResult
            result.confidence, // Detection score from CrisisDetectionResult
            result.category ? [result.category] : [], // Detected risks from CrisisDetectionResult
          )
        } catch (error) {
          logger.error('Error handling single crisis event:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            result,
          })
        }
      }
    }

    // Calculate latency
    const latencyMs = Date.now() - startTime

    // Log results
    logger.info('Crisis detection completed', {
      latencyMs,
      crisisDetected,
      sensitivityLevel,
      isBatch: !!batch,
      userId: session.user.id,
    })

    // Define audit resource
    const aiResource: AuditResource = {
      id: 'crisis-detection',
      type: 'ai',
    }

    // Create audit log entry for the request
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'ai.crisis.request',
      session.user.id,
      aiResource.id, // resource is a string
      {
        // details instead of metadata
        modelName: aiService.getModelInfo('default')?.name || 'unknown',
        sensitivityLevel,
        batchSize: batch ? batch.length : 0,
        textLength: text ? text.length : 0,
        resourceType: aiResource.type,
      } as AuditDetails,
      AuditEventStatus.SUCCESS,
    )

    // Create audit log entry for the response
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'ai.crisis.response',
      session.user.id,
      aiResource.id, // resource is a string
      {
        // details instead of metadata
        modelName: aiService.getModelInfo('default')?.name || 'unknown',
        resultCount: batch ? (result as unknown[]).length : 1,
        crisisDetected,
        latencyMs: Date.now() - startTime,
        priority: crisisDetected ? 'high' : 'normal',
        resourceType: aiResource.type,
      } as AuditDetails,
      AuditEventStatus.SUCCESS,
    )

    // Return response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Error processing crisis detection request:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Define audit resource for error
    const aiResource: AuditResource = {
      id: 'crisis-detection',
      type: 'ai',
    }

    // Create audit log entry for the error
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'ai.crisis.error',
      session?.user?.id || 'anonymous',
      aiResource.id, // resource is a string
      {
        // details instead of metadata
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        status: 'error', // This can go into details
        resourceType: aiResource.type,
      } as AuditDetails,
      AuditEventStatus.FAILURE,
    )

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to process crisis detection request',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
