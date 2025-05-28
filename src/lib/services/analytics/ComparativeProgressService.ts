import type {
  ProgressSnapshot,
  Benchmark,
  ComparativeProgressResult,
  ComparativeProgressParams
} from '../../../types/analytics';

/**
 * Service for analyzing user progress against anonymized benchmarks.
 * Provides comparative insights while maintaining privacy and security.
 */
export class ComparativeProgressService {
  private logger: any; // Replace with your actual logger type

  constructor(logger: any) {
    this.logger = logger;
  }

  /**
   * Performs comparative analysis of user progress against benchmarks.
   * @param params Parameters for the comparison
   * @returns ComparativeProgressResult with user data, benchmarks, and insights
   */
  public async analyzeProgress(params: ComparativeProgressParams): Promise<ComparativeProgressResult> {
    try {
      // Log the request (without PII)
      this.logger.info('Comparative progress analysis requested', {
        metricName: params.metricName,
        cohortId: params.cohortId,
        dateRange: params.dateRange
      });

      // Fetch user progress data
      const userProgressSnapshots = await this.fetchUserProgressData(params);
      
      // If no user data, return early with insufficient data
      if (!userProgressSnapshots.length) {
        return this.createInsufficientDataResult(params);
      }

      // Fetch benchmark data for comparison
      const benchmarkData = await this.fetchBenchmarkData(params);
      
      // Generate insights by comparing user data to benchmarks
      const comparisonInsights = this.generateInsights(userProgressSnapshots, benchmarkData);
      
      // Construct and return the complete result
      return {
        userProgressSnapshots,
        benchmarkData,
        comparisonInsights
      };
    } catch (error) {
      // Log the error (without PII)
      this.logger.error('Error in comparative progress analysis', {
        metricName: params.metricName,
        cohortId: params.cohortId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return error result
      return {
        userProgressSnapshots: [],
        benchmarkData: null,
        comparisonInsights: {
          trend: 'insufficient_data'
        },
        error: 'Failed to complete comparative analysis'
      };
    }
  }

  /**
   * Fetches anonymized progress data for a specific user.
   * In production, this would query a database with proper anonymization.
   * @param params Parameters to identify the user and metrics
   * @returns Array of progress snapshots
   */
  private async fetchUserProgressData(params: ComparativeProgressParams): Promise<ProgressSnapshot[]> {
    // NOTE: This is mock data for development purposes.
    // In production, this would query a database with proper anonymization.
    
    const { anonymizedUserId, metricName, dateRange } = params;
    
    // Generate mock data points between start and end dates
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    // For demo, generate one data point per week
    const snapshots: ProgressSnapshot[] = [];
    const dataPointCount = Math.min(Math.ceil(daysBetween / 7), 12); // Cap at 12 points
    
    // Generate a realistic trend (improving, declining, or fluctuating)
    const trendType = Math.random() > 0.5 ? 'improving' : 'declining';
    const baseValue = metricName.includes('phq') || metricName.includes('gad') ? 12 : 50;
    const changePerPoint = trendType === 'improving' ? -0.7 : 0.5; // Decrease is improvement for clinical scores
    
    for (let i = 0; i < dataPointCount; i++) {
      const pointDate = new Date(startDate);
      pointDate.setDate(startDate.getDate() + (i * 7));
      
      // Add some randomness to the trend
      const randomVariance = (Math.random() - 0.5) * 2;
      const value = Math.max(0, baseValue + (i * changePerPoint) + randomVariance);
      
      snapshots.push({
        anonymizedUserId,
        date: pointDate.toISOString().split('T')[0],
        metricName,
        metricValue: Math.round(value * 10) / 10, // Round to 1 decimal place
        sessionId: `session-${i + 1}`
      });
    }
    
    return snapshots;
  }

  /**
   * Fetches benchmark data for comparison.
   * In production, this would query an analytics database with pre-computed benchmarks.
   * @param params Parameters to identify the cohort and metric
   * @returns Benchmark data or null if not available
   */
  private async fetchBenchmarkData(params: ComparativeProgressParams): Promise<Benchmark | null> {
    // NOTE: This is mock data for development purposes.
    // In production, this would query a database with pre-computed benchmarks.
    
    const { cohortId, metricName } = params;
    
    // Mock benchmark data based on metric type
    if (metricName.includes('phq')) {
      // PHQ-9 (depression) benchmark - lower is better
      return {
        cohortId,
        metricName,
        averageValue: 8.5,
        percentile25: 5.0,
        percentile75: 12.0,
        standardDeviation: 3.2,
        sampleSize: 1250,
        benchmarkDescription: `Anonymized ${metricName} scores from similar users`
      };
    } else if (metricName.includes('gad')) {
      // GAD-7 (anxiety) benchmark - lower is better
      return {
        cohortId,
        metricName,
        averageValue: 7.2,
        percentile25: 4.0,
        percentile75: 10.5,
        standardDeviation: 2.8,
        sampleSize: 1100,
        benchmarkDescription: `Anonymized ${metricName} scores from similar users`
      };
    } else if (metricName.includes('engagement')) {
      // Engagement score benchmark - higher is better
      return {
        cohortId,
        metricName,
        averageValue: 68.5,
        percentile25: 52.0,
        percentile75: 85.0,
        standardDeviation: 15.3,
        sampleSize: 980,
        benchmarkDescription: `Anonymized ${metricName} ratings from similar users`
      };
    }
    
    // For unknown metrics, return null
    return null;
  }

  /**
   * Analyzes user progress against benchmarks to generate insights.
   * @param snapshots User progress snapshots
   * @param benchmark Benchmark data for comparison
   * @returns Comparison insights
   */
  private generateInsights(
    snapshots: ProgressSnapshot[],
    benchmark: Benchmark | null
  ): ComparativeProgressResult['comparisonInsights'] {
    // If we don't have enough data points or no benchmark, return insufficient data
    if (snapshots.length < 2 || !benchmark) {
      return { trend: 'insufficient_data' };
    }
    
    // Sort snapshots by date
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Determine if the metric is "lower is better" (clinical scores) or "higher is better" (engagement)
    const lowerIsBetter = benchmark.metricName.includes('phq') || benchmark.metricName.includes('gad');
    
    // Calculate trend
    const firstValue = sortedSnapshots[0].metricValue;
    const lastValue = sortedSnapshots[sortedSnapshots.length - 1].metricValue;
    const valueDifference = lastValue - firstValue;
    
    // Determine trend direction
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(valueDifference) < 1) {
      trend = 'stable';
    } else if ((lowerIsBetter && valueDifference < 0) || (!lowerIsBetter && valueDifference > 0)) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }
    
    // Compare to average
    const relativeToAverage = this.compareToAverage(lastValue, benchmark, lowerIsBetter);
    
    // Estimate percentile rank
    const percentileRank = this.estimatePercentileRank(lastValue, benchmark, lowerIsBetter);
    
    // Generate narrative summary
    const narrativeSummary = this.generateNarrativeSummary(
      trend, relativeToAverage, percentileRank, lowerIsBetter, benchmark.metricName
    );
    
    return {
      trend,
      relativeToAverage,
      percentileRank,
      narrativeSummary
    };
  }

