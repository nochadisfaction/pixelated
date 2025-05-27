import type { APIRoute } from 'astro'
import { CrisisDetectionService } from '../../../lib/ai/services/crisis-detection'
import { getAIServiceByProvider } from '../../../lib/ai/providers'
import { getSession } from '../../../lib/auth/session'
import { getLogger } from '../../../lib/logging'
import { createAuditLog } from '../../../lib/audit/log'
import type { AuditResource, AuditLogEntry } from '../../../lib/audit/log'

const logger = getLogger({ prefix: 'api-crisis-detection' })

/**
 * API route for crisis detection
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now()
  let crisisDetected = false
  let session: any = null

  try {
    // Get session for authentication
    session = await getSession(request)

    // Check if user is authenticated
    if (!session?.user) {
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
          crisisDetected = true
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
    const requestAuditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.request',
      resource: aiResource,
      metadata: {
        modelName: aiService.getModelInfo('default')?.name || 'unknown',
        sensitivityLevel,
        batchSize: batch ? batch.length : 0,
        textLength: text ? text.length : 0,
      },
      timestamp: new Date(),
    }

    // Log the request
    await createAuditLog(requestAuditEntry)

    // Create audit log entry for the response
    const responseAuditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.response',
      resource: aiResource,
      metadata: {
        modelName: aiService.getModelInfo('default')?.name || 'unknown',
        resultCount: batch ? (result as any[]).length : 1,
        crisisDetected,
        latencyMs: Date.now() - startTime,
        priority: crisisDetected ? 'high' : 'normal',
      },
      timestamp: new Date(),
    }

    // Log the response
    await createAuditLog(responseAuditEntry)

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
    const errorAuditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.error',
      resource: aiResource,
      metadata: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        status: 'error',
      },
      timestamp: new Date(),
    }

    // Create audit log for the error
    await createAuditLog(errorAuditEntry)

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
