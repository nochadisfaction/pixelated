import { logger } from '../lib/logging/logger'
import { PerformanceLogger } from '../lib/logging/performance-logger'

interface PerformanceReport {
  totalRequests: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  successRate: number
  cacheHitRate: number
  averageTokens: number
  errorDistribution: Record<string, number>
  modelDistribution: Record<string, number>
}

async function generateReport(days = 7): Promise<PerformanceReport> {
  const performanceLogger = PerformanceLogger.getInstance()
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const metrics = await performanceLogger.getMetrics({
    start: startDate,
    end: endDate,
  })

  // Calculate metrics
  const totalRequests = metrics.length
  const successfulRequests = metrics.filter((m) => m.success).length
  const cachedRequests = metrics.filter((m) => m.cached).length
  const latencies = metrics.map((m) => m.latency).sort((a, b) => a - b)
  const p95Index = Math.floor(latencies.length * 0.95)
  const p99Index = Math.floor(latencies.length * 0.99)

  // Calculate distributions
  const errorDistribution: Record<string, number> = {}
  const modelDistribution: Record<string, number> = {}

  metrics.forEach((metric) => {
    if (!metric.success && metric.errorCode) {
      errorDistribution[metric.errorCode] =
        (errorDistribution[metric.errorCode] || 0) + 1
    }
    modelDistribution[metric.model] = (modelDistribution[metric.model] || 0) + 1
  })

  const report: PerformanceReport = {
    totalRequests,
    averageLatency:
      latencies.reduce((sum, val) => sum + val, 0) / totalRequests,
    p95Latency: latencies[p95Index],
    p99Latency: latencies[p99Index],
    successRate: (successfulRequests / totalRequests) * 100,
    cacheHitRate: (cachedRequests / totalRequests) * 100,
    averageTokens:
      metrics.reduce((sum, m) => sum + (m.totalTokens || 0), 0) / totalRequests,
    errorDistribution,
    modelDistribution,
  }

  return report
}

async function main() {
  try {
    logger.info('Generating performance report...')
    const report = await generateReport()

    console.log('\nPerformance Report')
    console.log('=================\n')
    console.log(`Total Requests: ${report.totalRequests}`)
    console.log(`Average Latency: ${report.averageLatency.toFixed(2)}ms`)
    console.log(`P95 Latency: ${report.p95Latency}ms`)
    console.log(`P99 Latency: ${report.p99Latency}ms`)
    console.log(`Success Rate: ${report.successRate.toFixed(2)}%`)
    console.log(`Cache Hit Rate: ${report.cacheHitRate.toFixed(2)}%`)
    console.log(`Average Tokens: ${report.averageTokens.toFixed(2)}\n`)

    console.log('Error Distribution:')
    Object.entries(report.errorDistribution).forEach(([error, count]) => {
      console.log(
        `  ${error}: ${count} (${((count / report.totalRequests) * 100).toFixed(2)}%)`,
      )
    })

    console.log('\nModel Distribution:')
    Object.entries(report.modelDistribution).forEach(([model, count]) => {
      console.log(
        `  ${model}: ${count} (${((count / report.totalRequests) * 100).toFixed(2)}%)`,
      )
    })

    // Cleanup old logs
    await PerformanceLogger.getInstance().cleanup()
  } catch (error) {
    logger.error('Failed to generate performance report:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Script failed:', error)
    process.exit(1)
  })
}
