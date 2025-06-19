export const prerender = false

import type { APIRoute } from 'astro'
import { api } from '@/convex/generated/api'

/**
 * API endpoint for fetching system metrics (admin only)
 * GET /api/admin/metrics
 */
export const GET: APIRoute = async () => {
  try {
    // Create Convex client outside of React hooks
    const client = await import('@/lib/convex').then((m) => m.getConvexClient())

    // Fetch metrics from Convex
    const [
      activeUsers,
      activeSessions,
      avgResponseTime,
      systemLoad,
      storageUsed,
      messagesSent,
      activeSecurityLevel,
    ] = await Promise.all([
      client.query(api['metrics']['getActiveUsers']),
      client.query(api['metrics']['getActiveSessions']),
      client.query(api['metrics']['getAverageResponseTime']),
      client.query(api['metrics']['getSystemLoad']),
      client.query(api['metrics']['getStorageUsed']),
      client.query(api['metrics']['getMessagesSent']),
      client.query(api['metrics']['getActiveSecurityLevel']),
    ])

    return new Response(
      JSON.stringify({
        activeUsers,
        activeSessions,
        avgResponseTime,
        systemLoad,
        storageUsed,
        messagesSent,
        activeSecurityLevel,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
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
