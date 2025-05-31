import type { APIRoute } from 'astro';
import { BiasDetectionEngine } from '@/lib/ai/bias-detection/BiasDetectionEngine';
import { getLogger } from '@/lib/utils/logger';
import type { SessionData, BiasAnalysisResult } from '@/lib/ai/bias-detection/types';

const logger = getLogger('BiasAnalysisAPI');

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionData: SessionData = await request.json();
    
    // Validate required fields
    if (!sessionData.sessionId || !sessionData.content) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        message: 'sessionId and content are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Starting bias analysis for session', {
      sessionId: sessionData.sessionId,
      participantDemographics: sessionData.participantDemographics
    });

    // Initialize bias detection engine
    const biasEngine = new BiasDetectionEngine({
      warningThreshold: 0.3,
      highThreshold: 0.6,
      criticalThreshold: 0.8,
      enableHipaaCompliance: true,
      enableAuditLogging: true
    });

    // Perform bias analysis
    const analysisResult = await biasEngine.analyzeSession(sessionData);

    logger.info('Bias analysis completed', {
      sessionId: sessionData.sessionId,
      overallBiasScore: analysisResult.overallBiasScore,
      alertLevel: analysisResult.alertLevel
    });

    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Bias analysis failed', { error });
    
    return new Response(JSON.stringify({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response(JSON.stringify({
        error: 'Missing sessionId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Retrieving bias analysis results', { sessionId });

    // Initialize bias detection engine
    const biasEngine = new BiasDetectionEngine({
      warningThreshold: 0.3,
      highThreshold: 0.6,
      criticalThreshold: 0.8,
      enableHipaaCompliance: true,
      enableAuditLogging: true
    });

    // Get analysis results for session
    const analysisResult = await biasEngine.getSessionAnalysis(sessionId);

    if (!analysisResult) {
      return new Response(JSON.stringify({
        error: 'Session analysis not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve bias analysis', { error });
    
    return new Response(JSON.stringify({
      error: 'Failed to retrieve analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 