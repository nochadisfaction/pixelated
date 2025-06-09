/**
 * Performance Monitor for Bias Detection Engine
 * Tracks metrics and performance data for the bias detection system
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetric[];
  summary: {
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private requestTimings: Array<{
    endpoint: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }> = [];

  /**
   * Record a request timing
   */
  recordRequestTiming(endpoint: string, method: string, duration: number, status: number) {
    this.requestTimings.push({
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });

    // Keep only last 1000 entries to prevent memory leaks
    if (this.requestTimings.length > 1000) {
      this.requestTimings = this.requestTimings.slice(-1000);
    }

    // Add as a metric
    this.addMetric(`request_duration_ms`, duration, {
      endpoint,
      method,
      status: status.toString(),
    });
  }

  /**
   * Add a performance metric
   */
  addMetric(name: string, value: number, labels?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      labels,
    });

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }

  /**
   * Get performance snapshot for a time range
   */
  getSnapshot(timeRange: number = 300000): PerformanceSnapshot {
    const now = Date.now();
    const cutoff = now - timeRange;

    // Filter metrics within time range
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    const recentRequests = this.requestTimings.filter(r => r.timestamp >= cutoff);

    // Calculate summary statistics
    const totalRequests = recentRequests.length;
    const successfulRequests = recentRequests.filter(r => r.status >= 200 && r.status < 300);
    const averageResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests 
      : 0;
    const errorRate = totalRequests > 0 
      ? (totalRequests - successfulRequests.length) / totalRequests 
      : 0;
    const throughput = totalRequests / (timeRange / 1000); // requests per second

    return {
      timestamp: now,
      metrics: recentMetrics,
      summary: {
        requestCount: totalRequests,
        averageResponseTime,
        errorRate,
        throughput,
      },
    };
  }

  /**
   * Export metrics in different formats
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheus();
    }
    
    return JSON.stringify(this.getSnapshot(), null, 2);
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheus(): string {
    const lines: string[] = [];
    const metricGroups = new Map<string, PerformanceMetric[]>();

    // Group metrics by name
    for (const metric of this.metrics) {
      const group = metricGroups.get(metric.name) || [];
      group.push(metric);
      metricGroups.set(metric.name, group);
    }

    // Generate Prometheus format
    for (const [name, metrics] of metricGroups) {
      lines.push(`# HELP ${name} Performance metric for bias detection`);
      lines.push(`# TYPE ${name} gauge`);
      
      for (const metric of metrics.slice(-10)) { // Only last 10 of each type
        const labels = metric.labels 
          ? Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')
          : '';
        
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${name}${labelStr} ${metric.value} ${metric.timestamp}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Clear all metrics and request data
   */
  clear() {
    this.metrics = [];
    this.requestTimings = [];
  }

  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceSnapshot, PerformanceMetric }; 