  /**
   * Compares a value to the benchmark average.
   * @param value User's value
   * @param benchmark Benchmark data
   * @param lowerIsBetter Whether lower values are better
   * @returns Relative position to average
   */
  private compareToAverage(
    value: number,
    benchmark: Benchmark,
    lowerIsBetter: boolean
  ): 'above' | 'below' | 'at' {
    const difference = value - benchmark.averageValue;
    const threshold = benchmark.standardDeviation ? benchmark.standardDeviation * 0.2 : 1;
    
    if (Math.abs(difference) <= threshold) {
      return 'at';
    }
    
    if (lowerIsBetter) {
      return difference < 0 ? 'above' : 'below';
    } else {
      return difference > 0 ? 'above' : 'below';
    }
  }

  /**
   * Estimates the percentile rank of a value within the benchmark distribution.
   * @param value User's value
   * @param benchmark Benchmark data
   * @param lowerIsBetter Whether lower values are better
   * @returns Estimated percentile (0-100)
   */
  private estimatePercentileRank(
    value: number,
    benchmark: Benchmark,
    lowerIsBetter: boolean
  ): number {
    // Simple linear interpolation between known percentiles
    if (lowerIsBetter) {
      if (value <= benchmark.percentile25) {
        return 75 + (25 * (benchmark.percentile25 - value) / benchmark.percentile25);
      } else if (value >= benchmark.percentile75) {
        return 25 * (benchmark.percentile75 / value);
      } else {
        return 75 - (50 * (value - benchmark.percentile25) / (benchmark.percentile75 - benchmark.percentile25));
      }
    } else if (value >= benchmark.percentile75) {
      return 75 + (25 * (value - benchmark.percentile75) / benchmark.percentile75);
    } else if (value <= benchmark.percentile25) {
      return 25 * (value / benchmark.percentile25);
    } else {
      return 25 + (50 * (value - benchmark.percentile25) / (benchmark.percentile75 - benchmark.percentile25));
    }
  }

