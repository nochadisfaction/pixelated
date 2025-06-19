import type { APIRoute } from 'astro'
import { validationRunner } from '../../../../lib/ai/validation/ContinuousValidationRunner'
import { getLogger } from '../../../../lib/logging'
import { getSession } from '../../../../lib/auth/session'
import {
  createAuditLog,
  AuditEventType,
  AuditEventStatus,
} from '../../../../lib/audit'

export const GET: APIRoute = async ({ request }) => {
  const logger = getLogger({ prefix: 'validation-history' })

  try {
    // Authenticate the request
    const sessionData = await getSession(request)
    if (!sessionData) {
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

    // Parse query parameters for limit
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit =
      limitParam !== null && /^\d+$/.test(limitParam)
        ? parseInt(limitParam, 10)
        : 20
    if (limit <= 0 || isNaN(limit)) {
      return new Response(
        JSON.stringify({ error: 'Invalid limit parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Initialize the validation runner if needed
    await validationRunner.initialize()

    // Get history
    const history = await validationRunner.getRunHistory(limit)

    // Create audit log for successful retrieval
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-history-get',
      sessionData.user?.id || 'system',
      'validation-api',
      {
        userId: sessionData.user?.id,
        entriesCount: history.length,
      },
      AuditEventStatus.SUCCESS,
    )

    return new Response(
      JSON.stringify({
        success: true,
        history,
        count: history.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    )
  } catch (error) {
    // Log the error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Failed to get validation history: ${errorMessage}`)

    // Create audit log for failed retrieval
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-history-get',
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
        message: `Failed to get validation history: ${errorMessage}`,
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
