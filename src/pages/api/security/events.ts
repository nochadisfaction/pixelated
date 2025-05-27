import type { APIRoute } from 'astro'
import { getConvexClient } from '@/lib/convex'
import { api } from '@/convex/generated/api'
import { getLogger } from '@/lib/logging'

const logger = getLogger()

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const severity = url.searchParams.get('severity') as
      | 'critical'
      | 'high'
      | 'medium'
      | 'low'
      | null
    const startTime = url.searchParams.get('startTime')
    const endTime = url.searchParams.get('endTime')
    const limit = url.searchParams.get('limit')

    const client = await getConvexClient()
    const [events, stats] = await Promise.all([
      client.query(api.security.getSecurityEvents, {
        type: type || undefined,
        severity: severity || undefined,
        startTime: startTime ? parseInt(startTime) : undefined,
        endTime: endTime ? parseInt(endTime) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      }),
      client.query(api.security.getEventStats),
    ])

    return new Response(JSON.stringify({ events, stats }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    logger.error(
      'Error fetching security events:',
      error as Record<string, unknown>,
    )
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
