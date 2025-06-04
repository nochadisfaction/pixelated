import type {
  CrossSessionPattern,
  RiskCorrelation,
  TrendPattern,
} from '@/lib/fhe/pattern-recognition'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotProps,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { FilterControls, FilterOptions } from './FilterControls'
import { IconFilter } from '@/components/ui/icons'
import AdvancedFilteringComponent, {
  AdvancedFilterOptions,
} from './AdvancedFilteringComponent'

export interface PatternVisualizationProps {
  'trends': TrendPattern[]
  'crossSessionPatterns': CrossSessionPattern[]
  'riskCorrelations': RiskCorrelation[]
  'isLoading'?: boolean
  'onPatternSelect'?: (
    pattern: TrendPattern | CrossSessionPattern | RiskCorrelation,
  ) => void
  'highlightedPatterns'?: string[] // Array of pattern IDs to highlight
  'client:load'?: boolean
  'client:visible'?: boolean
  'client:idle'?: boolean
  'client:only'?: boolean
}

// Define interfaces for the transformed data
interface TransformedTrend {
  date: string
  significance: number
  confidence: number
  original: TrendPattern
  isHighlighted?: boolean
  trendId?: string // Added for keying if necessary
}

interface TransformedPattern {
  pattern: string
  frequency: number
  confidence: number
  original: CrossSessionPattern
  isHighlighted?: boolean
  patternId?: string // Added for keying if necessary
}

// Interface for activeDot click handler props for Trends
interface TrendDotClickProps extends DotProps {
  payload: TransformedTrend
}

// Interface for activeDot click handler props for Patterns/Risks
interface PatternAreaClickProps extends DotProps {
  // Assuming Area click also gets DotProps like structure
  payload: TransformedPattern | RiskCorrelation
}

