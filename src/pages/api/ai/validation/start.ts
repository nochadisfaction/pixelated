import type { APIRoute } from 'astro'
import { emotionValidationPipeline } from '../../../../lib/ai/emotions/EmotionValidationPipeline'
import { getLogger } from '../../../../lib/logging'
import { isAuthenticated } from '../../../../lib/auth'
import {
  createAuditLog,
  AuditEventType,
  AuditEventStatus,
} from '../../../../lib/audit'

export const POST: APIRoute = async ({ request }) => {
  const logger = getLogger({ prefix: 'validation-api' })

  try {
    // Authenticate the request
    const authResult = await isAuthenticated(request)
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You must be authenticated to access this endpoint',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Check user permissions (must be admin)
    if (!authResult.user?.isAdmin) {
      // Create audit log for unauthorized access attempt
      await createAuditLog(
        AuditEventType.SECURITY_EVENT,
        'validation-pipeline-start-unauthorized',
        authResult.user?.id || 'unknown',
        'validation-api',
        {
          userId: authResult.user?.id,
          email: authResult.user?.email,
        },
        AuditEventStatus.FAILURE,
      )

      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message:
            'You do not have permission to start the validation pipeline',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Initialize if not already initialized
    if (!emotionValidationPipeline.isInitialized) {
      await emotionValidationPipeline.initialize()
    }

    // Start continuous validation
    logger.info('Starting continuous validation')
    emotionValidationPipeline.startContinuousValidation()

    // Create audit log for successful start
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-pipeline-start',
      authResult.user?.id || 'system',
      'validation-api',
      {
        userId: authResult.user?.id,
        username: authResult.user?.username || authResult.user?.email,
      },
      AuditEventStatus.SUCCESS,
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Continuous validation started successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    // Log the error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error starting continuous validation: ${errorMessage}`)

    // Create audit log for failed start
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-pipeline-start',
      'system',
      'validation-api',
      {
        error: errorMessage,
      },
      AuditEventStatus.FAILURE,
    )

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: `Failed to start continuous validation: ${errorMessage}`,
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
