/**
 * Bias Detection Dashboard Component
 *
 * Provides real-time monitoring and analytics for bias detection in therapeutic training sessions.
 * Features bias metrics, alerts, trends, and demographic analysis.
 *
 * Accessibility Features:
 * - ARIA labels and descriptions for all interactive elements
 * - Keyboard navigation support
 * - Screen reader friendly content
 * - High contrast support
 * - Focus management
 *
 * Responsive Design:
 * - Mobile-first approach with breakpoint-specific layouts
 * - Flexible grid systems that adapt to screen size
 * - Touch-friendly interface elements
 * - Optimized chart rendering for different screen sizes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '@/components/ui/alert'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import {
  AlertTriangle,
  Users,
  Eye,
  Download,
  RefreshCw,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Clock,
  Bell,
  Check,
  X,
  Mail,
  MessageSquare,
  Archive,
  AlertCircle,
  Info,
  CheckCircle,
} from 'lucide-react'
import { getLogger } from '@/lib/utils/logger'
import type { BiasDashboardData } from '@/lib/ai/bias-detection/types'

const logger = getLogger('BiasDashboard')

interface BiasDashboardProps {
  className?: string
  refreshInterval?: number // milliseconds
  enableRealTimeUpdates?: boolean
}

// Notification types
interface NotificationSettings {
  emailEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  criticalAlerts: boolean
  highAlerts: boolean
  mediumAlerts: boolean
  lowAlerts: boolean
}

interface AlertAction {
  id: string
  type: 'acknowledge' | 'dismiss' | 'escalate' | 'archive'
  timestamp: string
  userId?: string
  notes?: string
}

export const BiasDashboard: React.FC<BiasDashboardProps> = ({
  className = '',
  refreshInterval = 30000, // 30 seconds
  enableRealTimeUpdates = true,
}) => {
  // State management
  const [dashboardData, setDashboardData] = useState<BiasDashboardData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [selectedDemographicFilter, setSelectedDemographicFilter] =
    useState('all')
  const [autoRefresh, setAutoRefresh] = useState(enableRealTimeUpdates)
  const [, setWsConnected] = useState(false)
  const [wsConnectionStatus, setWsConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'
  >('disconnected')
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  // Filtering state
  const [biasScoreFilter, setBiasScoreFilter] = useState<
    'all' | 'low' | 'medium' | 'high'
  >('all')
  const [alertLevelFilter, setAlertLevelFilter] = useState<
    'all' | 'low' | 'medium' | 'high' | 'critical'
  >('all')
  const [, setSessionTypeFilter] = useState<'all' | 'individual' | 'group'>(
    'all',
  )
  const [customDateRange, setCustomDateRange] = useState<{
    start: string
    end: string
  }>({
    start: '',
    end: '',
  })

  // Alert management state
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      criticalAlerts: true,
      highAlerts: true,
      mediumAlerts: true,
      lowAlerts: false,
    })
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [alertActions, setAlertActions] = useState<Map<string, AlertAction[]>>(
    new Map(),
  )
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false)
  const [alertNotes, setAlertNotes] = useState<Map<string, string>>(new Map())

  // Data export state
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>(
    'json',
  )
  const [exportDateRange, setExportDateRange] = useState<{
    start: string
    end: string
  }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 7 days ago
    end: new Date().toISOString().split('T')[0], // today
  })
  const [exportDataTypes, setExportDataTypes] = useState({
    summary: true,
    alerts: true,
    trends: true,
    demographics: true,
    sessions: true,
    recommendations: false,
  })
  const [exportFilters, setExportFilters] = useState({
    applyCurrentFilters: true,
    includeArchived: false,
    minBiasScore: 0,
    maxBiasScore: 1,
  })
  const [exportProgress, setExportProgress] = useState<{
    isExporting: boolean
    progress: number
    status: string
  }>({
    isExporting: false,
    progress: 0,
    status: '',
  })

  // Responsive design state
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop',
  )

  // Accessibility state
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [announcements, setAnnouncements] = useState<string[]>([])

  // Focus management refs
  const skipLinkRef = useRef<HTMLAnchorElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const alertsTabRef = useRef<HTMLButtonElement>(null)

  // Time range options
  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' },
  ]

  // Demographic filter options
  const demographicFilterOptions = [
    { value: 'all', label: 'All Demographics' },
    { value: 'age', label: 'Filter by Age' },
    { value: 'gender', label: 'Filter by Gender' },
    { value: 'ethnicity', label: 'Filter by Ethnicity' },
  ]

  // Filter functions
  const filterDataByTimeRange = useCallback(
    (data: any[], timeRange: string) => {
      if (!data || data.length === 0) return data

      const now = new Date()
      let startTime: Date

      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
          break
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'custom':
          if (customDateRange.start) {
            startTime = new Date(customDateRange.start)
          } else {
            return data
          }
          break
        default:
          return data
      }

      const endTime =
        timeRange === 'custom' && customDateRange.end
          ? new Date(customDateRange.end)
          : now

      return data.filter((item) => {
        const itemDate = new Date(item.timestamp || item.date)
        return itemDate >= startTime && itemDate <= endTime
      })
    },
    [customDateRange],
  )

  const filterDataByBiasScore = useCallback((data: any[], filter: string) => {
    if (filter === 'all' || !data) return data

    return data.filter((item) => {
      const score = item.biasScore || item.overallBiasScore || 0
      switch (filter) {
        case 'low':
          return score < 0.3
        case 'medium':
          return score >= 0.3 && score < 0.6
        case 'high':
          return score >= 0.6
        default:
          return true
      }
    })
  }, [])

  const filterDataByAlertLevel = useCallback((data: any[], filter: string) => {
    if (filter === 'all' || !data) return data
    return data.filter(
      (item) => item.level === filter || item.alertLevel === filter,
    )
  }, [])

  // Apply all filters to data
  const getFilteredData = useCallback(
    (data: any[], type: 'trends' | 'alerts' | 'sessions') => {
      if (!data) return data

      let filtered = filterDataByTimeRange(data, selectedTimeRange)

      if (type === 'alerts') {
        filtered = filterDataByAlertLevel(filtered, alertLevelFilter)
      }

      if (type === 'sessions' || type === 'trends') {
        filtered = filterDataByBiasScore(filtered, biasScoreFilter)
      }

      return filtered
    },
    [
      selectedTimeRange,
      alertLevelFilter,
      biasScoreFilter,
      filterDataByTimeRange,
      filterDataByAlertLevel,
      filterDataByBiasScore,
    ],
  )

  // Alert management functions
  const handleAlertAction = useCallback(
    async (alertId: string, action: AlertAction['type'], notes?: string) => {
      try {
        const actionData: AlertAction = {
          id: `action-${Date.now()}`,
          type: action,
          timestamp: new Date().toISOString(),
          userId: 'current-user', // In real app, get from auth context
          notes,
        }

        // Update local state
        setAlertActions((prev) => {
          const newActions = new Map(prev)
          const existingActions = newActions.get(alertId) || []
          newActions.set(alertId, [...existingActions, actionData])
          return newActions
        })

        // Update dashboard data based on action
        if (
          action === 'acknowledge' ||
          action === 'dismiss' ||
          action === 'archive'
        ) {
          setDashboardData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              alerts: prev.alerts.map((alert) =>
                alert.alertId === alertId
                  ? { ...alert, acknowledged: true, status: action }
                  : alert,
              ),
            }
          })
        }

        // Send to backend
        const response = await fetch(
          `/api/bias-detection/alerts/${alertId}/action`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(actionData),
          },
        )

        if (!response.ok) {
          throw new Error('Failed to update alert')
        }

        logger.info(`Alert ${action} completed`, { alertId, action, notes })
      } catch (err) {
        logger.error('Failed to perform alert action', {
          error: err,
          alertId,
          action,
        })
        // Revert local state on error
        setAlertActions((prev) => {
          const newActions = new Map(prev)
          const existingActions = newActions.get(alertId) || []
          newActions.set(alertId, existingActions.slice(0, -1))
          return newActions
        })
      }
    },
    [],
  )

  const handleBulkAlertAction = useCallback(
    async (alertIds: string[], action: AlertAction['type']) => {
      try {
        const promises = alertIds.map((alertId) =>
          handleAlertAction(alertId, action),
        )
        await Promise.all(promises)
        setSelectedAlerts(new Set()) // Clear selection
        logger.info(`Bulk ${action} completed`, { count: alertIds.length })
      } catch (err) {
        logger.error('Failed to perform bulk alert action', {
          error: err,
          action,
          count: alertIds.length,
        })
      }
    },
    [handleAlertAction],
  )

  const toggleAlertSelection = useCallback((alertId: string) => {
    setSelectedAlerts((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(alertId)) {
        newSelection.delete(alertId)
      } else {
        newSelection.add(alertId)
      }
      return newSelection
    })
  }, [])

  const selectAllAlerts = useCallback(() => {
    if (!dashboardData?.alerts) return
    const filteredAlerts = getFilteredData(dashboardData.alerts, 'alerts')
    setSelectedAlerts(new Set(filteredAlerts.map((alert) => alert.alertId)))
  }, [dashboardData?.alerts, getFilteredData])

  const clearAlertSelection = useCallback(() => {
    setSelectedAlerts(new Set())
  }, [])

  const updateNotificationSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      try {
        const updatedSettings = { ...notificationSettings, ...newSettings }
        setNotificationSettings(updatedSettings)

        // Send to backend
        const response = await fetch(
          '/api/bias-detection/notification-settings',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedSettings),
          },
        )

        if (!response.ok) {
          throw new Error('Failed to update notification settings')
        }

        logger.info('Notification settings updated', updatedSettings)
      } catch (err) {
        logger.error('Failed to update notification settings', { error: err })
        // Revert on error
        setNotificationSettings(notificationSettings)
      }
    },
    [notificationSettings],
  )

  const sendTestNotification = useCallback(async () => {
    try {
      const response = await fetch('/api/bias-detection/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: notificationSettings }),
      })

      if (!response.ok) {
        throw new Error('Failed to send test notification')
      }

      logger.info('Test notification sent')
      // Show success message (in real app, use toast notification)
      alert('Test notification sent successfully!')
    } catch (err) {
      logger.error('Failed to send test notification', { error: err })
      alert('Failed to send test notification')
    }
  }, [notificationSettings])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/bias-detection/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch dashboard data: ${response.statusText}`,
        )
      }

      const data: BiasDashboardData = await response.json()
      setDashboardData(data)
      setLastUpdated(new Date())

      logger.info('Dashboard data loaded successfully', {
        totalSessions: data.summary.totalSessions,
        averageBiasScore: data.summary.averageBiasScore,
        alertsCount: data.alerts.length,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Failed to fetch dashboard data', { error: errorMessage })
    } finally {
      setLoading(false)
    }
  }, [])

  // WebSocket connection setup
  useEffect(() => {
    if (!enableRealTimeUpdates) return

    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 1000 // Start with 1 second

    const connectWebSocket = () => {
      try {
        setWsConnectionStatus('connecting')
        const wsUrl =
          process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/bias-detection'
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setWsConnected(true)
          setWsConnectionStatus('connected')
          setWsReconnectAttempts(0)
          reconnectAttempts = 0 // Reset attempts on successful connection
          announceToScreenReader('Live updates connected')
          logger.info('WebSocket connection established', { url: wsUrl })

          // Send initial subscription message
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                'bias_alerts',
                'session_updates',
                'metrics_updates',
                'trends_updates',
              ],
              filters: {
                timeRange: selectedTimeRange,
                biasScoreFilter,
                alertLevelFilter,
              },
            }),
          )
        }

        ws.onclose = (event) => {
          setWsConnected(false)
          announceToScreenReader('Live updates disconnected')
          logger.info('WebSocket connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          })

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            setWsConnectionStatus('reconnecting')
            const delay = reconnectDelay * Math.pow(2, reconnectAttempts)
            reconnectAttempts++
            setWsReconnectAttempts(reconnectAttempts)

            logger.info('Attempting to reconnect WebSocket', {
              attempt: reconnectAttempts,
              delay,
              maxAttempts: maxReconnectAttempts,
            })

            setTimeout(() => {
              if (wsRef.current?.readyState === WebSocket.CLOSED) {
                connectWebSocket()
              }
            }, delay)
          } else {
            setWsConnectionStatus('error')
            logger.error('Max WebSocket reconnection attempts reached')
            announceToScreenReader(
              'Live updates failed to reconnect. Please refresh the page.',
            )
          }
        }

        ws.onerror = (error) => {
          setWsConnectionStatus('error')
          logger.error('WebSocket error', { error })
          announceToScreenReader('Live updates connection error')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle different types of real-time updates
            switch (data.type) {
              case 'bias_alert':
                // Add new alert to the list
                setDashboardData((prev) => {
                  if (!prev) return prev
                  const newAlert = data.alert
                  announceToScreenReader(
                    `New ${newAlert.level} bias alert: ${newAlert.message}`,
                  )
                  return {
                    ...prev,
                    alerts: [newAlert, ...(prev.alerts || [])],
                    summary: {
                      ...prev.summary,
                      totalAlerts: prev.summary.totalAlerts + 1,
                    },
                  }
                })
                break

              case 'session_update':
                // Update session data
                setDashboardData((prev) => {
                  if (!prev) return prev
                  const updatedSession = data.session
                  return {
                    ...prev,
                    recentAnalyses: prev.recentAnalyses.map((session) =>
                      session.sessionId === updatedSession.sessionId
                        ? updatedSession
                        : session,
                    ),
                  }
                })
                announceToScreenReader(
                  `Session ${data.session.sessionId} updated`,
                )
                break

              case 'metrics_update':
                // Update summary metrics
                setDashboardData((prev) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    summary: {
                      ...prev.summary,
                      ...data.metrics,
                    },
                  }
                })
                announceToScreenReader('Dashboard metrics updated')
                break

              case 'trends_update':
                // Update trend data
                setDashboardData((prev) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    trends: data.trends || prev.trends,
                  }
                })
                announceToScreenReader('Trend data updated')
                break

              case 'connection_status':
                // Handle connection status updates
                if (data.status === 'authenticated') {
                  logger.info('WebSocket authenticated successfully')
                } else if (data.status === 'error') {
                  logger.error('WebSocket authentication failed', {
                    error: data.error,
                  })
                }
                break

              case 'heartbeat':
                // Respond to heartbeat to keep connection alive
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'heartbeat_response' }))
                }
                break

              default:
                logger.warn('Unknown WebSocket message type', {
                  type: data.type,
                  data,
                })
            }

            // Update last updated timestamp
            setLastUpdated(new Date())
          } catch (error) {
            logger.error('Failed to process WebSocket message', {
              error,
              rawData: event.data,
            })
          }
        }

        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }))
          }
        }, 30000) // Send heartbeat every 30 seconds

        // Store interval reference for cleanup
        ws.heartbeatInterval = heartbeatInterval
      } catch (error) {
        setWsConnectionStatus('error')
        logger.error('Failed to create WebSocket connection', { error })
        setWsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        // Clear heartbeat interval
        if (wsRef.current.heartbeatInterval) {
          clearInterval(wsRef.current.heartbeatInterval)
        }

        // Close connection gracefully
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }))
        }

        wsRef.current.close(1000, 'Component unmounting')
        wsRef.current = null
      }
    }
  }, [
    enableRealTimeUpdates,
    selectedTimeRange,
    biasScoreFilter,
    alertLevelFilter,
    announceToScreenReader,
  ])

  // Update WebSocket subscription when filters change
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'update_subscription',
          filters: {
            timeRange: selectedTimeRange,
            biasScoreFilter,
            alertLevelFilter,
            demographicFilter: selectedDemographicFilter,
          },
        }),
      )
      logger.info('Updated WebSocket subscription filters', {
        timeRange: selectedTimeRange,
        biasScoreFilter,
        alertLevelFilter,
        demographicFilter: selectedDemographicFilter,
      })
    }
  }, [
    selectedTimeRange,
    biasScoreFilter,
    alertLevelFilter,
    selectedDemographicFilter,
  ])

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData()

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchDashboardData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval])

  // Responsive design effect
  useEffect(() => {
    updateScreenSize()
    checkAccessibilityPreferences()

    const handleResize = () => {
      updateScreenSize()
    }

    const handleMediaChange = () => {
      checkAccessibilityPreferences()
    }

    window.addEventListener('resize', handleResize)

    // Listen for accessibility preference changes
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')

    reducedMotionQuery.addEventListener('change', handleMediaChange)
    highContrastQuery.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      reducedMotionQuery.removeEventListener('change', handleMediaChange)
      highContrastQuery.removeEventListener('change', handleMediaChange)
    }
  }, [updateScreenSize, checkAccessibilityPreferences])

  // Keyboard navigation effect
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Alert severity colors
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Bias score color based on severity
  const getBiasScoreColor = (score: number) => {
    if (score >= 0.8) {
      return 'text-red-600'
    }
    if (score >= 0.6) {
      return 'text-orange-600'
    }
    if (score >= 0.3) {
      return 'text-yellow-600'
    }
    return 'text-green-600'
  }

  // Export dashboard data

  // Enhanced export function with progress tracking
  const exportDataWithOptions = async () => {
    try {
      setExportProgress({
        isExporting: true,
        progress: 0,
        status: 'Preparing export...',
      })

      // Prepare export parameters
      const exportParams = {
        format: exportFormat,
        dateRange: exportDateRange,
        dataTypes: exportDataTypes,
        filters: exportFilters,
        currentFilters: exportFilters.applyCurrentFilters
          ? {
              timeRange: selectedTimeRange,
              biasScoreFilter,
              alertLevelFilter,
              demographicFilter: selectedDemographicFilter,
              customDateRange:
                selectedTimeRange === 'custom' ? customDateRange : undefined,
            }
          : undefined,
      }

      setExportProgress((prev) => ({
        ...prev,
        progress: 25,
        status: 'Gathering data...',
      }))

      const response = await fetch('/api/bias-detection/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportParams),
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      setExportProgress((prev) => ({
        ...prev,
        progress: 75,
        status: 'Generating file...',
      }))

      // Handle different response types based on format
      let blob: Blob
      let filename: string
      const timestamp = new Date().toISOString().split('T')[0]

      switch (exportFormat) {
        case 'json':
          blob = await response.blob()
          filename = `bias-dashboard-${timestamp}.json`
          break
        case 'csv':
          blob = await response.blob()
          filename = `bias-dashboard-${timestamp}.csv`
          break
        case 'pdf':
          blob = await response.blob()
          filename = `bias-dashboard-report-${timestamp}.pdf`
          break
        default:
          throw new Error('Unsupported export format')
      }

      setExportProgress((prev) => ({
        ...prev,
        progress: 90,
        status: 'Downloading file...',
      }))

      // Download the file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportProgress((prev) => ({
        ...prev,
        progress: 100,
        status: 'Export completed!',
      }))

      // Close dialog after successful export
      setTimeout(() => {
        setShowExportDialog(false)
        setExportProgress({
          isExporting: false,
          progress: 0,
          status: '',
        })
      }, 1500)

      logger.info(`Dashboard data exported successfully`, {
        format: exportFormat,
        dataTypes: Object.keys(exportDataTypes).filter(
          (key) => exportDataTypes[key as keyof typeof exportDataTypes],
        ),
        dateRange: exportDateRange,
        filename,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setExportProgress({
        isExporting: false,
        progress: 0,
        status: `Error: ${errorMessage}`,
      })
      logger.error('Export failed', {
        error: errorMessage,
        exportParams: { format: exportFormat, dataTypes: exportDataTypes },
      })

      // Clear error after 3 seconds
      setTimeout(() => {
        setExportProgress({
          isExporting: false,
          progress: 0,
          status: '',
        })
      }, 3000)
    }
  }

  // Add new helper functions
  const getChartColors = (index: number, total: number) => {
    const hue = (index * 360) / total
    return `hsl(${hue}, 70%, 60%)`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold">{new Date(label).toLocaleString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Responsive design helpers
  const updateScreenSize = useCallback(() => {
    const width = window.innerWidth
    const newIsMobile = width < 768
    const newIsTablet = width >= 768 && width < 1024
    const newScreenSize: 'mobile' | 'tablet' | 'desktop' = newIsMobile
      ? 'mobile'
      : newIsTablet
        ? 'tablet'
        : 'desktop'

    setIsMobile(newIsMobile)
    setIsTablet(newIsTablet)
    setScreenSize(newScreenSize)
  }, [])

  // Accessibility helpers
  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncements((prev) => [...prev, message])
    // Remove announcement after 5 seconds to prevent accumulation
    setTimeout(() => {
      setAnnouncements((prev) => prev.slice(1))
    }, 5000)
  }, [])

  const checkAccessibilityPreferences = useCallback(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    setReducedMotion(prefersReducedMotion)

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia(
      '(prefers-contrast: high)',
    ).matches
    setHighContrast(prefersHighContrast)
  }, [])

  const getResponsiveChartHeight = useCallback(() => {
    switch (screenSize) {
      case 'mobile':
        return 200
      case 'tablet':
        return 250
      default:
        return 300
    }
  }, [screenSize])

  const getResponsiveGridCols = useCallback(
    (maxCols: number) => {
      switch (screenSize) {
        case 'mobile':
          return 1
        case 'tablet':
          return Math.min(2, maxCols)
        default:
          return maxCols
      }
    },
    [screenSize],
  )

  // Keyboard navigation helpers
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip to main content with Alt+M
      if (event.altKey && event.key === 'm') {
        event.preventDefault()
        mainContentRef.current?.focus()
        announceToScreenReader('Jumped to main content')
      }

      // Skip to alerts with Alt+A
      if (event.altKey && event.key === 'a') {
        event.preventDefault()
        alertsTabRef.current?.click()
        alertsTabRef.current?.focus()
        announceToScreenReader('Jumped to alerts section')
      }

      // Escape key to close dialogs
      if (event.key === 'Escape') {
        if (showExportDialog) {
          setShowExportDialog(false)
          announceToScreenReader('Export dialog closed')
        }
        if (showNotificationSettings) {
          setShowNotificationSettings(false)
          announceToScreenReader('Notification settings closed')
        }
      }
    },
    [showExportDialog, showNotificationSettings, announceToScreenReader],
  )

  // Helper function to get connection status display
  const getConnectionStatusDisplay = () => {
    switch (wsConnectionStatus) {
      case 'connected':
        return {
          text: 'Live updates connected',
          color: 'text-green-500',
          icon: <Activity className="h-3 w-3 mr-1" />,
          pulse: false,
        }
      case 'connecting':
        return {
          text: 'Connecting to live updates...',
          color: 'text-yellow-500',
          icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />,
          pulse: true,
        }
      case 'reconnecting':
        return {
          text: `Reconnecting... (attempt ${wsReconnectAttempts})`,
          color: 'text-orange-500',
          icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />,
          pulse: true,
        }
      case 'error':
        return {
          text: 'Live updates failed',
          color: 'text-red-500',
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
          pulse: false,
        }
      case 'disconnected':
      default:
        return {
          text: 'Live updates disabled',
          color: 'text-gray-500',
          icon: <Activity className="h-3 w-3 mr-1" />,
          pulse: false,
        }
    }
  }

  const connectionStatus = getConnectionStatusDisplay()

  // Manual WebSocket reconnection
  const reconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      // Close existing connection
      if (wsRef.current.heartbeatInterval) {
        clearInterval(wsRef.current.heartbeatInterval)
      }
      wsRef.current.close(1000, 'Manual reconnection')
      wsRef.current = null
    }

    // Reset connection state
    setWsConnected(false)
    setWsConnectionStatus('disconnected')
    setWsReconnectAttempts(0)

    // Trigger reconnection
    if (enableRealTimeUpdates) {
      setTimeout(() => {
        // The useEffect will handle the actual reconnection
        setWsConnectionStatus('connecting')
      }, 100)
    }

    announceToScreenReader('Manually reconnecting to live updates')
    logger.info('Manual WebSocket reconnection initiated')
  }, [enableRealTimeUpdates, announceToScreenReader])

  if (loading && !dashboardData) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">
            Loading bias detection dashboard...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert
          variant="error"
          title="Error Loading Dashboard"
          description={
            <div>
              {error}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={fetchDashboardData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          }
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  const {
    summary,
    recentAnalyses,
    alerts,
    trends,
    demographics,
    recommendations,
  } = dashboardData

  // Apply filters to data
  const filteredTrends = getFilteredData(trends, 'trends')
  const filteredAlerts = getFilteredData(alerts, 'alerts')
  const filteredSessions = getFilteredData(recentAnalyses, 'sessions')

  return (
    <div
      className={`p-6 space-y-6 ${className} ${highContrast ? 'high-contrast' : ''}`}
    >
      {/* Skip Links for Accessibility */}
      <div className="sr-only">
        <a
          ref={skipLinkRef}
          href="#main-content"
          className="skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
          onClick={(e) => {
            e.preventDefault()
            mainContentRef.current?.focus()
            announceToScreenReader('Jumped to main content')
          }}
        >
          Skip to main content
        </a>
        <a
          href="#alerts-section"
          className="skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-32 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
          onClick={(e) => {
            e.preventDefault()
            alertsTabRef.current?.click()
            alertsTabRef.current?.focus()
            announceToScreenReader('Jumped to alerts section')
          }}
        >
          Skip to alerts
        </a>
      </div>

      {/* Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Header */}
      <header
        className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row items-center justify-between'}`}
      >
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>
            Bias Detection Dashboard
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            Real-time monitoring of therapeutic training bias
            {lastUpdated && (
              <span className={`${isMobile ? 'block' : 'ml-2'}`}>
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {enableRealTimeUpdates && (
              <span
                className={`${isMobile ? 'block' : 'ml-2'} ${connectionStatus.color} ${connectionStatus.pulse ? 'animate-pulse' : ''}`}
              >
                • {connectionStatus.icon}
                {connectionStatus.text}
              </span>
            )}
          </p>
        </div>

        <div
          className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-2'} ${isMobile ? 'w-full' : ''}`}
        >
          <Button
            variant="outline"
            size={isMobile ? 'default' : 'sm'}
            onClick={() => {
              setAutoRefresh(!autoRefresh)
              announceToScreenReader(
                `Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`,
              )
            }}
            className={isMobile ? 'w-full justify-start' : ''}
            aria-label={`Auto-refresh is currently ${autoRefresh ? 'on' : 'off'}. Click to ${autoRefresh ? 'disable' : 'enable'}.`}
          >
            <Activity
              className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'} ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`}
            />
            Auto-refresh {autoRefresh ? 'On' : 'Off'}
          </Button>

          <Button
            variant="outline"
            size={isMobile ? 'default' : 'sm'}
            onClick={() => {
              fetchDashboardData()
              announceToScreenReader('Dashboard data refreshed')
            }}
            disabled={loading}
            className={isMobile ? 'w-full justify-start' : ''}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'} ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          {/* WebSocket Reconnect Button - Show when connection failed */}
          {enableRealTimeUpdates &&
            (wsConnectionStatus === 'error' ||
              wsConnectionStatus === 'disconnected') && (
              <Button
                variant="outline"
                size={isMobile ? 'default' : 'sm'}
                onClick={reconnectWebSocket}
                className={isMobile ? 'w-full justify-start' : ''}
                aria-label="Reconnect to live updates"
              >
                <Activity className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'}`} />
                Reconnect Live Updates
              </Button>
            )}

          <Button
            variant="outline"
            size={isMobile ? 'default' : 'sm'}
            onClick={() => {
              setShowNotificationSettings(!showNotificationSettings)
              announceToScreenReader(
                `Notification settings ${!showNotificationSettings ? 'opened' : 'closed'}`,
              )
            }}
            className={isMobile ? 'w-full justify-start' : ''}
            aria-label="Open notification settings"
            aria-expanded={showNotificationSettings}
          >
            <Bell className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'}`} />
            Notifications
          </Button>

          <Button
            variant="outline"
            size={isMobile ? 'default' : 'sm'}
            onClick={() => {
              setShowExportDialog(true)
              announceToScreenReader('Export dialog opened')
            }}
            className={isMobile ? 'w-full justify-start' : ''}
            aria-label="Open data export options"
          >
            <Download className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'}`} />
            Export
          </Button>
        </div>
      </header>

      {/* Notification Settings Panel */}
      {showNotificationSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notification Channels */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Notification Channels
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.inAppEnabled}
                      onChange={(e) =>
                        updateNotificationSettings({
                          inAppEnabled: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <Bell className="h-4 w-4" />
                    <span>In-App Notifications</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) =>
                        updateNotificationSettings({
                          emailEnabled: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <Mail className="h-4 w-4" />
                    <span>Email Notifications</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsEnabled}
                      onChange={(e) =>
                        updateNotificationSettings({
                          smsEnabled: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <MessageSquare className="h-4 w-4" />
                    <span>SMS Notifications</span>
                  </label>
                </div>
              </div>

              {/* Alert Level Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Alert Level Notifications
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.criticalAlerts}
                      onChange={(e) =>
                        updateNotificationSettings({
                          criticalAlerts: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>Critical Alerts</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.highAlerts}
                      onChange={(e) =>
                        updateNotificationSettings({
                          highAlerts: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>High Priority Alerts</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.mediumAlerts}
                      onChange={(e) =>
                        updateNotificationSettings({
                          mediumAlerts: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <Info className="h-4 w-4 text-yellow-500" />
                    <span>Medium Priority Alerts</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationSettings.lowAlerts}
                      onChange={(e) =>
                        updateNotificationSettings({
                          lowAlerts: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span>Low Priority Alerts</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Test Notification */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Test Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Send a test notification to verify your settings
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={sendTestNotification}
                  disabled={
                    !notificationSettings.emailEnabled &&
                    !notificationSettings.smsEnabled &&
                    !notificationSettings.inAppEnabled
                  }
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Export Dialog */}
      {showExportDialog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Dashboard Data
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportDialog(false)}
                disabled={exportProgress.isExporting}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Export Format Selection */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <PieChartIcon className="h-4 w-4 mr-2" />
                  Export Format
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) =>
                        setExportFormat(e.target.value as 'json')
                      }
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-muted-foreground">
                        Raw data format
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as 'csv')}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-muted-foreground">
                        Spreadsheet format
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-muted-foreground">
                        Report format
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={exportDateRange.start}
                      onChange={(e) =>
                        setExportDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="w-full p-2 border rounded-md bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      value={exportDateRange.end}
                      onChange={(e) =>
                        setExportDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="w-full p-2 border rounded-md bg-background mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Data Types Selection */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Data to Include
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportDataTypes.summary}
                      onChange={(e) =>
                        setExportDataTypes((prev) => ({
                          ...prev,
                          summary: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Summary Metrics</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportDataTypes.alerts}
                      onChange={(e) =>
                        setExportDataTypes((prev) => ({
                          ...prev,
                          alerts: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Alerts</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportDataTypes.trends}
                      onChange={(e) =>
                        setExportDataTypes((prev) => ({
                          ...prev,
                          trends: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Trend Data</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportDataTypes.demographics}
                      onChange={(e) =>
                        setExportDataTypes((prev) => ({
                          ...prev,
                          demographics: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Demographics</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportDataTypes.sessions}
                      onChange={(e) =>
                        setExportDataTypes((prev) => ({
                          ...prev,
                          sessions: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Session Data</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportDataTypes.recommendations}
                      onChange={(e) =>
                        setExportDataTypes((prev) => ({
                          ...prev,
                          recommendations: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Recommendations</span>
                  </label>
                </div>
              </div>

              {/* Export Filters */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Export Options
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportFilters.applyCurrentFilters}
                      onChange={(e) =>
                        setExportFilters((prev) => ({
                          ...prev,
                          applyCurrentFilters: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Apply current dashboard filters</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportFilters.includeArchived}
                      onChange={(e) =>
                        setExportFilters((prev) => ({
                          ...prev,
                          includeArchived: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>Include archived alerts</span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">
                        Min Bias Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={exportFilters.minBiasScore}
                        onChange={(e) =>
                          setExportFilters((prev) => ({
                            ...prev,
                            minBiasScore: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full p-2 border rounded-md bg-background mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Max Bias Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={exportFilters.maxBiasScore}
                        onChange={(e) =>
                          setExportFilters((prev) => ({
                            ...prev,
                            maxBiasScore: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full p-2 border rounded-md bg-background mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Progress */}
              {exportProgress.isExporting && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Export Progress
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{exportProgress.status}</span>
                      <span>{exportProgress.progress}%</span>
                    </div>
                    <Progress
                      value={exportProgress.progress}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Export Status */}
              {exportProgress.status && !exportProgress.isExporting && (
                <div
                  className={`p-3 rounded-md ${
                    exportProgress.status.startsWith('Error')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  <div className="flex items-center">
                    {exportProgress.status.startsWith('Error') ? (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {exportProgress.status}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {Object.values(exportDataTypes).filter(Boolean).length} data
                  types selected
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(false)}
                    disabled={exportProgress.isExporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={exportDataWithOptions}
                    disabled={
                      exportProgress.isExporting ||
                      !Object.values(exportDataTypes).some(Boolean)
                    }
                  >
                    {exportProgress.isExporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export {exportFormat.toUpperCase()}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtering Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Time Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Range Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time Range
              </label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range */}
            {selectedTimeRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={customDateRange.start}
                    onChange={(e) =>
                      setCustomDateRange((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={customDateRange.end}
                    onChange={(e) =>
                      setCustomDateRange((prev) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
              </>
            )}

            {/* Bias Score Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Bias Score Level
              </label>
              <select
                value={biasScoreFilter}
                onChange={(e) => setBiasScoreFilter(e.target.value as any)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="all">All Levels</option>
                <option value="low">Low (&lt; 30%)</option>
                <option value="medium">Medium (30-60%)</option>
                <option value="high">High (&gt; 60%)</option>
              </select>
            </div>

            {/* Alert Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Alert Level
              </label>
              <select
                value={alertLevelFilter}
                onChange={(e) => setAlertLevelFilter(e.target.value as any)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="all">All Alerts</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Demographics Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Demographics
              </label>
              <select
                value={selectedDemographicFilter}
                onChange={(e) => setSelectedDemographicFilter(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {demographicFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium opacity-0">Clear</label>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTimeRange('24h')
                  setBiasScoreFilter('all')
                  setAlertLevelFilter('all')
                  setSelectedDemographicFilter('all')
                  setCustomDateRange({ start: '', end: '' })
                }}
                className="w-full"
              >
                Clear All Filters
              </Button>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Active Filters:</strong>
              {selectedTimeRange !== '24h' &&
                ` Time: ${timeRangeOptions.find((o) => o.value === selectedTimeRange)?.label}`}
              {biasScoreFilter !== 'all' && ` • Bias: ${biasScoreFilter}`}
              {alertLevelFilter !== 'all' && ` • Alerts: ${alertLevelFilter}`}
              {selectedDemographicFilter !== 'all' &&
                ` • Demographics: ${selectedDemographicFilter}`}
              {selectedTimeRange === '24h' &&
                biasScoreFilter === 'all' &&
                alertLevelFilter === 'all' &&
                selectedDemographicFilter === 'all' &&
                ' None'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {filteredAlerts.filter(
        (alert) => alert.level === 'critical' || alert.level === 'high',
      ).length > 0 && (
        <Alert
          variant="error"
          title="High Priority Bias Alerts"
          description={`${filteredAlerts.filter((alert) => alert.level === 'critical' || alert.level === 'high').length} critical or high-priority bias issues require immediate attention.`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      )}

      {/* Summary Cards - Update with filtered data counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Filtered Sessions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSessions.length.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredSessions.length !== recentAnalyses.length &&
                `of ${recentAnalyses.length} total sessions`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Bias Score
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getBiasScoreColor(
                filteredSessions.length > 0
                  ? filteredSessions.reduce(
                      (sum, session) => sum + (session.overallBiasScore || 0),
                      0,
                    ) / filteredSessions.length
                  : summary.averageBiasScore,
              )}`}
            >
              {filteredSessions.length > 0
                ? (
                    (filteredSessions.reduce(
                      (sum, session) => sum + (session.overallBiasScore || 0),
                      0,
                    ) /
                      filteredSessions.length) *
                    100
                  ).toFixed(1)
                : (summary.averageBiasScore * 100).toFixed(1)}
              %
            </div>
            <Progress
              value={
                filteredSessions.length > 0
                  ? (filteredSessions.reduce(
                      (sum, session) => sum + (session.overallBiasScore || 0),
                      0,
                    ) /
                      filteredSessions.length) *
                    100
                  : summary.averageBiasScore * 100
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Filtered Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredAlerts.length !== alerts.length &&
                `of ${alerts.length} total alerts`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Score
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(summary.complianceScore * 100).toFixed(1)}%
            </div>
            <Progress value={summary.complianceScore * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <main
        ref={mainContentRef}
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none"
        role="main"
        aria-label="Dashboard main content"
      >
        <Tabs defaultValue="trends" className="w-full">
          <TabsList
            className={`grid w-full ${isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-5'} ${isMobile ? 'h-auto' : ''}`}
          >
            <TabsTrigger
              value="trends"
              className={isMobile ? 'text-xs py-3' : ''}
              aria-label="View bias trends and analytics"
            >
              {isMobile ? 'Trends' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger
              value="demographics"
              className={isMobile ? 'text-xs py-3' : ''}
              aria-label="View demographic breakdown"
            >
              {isMobile ? 'Demo' : 'Demographics'}
            </TabsTrigger>
            <TabsTrigger
              ref={alertsTabRef}
              value="alerts"
              id="alerts-section"
              className={isMobile ? 'text-xs py-3' : ''}
              aria-label={`View alerts. ${filteredAlerts.length} alerts currently active`}
            >
              {isMobile ? 'Alerts' : 'Alerts'}
              {filteredAlerts.length > 0 && (
                <Badge
                  variant="destructive"
                  className={`ml-2 ${isMobile ? 'text-xs px-1' : ''}`}
                  aria-label={`${filteredAlerts.length} active alerts`}
                >
                  {filteredAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger
                  value="sessions"
                  aria-label="View recent session data"
                >
                  Recent Sessions
                </TabsTrigger>
                <TabsTrigger
                  value="recommendations"
                  aria-label="View system recommendations"
                >
                  Recommendations
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Mobile-specific additional tabs */}
          {isMobile && (
            <TabsList className="grid w-full grid-cols-2 mt-2">
              <TabsTrigger
                value="sessions"
                className="text-xs py-3"
                aria-label="View recent session data"
              >
                Sessions
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="text-xs py-3"
                aria-label="View system recommendations"
              >
                Recommendations
              </TabsTrigger>
            </TabsList>
          )}

          {/* Trends Tab - Use filtered data */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Bias Score Trends ({filteredTrends.length} data points)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer
                  width="100%"
                  height={getResponsiveChartHeight()}
                >
                  <AreaChart data={filteredTrends}>
                    <defs>
                      <linearGradient
                        id="biasScoreGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis domain={[0, 1]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine
                      y={0.3}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label="Warning"
                    />
                    <ReferenceLine
                      y={0.6}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label="High"
                    />
                    <Area
                      type="monotone"
                      dataKey="biasScore"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#biasScoreGradient)"
                      animationDuration={reducedMotion ? 0 : 1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div
              className={`grid grid-cols-1 ${getResponsiveGridCols(2) === 2 ? 'lg:grid-cols-2' : ''} gap-6`}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Session Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={getResponsiveChartHeight() - 100}
                  >
                    <BarChart data={filteredTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString()
                        }
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="sessionCount"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        animationDuration={reducedMotion ? 0 : 1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Frequency</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={getResponsiveChartHeight() - 100}
                  >
                    <BarChart data={filteredTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString()
                        }
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="alertCount"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                        animationDuration={reducedMotion ? 0 : 1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Add new Radar Chart for Bias Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Bias Metrics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer
                  width="100%"
                  height={getResponsiveChartHeight()}
                >
                  <RadarChart
                    data={[
                      { metric: 'Gender', value: 0.3 },
                      { metric: 'Age', value: 0.4 },
                      { metric: 'Ethnicity', value: 0.2 },
                      { metric: 'Language', value: 0.5 },
                      { metric: 'Cultural', value: 0.3 },
                      { metric: 'Socioeconomic', value: 0.4 },
                    ]}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} />
                    <Radar
                      name="Bias Score"
                      dataKey="value"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      animationDuration={reducedMotion ? 0 : 1000}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Age Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(demographics.age).map(
                          ([age, count]) => ({
                            name: age,
                            value: count,
                          }),
                        )}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        animationDuration={1000}
                        animationBegin={0}
                      >
                        {Object.entries(demographics.age).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getChartColors(
                              index,
                              Object.keys(demographics.age).length,
                            )}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border rounded shadow">
                                <p className="font-semibold">
                                  {payload[0].name}
                                </p>
                                <p>Count: {payload[0].value}</p>
                                <p>
                                  Percentage:{' '}
                                  {(payload[0].payload.percent * 100).toFixed(
                                    1,
                                  )}
                                  %
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gender Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(demographics.gender).map(
                          ([gender, count]) => ({
                            name: gender,
                            value: count,
                          }),
                        )}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#82ca9d"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        animationDuration={1000}
                        animationBegin={0}
                      >
                        {Object.entries(demographics.gender).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getChartColors(
                              index,
                              Object.keys(demographics.gender).length,
                            )}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border rounded shadow">
                                <p className="font-semibold">
                                  {payload[0].name}
                                </p>
                                <p>Count: {payload[0].value}</p>
                                <p>
                                  Percentage:{' '}
                                  {(payload[0].payload.percent * 100).toFixed(
                                    1,
                                  )}
                                  %
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Ethnicity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Ethnicity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(demographics.ethnicity).map(
                      ([ethnicity, count]) => ({
                        ethnicity,
                        count,
                      }),
                    )}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="ethnicity" type="category" width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="#8884d8"
                      radius={[0, 4, 4, 0]}
                      animationDuration={1000}
                      animationBegin={0}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab - Use filtered data */}
          <TabsContent value="alerts" className="space-y-4">
            {/* Alert Management Controls */}
            {filteredAlerts.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={
                            selectedAlerts.size === filteredAlerts.length &&
                            filteredAlerts.length > 0
                          }
                          onChange={(e) =>
                            e.target.checked
                              ? selectAllAlerts()
                              : clearAlertSelection()
                          }
                          className="rounded"
                        />
                        <span className="text-sm">
                          {selectedAlerts.size > 0
                            ? `${selectedAlerts.size} selected`
                            : 'Select all'}
                        </span>
                      </label>

                      {selectedAlerts.size > 0 && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleBulkAlertAction(
                                Array.from(selectedAlerts),
                                'acknowledge',
                              )
                            }
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleBulkAlertAction(
                                Array.from(selectedAlerts),
                                'dismiss',
                              )
                            }
                          >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleBulkAlertAction(
                                Array.from(selectedAlerts),
                                'archive',
                              )
                            }
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {filteredAlerts.length} alerts
                      </Badge>
                      <Badge variant="destructive">
                        {
                          filteredAlerts.filter(
                            (a) => a.level === 'critical' || a.level === 'high',
                          ).length
                        }{' '}
                        high priority
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredAlerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {alerts.length === 0
                      ? 'No active alerts'
                      : 'No alerts match current filters'}
                  </p>
                  {alerts.length > 0 && filteredAlerts.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setAlertLevelFilter('all')
                        setSelectedTimeRange('24h')
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map((alert) => {
                const isSelected = selectedAlerts.has(alert.alertId)
                const actions = alertActions.get(alert.alertId) || []
                const lastAction = actions[actions.length - 1]

                return (
                  <Card
                    key={alert.alertId}
                    className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAlertSelection(alert.alertId)}
                          className="mt-1 rounded"
                        />

                        {/* Alert Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <Badge
                                className={`${getAlertColor(alert.level)} text-white`}
                              >
                                {alert.level.toUpperCase()}
                              </Badge>
                              <div>
                                <h4 className="font-semibold">{alert.type}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {alert.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Session: {alert.sessionId} •{' '}
                                  {new Date(alert.timestamp).toLocaleString()}
                                </p>

                                {/* Alert Status */}
                                {lastAction && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {lastAction.type === 'acknowledge' && (
                                        <Check className="h-3 w-3 mr-1" />
                                      )}
                                      {lastAction.type === 'dismiss' && (
                                        <X className="h-3 w-3 mr-1" />
                                      )}
                                      {lastAction.type === 'archive' && (
                                        <Archive className="h-3 w-3 mr-1" />
                                      )}
                                      {lastAction.type === 'escalate' && (
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                      )}
                                      {lastAction.type.charAt(0).toUpperCase() +
                                        lastAction.type.slice(1)}
                                      d
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        lastAction.timestamp,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                )}

                                {/* Alert Notes */}
                                {alertNotes.has(alert.alertId) && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                                    <strong>Notes:</strong>{' '}
                                    {alertNotes.get(alert.alertId)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-2">
                              {!alert.acknowledged && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleAlertAction(
                                        alert.alertId,
                                        'acknowledge',
                                      )
                                    }
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Acknowledge
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const notes = prompt(
                                        'Add notes (optional):',
                                      )
                                      handleAlertAction(
                                        alert.alertId,
                                        'escalate',
                                        notes || undefined,
                                      )
                                    }}
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Escalate
                                  </Button>
                                </>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const notes = prompt('Add notes (optional):')
                                  if (notes) {
                                    setAlertNotes(
                                      (prev) =>
                                        new Map(prev.set(alert.alertId, notes)),
                                    )
                                  }
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Note
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleAlertAction(alert.alertId, 'dismiss')
                                }
                              >
                                <X className="h-4 w-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          </div>

                          {/* Action History */}
                          {actions.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <details className="text-sm">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  Action History ({actions.length})
                                </summary>
                                <div className="mt-2 space-y-1">
                                  {actions.map((action) => (
                                    <div
                                      key={action.id}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span>
                                        {action.type.charAt(0).toUpperCase() +
                                          action.type.slice(1)}
                                        {action.notes && ` - ${action.notes}`}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {new Date(
                                          action.timestamp,
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          {/* Recent Sessions Tab - Use filtered data */}
          <TabsContent value="sessions" className="space-y-4">
            {filteredSessions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {recentAnalyses.length === 0
                      ? 'No recent sessions'
                      : 'No sessions match current filters'}
                  </p>
                  {recentAnalyses.length > 0 &&
                    filteredSessions.length === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setBiasScoreFilter('all')
                          setSelectedTimeRange('24h')
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                </CardContent>
              </Card>
            ) : (
              filteredSessions.map((analysis) => (
                <Card key={analysis.sessionId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">
                          Session {analysis.sessionId}
                        </h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <span
                            className={`text-sm font-medium ${getBiasScoreColor(analysis.overallBiasScore)}`}
                          >
                            Bias Score:{' '}
                            {(analysis.overallBiasScore * 100).toFixed(1)}%
                          </span>

                          <Badge
                            variant={
                              analysis.alertLevel === 'low'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {analysis.alertLevel}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </p>
                        <Button size="sm" variant="outline" className="mt-2">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge
                          variant={
                            rec.priority === 'critical'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {rec.priority}
                        </Badge>
                        <h4 className="font-semibold">{rec.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {rec.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm">Implement</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
