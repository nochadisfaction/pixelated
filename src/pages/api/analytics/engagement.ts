import type { APIRoute } from 'astro'
import { requirePageAuth } from '@/lib/auth/serverAuth'

// Disable prerendering since this API route uses request.headers
export const prerender = false

// Type definitions for engagement metrics
interface EngagementMetrics {
  totalSessions: number
  engagementRate: number
  avgSessionDuration: number
  activeUsers: number
  sessionTrends: {
    labels: string[]
    series: { name: string; data: number[]; color?: string }[]
  }
  engagementRateTrend: {
    labels: string[]
    series: { name: string; data: number[]; color?: string }[]
  }
  sessionDurationTrend: {
    labels: string[]
    series: { name: string; data: number[]; color?: string }[]
  }
  interactionBreakdown: {
    label: string
    value: number
  }[]
  recentActivity: {
    user: string
    action: string
    duration: number
    timestamp: number
    sessionScore: number
  }[]
}

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Enforce authentication (throws if not authenticated)
    await requirePageAuth({ request, cookies })

    // TODO: Replace with real data fetching logic
    // For now, return static/mock data (same as in engagement.astro)
    const metrics: EngagementMetrics = {
      totalSessions: 235,
      engagementRate: 48.5,
      avgSessionDuration: 14.5,
      activeUsers: 182,
      sessionTrends: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          {
            name: 'Sessions',
            data: [28, 34, 42, 38, 45, 35, 32],
            color: 'rgba(59, 130, 246, 0.5)',
          },
          {
            name: 'Unique Users',
            data: [20, 25, 30, 28, 33, 24, 22],
            color: 'rgba(16, 185, 129, 0.5)',
          },
        ],
      },
      engagementRateTrend: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          {
            name: 'Engagement Rate (%)',
            data: [42, 45, 48, 47, 52, 45, 44],
            color: 'rgba(139, 92, 246, 0.5)',
          },
        ],
      },
      sessionDurationTrend: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          {
            name: 'Average Duration (min)',
            data: [12.5, 13.2, 15.0, 14.8, 16.2, 14.0, 13.5],
            color: 'rgba(249, 115, 22, 0.5)',
          },
        ],
      },
      interactionBreakdown: [
        { label: 'Chat Responses', value: 35 },
        { label: 'Tool Usage', value: 25 },
        { label: 'Form Submissions', value: 18 },
        { label: 'Feedback Responses', value: 12 },
        { label: 'Report Views', value: 10 },
      ],
      recentActivity: [
        {
          user: 'User 123',
          action: 'Session Completed',
          duration: 14.5,
          timestamp: Date.now() - 1000 * 60 * 30,
          sessionScore: 87,
        },
        {
          user: 'User 456',
          action: 'Feedback Submitted',
          duration: 22.3,
          timestamp: Date.now() - 1000 * 60 * 45,
          sessionScore: 92,
        },
        {
          user: 'User 789',
          action: 'Assessment Taken',
          duration: 18.7,
          timestamp: Date.now() - 1000 * 60 * 60,
          sessionScore: 78,
        },
        {
          user: 'User 234',
          action: 'Chat Session',
          duration: 11.2,
          timestamp: Date.now() - 1000 * 60 * 90,
          sessionScore: 84,
        },
        {
          user: 'User 567',
          action: 'Report Generated',
          duration: 8.5,
          timestamp: Date.now() - 1000 * 60 * 120,
          sessionScore: 90,
        },
      ],
    }

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error: any) {
    // Log error securely (avoid leaking sensitive info)
    console.error('Engagement metrics API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch engagement metrics.' }),
      {
        status: error?.status || 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
