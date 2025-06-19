/**
 * Bias Detection Engine - Metrics API Endpoint
 * 
 * This endpoint provides access to performance metrics and monitoring data
 * for the bias detection engine.
 */

import type { APIRoute } from 'astro';
import { performanceMonitor } from '../../../lib/ai/bias-detection/performance-monitor';
import { createServerlessHandler } from '../../../lib/ai/bias-detection/serverless-handlers';
import { z } from 'zod';

// Request validation schema
const metricsQuerySchema = z.object({
  timeRange: z.coerce.number().min(60000).max(86400000).optional(), // 1 minute to 24 hours
  format: z.enum(['json', 'prometheus']).optional().default('json'),
  metrics: z.string().optional(), // comma-separated list of specific metrics
  aggregation: z.enum(['raw', 'summary']).optional().default('summary'),
});

type MetricsQuery = z.infer<typeof metricsQuerySchema>;

// Main handler for metrics endpoint
const handleMetricsRequest = async (req: any) => {
  const startTime = Date.now();

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
        }),
      };
    }

    // Validate query parameters
    const queryResult = metricsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid query parameters',
          details: queryResult.error.errors,
        }),
      };
    }

    const query: MetricsQuery = queryResult.data;

    // Get performance snapshot
    const snapshot = performanceMonitor.getSnapshot(query.timeRange);

    // Filter metrics if specific ones requested
    let filteredMetrics = snapshot.metrics;
    if (query.metrics) {
      const requestedMetrics = query.metrics.split(',').map(m => m.trim());
      filteredMetrics = snapshot.metrics.filter((m: { name: string }) => 
        requestedMetrics.includes(m.name)
      );
    }

    // Prepare response based on format
    if (query.format === 'prometheus') {
      const prometheusData = performanceMonitor.exportMetrics('prometheus');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: prometheusData,
      };
    }

    // JSON response
    const responseData = {
      timestamp: snapshot.timestamp,
      timeRange: query.timeRange || 300000,
      summary: snapshot.summary,
      ...(query.aggregation === 'raw' && { 
        metrics: filteredMetrics 
      }),
      meta: {
        totalMetrics: filteredMetrics.length,
        metricsTypes: [...new Set(filteredMetrics.map((m: { name: string }) => m.name))],
        requestDuration: Date.now() - startTime,
      },
    };

    // Record this API call's performance
    performanceMonitor.recordRequestTiming(
      '/api/bias-detection/metrics',
      'GET',
      Date.now() - startTime,
      200
    );

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Metrics should always be fresh
      },
      body: JSON.stringify(responseData, null, 2),
    };

  } catch (error) {
    console.error('Metrics endpoint error:', error);

    // Record error performance
    performanceMonitor.recordRequestTiming(
      '/api/bias-detection/metrics',
      'GET',
      Date.now() - startTime,
      500
    );

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// Create serverless-compatible handler
export const handler = createServerlessHandler(handleMetricsRequest);

// Astro API route export
export const GET: APIRoute = async ({ request, url }) => {
  const queryParams = Object.fromEntries(url.searchParams.entries());
  
  const mockRequest = {
    method: 'GET',
    headers: Object.fromEntries(request.headers.entries()),
    query: queryParams,
    body: null,
    path: '/api/bias-detection/metrics',
  };

  const response = await handleMetricsRequest(mockRequest);
  
  return new Response(response.body, {
    status: response.statusCode,
    headers: response.headers,
  });
}; 