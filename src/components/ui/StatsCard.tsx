import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className = '',
}: StatsCardProps) {
  return (
    <div
      className={`p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">
            {title}
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </div>
          {description && (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </div>
          )}
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span
                className={`flex items-center ${
                  trend.isPositive
                    ? 'text-green-500 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {trend.isPositive ? (
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                )}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-purple-100 rounded-lg dark:bg-purple-900">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
