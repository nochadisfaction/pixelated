import { AuditEventType } from '../audit'
import { createResourceAuditLog } from '../audit/log'
import { supabase } from '../db/supabase'

export interface PerformanceMetric {
  model: string
  latency: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  success: boolean
  error_code?: string
  cached: boolean
  optimized: boolean
  user_id?: string
  session_id?: string
  request_id: string
}

/**
 * Track AI performance metrics in the database
 */
export async function trackPerformance(
  metric: PerformanceMetric,
): Promise<void> {
  try {
    await supabase.from('ai_performance_metrics').insert({
      model: metric.model,
      latency: metric.latency,
      input_tokens: metric.input_tokens,
      output_tokens: metric.output_tokens,
      total_tokens: metric.total_tokens,
      success: metric.success,
      error_code: metric.error_code || null,
      cached: metric.cached,
      optimized: metric.optimized,
      user_id: metric.user_id || null,
      session_id: metric.session_id || null,
      request_id: metric.request_id,
    })

    // Log audit event for tracking purposes
    // Only log if user_id is provided
    if (metric.user_id) {
      await createResourceAuditLog(
        AuditEventType.AI_OPERATION,
        metric.user_id,
        { id: 'ai_service', type: 'ai' },
        {
          model: metric.model,
          success: metric.success,
          cached: metric.cached,
          optimized: metric.optimized,
        },
      )
    }
  } catch (error) {
    console.error('Error tracking AI performance:', error)
  }
}

/**
 * Get performance metrics for a specific model
 */
export async function getModelPerformance(
  model: string,
  days = 30,
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('ai_performance_metrics')
      .select('*')
      .eq('model', model)
      .gte(
        'created_at',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      )

    if (error) {
      throw error
    }

    // Calculate aggregated metrics
    const avgLatency =
      data?.reduce((sum, row) => sum + row.latency, 0) / data?.length
    const avgTokens =
      data?.reduce((sum, row) => sum + row.total_tokens, 0) / data?.length
    const requestCount = data?.length
    const successCount = data?.filter((row) => row.success).length
    const cachedCount = data?.filter((row) => row.cached).length
    const optimizedCount = data?.filter((row) => row.optimized).length

    return {
      avg_latency: avgLatency,
      avg_tokens: avgTokens,
      request_count: requestCount,
      success_count: successCount,
      cached_count: cachedCount,
      optimized_count: optimizedCount,
    }
  } catch (error) {
    console.error('Error getting model performance:', error)
    return {
      model: 'unknown',
      avg_latency: 0,
      success_rate: 0,
      usage_count: 0,
    }
  }
}

/**
 * Get overall AI performance metrics
 */
export async function getOverallPerformance(days = 30): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('ai_performance_metrics')
      .select('*')
      .gte(
        'created_at',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      )

    if (error) {
      throw error
    }

    // Calculate aggregated metrics
    const avgLatency =
      data?.reduce((sum, row) => sum + row.latency, 0) / data?.length
    const avgTokens =
      data?.reduce((sum, row) => sum + row.total_tokens, 0) / data?.length
    const requestCount = data?.length
    const successCount = data?.filter((row) => row.success).length
    const cachedCount = data?.filter((row) => row.cached).length
    const optimizedCount = data?.filter((row) => row.optimized).length
    const uniqueModels = new Set(data?.map((row) => row.model)).size

    return {
      avg_latency: avgLatency,
      avg_tokens: avgTokens,
      request_count: requestCount,
      success_count: successCount,
      cached_count: cachedCount,
      optimized_count: optimizedCount,
      model_count: uniqueModels,
    }
  } catch (error) {
    console.error('Error getting overall performance:', error)
    return {
      avg_latency: 0,
      success_rate: 0,
      total_requests: 0,
      token_usage: 0,
    }
  }
}
