/**
 * Session Analysis API Endpoint for Pixelated Empathy Bias Detection Engine
 *
 * This endpoint provides comprehensive bias analysis for therapeutic sessions with
 * full validation, authentication, security controls, and HIPAA compliance.
 */

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { BiasDetectionEngine } from '@/lib/ai/bias-detection/BiasDetectionEngine'
import {
  validateTherapeuticSession,
} from '@/lib/ai/bias-detection/utils'
import { getAuditLogger } from '@/lib/ai/bias-detection/audit'
import { getCacheManager } from '@/lib/ai/bias-detection/cache'
import { performanceMonitor } from '@/lib/ai/bias-detection/performance-monitor'
import { getLogger } from '@/lib/utils/logger'
import type {
  TherapeuticSession,
  BiasAnalysisResult,
  AnalyzeSessionRequest,
  AnalyzeSessionResponse,
  UserContext,
} from '@/lib/ai/bias-detection/types'

const logger = getLogger('BiasAnalysisAPI')

// =============================================================================
// REQUEST/RESPONSE VALIDATION SCHEMAS
// =============================================================================

const AnalyzeSessionRequestSchema = z.object({
  session: z.object({
    sessionId: z.string().uuid('Session ID must be a valid UUID'),
    timestamp: z
      .string()
      .datetime()
      .transform((str) => new Date(str)),
    participantDemographics: z.object({
      age: z.string().min(1),
      gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']),
      ethnicity: z.string().min(1),
      primaryLanguage: z.string().min(2),
      socioeconomicStatus: z
        .enum(['low', 'middle', 'high', 'not-specified'])
        .optional(),
      education: z.string().optional(),
      region: z.string().optional(),
      culturalBackground: z.array(z.string()).optional(),
      disabilityStatus: z.string().optional(),
    }),
    scenario: z.object({
      scenarioId: z.string().min(1),
      type: z.enum([
        'depression',
        'anxiety',
        'trauma',
        'substance-abuse',
        'grief',
        'other',
      ]),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']),
      tags: z.array(z.string()),
      description: z.string().min(1),
      learningObjectives: z.array(z.string()),
    }),
    content: z.object({
      patientPresentation: z.string().min(1),
      therapeuticInterventions: z.array(z.string()),
      patientResponses: z.array(z.string()),
      sessionNotes: z.string(),
      assessmentResults: z.any().optional(),
    }),
    aiResponses: z.array(
      z.object({
        responseId: z.string(),
        timestamp: z
          .string()
          .datetime()
          .transform((str) => new Date(str)),
        type: z.enum([
          'diagnostic',
          'intervention',
          'risk-assessment',
          'recommendation',
        ]),
        content: z.string().min(1),
        confidence: z.number().min(0).max(1),
        modelUsed: z.string(),
        reasoning: z.string().optional(),
      }),
    ),
    expectedOutcomes: z.array(z.any()),
    transcripts: z.array(z.any()),
    metadata: z.object({
      trainingInstitution: z.string(),
      supervisorId: z.string().optional(),
      traineeId: z.string(),
      sessionDuration: z.number().positive(),
      completionStatus: z.enum(['completed', 'partial', 'abandoned']),
      technicalIssues: z.array(z.string()).optional(),
    }),
  }),
  options: z
    .object({
      skipCache: z.boolean().optional(),
      includeExplanation: z.boolean().optional(),
      demographicFocus: z.array(z.any()).optional(),
    })
    .optional(),
})

const GetAnalysisRequestSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  includeCache: z.boolean().optional(),
  anonymize: z.boolean().optional(),
})

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

async function authenticateRequest(
  request: Request,
): Promise<UserContext | null> {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)

    // TODO: Integrate with Supabase Auth
    // For now, we'll decode a mock JWT or use a simple token validation
    // In production, this would validate against Supabase JWT

    if (!token || token === 'invalid') {
      return null
    }

    // Mock user context - in production this would come from JWT claims
    const mockUser: UserContext = {
      userId: `user-${token.slice(0, 8)}`,
      email: 'user@example.com',
      role: {
        id: 'analyst',
        name: 'analyst',
        description: 'Data Analyst',
        level: 3,
      },
      permissions: [
        {
          resource: 'bias-analysis',
          actions: ['read', 'write'],
          conditions: [],
        },
      ],
    }

    return mockUser
  } catch (error) {
    logger.error('Authentication failed', { error })
    return null
  }
}

function hasPermission(
  user: UserContext,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'export',
): boolean {
  return user.permissions.some(
    (permission) =>
      permission.resource === resource &&
      permission.actions.includes(action),
  )
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const rateLimitMap = new Map()

function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60000,
): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

