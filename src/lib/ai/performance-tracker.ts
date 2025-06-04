import { AuditEventType } from '../audit'
import { createResourceAuditLog } from '../audit'
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

// Define a type for the database row
interface MetricRow {
  model: string
  latency: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  success: boolean
  error_code: string | null
  cached: boolean
  optimized: boolean
  user_id: string | null
  session_id: string | null
  request_id: string
  created_at?: string
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
): Promise<
  | {
      avg_latency: number
      avg_tokens: number
      request_count: number
      success_count: number
      cached_count: number
      optimized_count: number
    }
  | {
      model: string
      avg_latency: number
      success_rate: number
      usage_count: number
    }
> {
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
      data?.reduce((sum: number, row: MetricRow) => sum + row.latency, 0) /
      (data?.length || 1)
    const avgTokens =
      data?.reduce((sum: number, row: MetricRow) => sum + row.total_tokens, 0) /
      (data?.length || 1)
    const requestCount = data?.length || 0
    const successCount =
      data?.filter((row: MetricRow) => row.success).length || 0
    const cachedCount = data?.filter((row: MetricRow) => row.cached).length || 0
    const optimizedCount =
      data?.filter((row: MetricRow) => row.optimized).length || 0

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
export async function getOverallPerformance(days = 30): Promise<
  | {
      avg_latency: number
      avg_tokens: number
      request_count: number
      success_count: number
      cached_count: number
      optimized_count: number
      model_count: number
    }
  | {
      avg_latency: number
      success_rate: number
      total_requests: number
      token_usage: number
    }
> {
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
      data?.reduce((sum: number, row: MetricRow) => sum + row.latency, 0) /
      (data?.length || 1)
    const avgTokens =
      data?.reduce((sum: number, row: MetricRow) => sum + row.total_tokens, 0) /
      (data?.length || 1)
    const requestCount = data?.length || 0
    const successCount =
      data?.filter((row: MetricRow) => row.success).length || 0
    const cachedCount = data?.filter((row: MetricRow) => row.cached).length || 0
    const optimizedCount =
      data?.filter((row: MetricRow) => row.optimized).length || 0
    const uniqueModels =
      new Set(data?.map((row: MetricRow) => row.model)).size || 0

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
