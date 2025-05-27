import React, { useEffect, useState } from 'react'

// Define interface for the expected AIService in this component
interface AIServiceProps {
  getCacheService: () => {
    getStats: () => {
      size: number
      maxSize: number
      enabled: boolean
      ttl: number
      hitRate?: number
    }
    clear: () => void
  }
}

interface PerformanceMetrics {
  cache: {
    size: number
    maxSize: number
    enabled: boolean
    ttl: number
    hitRate?: number
  }
  connectionPool: {
    totalConnections: number
    activeConnections: number
    idleConnections: number
    maxConnections: number
    enabled: boolean
  }
  responseTime: {
    average: number
    min: number
    max: number
    samples: number
  }
  tokenUsage: {
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
    averagePerRequest: number
    samples: number
  }
}

export interface PerformanceDashboardProps {
  aiService: AIServiceProps
  refreshInterval?: number // in milliseconds
}

export function PerformanceDashboardReact({
  aiService,
  refreshInterval = 10000,
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Mock response time and token usage data (in a real app, this would come from a database)
  const mockResponseTimeData = {
    average: 450,
    min: 120,
    max: 1200,
    samples: 156,
  }

  const mockTokenUsageData = {
    totalPromptTokens: 45600,
    totalCompletionTokens: 32400,
    totalTokens: 78000,
    averagePerRequest: 500,
    samples: 156,
  }

  useEffect(() => {
    const fetchMetrics = () => {
      try {
        setLoading(true)

        // Get real-time metrics from the AI service
        const serviceStats = aiService.getCacheService().getStats()

        // Combine with mock data (in a real app, all data would come from a database)
        setMetrics({
          cache: serviceStats,
          connectionPool: {
            totalConnections: 10,
            activeConnections: 3,
            idleConnections: 7,
            maxConnections: 20,
            enabled: true,
          },
          responseTime: mockResponseTimeData,
          tokenUsage: mockTokenUsageData,
        })

        setError(null)
      } catch (err) {
        setError('Failed to fetch performance metrics')
        console.error('Error fetching metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    // Fetch metrics immediately
    fetchMetrics()

    // Set up interval for refreshing metrics
    const intervalId = setInterval(fetchMetrics, refreshInterval)

    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [aiService, refreshInterval])

  if (loading && !metrics) {
    return <div className="p-4 text-center">Loading performance metrics...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>
  }

  if (!metrics) {
    return <div className="p-4 text-center">No performance data available</div>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        AI Performance Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cache Metrics */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Cache Performance
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Status:</span>
              <span
                className={
                  metrics.cache.enabled ? 'text-green-500' : 'text-red-500'
                }
              >
                {metrics.cache.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Cache Size:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.cache.size} /{metrics.cache.maxSize}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">TTL:</span>
              <span className="text-gray-800 dark:text-gray-200">
                {(metrics.cache.ttl / 1000).toFixed(0)}s
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Hit Rate:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.cache.hitRate
                  ? `${(metrics.cache.hitRate * 100).toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Pool Metrics */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Connection Pool
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Status:</span>
              <span
                className={
                  metrics.connectionPool.enabled
                    ? 'text-green-500'
                    : 'text-red-500'
                }
              >
                {metrics.connectionPool.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Active Connections:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.connectionPool.activeConnections}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Idle Connections:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.connectionPool.idleConnections}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Total Connections:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.connectionPool.totalConnections} /{' '}
                {metrics.connectionPool.maxConnections}
              </span>
            </div>
          </div>
        </div>

        {/* Response Time Metrics */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Response Time
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Average:</span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.responseTime.average}
                ms
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Min:</span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.responseTime.min}
                ms
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Max:</span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.responseTime.max}
                ms
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Samples:</span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.responseTime.samples}
              </span>
            </div>
          </div>
        </div>

        {/* Token Usage Metrics */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Token Usage
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Total Tokens:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.tokenUsage.totalTokens.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Prompt Tokens:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.tokenUsage.totalPromptTokens.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Completion Tokens:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.tokenUsage.totalCompletionTokens.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Avg. Per Request:
              </span>
              <span className="text-gray-800 dark:text-gray-200">
                {metrics.tokenUsage.averagePerRequest.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-right">
        <button
          onClick={() => aiService.getCacheService().clear()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Reset Connections
        </button>
      </div>
    </div>
  )
}
