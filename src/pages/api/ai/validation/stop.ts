import type { APIRoute } from 'astro'
import { emotionValidationPipeline } from '../../../../lib/ai/emotions/EmotionValidationPipeline'
import { getLogger } from '../../../../lib/logging'
import { getCurrentUser } from '../../../../lib/auth'
import type { AstroCookies } from 'astro'
import {
  createAuditLog,
  AuditEventType,
  AuditEventStatus,
} from '../../../../lib/audit'

// Helper function to convert Request to AstroCookies
function getCookiesFromRequest(request: Request): AstroCookies {
  const cookieHeader = request.headers.get('cookie') || ''
  return {
    get: (name: string) => {
      const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
      return match ? { value: match[1] } : undefined
    },
    // Add required methods for AstroCookies interface
    has: (name: string) => {
      return cookieHeader.includes(`${name}=`)
    },
    set: () => {},
    delete: () => {},
  } as unknown as AstroCookies
}

export const POST: APIRoute = async ({ request }) => {
  const logger = getLogger({ prefix: 'validation-api' })

  try {
    // Get cookies from request
    const cookies = getCookiesFromRequest(request)
    
    // Authenticate the request
    const user = await getCurrentUser(cookies)
    if (!user) {
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
    if (user.role !== 'admin') {
      // Create audit log for unauthorized access attempt
      await createAuditLog(
        AuditEventType.SECURITY,
        'validation-pipeline-stop-unauthorized',
        user.id,
        'validation-api',
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        AuditEventStatus.FAILURE,
      )

      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to stop the validation pipeline',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Stop continuous validation
    logger.info('Stopping continuous validation')
    emotionValidationPipeline.stopContinuousValidation()

    // Create audit log for successful stop
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-pipeline-stop',
      user.id,
      'validation-api',
      {
        userId: user.id,
        username: user.fullName || user.email,
      },
      AuditEventStatus.SUCCESS,
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Continuous validation stopped successfully',
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
    logger.error(`Error stopping continuous validation: ${errorMessage}`)

    // Create audit log for failed stop
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-pipeline-stop',
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
        message: `Failed to stop continuous validation: ${errorMessage}`,
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
