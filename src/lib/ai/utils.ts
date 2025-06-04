import type { AIService } from './AIService'

/**
 * Check if the given AIService instance supports session documentation
 *
 * @param service The AIService instance to check
 * @returns True if the service supports documentation generation
 */
export function supportsSessionDocumentation(service: AIService): boolean {
  // Check if the service has generateSessionDocumentation method
  if (!('generateSessionDocumentation' in service)) {
    return false
  }

  // Check if the provider supports documentation generation
  const { provider } = service as any
  if (!provider || typeof provider !== 'object') {
    return false
  }

  return (
    'generateSessionDocumentation' in provider &&
    typeof provider.generateSessionDocumentation === 'function'
  )
}

/**
 * Format the given time duration in minutes to a human-readable string
 *
 * @param durationMinutes Duration in minutes
 * @returns Formatted duration string (e.g., "1h 30m")
 */
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 1) {
    return 'less than a minute'
  }

  const hours = Math.floor(durationMinutes / 60)
  const minutes = Math.floor(durationMinutes % 60)

  if (hours === 0) {
    return `${minutes}m`
  } else if (minutes === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${minutes}m`
  }
}

/**
 * Extract primary emotional themes from emotion analysis data
 *
 * @param analyses Array of emotion analyses
 * @returns Array of emotion themes with their average intensity
 */
export function extractEmotionalThemes(
  analyses: Array<any>,
): Array<{ theme: string; intensity: number; frequency: number }> {
  if (!analyses || analyses.length === 0) {
    return []
  }

  // Collect all emotions across analyses
  const emotions: Record<string, { sum: number; count: number }> = {}

  analyses.forEach((analysis) => {
    if (analysis.emotions && Array.isArray(analysis.emotions)) {
      analysis.emotions.forEach((emotion: any) => {
        const type = emotion.type || 'unknown'
        const intensity = emotion.intensity || 0

        if (!emotions[type]) {
          emotions[type] = { sum: 0, count: 0 }
        }

        emotions[type].sum += intensity
        emotions[type].count += 1
      })
    }
  })

  // Convert to array and sort by frequency then intensity
  return Object.entries(emotions)
    .map(([theme, data]) => ({
      theme,
      intensity: data.sum / data.count,
      frequency: data.count,
    }))
    .sort((a, b) => b.frequency - a.frequency || b.intensity - a.intensity)
}