// =============================================================================
// SECURITY HELPERS
// =============================================================================

function getClientInfo(request: Request): {
  ipAddress: string
  userAgent: string
} {
  let ipAddress = 'unknown'
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, take the first valid one
    ipAddress = forwarded.split(',').map(ip => ip.trim()).find(Boolean) || 'unknown'
  } else {
    const realIp = request.headers.get('x-real-ip')
    if (realIp && realIp.trim() !== '') {
      ipAddress = realIp.trim()
    }
  }
  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown'

  return { ipAddress, userAgent }
}

function sanitizeSessionForLogging(
  session: TherapeuticSession,
): Partial<TherapeuticSession> {
  return {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    participantDemographics: {
      age: session.participantDemographics.age,
      gender: session.participantDemographics.gender,
      ethnicity: session.participantDemographics.ethnicity,
      primaryLanguage: session.participantDemographics.primaryLanguage,
      // Remove potentially identifying information
    },
    scenario: {
      scenarioId: session.scenario.scenarioId,
      type: session.scenario.type,
      complexity: session.scenario.complexity,
      tags: session.scenario.tags,
      description: '[REDACTED]',
      learningObjectives: [],
    },
    metadata: {
      trainingInstitution: session.metadata.trainingInstitution,
      traineeId: '[REDACTED]',
      sessionDuration: session.metadata.sessionDuration,
      completionStatus: session.metadata.completionStatus,
    },
  }
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now()
  let user: UserContext | null = null
  let sessionId: string | undefined

  try {
    // Get client information for security logging
    const clientInfo = getClientInfo(request)

    // Authenticate user
    user = await authenticateRequest(request)
    if (!user) {
      const auditLogger = getAuditLogger()
      await auditLogger.logAuthentication(
        'unknown',
        'unknown@example.com',
        'login',
        clientInfo,
        false,
        'Missing or invalid authorization token',
      )

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    // Check authorization
    if (!hasPermission(user, 'bias-analysis', 'write')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions for bias analysis',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Rate limiting
    if (!checkRateLimit(user.userId, 60, 60000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid Content Type',
          message: 'Content-Type must be application/json',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse and validate request body
    let requestData: AnalyzeSessionRequest
    try {
      const rawBody = await request.json()
      const validatedRequest = AnalyzeSessionRequestSchema.parse(rawBody)
      requestData = validatedRequest as AnalyzeSessionRequest
      sessionId = requestData.session.sessionId
    } catch (error) {
      logger.error('Request validation failed', { error, userId: user.userId })

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation Error',
          message: error instanceof z.ZodError
            ? `Invalid request data: ${error.errors.map((e) => e.message).join(', ')}`
            : 'Invalid request format',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Additional therapeutic session validation
    const validatedSession = validateTherapeuticSession(requestData.session)

    logger.info('Starting bias analysis for session', {
      sessionId: validatedSession.sessionId,
      userId: user.userId,
      demographics:
        sanitizeSessionForLogging(validatedSession).participantDemographics,
    })

    // Check cache first (unless skipCache is true)
    const cacheManager = getCacheManager()
    const shouldUseCache = !requestData.options?.skipCache

    if (shouldUseCache) {
      const cachedResult = await cacheManager.analysisCache.getAnalysisResult(
        validatedSession.sessionId,
      )
      if (cachedResult) {

        // Log cache hit
        const auditLogger = getAuditLogger()
        await auditLogger.logAction(
          user,
          {
            type: 'read',
            category: 'bias-analysis',
            description: `Retrieved cached bias analysis for session ${validatedSession.sessionId}`,
            sensitivityLevel: 'medium',
          },
          'cached-analysis',
          { sessionId: validatedSession.sessionId, cacheHit: true },
          clientInfo,
          validatedSession.sessionId,
        )

        const cacheProcessingTime = Date.now() - startTime

        // Record cache hit performance
        performanceMonitor.recordRequestTiming(
          '/api/bias-detection/analyze',
          'POST',
          cacheProcessingTime,
          200,
          user.userId,
        )

        logger.info('Bias analysis served from cache', {
          sessionId: validatedSession.sessionId,
          userId: user.userId,
          processingTime: cacheProcessingTime,
        })

        return new Response(
          JSON.stringify({
            success: true,
            data: cachedResult,
            processingTime: cacheProcessingTime,
            cacheHit: true,
          } as AnalyzeSessionResponse),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
            },
          },
        )
      }
    }

    // Initialize bias detection engine with secure configuration
    const biasEngine = new BiasDetectionEngine({
      pythonServiceUrl:
        process.env['PYTHON_SERVICE_URL'] || 'http://localhost:5000',
      pythonServiceTimeout: 30000,
      thresholds: {
        warningLevel: 0.3,
        highLevel: 0.6,
        criticalLevel: 0.8,
      },
      layerWeights: {
        preprocessing: 0.2,
        modelLevel: 0.3,
        interactive: 0.2,
        evaluation: 0.3,
      },
      evaluationMetrics: ['fairness', 'bias', 'performance'],
      metricsConfig: {
        enableRealTimeMonitoring: true,
        metricsRetentionDays: 90,
        aggregationIntervals: ['1h', '1d', '1w'],
        dashboardRefreshRate: 300,
        exportFormats: ['json', 'csv'],
      },
      alertConfig: {
        enableSlackNotifications: false,
        enableEmailNotifications: true,
        emailRecipients: ['alerts@example.com'],
        alertCooldownMinutes: 30,
        escalationThresholds: {
          criticalResponseTimeMinutes: 15,
          highResponseTimeMinutes: 60,
        },
      },
      reportConfig: {
        includeConfidentialityAnalysis: true,
        includeDemographicBreakdown: true,
        includeTemporalTrends: true,
        includeRecommendations: true,
        reportTemplate: 'standard',
        exportFormats: ['json', 'pdf'],
      },
      explanationConfig: {
        explanationMethod: 'shap',
        maxFeatures: 10,
        includeCounterfactuals: true,
        generateVisualization: false,
      },
      hipaaCompliant: true,
      dataMaskingEnabled: true,
      auditLogging: true,
    })

    // Perform bias analysis
    const analysisResult = await biasEngine.analyzeSession(validatedSession)

    // Cache the result
    if (shouldUseCache) {
      await cacheManager.analysisCache.cacheAnalysisResult(
        validatedSession.sessionId,
        analysisResult,
      )
    }

    // Log successful analysis
    const auditLogger = getAuditLogger()
    await auditLogger.logBiasAnalysis(
      user,
      validatedSession.sessionId,
      validatedSession.participantDemographics,
      analysisResult.overallBiasScore,
      analysisResult.alertLevel,
      clientInfo,
      true,
    )

    const processingTime = Date.now() - startTime

    // Record performance metrics
    performanceMonitor.recordRequestTiming(
      '/api/bias-detection/analyze',
      'POST',
      processingTime,
      200,
      user.userId,
    )

    // Record ML performance
    performanceMonitor.recordMLPerformance(
      'bias-detection-engine',
      'session-analysis',
      processingTime,
      undefined, // accuracy would be calculated separately
      analysisResult.confidence,
    )

    logger.info('Bias analysis completed successfully', {
      sessionId: validatedSession.sessionId,
      userId: user.userId,
      overallBiasScore: analysisResult.overallBiasScore,
      alertLevel: analysisResult.alertLevel,
      processingTime,
      cacheHit: false,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        processingTime,
        cacheHit: false,
      } as AnalyzeSessionResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Processing-Time': processingTime.toString(),
        },
      },
    )
  } catch (error) {
    const processingTime = Date.now() - startTime

    // Record error performance metrics
    if (user) {
      performanceMonitor.recordRequestTiming(
        '/api/bias-detection/analyze',
        'POST',
        processingTime,
        500,
        user.userId,
      )
    }

    logger.error('Bias analysis failed', {
      error,
      sessionId,
      userId: user?.userId,
      processingTime,
    })

    // Log failed analysis
    if (user && sessionId) {
      const auditLogger = getAuditLogger()
      const clientInfo = getClientInfo(request)

      await auditLogger.logAction(
        user,
        {
          type: 'create',
          category: 'bias-analysis',
          description: `Failed bias analysis for session ${sessionId}`,
          sensitivityLevel: 'high',
        },
        'bias-analysis',
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
        clientInfo,
        sessionId,
        false,
        error instanceof Error ? error.message : String(error),
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Analysis Failed',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
      } as AnalyzeSessionResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now()
  let user: UserContext | null = null
  let sessionId: string | undefined

  try {
    // Get client information
    const clientInfo = getClientInfo(request)

    // Authenticate user
    user = await authenticateRequest(request)
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Check authorization
    if (!hasPermission(user, 'bias-analysis', 'read')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions to read bias analysis',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Rate limiting
    if (!checkRateLimit(user.userId, 120, 60000)) {
      // Higher limit for GET requests
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        },
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = {
      sessionId: url.searchParams.get('sessionId'),
      includeCache: url.searchParams.get('includeCache') === 'true',
      anonymize: url.searchParams.get('anonymize') === 'true',
    }

    try {
      const validatedParams = GetAnalysisRequestSchema.parse(queryParams)
      sessionId = validatedParams.sessionId
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation Error',
          message: error instanceof z.ZodError
            ? `Invalid query parameters: ${error.errors.map((e) => e.message).join(', ')}`
            : 'Invalid query parameters',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    logger.info('Retrieving bias analysis results', {
      sessionId,
      userId: user.userId,
      includeCache: queryParams.includeCache,
    })

    // Try cache first
    const cacheManager = getCacheManager()
    let analysisResult: BiasAnalysisResult | null = null
    let cacheHit = false

    if (queryParams.includeCache) {
      analysisResult =
        await cacheManager.analysisCache.getAnalysisResult(sessionId)
      if (analysisResult) {
        cacheHit = true
      }
    }

    // If not in cache, try to get from bias detection engine
    if (!analysisResult) {
      const biasEngine = new BiasDetectionEngine({
        pythonServiceUrl:
          // biome-ignore lint/complexity/useLiteralKeys: <explanation>
          process.env['PYTHON_SERVICE_URL'] || 'http://localhost:5000',
        pythonServiceTimeout: 30000,
        thresholds: {
          warningLevel: 0.3,
          highLevel: 0.6,
          criticalLevel: 0.8,
        },
        layerWeights: {
          preprocessing: 0.2,
          modelLevel: 0.3,
          interactive: 0.2,
          evaluation: 0.3,
        },
        evaluationMetrics: ['fairness', 'bias', 'performance'],
        metricsConfig: {
          enableRealTimeMonitoring: true,
          metricsRetentionDays: 90,
          aggregationIntervals: ['1h', '1d', '1w'],
          dashboardRefreshRate: 300,
          exportFormats: ['json', 'csv'],
        },
        alertConfig: {
          enableSlackNotifications: false,
          enableEmailNotifications: true,
          emailRecipients: ['alerts@example.com'],
          alertCooldownMinutes: 30,
          escalationThresholds: {
            criticalResponseTimeMinutes: 15,
            highResponseTimeMinutes: 60,
          },
        },
        reportConfig: {
          includeConfidentialityAnalysis: true,
          includeDemographicBreakdown: true,
          includeTemporalTrends: true,
          includeRecommendations: true,
          reportTemplate: 'standard',
          exportFormats: ['json', 'pdf'],
        },
        explanationConfig: {
          explanationMethod: 'shap',
          maxFeatures: 10,
          includeCounterfactuals: true,
          generateVisualization: false,
        },
        hipaaCompliant: true,
        dataMaskingEnabled: true,
        auditLogging: true,
      })

      analysisResult = await biasEngine.getSessionAnalysis(sessionId)
    }

    if (!analysisResult) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Not Found',
          message: 'Session analysis not found',
        } as unknown as AnalyzeSessionResponse),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Anonymize sensitive data if requested
    if (queryParams.anonymize) {
      analysisResult = {
        ...analysisResult,
        demographics: {
          age: analysisResult.demographics.age,
          gender: analysisResult.demographics.gender,
          ethnicity: '[ANONYMIZED]',
          primaryLanguage: analysisResult.demographics.primaryLanguage,
        },
      }
    }

    // Log successful retrieval
    const auditLogger = getAuditLogger()
    await auditLogger.logAction(
      user,
      {
        type: 'read',
        category: 'bias-analysis',
        description: `Retrieved bias analysis for session ${sessionId}`,
        sensitivityLevel: 'medium',
      },
      'bias-analysis-retrieval',
      {
        sessionId,
        cacheHit,
        anonymized: queryParams.anonymize,
      },
      clientInfo,
      sessionId,
    )

    const processingTime = Date.now() - startTime

    logger.info('Bias analysis retrieved successfully', {
      sessionId,
      userId: user.userId,
      cacheHit,
      processingTime,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        processingTime,
        cacheHit,
      } as AnalyzeSessionResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': cacheHit ? 'HIT' : 'MISS',
          'X-Processing-Time': processingTime.toString(),
        },
      },
    )
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to retrieve bias analysis', {
      error,
      sessionId,
      userId: user?.userId,
      processingTime,
    })

    // Log failed retrieval
    if (user && sessionId) {
      const auditLogger = getAuditLogger()
      const clientInfo = getClientInfo(request)

      await auditLogger.logAction(
        user,
        {
          type: 'read',
          category: 'bias-analysis',
          description: `Failed to retrieve bias analysis for session ${sessionId}`,
          sensitivityLevel: 'medium',
        },
        'bias-analysis-retrieval',
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
        clientInfo,
        sessionId,
        false,
        error instanceof Error ? error.message : String(error),
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Retrieval Failed',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
      } as AnalyzeSessionResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