  /**
   * Generates a human-readable summary of the comparison insights.
   * @param trend User's progress trend
   * @param relativeToAverage Position relative to average
   * @param percentileRank Percentile rank
   * @param lowerIsBetter Whether lower values are better
   * @param metricName Name of the metric
   * @returns Narrative summary
   */
  private generateNarrativeSummary(
    trend: 'improving' | 'declining' | 'stable',
    relativeToAverage: 'above' | 'below' | 'at',
    percentileRank: number,
    lowerIsBetter: boolean,
    metricName: string
  ): string {
    const metricLabel = this.getMetricLabel(metricName);
    const performanceLevel = this.getPerformanceLevel(percentileRank, lowerIsBetter);
    const trendDescription = this.getTrendDescription(trend);
    const comparisonDescription = this.getComparisonDescription(relativeToAverage, lowerIsBetter);
    
    return `${metricLabel} is ${trendDescription} and currently ${comparisonDescription} (${performanceLevel}).`;
  }

  /**
   * Gets a human-readable label for a metric.
   * @param metricName Raw metric name
   * @returns User-friendly label
   */
  private getMetricLabel(metricName: string): string {
    if (metricName.includes('phq')) {
      return 'Depression score';
    }
    if (metricName.includes('gad')) {
      return 'Anxiety level';
    }
    if (metricName.includes('engagement')) {
      return 'Engagement rating';
    }
    return 'Progress metric';
  }

  /**
   * Gets a description of the performance level based on percentile.
   * @param percentileRank Percentile rank
   * @param lowerIsBetter Whether lower values are better
   * @returns Performance level description
   */
  private getPerformanceLevel(percentileRank: number, lowerIsBetter: boolean): string {
    const adjustedPercentile = lowerIsBetter ? 100 - percentileRank : percentileRank;
    
    if (adjustedPercentile >= 90) {
      return 'excellent progress';
    }
    if (adjustedPercentile >= 75) {
      return 'very good progress';
    }
    if (adjustedPercentile >= 60) {
      return 'good progress';
    }
    if (adjustedPercentile >= 40) {
      return 'moderate progress';
    }
    if (adjustedPercentile >= 25) {
      return 'some progress';
    }
    return 'limited progress';
  }

  /**
   * Gets a description of the trend.
   * @param trend Progress trend
   * @returns Trend description
   */
  private getTrendDescription(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving': return 'showing improvement';
      case 'declining': return 'showing some challenges';
      case 'stable': return 'remaining stable';
      default: return 'showing mixed results';
    }
  }

  /**
   * Gets a description of the comparison to average.
   * @param relativeToAverage Position relative to average
   * @param lowerIsBetter Whether lower values are better
   * @returns Comparison description
   */
  private getComparisonDescription(
    relativeToAverage: 'above' | 'below' | 'at',
    lowerIsBetter: boolean
  ): string {
    if (relativeToAverage === 'at') {
      return 'near the average for similar users';
    }
    
    const betterThanAverage = 
      (lowerIsBetter && relativeToAverage === 'below') || 
      (!lowerIsBetter && relativeToAverage === 'above');
    
    return betterThanAverage 
      ? 'better than average for similar users' 
      : 'below average compared to similar users';
  }

  /**
   * Creates a result for insufficient data scenarios.
   * @param params Original request parameters
   * @returns Basic result with insufficient data trend
   */
  private createInsufficientDataResult(params: ComparativeProgressParams): ComparativeProgressResult {
    return {
      userProgressSnapshots: [],
      benchmarkData: null,
      comparisonInsights: {
        trend: 'insufficient_data',
        narrativeSummary: `Insufficient data available for ${params.metricName} analysis. More data points are needed for meaningful comparison.`
      }
    };
  }
} 