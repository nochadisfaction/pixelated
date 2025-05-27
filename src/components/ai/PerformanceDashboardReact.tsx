import React, { useEffect, useState } from 'react'

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

export interface PerformanceDashboardProps {
  aiService: AIServiceProps
  refreshInterval?: number // in milliseconds
}

export function PerformanceDashboardReact({
  aiService,
  refreshInterval = 10000,
}: PerformanceDashboardProps) {
  const [cacheStats, setCacheStats] = useState<{
    size: number
    maxSize: number
    enabled: boolean
    ttl: number
    hitRate?: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCacheStats = async () => {
    try {
      setIsLoading(true)
      const cache = aiService.getCacheService()
      const stats = cache.getStats()
      setCacheStats(stats)
    } catch (error) {
      console.error('Error fetching cache stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchCacheStats()

    // Set up polling interval if refreshInterval is provided
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchCacheStats, refreshInterval)
      return () => clearInterval(intervalId)
    }
  }, [refreshInterval])

  const handleClearCache = async () => {
    try {
      const cache = aiService.getCacheService()
      await cache.clear()
      // Refetch stats after clearing
      fetchCacheStats()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  if (isLoading && !cacheStats) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Cache Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Size</div>
            <div className="text-xl font-semibold">
              {cacheStats?.size || 0} entries
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Max Size
            </div>
            <div className="text-xl font-semibold">
              {cacheStats?.maxSize || 0} entries
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Hit Rate
            </div>
            <div className="text-xl font-semibold">
              {cacheStats?.hitRate !== undefined
                ? `${(cacheStats.hitRate * 100).toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">TTL</div>
            <div className="text-xl font-semibold">
              {cacheStats?.ttl ? `${cacheStats.ttl / 1000}s` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
          <span
            className={`font-medium ${
              cacheStats?.enabled
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {cacheStats?.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <button
          onClick={handleClearCache}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
        >
          Clear Cache
        </button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-6 text-right">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}

// Add default export
export default PerformanceDashboardReact
