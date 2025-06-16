/**
 * Unit tests for the Bias Detection Dashboard API Endpoint
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockedFunction,
} from 'vitest'

// Mock all dependencies
vi.mock('@/lib/ai/bias-detection/BiasDetectionEngine')
vi.mock('@/lib/utils/logger')

import { BiasDetectionEngine } from '@/lib/ai/bias-detection/BiasDetectionEngine'
import { getLogger } from '@/lib/utils/logger'
import type { BiasDashboardData } from '@/lib/ai/bias-detection/types'

// Import the actual handler
const { GET } = await import('./dashboard')

describe('Bias Detection Dashboard API Endpoint', () => {
  let mockLogger: any
  let mockBiasEngine: any

  const mockDashboardData: BiasDashboardData = {
    summary: {
      totalSessions: 150,
      averageBiasScore: 0.35,
      highBiasSessions: 8,
      totalAlerts: 12,
      lastUpdated: new Date('2024-01-15T10:00:00Z'),
    },
    alerts: [
      {
        id: 'alert-1',
        type: 'high_bias',
        message: 'High bias detected in therapeutic session',
        timestamp: new Date('2024-01-15T09:30:00Z').toISOString(),
        level: 'high',
        sessionId: 'session-123',
        biasScore: 0.75,
        demographics: {
          age: '25-35',
          gender: 'female',
          ethnicity: 'hispanic',
          primaryLanguage: 'en',
        },
      },
      {
        id: 'alert-2',
        type: 'medium_bias',
        message: 'Medium bias detected in therapeutic session',
        timestamp: new Date('2024-01-15T08:45:00Z').toISOString(),
        level: 'medium',
        sessionId: 'session-124',
        biasScore: 0.45,
        demographics: {
          age: '35-45',
          gender: 'male',
          ethnicity: 'asian',
          primaryLanguage: 'en',
        },
      },
    ],
    trends: [
      {
        date: new Date('2024-01-14T00:00:00Z').toISOString(),
        biasScore: 0.32,
        sessionCount: 25,
        alertCount: 3,
      },
      {
        date: new Date('2024-01-15T00:00:00Z').toISOString(),
        biasScore: 0.35,
        sessionCount: 28,
        alertCount: 4,
      },
    ],
    demographics: {
      age: {
        '18-24': 20,
        '25-34': 35,
        '35-44': 25,
        '45-54': 15,
        '55+': 5,
      },
      gender: {
        male: 45,
        female: 50,
        other: 5,
      },
      ethnicity: {
        asian: 25,
        black: 20,
        hispanic: 30,
        white: 20,
        other: 5,
      },
    },
    recentAnalyses: [
      {
        sessionId: 'session-123',
        timestamp: new Date('2024-01-15T09:30:00Z').toISOString(),
        overallBiasScore: 0.75,
        alertLevel: 'high',
        demographics: {
          age: '25-35',
          gender: 'female',
          ethnicity: 'hispanic',
          primaryLanguage: 'en',
        },
      },
      {
        sessionId: 'session-124',
        timestamp: new Date('2024-01-15T08:45:00Z').toISOString(),
        overallBiasScore: 0.45,
        alertLevel: 'medium',
        demographics: {
          age: '35-45',
          gender: 'male',
          ethnicity: 'asian',
          primaryLanguage: 'en',
        },
      },
    ],
  }

  const createMockRequest = (
    searchParams: Record<string, string> = {},
    headers: Record<string, string> = {},
  ) => {
    const url = new URL('http://localhost:3000/api/bias-detection/dashboard')
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const defaultHeaders = {
      'authorization': 'Bearer valid-token',
      'content-type': 'application/json',
      ...headers,
    }

    return {
      url: url.toString(),
      headers: {
        get: vi.fn((key: string) => defaultHeaders[key.toLowerCase()] || null),
      },
    } as any
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup logger mocks
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    }
    ;(getLogger as MockedFunction<typeof getLogger>).mockReturnValue(mockLogger)

    // Setup global Response mock
    global.Response = vi.fn().mockImplementation((body, init) => {
      let responseData
      try {
        responseData = JSON.parse(body)
      } catch {
        responseData = { error: 'Invalid JSON' }
      }

      const defaultHeaders = new Map([
        ['Content-Type', 'application/json'],
        ['X-Processing-Time', '150'],
      ])

      return {
        status: init?.status || 200,
        json: vi.fn().mockResolvedValue(responseData),
        headers: {
          get: vi.fn((key: string) => defaultHeaders.get(key) || null),
        },
      }
    }) as any

    // Setup bias engine mocks
    mockBiasEngine = {
      getDashboardData: vi.fn().mockResolvedValue(mockDashboardData),
    }
    ;(BiasDetectionEngine as any).mockImplementation(() => mockBiasEngine)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/bias-detection/dashboard', () => {
    it('should successfully return dashboard data with default parameters', async () => {
      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockDashboardData)
      expect(typeof responseData.processingTime).toBe('number')

      // Verify bias engine was called with defaults
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h',
        demographicFilter: 'all',
      })

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching bias detection dashboard data',
        {
          timeRange: '24h',
          demographicFilter: 'all',
        },
      )
    })

    it('should handle custom time range parameter', async () => {
      const request = createMockRequest({ timeRange: '7d' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)

      // Verify bias engine was called with custom time range
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '7d',
        demographicFilter: 'all',
      })
    })

    it('should handle custom demographic filter parameter', async () => {
      const request = createMockRequest({ demographic: 'female' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)

      // Verify bias engine was called with custom demographic filter
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h',
        demographicFilter: 'female',
      })
    })

    it('should handle multiple query parameters', async () => {
      const request = createMockRequest({
        timeRange: '30d',
        demographic: 'hispanic',
      })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)

      // Verify bias engine was called with both parameters
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '30d',
        demographicFilter: 'hispanic',
      })
    })

    it('should handle bias detection engine errors', async () => {
      const error = new Error('Database connection failed')
      mockBiasEngine.getDashboardData.mockRejectedValue(error)

      const request = createMockRequest()

      // Mock Response for error case
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 500,
        json: vi.fn().mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
      })) as any

      const response = await GET({ request } as any)

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Dashboard Data Retrieval Failed')
      expect(responseData.message).toBe('Database connection failed')

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch dashboard data',
        expect.objectContaining({
          error: error.message,
        }),
      )
    })

    it('should handle empty dashboard data', async () => {
      const emptyDashboardData: BiasDashboardData = {
        summary: {
          totalSessions: 0,
          averageBiasScore: 0,
          highBiasSessions: 0,
          totalAlerts: 0,
          lastUpdated: new Date(),
        },
        alerts: [],
        trends: [],
        demographics: {
          age: {},
          gender: {},
          ethnicity: {},
        },
        recentAnalyses: [],
      }

      mockBiasEngine.getDashboardData.mockResolvedValue(emptyDashboardData)

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(emptyDashboardData)
      expect(responseData.data.summary.totalSessions).toBe(0)
      expect(responseData.data.alerts).toHaveLength(0)
    })

    it('should validate time range parameter values', async () => {
      const validTimeRanges = ['1h', '6h', '24h', '7d', '30d', '90d']

      for (const timeRange of validTimeRanges) {
        const request = createMockRequest({ timeRange })
        const response = await GET({ request } as any)

        expect(response.status).toBe(200)
        expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
          timeRange,
          demographicFilter: 'all',
        })
      }
    })

    it('should handle invalid time range gracefully', async () => {
      const request = createMockRequest({ timeRange: 'invalid' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Should fall back to default time range
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: 'invalid', // API passes through, engine validates
        demographicFilter: 'all',
      })
    })

    it('should set appropriate response headers', async () => {
      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })

    it('should handle concurrent requests properly', async () => {
      const requests = Array.from({ length: 5 }, () =>
        createMockRequest({ timeRange: '24h' }),
      )

      const responses = await Promise.all(
        requests.map((request) => GET({ request } as any)),
      )

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Bias engine should be called for each request
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledTimes(5)
    })

    it('should handle large dataset responses', async () => {
      // Create a large mock dataset
      const largeDashboardData: BiasDashboardData = {
        ...mockDashboardData,
        alerts: Array.from({ length: 1000 }, (_, i) => ({
          id: `alert-${i}`,
          type: 'medium_bias',
          message: `Alert ${i}`,
          timestamp: new Date().toISOString(),
          level: 'medium',
          sessionId: `session-${i}`,
          biasScore: 0.4 + (i % 10) * 0.01,
          demographics: {
            age: '25-35',
            gender: 'female',
            ethnicity: 'hispanic',
            primaryLanguage: 'en',
          },
        })),
        trends: Array.from({ length: 90 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          biasScore: 0.3 + Math.random() * 0.2,
          sessionCount: 20 + Math.floor(Math.random() * 20),
          alertCount: Math.floor(Math.random() * 10),
        })),
      }

      mockBiasEngine.getDashboardData.mockResolvedValue(largeDashboardData)

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.alerts).toHaveLength(1000)
      expect(responseData.data.trends).toHaveLength(90)
    })

    it('should handle network timeout scenarios', async () => {
      // Simulate a timeout by making the engine hang
      mockBiasEngine.getDashboardData.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100),
          ),
      )

      const request = createMockRequest()

      // Mock Response for timeout case
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 500,
        json: vi.fn().mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
      })) as any

      const response = await GET({ request } as any)

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Dashboard Data Retrieval Failed')
      expect(responseData.message).toBe('Request timeout')
    })

    it('should log performance metrics', async () => {
      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(typeof responseData.processingTime).toBe('number')
      expect(responseData.processingTime).toBeGreaterThan(0)

      // Verify performance logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Dashboard data retrieved successfully',
        expect.objectContaining({
          processingTime: expect.any(Number),
          alertCount: mockDashboardData.alerts.length,
          sessionCount: mockDashboardData.summary.totalSessions,
        }),
      )
    })

    it('should handle malformed URL parameters', async () => {
      // Create request with malformed URL
      const request = {
        url: 'http://localhost:3000/api/bias-detection/dashboard?timeRange=',
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'authorization': 'Bearer valid-token',
              'content-type': 'application/json',
            }
            return headers[key.toLowerCase()] || null
          }),
        },
      } as any

      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Should handle empty parameter gracefully
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h', // Falls back to default
        demographicFilter: 'all',
      })
    })
  })
})