export function PatternVisualization({
  trends = [],
  crossSessionPatterns = [],
  riskCorrelations = [],
  isLoading = false,
  onPatternSelect,
  highlightedPatterns = [],
}: PatternVisualizationProps) {
  // ALL HOOKS MUST BE AT THE VERY TOP OF THE FUNCTION BODY
  const [activeTab, setActiveTab] = useState<'trends' | 'patterns' | 'risks'>(
    'trends',
  )
  const [showFilters, setShowFilters] = useState(false)
  const [useAdvancedFiltering, setUseAdvancedFiltering] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({})
  const [advancedFilterOptions, setAdvancedFilterOptions] =
    useState<AdvancedFilterOptions>({})
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({})
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] =
    useState<AdvancedFilterOptions>({})
  const [localHighlightedPatterns, setLocalHighlightedPatterns] =
    useState<string[]>(highlightedPatterns)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setLocalHighlightedPatterns(highlightedPatterns)
  }, [highlightedPatterns])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Extract unique pattern types for filter dropdown
  const patternTypes = useMemo(() => {
    return Array.from(new Set(crossSessionPatterns.map((p) => p.type)))
  }, [crossSessionPatterns])

  // Extract unique risk factors for filter dropdown
  const riskFactors = useMemo(() => {
    return Array.from(new Set(riskCorrelations.map((r) => r.riskFactor)))
  }, [riskCorrelations])

  // Extract available emotion types from trends
  const emotionTypes = useMemo(() => {
    return Array.from(
      new Set(trends.flatMap((trend) => trend.emotionTypes || [])),
    )
  }, [trends])

  // Apply basic filters to data
  const {
    filteredTrends: basicFilteredTrends,
    filteredPatterns: basicFilteredPatterns,
    filteredRisks: basicFilteredRisks,
  } = useMemo(() => {
    let filteredTrends = [...trends]
    let filteredPatterns = [...crossSessionPatterns]
    let filteredRisks = [...riskCorrelations]

    if (appliedFilters.startDate) {
      filteredTrends = filteredTrends.filter(
        (trend) =>
          new Date(trend.startDate) >= new Date(appliedFilters.startDate!),
      )
    }
    if (appliedFilters.endDate) {
      filteredTrends = filteredTrends.filter(
        (trend) => new Date(trend.endDate) <= new Date(appliedFilters.endDate!),
      )
    }
    if (appliedFilters.patternType && appliedFilters.patternType !== '') {
      filteredPatterns = filteredPatterns.filter(
        (pattern) => pattern.type === appliedFilters.patternType,
      )
    }
    if (appliedFilters.minFrequency) {
      filteredPatterns = filteredPatterns.filter(
        (pattern) =>
          (pattern.sessions?.length || 0) >= appliedFilters.minFrequency!,
      )
    }
    if (appliedFilters.riskFactor && appliedFilters.riskFactor !== '') {
      filteredRisks = filteredRisks.filter(
        (risk) => risk.riskFactor === appliedFilters.riskFactor,
      )
    }
    if (appliedFilters.minSeverity) {
      filteredRisks = filteredRisks.filter(
        (risk) => risk.severityScore >= appliedFilters.minSeverity!,
      )
    }
    if (appliedFilters.minSignificance) {
      filteredTrends = filteredTrends.filter(
        (trend) => (trend.significance ?? 0) >= appliedFilters.minSignificance!,
      ) // Safely access significance
      filteredPatterns = filteredPatterns.filter(
        (pattern) =>
          (pattern.significance ?? 0) >= appliedFilters.minSignificance!,
      )
    }
    if (appliedFilters.minConfidence) {
      filteredTrends = filteredTrends.filter(
        (trend) => trend.confidence >= appliedFilters.minConfidence!,
      )
      filteredPatterns = filteredPatterns.filter(
        (pattern) => pattern.confidence >= appliedFilters.minConfidence!,
      )
      filteredRisks = filteredRisks.filter(
        (risk) => risk.confidence >= appliedFilters.minConfidence!,
      )
    }
    return { filteredTrends, filteredPatterns, filteredRisks }
  }, [trends, crossSessionPatterns, riskCorrelations, appliedFilters])

  // Apply advanced filters to data
  const {
    filteredTrends: advancedFilteredTrends,
    filteredPatterns: advancedFilteredPatterns,
    filteredRisks: advancedFilteredRisks,
  } = useMemo(() => {
    let filteredTrends = [...basicFilteredTrends]
    let filteredPatterns = [...basicFilteredPatterns]
    let filteredRisks = [...basicFilteredRisks]

    if (typeof appliedAdvancedFilters.customLogic === 'function') {
      try {
        const customLogic = appliedAdvancedFilters.customLogic as (
          trends: TrendPattern[],
          patterns: CrossSessionPattern[],
          risks: RiskCorrelation[],
        ) => {
          trends?: TrendPattern[]
          patterns?: CrossSessionPattern[]
          risks?: RiskCorrelation[]
        }

        const result = customLogic(
          filteredTrends,
          filteredPatterns,
          filteredRisks,
        )
        if (result && typeof result === 'object') {
          filteredTrends = result.trends ?? filteredTrends
          filteredPatterns = result.patterns ?? filteredPatterns
          filteredRisks = result.risks ?? filteredRisks
        }
      } catch (error) {
        console.error('Error applying advanced filter logic:', error)
      }
    } else if (
      typeof appliedAdvancedFilters.customLogic === 'string' &&
      appliedAdvancedFilters.customLogic.trim() !== ''
    ) {
      // String-based custom logic is not supported for security reasons.
      console.warn(
        'String-based custom logic is not supported for security reasons.',
      )
    }

    if (appliedAdvancedFilters.keywords) {
      const keywords = appliedAdvancedFilters.keywords
        .toLowerCase()
        .split(',')
        .map((kw: string) => kw.trim())
      // Ensure item properties are safely accessed, especially for union types
      const keywordFilter = (
        item: TrendPattern | CrossSessionPattern | RiskCorrelation,
      ) => {
        const itemDescription = item.description
        const itemName = 'name' in item ? item.name : undefined

        return keywords.some(
          (kw: string) =>
            (typeof itemDescription === 'string' &&
              itemDescription.toLowerCase().includes(kw)) ||
            (typeof itemName === 'string' &&
              itemName.toLowerCase().includes(kw)),
        )
      }
      filteredTrends = filteredTrends.filter(
        keywordFilter as (item: TrendPattern) => boolean,
      )
      filteredPatterns = filteredPatterns.filter(
        keywordFilter as (item: CrossSessionPattern) => boolean,
      )
      filteredRisks = filteredRisks.filter(
        keywordFilter as (item: RiskCorrelation) => boolean,
      )
    }

    if (appliedAdvancedFilters.sentimentScore) {
      const { min, max } = appliedAdvancedFilters.sentimentScore
      const sentimentFilter = (item: TrendPattern | { sentiment?: number }) => {
        const sentimentValue =
          'sentiment' in item && typeof item.sentiment === 'number'
            ? item.sentiment
            : 'confidence' in item
              ? item.confidence
              : undefined

        return (
          sentimentValue !== undefined &&
          (min === undefined || sentimentValue >= min) &&
          (max === undefined || sentimentValue <= max)
        )
      }
      filteredTrends = filteredTrends.filter(
        sentimentFilter as (
          value: TrendPattern,
          index: number,
          array: TrendPattern[],
        ) => unknown,
      )
    }

    return { filteredTrends, filteredPatterns, filteredRisks }
  }, [
    basicFilteredTrends,
    basicFilteredPatterns,
    basicFilteredRisks,
    appliedAdvancedFilters,
  ])

  // Determine which set of filtered data to use
  const finalFilteredTrends = useAdvancedFiltering
    ? advancedFilteredTrends
    : basicFilteredTrends
  const finalFilteredPatterns = useAdvancedFiltering
    ? advancedFilteredPatterns
    : basicFilteredPatterns
  const finalFilteredRisks = useAdvancedFiltering
    ? advancedFilteredRisks
    : basicFilteredRisks

  // Transform data with highlight information - Moved up
  const transformedTrendsToDisplay = useMemo(
    () => transformTrendsData(finalFilteredTrends, localHighlightedPatterns),
    [finalFilteredTrends, localHighlightedPatterns],
  )

  const transformedPatternsToDisplay = useMemo(
    () => transformPatternData(finalFilteredPatterns, localHighlightedPatterns),
    [finalFilteredPatterns, localHighlightedPatterns],
  )

  // Handle the activeDot click event with proper typing - Moved up
  const handleTrendDotClick = useCallback(
    (props: TrendDotClickProps, _event: React.MouseEvent<SVGElement>) => {
      const data = props.payload // No need for `as TransformedTrend` due to specific prop type
      if (data && data.original) {
        onPatternSelect?.(data.original)
      }
    },
    [onPatternSelect],
  )

  // Handle the area click event with proper typing - Moved up
  const handlePatternClick = useCallback(
    (props: PatternAreaClickProps, _event: React.MouseEvent<SVGElement>) => {
      const data = props.payload // No need for `as TransformedPattern | RiskCorrelation`
      if (
        data &&
        (data as TransformedPattern).original &&
        (data as TransformedPattern).patternId
      ) {
        // Check patternId to ensure it's TransformedPattern
        onPatternSelect?.((data as TransformedPattern).original)
      } else if (
        data &&
        (data as RiskCorrelation).id &&
        (data as RiskCorrelation).riskFactor
      ) {
        onPatternSelect?.(data as RiskCorrelation)
      }
    },
    [onPatternSelect],
  )

  // Handle tab change - Moved up
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as 'trends' | 'patterns' | 'risks')
  }, [])

  // Toggle filter visibility - Moved up
  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev)
  }, [])

  // Toggle advanced filtering mode - Moved up
  const toggleAdvancedFiltering = useCallback(() => {
    setUseAdvancedFiltering((prev) => !prev)
  }, [])

  // Handle basic filter change - Moved up
  const handleFilterChange = useCallback((options: FilterOptions) => {
    setFilterOptions(options)
  }, [])

  // Handle advanced filter change - Moved up
  const handleAdvancedFilterChange = useCallback(
    (options: AdvancedFilterOptions) => {
      setAdvancedFilterOptions(options)
    },
    [],
  )

  // Apply basic filters - Moved up
  const applyFilters = useCallback(() => {
    setAppliedFilters(filterOptions)
  }, [filterOptions])

  // Apply advanced filters - Moved up
  const applyAdvancedFilters = useCallback(() => {
    setAppliedAdvancedFilters(advancedFilterOptions)
  }, [advancedFilterOptions])

  // Reset basic filters - Moved up
  const resetFilters = useCallback(() => {
    setFilterOptions({})
    setAppliedFilters({})
  }, [])

  // Reset advanced filters - Moved up
  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilterOptions({})
    setAppliedAdvancedFilters({})
  }, [])

  const CustomTooltip = useCallback(
    ({
      active,
      payload,
      label,
    }: import('recharts').TooltipProps<number, string>) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload as
          | TransformedTrend
          | TransformedPattern
          | RiskCorrelation
        let content = null
        if (
          data &&
          'trendId' in data &&
          data.original &&
          'startDate' in data.original
        ) {
          const trendData = data as TransformedTrend
          content = (
            <>
              <p className="label">{`${label} : ${trendData.date}`}</p>
              <p className="intro">
                {`Significance: ${trendData.significance.toFixed(2)}`}
              </p>
              <p className="desc">
                {`Confidence: ${trendData.confidence.toFixed(2)}`}
              </p>
              {trendData.original.description && (
                <p className="desc text-xs italic">
                  {trendData.original.description}
                </p>
              )}
            </>
          )
        } else if (
          data &&
          'patternId' in data &&
          data.original &&
          'sessions' in data.original
        ) {
          const patternData = data as TransformedPattern
          content = (
            <>
              <p className="label">{`${label} : ${patternData.pattern}`}</p>
              <p className="intro">{`Frequency: ${patternData.frequency}`}</p>
              <p className="desc">
                {`Confidence: ${patternData.confidence.toFixed(2)}`}
              </p>
              {patternData.original.description && (
                <p className="desc text-xs italic">
                  {patternData.original.description}
                </p>
              )}
            </>
          )
        } else if (
          data &&
          'riskFactor' in data &&
          'severityScore' in data &&
          'id' in data
        ) {
          const riskData = data as RiskCorrelation
          content = (
            <>
              <p className="label">{`Risk: ${riskData.riskFactor}`}</p>
              <p className="intro">
                {`Severity: ${riskData.severityScore.toFixed(2)}`}
              </p>
              <p className="desc">
                {`Confidence: ${riskData.confidence.toFixed(2)}`}
              </p>
              {riskData.description && (
                <p className="desc text-xs italic">{riskData.description}</p>
              )}
            </>
          )
        } else {
          content = <p>Details not available</p>
        }

        return (
          <div className="bg-background p-3 border border-border shadow-lg rounded-md text-sm">
            {content}
          </div>
        )
      }
      return null
    },
    [],
  ) // CustomTooltip does not depend on component state/props changing its own definition

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </Card>
    )
  }

  if (!isClient) {
    return null // Or a placeholder/loader for SSR
  }

  return (
    <Card className="h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-grow flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={toggleFilters}>
            <IconFilter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {showFilters && (
          <div className="p-4 border-b bg-muted/40">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAdvancedFiltering}
              >
                {useAdvancedFiltering ? 'Basic Filters' : 'Advanced Filters'}
              </Button>
            </div>
            {useAdvancedFiltering ? (
              <AdvancedFilteringComponent
                options={advancedFilterOptions}
                onChange={handleAdvancedFilterChange}
                onApply={applyAdvancedFilters}
                onReset={resetAdvancedFilters}
                availableEmotionTypes={emotionTypes}
                availablePatternTypes={patternTypes}
                availablePatternCategories={Array.from(
                  new Set(
                    crossSessionPatterns.flatMap((p) => p.categories || []),
                  ),
                )}
              />
            ) : (
              <FilterControls
                options={filterOptions}
                onChange={handleFilterChange}
                onApply={applyFilters}
                onReset={resetFilters}
                activeTab={activeTab}
                patternTypes={patternTypes}
                riskFactors={riskFactors}
              />
            )}
          </div>
        )}

        <TabsContent value="trends" className="flex-grow p-1 m-0">
          {finalFilteredTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transformedTrendsToDisplay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="category"
                  dataKey="date"
                  name="Date"
                  tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                  allowDuplicatedCategory={false}
                />

                <YAxis
                  type="number"
                  dataKey="significance"
                  name="Significance"
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ strokeDasharray: '3 3' }}
                />

                <Line
                  type="monotone"
                  dataKey="significance"
                  stroke="var(--chart-primary)"
                  activeDot={{ r: 8, onClick: handleTrendDotClick }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No trend data to display.
            </div>
          )}
        </TabsContent>
        <TabsContent value="patterns" className="flex-grow p-1 m-0">
          {finalFilteredPatterns.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transformedPatternsToDisplay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="category"
                  dataKey="pattern"
                  name="Pattern"
                  tickFormatter={(tick) => tick}
                  allowDuplicatedCategory={false}
                />

                <YAxis type="number" dataKey="frequency" name="Frequency" />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'transparent' }}
                />

                <Area
                  type="monotone"
                  dataKey="frequency"
                  stroke="var(--chart-secondary)"
                  fill="var(--chart-secondary)"
                  activeDot={{ r: 8, onClick: handlePatternClick }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No pattern data to display.
            </div>
          )}
        </TabsContent>
        <TabsContent value="risks" className="flex-grow p-1 m-0">
          {finalFilteredRisks.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {/* Example: RadarChart for risks. Adjust as per actual visualization needs. */}
              <AreaChart data={finalFilteredRisks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="category"
                  dataKey="riskFactor"
                  name="Risk Factor"
                  tickFormatter={(tick) => tick}
                  allowDuplicatedCategory={false}
                />

                <YAxis
                  type="number"
                  dataKey="severityScore"
                  name="Severity Score"
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'transparent' }}
                />

                <Area
                  type="monotone"
                  dataKey="severityScore"
                  stroke="var(--chart-danger)"
                  fill="var(--chart-danger)"
                  activeDot={{ r: 8, onClick: handlePatternClick }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No risk data to display.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function transformTrendsData(
  trends: TrendPattern[],
  highlightedPatterns: string[] = [],
): TransformedTrend[] {
  return trends.map((trend) => ({
    date: new Date(trend.startDate).toLocaleDateString(),
    significance:
      trend.significance ??
      parseFloat(trend.indicators?.length ? '0.8' : '0.5'),
    confidence: trend.confidence,
    original: trend,
    isHighlighted: highlightedPatterns.includes(trend.id),
    trendId: trend.id,
  }))
}

function transformPatternData(
  patterns: CrossSessionPattern[],
  highlightedPatterns: string[] = [],
): TransformedPattern[] {
  return patterns.map((pattern) => ({
    pattern: pattern.type,
    frequency: pattern.sessions?.length || 0,
    confidence: pattern.confidence,
    original: pattern,
    isHighlighted: highlightedPatterns.includes(pattern.id),
    patternId: pattern.id,
  }))
}

export default PatternVisualization
