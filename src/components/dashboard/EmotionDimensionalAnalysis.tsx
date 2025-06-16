import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useMultidimensionalEmotions } from '@/lib/hooks/useMultidimensionalEmotions'
const MultidimensionalEmotionChart = lazy(
  () => import('@/components/session/MultidimensionalEmotionChart'),
)
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-radix'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface EmotionDimensionalAnalysisProps {
  userId: string
  sessionId?: string
}

interface SessionData {
  sessionId: string
  id: string
  title: string
  startTime: string
  date: string
}

interface DimensionalMap {
  valence: number
  arousal: number
  dominance: number
  timestamp: number
  type?: string
  intensity?: number
  confidence?: number
}

export default function EmotionDimensionalAnalysis({
  userId,
  sessionId,
}: EmotionDimensionalAnalysisProps) {
  const [analysisScope, setAnalysisScope] = useState<'client' | 'session'>(
    sessionId ? 'session' : 'client',
  )
  const [selectedSessionId, setSelectedSessionId] = useState<
    string | undefined
  >(sessionId)
  const [timeRange, setTimeRange] = useState<'all' | 'recent' | 'last-month'>(
    'all',
  )

  // State to hold actual sessions
  const [sessions, setSessions] = useState<
    { id: string; title: string; date: string }[]
  >([])
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Create options object for the hook
  const hookOptions: { clientId?: string; sessionId?: string } = {}
  if (analysisScope === 'client' && userId) {
    hookOptions.clientId = userId
  }
  if (analysisScope === 'session' && selectedSessionId) {
    hookOptions.sessionId = selectedSessionId
  }

  // Fetch emotion data based on scope and filters
  const { dimensionalMaps, patterns, isLoading, error, refetch } =
    useMultidimensionalEmotions(hookOptions)

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsLoadingSessions(true)
    setSessionError(null)

    try {
      const response = await fetch(`/api/sessions?clientId=${userId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform API data to expected format
      const formattedSessions = data.map((session: SessionData) => ({
        id: session.sessionId || session.id,
        title: session.title || 'Session',
        date: new Date(session.startTime).toLocaleDateString(),
      }))

      setSessions(formattedSessions)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setSessionError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [userId])

  // Fetch sessions on initial load
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Handle session change
  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setAnalysisScope('session')
  }

  // Handle scope change
  const handleScopeChange = (scope: 'client' | 'session') => {
    setAnalysisScope(scope)
  }

  // Format session options for select component
  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: `${session.title} (${session.date})`,
  }))

  // Format time range options for select component
  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'recent', label: 'Recent (30 days)' },
    { value: 'last-month', label: 'Last Month' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Dimensional Emotion Analysis</CardTitle>
              <CardDescription>
                Visualize emotional states in 3D space using valence, arousal,
                and dominance dimensions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <Button
                variant={analysisScope === 'client' ? 'default' : 'outline'}
                onClick={() => handleScopeChange('client')}
                className="w-32"
              >
                All Sessions
              </Button>
              <Button
                variant={analysisScope === 'session' ? 'default' : 'outline'}
                onClick={() => handleScopeChange('session')}
                className="w-32"
              >
                Single Session
              </Button>
            </div>

            {analysisScope === 'session' && (
              <>
                <Select
                  value={selectedSessionId || ''}
                  onValueChange={handleSessionChange}
                  disabled={isLoadingSessions}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue
                      placeholder={
                        isLoadingSessions
                          ? 'Loading sessions...'
                          : 'Select a session'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSessions ? (
                      <div className="p-2 text-center">Loading sessions...</div>
                    ) : (
                      sessionOptions.map((session) => (
                        <SelectItem key={session.value} value={session.value}>
                          {session.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {sessionError && (
                  <div className="text-red-500 text-sm mt-1">
                    Error: {sessionError}
                  </div>
                )}
              </>
            )}

            {analysisScope === 'client' && (
              <Select
                value={timeRange}
                onValueChange={(value: string) =>
                  setTimeRange(value as 'all' | 'recent' | 'last-month')
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && (
            <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md">
              <p className="font-medium">Error loading emotion data:</p>
              <p>{error.message}</p>
            </div>
          )}

          <Tabs defaultValue="3d-view">
            <TabsList className="mb-4">
              <TabsTrigger value="3d-view">3D Visualization</TabsTrigger>
              <TabsTrigger value="patterns">Emotion Patterns</TabsTrigger>
              <TabsTrigger value="insights">Key Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="3d-view">
              <div className="border rounded-lg overflow-hidden">
                <Suspense fallback={<div>Loading 3D Chart...</div>}>
                  <MultidimensionalEmotionChart
                    dimensionalMaps={dimensionalMaps}
                    patterns={patterns}
                    isLoading={isLoading}
                    height={500}
                  />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="patterns">
              <div className="border rounded-lg overflow-hidden p-4">
                <h3 className="text-base font-medium mb-3">
                  Emotional Dimension Patterns
                </h3>

                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-16 bg-gray-200 rounded w-full" />
                    <div className="h-16 bg-gray-200 rounded w-full" />
                    <div className="h-16 bg-gray-200 rounded w-full" />
                  </div>
                ) : patterns.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No significant patterns detected in the dimensional data
                  </p>
                ) : (
                  <div className="space-y-4">
                    {patterns.map((pattern, index) => (
                      <div
                        key={`pattern-${pattern.type}-${pattern.startTime}-${index}`}
                        className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium">
                            {pattern.type === 'oscillation' &&
                              'Oscillation Pattern'}
                            {pattern.type === 'progression' &&
                              'Progression Pattern'}
                            {pattern.type === 'quadrant_transition' &&
                              'Quadrant Transition'}
                            {pattern.type === 'dimension_dominance' &&
                              'Dominant Dimension'}
                          </div>
                          <div className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                            Strength: {(pattern.strength * 100).toFixed(0)}%
                          </div>
                        </div>

                        <p className="text-gray-600 mt-1 text-sm">
                          {pattern.description}
                        </p>

                        <div className="mt-2 text-xs text-gray-500 flex justify-between">
                          <span>
                            Start:{' '}
                            {new Date(pattern.startTime).toLocaleString()}
                          </span>
                          <span>
                            End: {new Date(pattern.endTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights">
              <div className="border rounded-lg overflow-hidden p-4">
                <h3 className="text-base font-medium mb-3">
                  Key Insights from Dimensional Analysis
                </h3>

                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
                ) : dimensionalMaps.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No dimensional data available for analysis
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <h4 className="font-medium text-blue-800">
                        Dominant Dimensions
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {generateDominantDimensionsInsight(
                          dimensionalMaps.map((dm) => ({
                            ...dm.primaryVector,
                            timestamp: (dm.timestamp as Date).getTime(),
                          })),
                        )}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                      <h4 className="font-medium text-green-800">
                        Emotional Movement
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        {generateMovementInsight(
                          dimensionalMaps.map((dm) => ({
                            ...dm.primaryVector,
                            timestamp: (dm.timestamp as Date).getTime(),
                          })),
                        )}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <h4 className="font-medium text-purple-800">
                        Quadrant Distribution
                      </h4>
                      <p className="text-sm text-purple-700 mt-1">
                        {generateQuadrantInsight(
                          dimensionalMaps.map((dm) => ({
                            ...dm.primaryVector,
                            timestamp: (dm.timestamp as Date).getTime(),
                          })),
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Generate insights about dominant dimensions (valence, arousal, dominance)
function generateDominantDimensionsInsight(
  dimensionalMaps: DimensionalMap[],
): string {
  // This is simplified - in a real implementation you would perform statistical analysis
  if (dimensionalMaps.length === 0) return 'Insufficient data for analysis.'

  // Calculate average values for each dimension
  const totals = dimensionalMaps.reduce(
    (acc, map) => {
      acc.valence += map.valence
      acc.arousal += map.arousal
      acc.dominance += map.dominance
      return acc
    },
    { valence: 0, arousal: 0, dominance: 0 },
  )

  const avgValence = totals.valence / dimensionalMaps.length
  const avgArousal = totals.arousal / dimensionalMaps.length
  const avgDominance = totals.dominance / dimensionalMaps.length

  // Determine dominant dimension
  const dimensions = [
    { name: 'Valence', value: Math.abs(avgValence) },
    { name: 'Arousal', value: Math.abs(avgArousal) },
    { name: 'Dominance', value: Math.abs(avgDominance) },
  ]

  dimensions.sort((a, b) => b.value - a.value)
  const dominantDimension = dimensions[0]
  
  if (!dominantDimension) {
    return 'Unable to determine dominant dimension from available data.'
  }
  
  const dominant = dominantDimension.name.toLowerCase()

  // Generate insight based on dominant dimension
  if (dominant === 'valence') {
    return avgValence > 0
      ? 'Emotional states show a prominent positive valence pattern, indicating a tendency toward positive emotional experiences.'
      : 'Emotional states show a prominent negative valence pattern, suggesting a tendency toward negative emotional experiences.'
  } 
  
  if (dominant === 'arousal') {
    return avgArousal > 0
      ? 'Emotions exhibit high arousal levels, suggesting heightened emotional intensity and energy.'
      : 'Emotions show low arousal patterns, indicating calmer, less energetic emotional states.'
  }
  
  return avgDominance > 0
    ? 'Dominant pattern in emotional control dimension, suggesting feelings of being in control during emotional experiences.'
    : 'Submissive pattern in emotional control dimension, suggesting feelings of being controlled by emotions.'
}

// Generate insights about emotional movement through dimensional space
function generateMovementInsight(dimensionalMaps: DimensionalMap[]): string {
  if (dimensionalMaps.length < 3)
    return 'More data points needed for movement analysis.'

  // Sort by timestamp to ensure chronological order
  const sorted = [...dimensionalMaps].sort((a, b) => a.timestamp - b.timestamp)

  // Calculate movement between consecutive points
  let totalMovement = 0
  let directionChanges = 0
  let lastDirection = null

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]

    if (!prev || !curr) continue

    // Calculate Euclidean distance between points in 3D space
    const distance = Math.sqrt(
      (curr.valence - prev.valence) ** 2 +
        (curr.arousal - prev.arousal) ** 2 +
        (curr.dominance - prev.dominance) ** 2,
    )

    totalMovement += distance

    // Detect direction changes (simplified)
    const currentDirection = {
      valence: Math.sign(curr.valence - prev.valence),
      arousal: Math.sign(curr.arousal - prev.arousal),
      dominance: Math.sign(curr.dominance - prev.dominance),
    }

    if (lastDirection) {
      if (
        currentDirection.valence !== lastDirection.valence ||
        currentDirection.arousal !== lastDirection.arousal ||
        currentDirection.dominance !== lastDirection.dominance
      ) {
        directionChanges++
      }
    }

    lastDirection = currentDirection
  }

  const avgMovement = totalMovement / (sorted.length - 1)
  const avgDirectionChanges = directionChanges / (sorted.length - 2 || 1)

  // Generate insight based on movement patterns
  if (avgMovement < 0.2) {
    return 'Emotional states show stability with minimal movement through dimensional space, suggesting emotional consistency.'
  } 
  
  if (avgMovement > 0.5) {
    return avgDirectionChanges > 0.5
      ? 'Significant emotional volatility detected with frequent shifts across multiple dimensions.'
      : 'Substantial emotional progression observed, moving consistently in specific directions across dimensions.'
  }
  
  return 'Moderate emotional movement detected, with gradual shifts between emotional states.'
}

// Generate insights about quadrant distribution in valence-arousal space
function generateQuadrantInsight(dimensionalMaps: DimensionalMap[]): string {
  if (dimensionalMaps.length === 0)
    return 'Insufficient data for quadrant analysis.'

  // Count points in each quadrant of valence-arousal space
  const quadrants = {
    q1: 0, // positive valence, positive arousal (excited, happy)
    q2: 0, // negative valence, positive arousal (angry, anxious)
    q3: 0, // negative valence, negative arousal (sad, depressed)
    q4: 0, // positive valence, negative arousal (calm, content)
  }

  for (const map of dimensionalMaps) {
    if (map.valence >= 0 && map.arousal >= 0) quadrants.q1++
    else if (map.valence < 0 && map.arousal >= 0) quadrants.q2++
    else if (map.valence < 0 && map.arousal < 0) quadrants.q3++
    else quadrants.q4++
  }

  // Calculate percentages
  const total = dimensionalMaps.length
  const q1Percent = Math.round((quadrants.q1 / total) * 100)
  const q2Percent = Math.round((quadrants.q2 / total) * 100)
  const q3Percent = Math.round((quadrants.q3 / total) * 100)
  const q4Percent = Math.round((quadrants.q4 / total) * 100)

  // Find dominant quadrant
  const dominantQuadrant = Object.entries(quadrants).reduce((max, entry) =>
    entry[1] > max[1] ? entry : max,
  )[0]

  // Generate insight
  let insight = `Emotional states distribute across valence-arousal quadrants as follows: ${q1Percent}% excited/happy, ${q2Percent}% angry/anxious, ${q3Percent}% sad/depressed, ${q4Percent}% calm/content. `

  switch (dominantQuadrant) {
    case 'q1':
      insight +=
        'The predominant pattern shows positive emotions with high energy levels.'
      break
    case 'q2':
      insight +=
        'The predominant pattern shows negative emotions with high energy levels.'
      break
    case 'q3':
      insight +=
        'The predominant pattern shows negative emotions with low energy levels.'
      break
    case 'q4':
      insight +=
        'The predominant pattern shows positive emotions with low energy levels.'
      break
  }

  return insight
}
