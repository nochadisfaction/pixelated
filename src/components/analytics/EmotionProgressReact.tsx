import React, { useState } from 'react'
import EmotionProgressDashboard from './EmotionProgressDashboard'
import useEmotionProgress from '../../hooks/useEmotionProgress'

export default function EmotionProgressReact() {
  const [timeRange, setTimeRange] = useState<
    'week' | 'month' | 'quarter' | 'year'
  >('month')

  const { data, isLoading, error } = useEmotionProgress({ timeRange })

  return (
    <>
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p className="font-bold">Error</p>
          <p>{error.message}</p>
        </div>
      )}

      {data ? (
        <EmotionProgressDashboard
          progressData={data}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          isLoading={isLoading}
        />
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-gray-500">No emotion progress data available</p>
        </div>
      )}
    </>
  )
}
