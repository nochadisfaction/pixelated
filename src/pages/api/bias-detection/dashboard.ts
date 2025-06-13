import type { APIRoute } from 'astro'
import { BiasDetectionEngine } from '@/lib/ai/bias-detection/BiasDetectionEngine'
import { getLogger } from '@/lib/utils/logger'
import type { BiasDashboardData } from '@/lib/ai/bias-detection/types'

const logger = getLogger('BiasDashboardAPI')

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'
    const demographicFilter = url.searchParams.get('demographic') || 'all'

    logger.info('Fetching bias detection dashboard data', {
      timeRange,
      demographicFilter,
    })

    // Initialize bias detection engine
    const biasEngine = new BiasDetectionEngine({
      warningThreshold: 0.3,
      highThreshold: 0.6,
      criticalThreshold: 0.8,
      enableHipaaCompliance: true,
      enableAuditLogging: true,
    })

    // Get dashboard metrics
    const dashboardData = await biasEngine.getDashboardData({
      timeRange,
      demographicFilter,
    })

    // Calculate time range for filtering
    const now = new Date()
    const timeRangeMs = getTimeRangeMs(timeRange)

    // Mock data structure - in production this would come from your database
    const mockDashboardData: BiasDashboardData = {
      summary: {
        totalSessions: 1247,
        averageBiasScore: 0.23,
        alertsCount: 12,
        trendsDirection: 'improving',
        lastUpdated: now.toISOString(),
      },
      alerts: [
        {
          id: 'alert-001',
          sessionId: 'session-123',
          level: 'high',
          message: 'Potential gender bias detected in therapeutic responses',
          timestamp: new Date(now.getTime() - 3600000).toISOString(),
          biasType: 'gender',
          confidence: 0.87,
          affectedDemographics: ['female', 'non-binary'],
          recommendations: [
            'Review language patterns in AI responses',
            'Implement gender-neutral terminology',
            'Retrain model with balanced dataset',
          ],
        },
        {
          id: 'alert-002',
          sessionId: 'session-456',
          level: 'medium',
          message: 'Cultural bias indicators in treatment recommendations',
          timestamp: new Date(now.getTime() - 7200000).toISOString(),
          biasType: 'cultural',
          confidence: 0.72,
          affectedDemographics: ['hispanic', 'asian'],
          recommendations: [
            'Include cultural competency training',
            'Review cultural assumptions in scenarios',
          ],
        },
      ],
      trends: {
        biasScoreOverTime: generateTrendData(timeRange, 'bias_score'),
        alertsOverTime: generateTrendData(timeRange, 'alerts'),
        demographicTrends: generateDemographicTrends(timeRange),
      },
      demographics: {
        totalParticipants: 1247,
        breakdown: [
          {
            group: 'Female',
            count: 623,
            percentage: 50.0,
            averageBiasScore: 0.21,
          },
          {
            group: 'Male',
            count: 498,
            percentage: 39.9,
            averageBiasScore: 0.25,
          },
          {
            group: 'Non-binary',
            count: 87,
            percentage: 7.0,
            averageBiasScore: 0.28,
          },
          {
            group: 'Prefer not to say',
            count: 39,
            percentage: 3.1,
            averageBiasScore: 0.22,
          },
        ],
        ageGroups: [
          { range: '18-25', count: 312, averageBiasScore: 0.26 },
          { range: '26-35', count: 456, averageBiasScore: 0.22 },
          { range: '36-45', count: 298, averageBiasScore: 0.21 },
          { range: '46-55', count: 134, averageBiasScore: 0.24 },
          { range: '56+', count: 47, averageBiasScore: 0.23 },
        ],
        ethnicities: [
          { group: 'White', count: 687, averageBiasScore: 0.22 },
          { group: 'Hispanic/Latino', count: 234, averageBiasScore: 0.25 },
          {
            group: 'Black/African American',
            count: 156,
            averageBiasScore: 0.24,
          },
          { group: 'Asian', count: 98, averageBiasScore: 0.21 },
          { group: 'Other', count: 72, averageBiasScore: 0.26 },
        ],
      },
      recentSessions: [
        {
          sessionId: 'session-789',
          timestamp: new Date(now.getTime() - 1800000).toISOString(),
          biasScore: 0.15,
          alertLevel: 'low',
          participantDemographics: {
            gender: 'female',
            age: '28',
            ethnicity: 'white',
          },
          scenario: 'Anxiety management training',
        },
        {
          sessionId: 'session-790',
          timestamp: new Date(now.getTime() - 2400000).toISOString(),
          biasScore: 0.67,
          alertLevel: 'high',
          participantDemographics: {
            gender: 'male',
            age: '34',
            ethnicity: 'hispanic',
          },
          scenario: 'Depression intervention simulation',
        },
      ],
    }

    return new Response(JSON.stringify(mockDashboardData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    logger.error('Failed to fetch bias detection dashboard data', { error })

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
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

function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case '1h':
      return 60 * 60 * 1000
    case '6h':
      return 6 * 60 * 60 * 1000
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    case '30d':
      return 30 * 24 * 60 * 60 * 1000
    default:
      return 24 * 60 * 60 * 1000
  }
}

function generateTrendData(timeRange: string, metric: 'bias_score' | 'alerts') {
  const points =
    timeRange === '1h'
      ? 12
      : timeRange === '6h'
        ? 24
        : timeRange === '24h'
          ? 24
          : 30
  const data = []
  const now = new Date()

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(
      now.getTime() - (i * getTimeRangeMs(timeRange)) / points,
    )

    if (metric === 'bias_score') {
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.random() * 0.4 + 0.1, // Random bias score between 0.1-0.5
        label: timestamp.toLocaleTimeString(),
      })
    } else {
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.floor(Math.random() * 5), // Random alert count 0-4
        label: timestamp.toLocaleTimeString(),
      })
    }
  }

  return data
}

function generateDemographicTrends(timeRange: string) {
  return {
    genderTrends: [
      { demographic: 'Female', trend: 'improving', change: -0.05 },
      { demographic: 'Male', trend: 'stable', change: 0.01 },
      { demographic: 'Non-binary', trend: 'concerning', change: 0.08 },
    ],
    ageTrends: [
      { demographic: '18-25', trend: 'stable', change: 0.02 },
      { demographic: '26-35', trend: 'improving', change: -0.03 },
      { demographic: '36-45', trend: 'improving', change: -0.04 },
      { demographic: '46+', trend: 'stable', change: 0.01 },
    ],
    ethnicityTrends: [
      { demographic: 'White', trend: 'stable', change: 0.0 },
      { demographic: 'Hispanic/Latino', trend: 'concerning', change: 0.06 },
      {
        demographic: 'Black/African American',
        trend: 'improving',
        change: -0.02,
      },
      { demographic: 'Asian', trend: 'stable', change: -0.01 },
    ],
  }
}
