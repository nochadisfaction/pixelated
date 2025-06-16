'use client'

import { useState, useEffect } from 'react'
import { SkeletonChartBar, SkeletonChartLine } from '@/components/ui/skeleton'

interface ChartProps {
  title: string
  dataPoints: number[]
  labels: string[]
  height?: number
  type?: 'bar' | 'line' | 'pie'
  isLoading?: boolean
}

export function Chart({
  title,
  dataPoints,
  labels,
  height = 200,
  type = 'bar',
  isLoading = false,
}: ChartProps) {
  // Calculate the maximum value for scaling
  const maxValue = Math.max(...dataPoints, 1)

  // Function to render different chart types
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <div className="h-full flex items-end">
            {dataPoints.map((value, index) => {
              const percentage = (value / maxValue) * 100
              const prevValue = index > 0 ? (dataPoints[index - 1] ?? 0) : value
              const prevPercentage = (prevValue / maxValue) * 100

              return (
                <div key={`line-${labels[index]}-${value}`} className="flex-1 flex flex-col items-center">
                  <div className="relative w-full h-full flex items-end justify-center">
                    {/* Line connecting points */}
                    {index > 0 && (
                      <div
                        className="absolute bg-primary/30"
                        style={{
                          height: '2px',
                          width: '100%',
                          bottom: `${prevPercentage}%`,
                          left: '-50%',
                          transform: `rotate(${Math.atan2(
                            percentage - prevPercentage,
                            100,
                          )}rad)`,
                          transformOrigin: 'left bottom',
                        }}
                      />
                    )}

                    {/* Data point */}
                    <div
                      className="w-3 h-3 rounded-full bg-primary relative z-10"
                      style={{ marginBottom: `${percentage}%` }}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    {labels[index]}
                  </div>
                </div>
              )
            })}
          </div>
        )

      case 'pie': {
        const total = dataPoints.reduce((sum, value) => sum + value, 0) || 1 // Prevent division by zero

        let currentAngle = 0
        const segments = dataPoints.map((value, index) => {
          const percentage = (value / total) * 100
          const angle = (percentage / 100) * 360
          const startAngle = currentAngle
          currentAngle += angle

          return {
            percentage,
            startAngle,
            endAngle: currentAngle,
            color: `hsl(${(index * 50) % 360}, 70%, 50%)`,
            label: labels[index],
            value,
          }
        })

        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="relative w-32 h-32 rounded-full overflow-hidden mb-4"
              style={{
                background:
                  'conic-gradient(transparent 0deg, transparent 360deg)',
              }}
            >
              {segments.map((segment) => (
                <div
                  key={`pie-segment-${segment.label}-${segment.value}`}
                  className="absolute inset-0"
                  style={{
                    background: segment.color,
                    clipPath: `path('M 64 64 L 64 0 A 64 64 0 ${
                      segment.endAngle - segment.startAngle > 180 ? 1 : 0
                    } 1 ${
                      64 + 64 * Math.cos((segment.endAngle * Math.PI) / 180)
                    } ${
                      64 + 64 * Math.sin((segment.endAngle * Math.PI) / 180)
                    } Z')`,

                    transform: `rotate(${segment.startAngle}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {segments.map((segment) => (
                <div key={`pie-legend-${segment.label}-${segment.value}`} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: segment.color }}
                  />

                  <span className="text-xs">
                    {segment.label}: {segment.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      }
      default:
        return (
          <div className="h-full flex items-end">
            {dataPoints.map((value, index) => {
              const percentage = (value / maxValue) * 100
              return (
                <div key={`bar-${labels[index]}-${value}`} className="flex-1 flex flex-col items-center">
                  <div className="relative h-full w-full flex items-end justify-center">
                    <div
                      className="w-8 bg-primary/70 hover:bg-primary transition-colors rounded-t relative group"
                      style={{ height: `${percentage}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        {value}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {labels[index]}
                  </div>
                </div>
              )
            })}
          </div>
        )
    }
  }

  return (
    <div className="w-full" aria-label={title} role="img">
      <div className="sr-only">
        {title} chart. Data visualization for {title}.
      </div>
      <h4 className="text-sm font-medium mb-3 text-center">{title}</h4>
      <div style={{ height: `${height}px` }} className="mb-2">
        {isLoading ? (
          type === 'line' ? (
            <SkeletonChartLine />
          ) : (
            <SkeletonChartBar />
          )
        ) : (
          renderChart()
        )}
      </div>
    </div>
  )
}

export function AnalyticsCharts() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [isLoading, setIsLoading] = useState(true)

  // Handle period changes with loading state
  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setIsLoading(true)
    setPeriod(newPeriod)
    
    // Simulate data loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1200)
  }

  // Initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  // Sample data
  const chartData = {
    daily: {
      sessions: {
        data: [2, 1, 3, 0, 2, 4, 1],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      duration: {
        data: [45, 30, 60, 0, 40, 90, 20],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      feedback: {
        data: [4, 3, 5, 0, 3, 4, 3],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      techniques: {
        data: [30, 25, 15, 30],
        labels: ['CBT', 'Mindfulness', 'DBT', 'Other'],
      },
    },
    weekly: {
      sessions: {
        data: [5, 8, 12, 7, 9, 11, 10, 13],
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      },
      duration: {
        data: [120, 180, 240, 150, 190, 210, 200, 250],
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      },
      feedback: {
        data: [3.5, 3.8, 4.1, 3.9, 4.0, 4.2, 4.3, 4.5],
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      },
      techniques: {
        data: [40, 30, 20, 10],
        labels: ['CBT', 'Mindfulness', 'DBT', 'Other'],
      },
    },
    monthly: {
      sessions: {
        data: [22, 28, 32, 26, 35, 30],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      },
      duration: {
        data: [480, 520, 600, 500, 650, 580],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      },
      feedback: {
        data: [3.7, 3.9, 4.0, 4.1, 4.3, 4.4],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      },
      techniques: {
        data: [45, 25, 20, 10],
        labels: ['CBT', 'Mindfulness', 'DBT', 'Other'],
      },
    },
  }

  const currentData = chartData[period]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Analytics</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded-md ${
              period === 'daily'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-accent'
            }`}
            onClick={() => handlePeriodChange('daily')}
          >
            Daily
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded-md ${
              period === 'weekly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-accent'
            }`}
            onClick={() => handlePeriodChange('weekly')}
          >
            Weekly
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded-md ${
              period === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-accent'
            }`}
            onClick={() => handlePeriodChange('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Chart
          title="Sessions Completed"
          dataPoints={currentData.sessions.data}
          labels={currentData.sessions.labels}
          type="bar"
          isLoading={isLoading}
        />

        <Chart
          title="Session Duration (minutes)"
          dataPoints={currentData.duration.data}
          labels={currentData.duration.labels}
          type="line"
          isLoading={isLoading}
        />

        <Chart
          title="Feedback Score (1-5)"
          dataPoints={currentData.feedback.data}
          labels={currentData.feedback.labels}
          type="line"
          isLoading={isLoading}
        />

        <Chart
          title="Techniques Used"
          dataPoints={currentData.techniques.data}
          labels={currentData.techniques.labels}
          type="pie"
          isLoading={isLoading}
        />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Data shown is for demonstration purposes.{' '}
          <a href="/analytics" className="text-primary hover:underline">
            View detailed analytics
          </a>
        </p>
      </div>
    </div>
  )
}
