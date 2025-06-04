import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  LineChart,
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { ProgressionAnalysis } from '@/lib/ai/temporal/types'

// Type definitions
interface EmotionProgressDashboardProps {
  progressData: {
    currentPeriod: ProgressionAnalysis
    previousPeriod: ProgressionAnalysis
    historicalProgress: Array<{
      date: string
      overallImprovement: number
      stabilityChange: number
      positiveEmotionChange: number
      negativeEmotionChange: number
    }>
    riskFactors: Array<{
      factor: string
      currentLevel: number
      previousLevel: number
      trend: 'improving' | 'worsening' | 'stable'
      priority: 'high' | 'medium' | 'low'
    }>
    goals: Array<{
      name: string
      target: number
      current: number
      progress: number
    }>
  }
  timeRange: 'week' | 'month' | 'quarter' | 'year'
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void
  isLoading?: boolean
  className?: string
}

/**
 * EmotionProgressDashboard Component
 *
 * Visualizes emotional health progress over time with multiple view options:
 * - Progress Overview: High-level metrics of emotional improvement
 * - Trend Analysis: Charts showing progress trends over time
 * - Risk Factors: Tracking of risk factors and their improvement
 * - Goals & Achievements: Visualization of progress toward emotional health goals
 */
export default function EmotionProgressDashboard({
  progressData,
  timeRange,
  onTimeRangeChange,
  isLoading = false,
  className = '',
}: EmotionProgressDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Loading state
  if (isLoading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-lg shadow ${className}`}
      aria-label="Emotional Progress Dashboard"
    >
      <div className="p-4 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Emotional Progress Dashboard
          </h2>

          <div className="flex items-center space-x-2">
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('week')}
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('month')}
            >
              Month
            </Button>
            <Button
              variant={timeRange === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('quarter')}
            >
              Quarter
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('year')}
            >
              Year
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 border-b">
          <TabsList className="w-full justify-start" role="tablist">
            <TabsTrigger value="overview" role="tab">
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends" role="tab">
              Trend Analysis
            </TabsTrigger>
            <TabsTrigger value="risks" role="tab">
              Risk Factors
            </TabsTrigger>
            <TabsTrigger value="goals" role="tab">
              Goals & Achievements
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="p-4" aria-live="polite">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <OverviewCard
              title="Overall Emotional Improvement"
              value={progressData.currentPeriod.overallImprovement}
              previousValue={progressData.previousPeriod.overallImprovement}
              higherIsBetter={true}
            />

            <OverviewCard
              title="Emotional Stability"
              value={progressData.currentPeriod.stabilityChange}
              previousValue={progressData.previousPeriod.stabilityChange}
              higherIsBetter={false}
              invert={true}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OverviewCard
              title="Positive Emotions"
              value={progressData.currentPeriod.positiveEmotionChange}
              previousValue={progressData.previousPeriod.positiveEmotionChange}
              higherIsBetter={true}
            />

            <OverviewCard
              title="Negative Emotions"
              value={progressData.currentPeriod.negativeEmotionChange}
              previousValue={progressData.previousPeriod.negativeEmotionChange}
              higherIsBetter={false}
              invert={true}
            />
          </div>
        </TabsContent>

        {/* Trend Analysis Tab Content */}
        <TabsContent value="trends" className="p-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Progress Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progressData.historicalProgress}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="overallImprovement"
                    name="Overall Improvement"
                    stroke="#22c55e"
                    activeDot={{ r: 8 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="stabilityChange"
                    name="Stability"
                    stroke="#3b82f6"
                  />

                  <Line
                    type="monotone"
                    dataKey="positiveEmotionChange"
                    name="Positive Emotions"
                    stroke="#4ade80"
                  />

                  <Line
                    type="monotone"
                    dataKey="negativeEmotionChange"
                    name="Negative Emotions"
                    stroke="#f59e0b"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Risk Factors Tab Content */}
        <TabsContent value="risks" className="p-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Risk Factor Tracking</h3>
            <div className="space-y-6">
              {progressData.riskFactors.map((risk, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{risk.factor}</span>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          risk.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : risk.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {risk.priority}
                      </span>
                    </div>
                    <div
                      className={
                        risk.trend === 'improving'
                          ? 'text-green-600'
                          : risk.trend === 'worsening'
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }
                    >
                      {risk.trend === 'improving' && '↓ '}
                      {risk.trend === 'worsening' && '↑ '}
                      {risk.trend === 'stable' && '→ '}
                      {(
                        ((risk.previousLevel - risk.currentLevel) /
                          risk.previousLevel) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                  <Progress
                    value={risk.currentLevel * 100}
                    max={100}
                    variant={
                      risk.trend === 'improving'
                        ? 'success'
                        : risk.trend === 'worsening'
                          ? 'error'
                          : 'primary'
                    }
                  />

                  <div className="text-xs text-gray-500">
                    Previous: {(risk.previousLevel * 100).toFixed(0)}% →
                    Current: {(risk.currentLevel * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Goals & Achievements Tab Content */}
        <TabsContent value="goals" className="p-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Progress Toward Goals</h3>
            <div className="space-y-6">
              {progressData.goals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-sm">
                      {goal.current.toFixed(1)} / {goal.target.toFixed(1)}
                    </span>
                  </div>
                  <Progress
                    value={goal.progress * 100}
                    max={100}
                    variant={goal.progress >= 1 ? 'success' : 'primary'}
                  />

                  <div className="text-xs text-gray-500">
                    {(goal.progress * 100).toFixed(0)}% complete
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper component for overview cards
function OverviewCard({
  title,
  value,
  previousValue,
  higherIsBetter = true,
  invert = false,
}: {
  title: string
  value: number
  previousValue: number
  higherIsBetter?: boolean
  invert?: boolean
}) {
  // Calculate change percentage
  const change =
    previousValue !== 0
      ? (value - previousValue) / Math.abs(previousValue)
      : value > 0
        ? 1
        : value < 0
          ? -1
          : 0

  // Format the absolute value for display
  const absValue = Math.abs(value * 100).toFixed(1)

  // Determine if current status is positive based on the value and whether higher values are better
  const isCurrentPositive = invert
    ? (value < 0 && higherIsBetter) || (value > 0 && !higherIsBetter)
    : (value > 0 && higherIsBetter) || (value < 0 && !higherIsBetter)

  // Get appropriate color classes for the current value
  const valueColorClass = isCurrentPositive ? 'text-green-600' : 'text-red-600'

  // Determine if the change is positive based on the direction and whether higher is better
  const isChangePositive = higherIsBetter ? change > 0 : change < 0

  // Get appropriate color for the change indicator
  const changeColorClass =
    change === 0
      ? 'text-gray-500'
      : isChangePositive
        ? 'text-green-600'
        : 'text-red-600'

  return (
    <Card className="p-4">
      <h3 className="text-base font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex items-baseline">
        <span className={`text-3xl font-bold ${valueColorClass}`}>
          {absValue}%
        </span>
        <span className={`ml-2 ${changeColorClass}`}>
          {change > 0 ? '↑' : change < 0 ? '↓' : '→'}{' '}
          {Math.abs(change * 100).toFixed(1)}%
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-1">
        from previous {change > 0 ? 'period' : 'period'}
      </p>
    </Card>
  )
}
