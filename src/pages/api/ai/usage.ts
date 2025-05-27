import type { AuditMetadata } from '@/lib/audit/log'
import type { APIRoute } from 'astro'
import { createAuditLog } from '@/lib/audit/log'
import { getAIUsageStats } from '../../../lib/ai/analytics'
import { handleApiError } from '../../../lib/ai/error-handling'
import { getSession } from '../../../lib/auth/session'
import { validateQueryParams } from '../../../lib/validation/index'
import { UsageStatsRequestSchema } from '../../../lib/validation/schemas'
import { RateLimiter } from '../../../lib/middleware/rate-limit'
import { getLogger } from '../../../lib/logging'

// Initialize logger
const logger = getLogger()

// Initialize rate limiter
const rateLimiter = new RateLimiter(30, 60 * 1000)

/**
 * API route for AI usage statistics
 * Secured by authentication and input validation
 * Rate limited to prevent abuse
 */
export const GET: APIRoute = async ({ request }) => {
  let session

  try {
    // Verify session
    session = await getSession(request)
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Apply rate limiting based on user role
    const role = session.user.role || 'user'
    const { allowed, limit, remaining, reset } = rateLimiter.check(
      `${session.user.id}:/api/ai/usage`,
      role,
      {
        admin: 60, // 60 requests per minute for admins
        therapist: 40, // 40 requests per minute for therapists
        user: 20, // 20 requests per minute for regular users
        anonymous: 5, // 5 requests per minute for unauthenticated users
      },
      60 * 1000, // 1 minute window
    )

    if (!allowed) {
      logger.warn('Rate limit exceeded for AI usage stats', {
        userId: session.user.id,
        role: role,
      })

      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    // Check if user has admin access for all users data
    const isAdmin = session?.user?.role === 'admin'

    // Validate query parameters
    const [params, validationError] = validateQueryParams(
      new URL(request.url),
      UsageStatsRequestSchema,
    )

    if (validationError) {
      // Create audit log for validation error
      await createAuditLog(
        session?.user?.id || 'anonymous',
        'ai.usage.validation_error',
        'ai_usage',
        {
          error: validationError.error,
          details: JSON.stringify(validationError.details),
          status: 'error',
        } as AuditMetadata,
        request,
      )

      return new Response(JSON.stringify(validationError), {
        status: validationError.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Only allow admins to view all users' data
    if (params!.allUsers && !isAdmin) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to view all users data',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Create audit log for the request
    await createAuditLog(
      session?.user?.id || 'anonymous',
      'ai.usage.request',
      'ai_usage',
      {
        period: params!.period,
        allUsers: params!.allUsers,
        startDate: params!.startDate,
        endDate: params!.endDate,
        status: 'success',
      },
      request,
    )

    // Get usage statistics
    const stats = await getAIUsageStats({
      period: params!.period,
      userId: params!.allUsers ? undefined : session?.user?.id,
      startDate: params!.startDate ? new Date(params!.startDate) : undefined,
      endDate: params!.endDate ? new Date(params!.endDate) : undefined,
    })

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    })
  } catch (error) {
    console.error('Error in AI usage API:', error)

    // Create audit log for the error
    await createAuditLog(
      session?.user?.id || 'anonymous',
      'ai.usage.error',
      'ai_usage',
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status: 'error',
      },
      request,
    )

    // Use standardized error handling
    return handleApiError(error)
  }
}
