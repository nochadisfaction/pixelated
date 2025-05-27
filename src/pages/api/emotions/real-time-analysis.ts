import type { NextApiRequest, NextApiResponse } from 'next'
import { getAIService } from '../../../lib/ai'
import { createLogger } from '../../../utils/logger'
import { rateLimiter } from '../../../lib/middleware/rate-limiter'
import { corsMiddleware } from '../../../lib/middleware/cors'
import { authenticateRequest } from '../../../lib/auth'

const logger = createLogger({ context: 'real-time-analysis-api' })
const METRICS_API_KEY = process.env.METRICS_API_KEY || ''

/**
 * Handler for real-time emotion analysis API requests
 *
 * @param req The request object
 * @param res The response object
 * @returns A JSON response with the emotion analysis or error
 *
 * @example
 * POST /api/emotions/real-time-analysis
 * {
 *   "text": "I'm feeling excited about this new feature!",
 *   "userId": "user-123" // Optional
 * }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get or create the AI service
    const aiService = getAIService()

    // Extract request data
    const { text, userId, context } = req.body

    // Validate input
    if (!text || typeof text !== 'string') {
      logger.warn('Invalid input: missing or non-string text', {
        userId,
        context,
      })
      return res
        .status(400)
        .json({ error: 'Text is required', code: 'ERR_TEXT_REQUIRED' })
    }

    if (text.length > 5000) {
      logger.warn('Input text too long', { userId, length: text.length })
      return res.status(400).json({
        error: 'Text exceeds maximum length of 5000 characters',
        code: 'ERR_TEXT_TOO_LONG',
      })
    }

    // Log the request (without the full text for privacy)
    logger.info('Processing real-time emotion analysis request', {
      textLength: text.length,
      userId: userId || 'anonymous',
      hasContext: !!context,
    })

    // Process the request with optimized real-time emotion analysis
    const result = await aiService.analyzeEmotionsRealTime(text, {
      userId: userId || 'anonymous',
      context: context || {},
    })

    // Return the analysis result
    return res.status(200).json({
      success: true,
      analysis: result,
      processingTimeMs:
        Date.now() -
        (req.headers['x-request-start']
          ? parseInt(req.headers['x-request-start'] as string, 10)
          : Date.now()),
    })
  } catch (error) {
    logger.error('Error processing real-time emotion analysis', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.body?.userId || 'anonymous',
      context: req.body?.context,
    })
    let code = 'ERR_UNKNOWN'
    let message = 'Failed to process emotion analysis'
    if (error instanceof Error) {
      if (error.message.includes('prompt injection')) {
        code = 'ERR_PROMPT_INJECTION'
        message = 'Unsafe input detected: possible prompt injection'
      } else if (error.message.includes('maximum allowed length')) {
        code = 'ERR_TEXT_TOO_LONG'
        message = error.message
      } else if (error.message.includes('required API credentials')) {
        code = 'ERR_API_CREDENTIALS'
        message = 'Server misconfiguration: missing API credentials'
      }
    }
    return res.status(500).json({
      error: message,
      code,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Apply middleware
export default corsMiddleware(
  rateLimiter(authenticateRequest(handler, { allowAnonymous: true })),
)

/**
 * GET /api/emotions/real-time-analysis/metrics
 * Returns cache and processing metrics for observability.
 * Requires x-api-key header matching METRICS_API_KEY.
 */
export async function GET(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers['x-api-key'] !== METRICS_API_KEY) {
    return res.status(403).json({ error: 'Forbidden', code: 'ERR_FORBIDDEN' })
  }
  try {
    const aiService = getAIService()
    const engine = aiService.getEmotionEngine()
    const cacheMetrics = engine.getCacheMetrics()
    const processingStatus = engine.getDynamicProcessingStatus()
    return res.status(200).json({
      cache: cacheMetrics,
      processing: processingStatus,
    })
  } catch (error) {
    logger.error('Error fetching metrics', { error })
    return res.status(500).json({
      error: 'Failed to fetch metrics',
      code: 'ERR_METRICS',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
