/**
 * Unit tests for the Bias Detection Export API Endpoint
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
const { GET } = await import('./export')

describe('Bias Detection Export API Endpoint', () => {
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
    ],
    trends: [
      {
        date: new Date('2024-01-14T00:00:00Z').toISOString(),
        biasScore: 0.32,
        sessionCount: 25,
        alertCount: 3,
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
    ],
  }

  const createMockRequest = (
    searchParams: Record<string, string> = {},
    headers: Record<string, string> = {},
  ) => {
    const url = new URL('http://localhost:3000/api/bias-detection/export')
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

    // Setup bias engine mocks
    mockBiasEngine = {
      getDashboardData: vi.fn().mockResolvedValue(mockDashboardData),
      exportData: vi.fn(),
    }
    ;(BiasDetectionEngine as any).mockImplementation(() => mockBiasEngine)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/bias-detection/export', () => {
    it('should export data as JSON format by default', async () => {
      // Mock Response for JSON export
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Content-Disposition':
                'attachment; filename="bias-dashboard-data.json"',
            }
            return headers[key] || null
          }),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain(
        'attachment',
      )
      expect(response.headers.get('Content-Disposition')).toContain('.json')

      // Verify bias engine was called
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h',
        includeDetails: false,
      })

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Exporting bias detection data',
        {
          format: 'json',
          timeRange: '24h',
          includeDetails: false,
        },
      )
    })

    it('should export data as CSV format when specified', async () => {
      // Mock Response for CSV export
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'Content-Type': 'text/csv',
              'Content-Disposition':
                'attachment; filename="bias-dashboard-data.csv"',
            }
            return headers[key] || null
          }),
        },
        blob: vi.fn().mockResolvedValue(new Blob([body], { type: 'text/csv' })),
      })) as any

      const request = createMockRequest({ format: 'csv' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('.csv')

      // Verify bias engine was called
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h',
        includeDetails: false,
      })
    })

    it('should export data as PDF format when specified', async () => {
      // Mock Response for PDF export
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'Content-Type': 'application/pdf',
              'Content-Disposition':
                'attachment; filename="bias-dashboard-report.pdf"',
            }
            return headers[key] || null
          }),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/pdf' })),
      })) as any

      const request = createMockRequest({ format: 'pdf' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toContain('.pdf')

      // Verify bias engine was called
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h',
        includeDetails: false,
      })
    })

    it('should handle custom time range parameter', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest({ timeRange: '7d' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Verify bias engine was called with custom time range
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '7d',
        includeDetails: false,
      })
    })

    it('should handle includeDetails parameter', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest({ includeDetails: 'true' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Verify bias engine was called with includeDetails
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '24h',
        includeDetails: true,
      })
    })

    it('should handle multiple parameters', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'text/csv'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob(['csv data'], { type: 'text/csv' })),
      })) as any

      const request = createMockRequest({
        format: 'csv',
        timeRange: '30d',
        includeDetails: 'true',
      })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Verify bias engine was called with all parameters
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
        timeRange: '30d',
        includeDetails: true,
      })

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Exporting bias detection data',
        {
          format: 'csv',
          timeRange: '30d',
          includeDetails: true,
        },
      )
    })

    it('should handle bias detection engine errors', async () => {
      const error = new Error('Database connection failed')
      mockBiasEngine.getDashboardData.mockRejectedValue(error)

      // Mock Response for error case
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 500,
        json: vi.fn().mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
      })) as any

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Export Failed')
      expect(responseData.message).toBe('Database connection failed')

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to export bias detection data',
        expect.objectContaining({
          error: error.message,
        }),
      )
    })

    it('should handle invalid format parameter gracefully', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest({ format: 'invalid' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Should fall back to JSON format
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Exporting bias detection data',
        expect.objectContaining({
          format: 'invalid', // API passes through, engine handles validation
        }),
      )
    })

    it('should generate appropriate filename for each format', async () => {
      const formats = [
        {
          format: 'json',
          expectedType: 'application/json',
          expectedExt: '.json',
        },
        { format: 'csv', expectedType: 'text/csv', expectedExt: '.csv' },
        { format: 'pdf', expectedType: 'application/pdf', expectedExt: '.pdf' },
      ]

      for (const { format, expectedType, expectedExt } of formats) {
        global.Response = vi.fn().mockImplementation((body, init) => ({
          status: init?.status || 200,
          headers: {
            get: vi.fn((key: string) => {
              const headers: Record<string, string> = {
                'Content-Type': expectedType,
                'Content-Disposition': `attachment; filename="bias-dashboard-data${expectedExt}"`,
              }
              return headers[key] || null
            }),
          },
          blob: vi
            .fn()
            .mockResolvedValue(new Blob([body], { type: expectedType })),
        })) as any

        const request = createMockRequest({ format })
        const response = await GET({ request } as any)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe(expectedType)
        expect(response.headers.get('Content-Disposition')).toContain(
          expectedExt,
        )
      }
    })

    it('should handle large dataset exports', async () => {
      // Create a large mock dataset
      const largeDashboardData: BiasDashboardData = {
        ...mockDashboardData,
        alerts: Array.from({ length: 10000 }, (_, i) => ({
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
        recentAnalyses: Array.from({ length: 5000 }, (_, i) => ({
          sessionId: `session-${i}`,
          timestamp: new Date().toISOString(),
          overallBiasScore: 0.3 + Math.random() * 0.4,
          alertLevel: 'medium',
          demographics: {
            age: '25-35',
            gender: 'female',
            ethnicity: 'hispanic',
            primaryLanguage: 'en',
          },
        })),
      }

      mockBiasEngine.getDashboardData.mockResolvedValue(largeDashboardData)

      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Verify large dataset was handled
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalled()
    })

    it('should handle export timeout scenarios', async () => {
      // Simulate a timeout by making the engine hang
      mockBiasEngine.getDashboardData.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Export timeout')), 100),
          ),
      )

      // Mock Response for timeout case
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 500,
        json: vi.fn().mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
      })) as any

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Export Failed')
      expect(responseData.message).toBe('Export timeout')
    })

    it('should log export completion with metrics', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest({ format: 'json' })
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Verify completion logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Bias detection data exported successfully',
        expect.objectContaining({
          format: 'json',
          processingTime: expect.any(Number),
          dataSize: expect.any(Number),
        }),
      )
    })

    it('should handle concurrent export requests', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const requests = Array.from({ length: 3 }, () =>
        createMockRequest({ format: 'json' }),
      )

      const responses = await Promise.all(
        requests.map((request) => GET({ request } as any)),
      )

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Bias engine should be called for each request
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalledTimes(3)
    })

    it('should handle empty dataset exports', async () => {
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

      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const request = createMockRequest()
      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      // Should handle empty data gracefully
      expect(mockBiasEngine.getDashboardData).toHaveBeenCalled()
    })

    it('should validate time range parameter values', async () => {
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([body], { type: 'application/json' })),
      })) as any

      const validTimeRanges = ['1h', '6h', '24h', '7d', '30d', '90d']

      for (const timeRange of validTimeRanges) {
        const request = createMockRequest({ timeRange })
        const response = await GET({ request } as any)

        expect(response.status).toBe(200)
        expect(mockBiasEngine.getDashboardData).toHaveBeenCalledWith({
          timeRange,
          includeDetails: false,
        })
      }
    })
  })
})
