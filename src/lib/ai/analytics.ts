import { createAuditLog } from '~/lib/audit/log'
import { supabase } from '~/lib/db/supabase'
import { getDateKey } from '~/lib/utils'

/**
 * Interface for AI usage statistics
 */
export interface AIUsageStat {
  date: string
  totalRequests: number
  totalTokens: number
  totalCost: number
  modelUsage: Record<
    string,
    {
      requests: number
      tokens: number
      cost: number
    }
  >
}

/**
 * Options for retrieving AI usage statistics
 */
export interface AIUsageStatsOptions {
  period: 'daily' | 'weekly' | 'monthly'
  userId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(
  options: AIUsageStatsOptions,
): Promise<AIUsageStat[]> {
  const {
    period = 'daily',
    userId,
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
    endDate = new Date(),
    limit = 30,
  } = options

  try {
    // Log the analytics request
    await createAuditLog(
      userId || 'system',
      'ai.analytics.request',
      'analytics',
      {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit,
      },
    )

    // Get all usage logs for the period
    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('user_id', userId || '')
      .order('created_at', { ascending: false })
      .limit(limit * 100) // Get more logs to account for grouping

    if (error) {
      throw error
    }

    // Group logs by date and model
    const statsByDate: Record<string, AIUsageStat> = {}

    for (const log of logs || []) {
      const date = getDateKey(log.created_at, period)

      // Initialize the date entry if it doesn't exist
      if (!statsByDate[date]) {
        statsByDate[date] = {
          date,
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          modelUsage: {},
        }
      }

      // Initialize model usage if it doesn't exist
      if (!statsByDate[date].modelUsage[log.model]) {
        statsByDate[date].modelUsage[log.model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        }
      }

      // Update totals
      statsByDate[date].totalRequests++
      statsByDate[date].totalTokens += log.total_tokens
      statsByDate[date].totalCost += log.cost

      // Update model usage
      statsByDate[date].modelUsage[log.model].requests++
      statsByDate[date].modelUsage[log.model].tokens += log.total_tokens
      statsByDate[date].modelUsage[log.model].cost += log.cost
    }

    // Convert to array and sort by date
    return Object.values(statsByDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error retrieving AI usage statistics:', error)

    // Log the error
    await createAuditLog(
      userId || 'system',
      'ai.analytics.error',
      'analytics',
      {
        error: error instanceof Error ? error?.message : String(error),
        period,
        userId,
      },
    )

    throw error
  }
}

/**
 * Get model usage breakdown
 */
export async function getModelUsageBreakdown(
  options: AIUsageStatsOptions,
): Promise<
  Record<
    string,
    {
      requests: number
      tokens: number
      cost: number
    }
  >
> {
  const stats = await getAIUsageStats(options)

  // Aggregate model usage across all dates
  const modelUsage: Record<
    string,
    {
      requests: number
      tokens: number
      cost: number
    }
  > = {}

  // First pass: calculate totals
  for (const stat of stats) {
    for (const [model, usage] of Object.entries(stat.modelUsage)) {
      if (!modelUsage[model]) {
        modelUsage[model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        }
      }

      modelUsage[model].requests += usage.requests
      modelUsage[model].tokens += usage.tokens
      modelUsage[model].cost += usage.cost
    }
  }

  return modelUsage
}
/**
 * Get usage trends over time
 */
export async function getUsageTrends(options: AIUsageStatsOptions): Promise<{
  dates: string[]
  requests: number[]
  tokens: number[]
  costs: number[]
}> {
  const stats = await getAIUsageStats(options)

  // Sort by date ascending
  stats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    dates: stats.map((stat) => stat.date),
    requests: stats.map((stat) => stat.totalRequests),
    tokens: stats.map((stat) => stat.totalTokens),
    costs: stats.map((stat) => stat.totalCost),
  }
}
