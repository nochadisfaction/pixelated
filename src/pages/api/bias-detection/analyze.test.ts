/**
 * Unit tests for the Session Analysis API Endpoint
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
vi.mock('@/lib/ai/bias-detection/utils')
vi.mock('@/lib/ai/bias-detection/audit')
vi.mock('@/lib/ai/bias-detection/cache')
vi.mock('@/lib/utils/logger')

import { BiasDetectionEngine } from '@/lib/ai/bias-detection/BiasDetectionEngine'
import {
  validateTherapeuticSession,
  generateAnonymizedId,
} from '@/lib/ai/bias-detection/utils'
import { getAuditLogger } from '@/lib/ai/bias-detection/audit'
import { getCacheManager } from '@/lib/ai/bias-detection/cache'
import { getLogger } from '@/lib/utils/logger'
import type {
  TherapeuticSession,
  BiasAnalysisResult,
} from '@/lib/ai/bias-detection/types'

// Import the actual handlers
const { POST, GET } = await import('./analyze')

describe('Session Analysis API Endpoint', () => {
  let mockLogger: any
  let mockAuditLogger: any
  let mockCacheManager: any
  let mockBiasEngine: any

  const mockSession: TherapeuticSession = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    participantDemographics: {
      age: '25-35',
      gender: 'female',
      ethnicity: 'hispanic',
      primaryLanguage: 'en',
    },
    scenario: {
      scenarioId: 'scenario-1',
      type: 'anxiety',
      complexity: 'intermediate',
      tags: ['anxiety', 'therapy'],
      description: 'Anxiety therapy session',
      learningObjectives: ['Identify triggers', 'Develop coping strategies'],
    },
    content: {
      patientPresentation: 'Patient presents with anxiety symptoms',
      therapeuticInterventions: ['CBT techniques', 'Breathing exercises'],
      patientResponses: ['Engaged well', 'Showed improvement'],
      sessionNotes: 'Productive session with good outcomes',
    },
    aiResponses: [
      {
        responseId: 'resp-1',
        timestamp: new Date('2024-01-15T10:05:00Z'),
        type: 'diagnostic',
        content: 'Patient shows signs of generalized anxiety',
        confidence: 0.85,
        modelUsed: 'gpt-4',
      },
    ],
    expectedOutcomes: [],
    transcripts: [],
    metadata: {
      trainingInstitution: 'University Hospital',
      traineeId: 'trainee-123',
      sessionDuration: 60,
      completionStatus: 'completed',
    },
  }

  const mockSessionForRequest = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: '2024-01-15T10:00:00Z',
    participantDemographics: {
      age: '25-35',
      gender: 'female',
      ethnicity: 'hispanic',
      primaryLanguage: 'en',
    },
    scenario: {
      scenarioId: 'scenario-1',
      type: 'anxiety',
      complexity: 'intermediate',
      tags: ['anxiety', 'therapy'],
      description: 'Anxiety therapy session',
      learningObjectives: ['Identify triggers', 'Develop coping strategies'],
    },
    content: {
      patientPresentation: 'Patient presents with anxiety symptoms',
      therapeuticInterventions: ['CBT techniques', 'Breathing exercises'],
      patientResponses: ['Engaged well', 'Showed improvement'],
      sessionNotes: 'Productive session with good outcomes',
    },
    aiResponses: [
      {
        responseId: 'resp-1',
        timestamp: '2024-01-15T10:05:00Z',
        type: 'diagnostic',
        content: 'Patient shows signs of generalized anxiety',
        confidence: 0.85,
        modelUsed: 'gpt-4',
      },
    ],
    expectedOutcomes: [],
    transcripts: [],
    metadata: {
      trainingInstitution: 'University Hospital',
      traineeId: 'trainee-123',
      sessionDuration: 60,
      completionStatus: 'completed',
    },
  }

  const mockAnalysisResult: BiasAnalysisResult = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    overallBiasScore: 0.25,
    layerResults: {
      preprocessing: {
        biasScore: 0.2,
        linguisticBias: {
          genderBiasScore: 0.1,
          racialBiasScore: 0.1,
          ageBiasScore: 0.05,
          culturalBiasScore: 0.05,
          biasedTerms: [],
          sentimentAnalysis: {
            overallSentiment: 0.5,
            emotionalValence: 0.6,
            subjectivity: 0.4,
            demographicVariations: {},
          },
        },
        representationAnalysis: {
          demographicDistribution: {},
          underrepresentedGroups: [],
          overrepresentedGroups: [],
          diversityIndex: 0.8,
          intersectionalityAnalysis: [],
        },
        dataQualityMetrics: {
          completeness: 0.9,
          consistency: 0.85,
          accuracy: 0.9,
          timeliness: 0.95,
          validity: 0.9,
          missingDataByDemographic: {},
        },
        recommendations: [],
      },
      modelLevel: {
        biasScore: 0.3,
        fairnessMetrics: {
          demographicParity: 0.1,
          equalizedOdds: 0.15,
          equalOpportunity: 0.12,
          calibration: 0.08,
          individualFairness: 0.1,
          counterfactualFairness: 0.09,
        },
        performanceMetrics: {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          f1Score: 0.85,
          auc: 0.9,
          calibrationError: 0.05,
          demographicBreakdown: {},
        },
        groupPerformanceComparison: [],
        recommendations: [],
      },
      interactive: {
        biasScore: 0.2,
        counterfactualAnalysis: {
          scenariosAnalyzed: 10,
          biasDetected: false,
          consistencyScore: 0.8,
          problematicScenarios: [],
        },
        featureImportance: [],
        whatIfScenarios: [],
        recommendations: [],
      },
      evaluation: {
        biasScore: 0.25,
        huggingFaceMetrics: {
          toxicity: 0.1,
          bias: 0.2,
          regard: {},
          stereotype: 0.15,
          fairness: 0.8,
        },
        customMetrics: {
          therapeuticBias: 0.2,
          culturalSensitivity: 0.8,
          professionalEthics: 0.9,
          patientSafety: 0.95,
        },
        temporalAnalysis: {
          trendDirection: 'stable',
          changeRate: 0.02,
          seasonalPatterns: [],
          interventionEffectiveness: [],
        },
        recommendations: [],
      },
    },
    demographics: mockSession.participantDemographics,
    recommendations: ['Regular bias monitoring recommended'],
    alertLevel: 'low',
    confidence: 0.88,
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

    // Setup global Response mock with default behavior
    global.Response = vi.fn().mockImplementation((body, init) => {
      let responseData
      try {
        responseData = JSON.parse(body)
      } catch {
        responseData = { error: 'Invalid JSON' }
      }

      const defaultHeaders = new Map([
        ['Content-Type', 'application/json'],
        ['X-Cache', 'MISS'],
        ['X-Processing-Time', '100'],
      ])

      return {
        status: init?.status || 200,
        json: vi.fn().mockResolvedValue(responseData),
        headers: {
          get: vi.fn((key: string) => defaultHeaders.get(key) || null),
        },
      }
    }) as any

    // Setup audit logger mocks
    mockAuditLogger = {
      logAuthentication: vi.fn().mockResolvedValue(undefined),
      logAction: vi.fn().mockResolvedValue(undefined),
      logBiasAnalysis: vi.fn().mockResolvedValue(undefined),
    }
    ;(getAuditLogger as MockedFunction<typeof getAuditLogger>).mockReturnValue(
      mockAuditLogger,
    )

    // Setup cache manager mocks
    mockCacheManager = {
      analysisCache: {
        getAnalysisResult: vi.fn().mockResolvedValue(null),
        cacheAnalysisResult: vi.fn().mockResolvedValue(undefined),
      },
    }
    ;(
      getCacheManager as MockedFunction<typeof getCacheManager>
    ).mockReturnValue(mockCacheManager)

    // Setup bias engine mocks
    mockBiasEngine = {
      analyzeSession: vi.fn().mockResolvedValue(mockAnalysisResult),
      getSessionAnalysis: vi.fn().mockResolvedValue(mockAnalysisResult),
    }
    ;(BiasDetectionEngine as any).mockImplementation(() => mockBiasEngine)

    // Setup utility mocks
    ;(
      validateTherapeuticSession as MockedFunction<
        typeof validateTherapeuticSession
      >
    ).mockImplementation((session) => session as TherapeuticSession)
    ;(
      generateAnonymizedId as MockedFunction<typeof generateAnonymizedId>
    ).mockReturnValue('anon-123')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/bias-detection/analyze', () => {
    const createMockRequest = (
      body: any,
      headers: Record<string, string> = {},
    ) => {
      const defaultHeaders = {
        'content-type': 'application/json',
        'authorization': 'Bearer valid-token',
        ...headers,
      }

      return {
        json: vi.fn().mockResolvedValue(body),
        headers: {
          get: vi.fn(
            (key: string) => defaultHeaders[key.toLowerCase()] || null,
          ),
        },
      } as any
    }

    // Helper to create a more realistic mock Response

    it('should successfully analyze a session with valid input', async () => {
      const requestBody = {
        session: mockSessionForRequest,
        options: { includeExplanation: true },
      }

      const request = createMockRequest(requestBody)

      // Mock the global Response constructor
      const mockResponseJson = vi.fn()
      const mockResponseHeaders = new Map([
        ['Content-Type', 'application/json'],
        ['X-Cache', 'MISS'],
        ['X-Processing-Time', '100'],
      ])

      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        json: mockResponseJson.mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => mockResponseHeaders.get(key) || null),
        },
      })) as any

      const response = await POST({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockAnalysisResult)
      expect(responseData.cacheHit).toBe(false)
      expect(typeof responseData.processingTime).toBe('number')

      // Verify bias engine was called
      expect(mockBiasEngine.analyzeSession).toHaveBeenCalledWith(mockSession)

      // Verify audit logging
      expect(mockAuditLogger.logBiasAnalysis).toHaveBeenCalled()
    })

    it('should return cached result when available', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(
        mockAnalysisResult,
      )

      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)
      const response = await POST({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.cacheHit).toBe(true)
      expect(responseData.data).toEqual(mockAnalysisResult)

      // Verify cache was checked
      expect(
        mockCacheManager.analysisCache.getAnalysisResult,
      ).toHaveBeenCalledWith(mockSession.sessionId)

      // Verify bias engine was not called
      expect(mockBiasEngine.analyzeSession).not.toHaveBeenCalled()
    })

    it('should skip cache when skipCache option is true', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(
        mockAnalysisResult,
      )

      const requestBody = {
        session: mockSessionForRequest,
        options: { skipCache: true },
      }

      const request = createMockRequest(requestBody)
      const response = await POST({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.cacheHit).toBe(false)

      // Verify cache was not checked
      expect(
        mockCacheManager.analysisCache.getAnalysisResult,
      ).not.toHaveBeenCalled()

      // Verify bias engine was called
      expect(mockBiasEngine.analyzeSession).toHaveBeenCalled()
    })

    it('should return 401 for missing authorization', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody, { authorization: '' })

      const response = await POST({ request } as any)

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')

      // Verify authentication failure was logged
      expect(mockAuditLogger.logAuthentication).toHaveBeenCalledWith(
        'unknown',
        'unknown@example.com',
        'login',
        expect.any(Object),
        false,
        'Missing or invalid authorization token',
      )
    })

    it('should return 401 for invalid authorization token', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody, {
        authorization: 'Bearer invalid',
      })

      const response = await POST({ request } as any)

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid content type', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody, {
        'content-type': 'text/plain',
      })

      const response = await POST({ request } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Invalid Content Type')
    })

    it('should return 400 for validation errors', async () => {
      const invalidSession = {
        ...mockSessionForRequest,
        sessionId: 'invalid-uuid', // Invalid UUID
      }

      const requestBody = { session: invalidSession }
      const request = createMockRequest(requestBody)

      const response = await POST({ request } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
      expect(responseData.message).toContain('Session ID must be a valid UUID')
    })

    it('should return 400 for missing required fields', async () => {
      const incompleteSession = {
        sessionId: mockSessionForRequest.sessionId,
        // Missing other required fields
      }

      const requestBody = { session: incompleteSession }
      const request = createMockRequest(requestBody)

      const response = await POST({ request } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
    })

    it('should handle bias detection engine errors', async () => {
      const error = new Error('Python service unavailable')
      mockBiasEngine.analyzeSession.mockRejectedValue(error)

      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)

      // Mock Response for error case
      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 500,
        json: vi.fn().mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => 'application/json'),
        },
      })) as any

      const response = await POST({ request } as any)

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Analysis Failed')
      expect(responseData.message).toBe('Python service unavailable')

      // Verify bias engine was called and failed
      expect(mockBiasEngine.analyzeSession).toHaveBeenCalledWith(mockSession)
    })

    it('should handle JSON parsing errors', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'content-type': 'application/json',
              'authorization': 'Bearer valid-token',
            }
            return headers[key.toLowerCase()] || null
          }),
        },
      } as any

      const response = await POST({ request } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
    })

    it('should include processing time in response', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)

      // Mock Response with processing time
      global.Response = vi.fn().mockImplementation((body, init) => {
        const responseData = JSON.parse(body)
        return {
          status: init?.status || 200,
          json: vi.fn().mockResolvedValue(responseData),
          headers: {
            get: vi.fn((key: string) => 'application/json'),
          },
        }
      }) as any

      const response = await POST({ request } as any)
      const responseData = await response.json()

      expect(responseData.processingTime).toBeDefined()
      expect(typeof responseData.processingTime).toBe('number')
      expect(responseData.processingTime).toBeGreaterThan(0)
    })

    it('should set appropriate response headers', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)

      // Mock Response with correct headers
      const mockHeaders = new Map([
        ['Content-Type', 'application/json'],
        ['X-Cache', 'MISS'],
        ['X-Processing-Time', '150'],
      ])

      global.Response = vi.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        json: vi.fn().mockResolvedValue(JSON.parse(body)),
        headers: {
          get: vi.fn((key: string) => mockHeaders.get(key) || null),
        },
      })) as any

      const response = await POST({ request } as any)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Cache')).toBe('MISS')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })
  })

  describe('GET /api/bias-detection/analyze', () => {
    const createMockGetRequest = (
      searchParams: Record<string, string> = {},
      headers: Record<string, string> = {},
    ) => {
      const url = new URL('http://localhost:3000/api/bias-detection/analyze')
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })

      const defaultHeaders = {
        authorization: 'Bearer valid-token',
        ...headers,
      }

      return {
        url: url.toString(),
        headers: {
          get: vi.fn(
            (key: string) => defaultHeaders[key.toLowerCase()] || null,
          ),
        },
      } as any
    }

    it('should successfully retrieve analysis results', async () => {
      mockBiasEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
        includeCache: 'true',
      })

      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockAnalysisResult)

      // Verify audit logging
      expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'read',
          category: 'bias-analysis',
        }),
        'bias-analysis-retrieval',
        expect.any(Object),
        expect.any(Object),
        mockSession.sessionId,
      )
    })

    it('should return cached result when available and includeCache is true', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(
        mockAnalysisResult,
      )

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
        includeCache: 'true',
      })

      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.cacheHit).toBe(true)
      expect(responseData.data).toEqual(mockAnalysisResult)

      // Verify cache was checked
      expect(
        mockCacheManager.analysisCache.getAnalysisResult,
      ).toHaveBeenCalledWith(mockSession.sessionId)

      // Verify bias engine was not called
      expect(mockBiasEngine.getSessionAnalysis).not.toHaveBeenCalled()
    })

    it('should anonymize sensitive data when anonymize is true', async () => {
      mockBiasEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
        anonymize: 'true',
      })

      const response = await GET({ request } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.demographics.ethnicity).toBe('[ANONYMIZED]')
      expect(responseData.data.demographics.age).toBe(
        mockAnalysisResult.demographics.age,
      )
      expect(responseData.data.demographics.gender).toBe(
        mockAnalysisResult.demographics.gender,
      )
    })

    it('should return 401 for missing authorization', async () => {
      const request = createMockGetRequest(
        { sessionId: mockSession.sessionId },
        { authorization: '' },
      )

      const response = await GET({ request } as any)

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid sessionId', async () => {
      const request = createMockGetRequest({
        sessionId: 'invalid-uuid',
      })

      const response = await GET({ request } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
      expect(responseData.message).toContain('Session ID must be a valid UUID')
    })

    it('should return 404 when analysis not found', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(null)
      mockBiasEngine.getSessionAnalysis.mockResolvedValue(null)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
      })

      const response = await GET({ request } as any)

      expect(response.status).toBe(404)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Not Found')
      expect(responseData.message).toBe('Session analysis not found')
    })

    it('should handle bias detection engine errors in GET', async () => {
      const error = new Error('Database connection failed')
      mockBiasEngine.getSessionAnalysis.mockRejectedValue(error)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
      })

      // Mock Response for GET error case
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
      expect(responseData.error).toBe('Retrieval Failed')
      expect(responseData.message).toBe('Database connection failed')

      // Verify bias engine was called and failed
      expect(mockBiasEngine.getSessionAnalysis).toHaveBeenCalledWith(
        mockSession.sessionId,
      )
    })

    it('should set appropriate response headers for GET', async () => {
      mockBiasEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
      })

      const response = await GET({ request } as any)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Cache')).toBe('MISS')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting after multiple requests', async () => {
      const requestBody = { session: mockSession }

      // Make 61 requests (over the limit of 60)
      const requests = Array.from({ length: 61 }, () =>
        POST({
          request: {
            json: vi.fn().mockResolvedValue(requestBody),
            headers: {
              get: vi.fn((key: string) => {
                const headers: Record<string, string> = {
                  'content-type': 'application/json',
                  'authorization': 'Bearer valid-token',
                }
                return headers[key.toLowerCase()] || null
              }),
            },
          } as any,
        } as any),
      )

      const responses = await Promise.all(requests)

      // Last request should be rate limited
      const lastResponse = responses[60]
      expect(lastResponse.status).toBe(429)

      const responseData = await lastResponse.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Rate Limit Exceeded')
    })
  })

  describe('Security Headers', () => {
    it('should include security-related headers in responses', async () => {
      const requestBody = { session: mockSession }
      const request = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'content-type': 'application/json',
              'authorization': 'Bearer valid-token',
            }
            return headers[key.toLowerCase()] || null
          }),
        },
      } as any

      const response = await POST({ request } as any)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })
  })
})
