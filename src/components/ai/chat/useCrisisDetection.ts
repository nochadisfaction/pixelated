import type { CrisisDetectionResult } from '../../../lib/ai/models/types'
import { useCallback, useState } from 'react'

interface UseCrisisDetectionOptions {
  apiEndpoint?: string
  model?: string
  sensitivityLevel?: 'low' | 'medium' | 'high'
  onError?: (error: Error) => void
  onCrisisDetected?: (result: CrisisDetectionResult) => void
  onComplete?: (result: CrisisDetectionResult) => void
}

interface UseCrisisDetectionResult {
  result: CrisisDetectionResult | null
  isLoading: boolean
  error: string | null
  detectCrisis: (text: string) => Promise<CrisisDetectionResult | null>
  detectBatch: (texts: string[]) => Promise<CrisisDetectionResult[] | null>
  reset: () => void
}

/**
 * Custom hook for crisis detection
 */
export function useCrisisDetection({
  apiEndpoint = '/api/ai/crisis-detection',
  model = 'gpt-4o',
  sensitivityLevel = 'medium',
  onError,
  onCrisisDetected,
  onComplete,
}: UseCrisisDetectionOptions = {}): UseCrisisDetectionResult {
  const [result, setResult] = useState<CrisisDetectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state
  const reset = useCallback(() => {
    setResult(null)
    setIsLoading(false)
    setError(null)
  }, [])

  // Detect crisis in a single text
  const detectCrisis = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) {
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Prepare request body
        const requestBody = {
          text,
          model,
          sensitivityLevel,
        }

        // Send request to API
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response?.ok) {
          const errorData = await response?.json()
          throw new Error(errorData.error || 'Failed to detect crisis')
        }

        // Parse response
        const data = (await response?.json()) as CrisisDetectionResult
        setResult(data)

        // Call onCrisisDetected callback if crisis detected
        if (data?.isCrisis && onCrisisDetected) {
          onCrisisDetected(data)
        }

        // Call onComplete callback
        if (onComplete) {
          onComplete(data)
        }

        return data
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)

        // Call onError callback
        if (onError && err instanceof Error) {
          onError(err)
        }

        return null
      } finally {
        setIsLoading(false)
      }
    },
    [
      isLoading,
      model,
      sensitivityLevel,
      apiEndpoint,
      onError,
      onCrisisDetected,
      onComplete,
    ],
  )

  // Detect crisis in a batch of texts
  const detectBatch = useCallback(
    async (texts: string[]) => {
      if (texts.length === 0 || isLoading) {
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Prepare request body
        const requestBody = {
          batch: texts,
          model,
          sensitivityLevel,
        }

        // Send request to API
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response?.ok) {
          const errorData = await response?.json()
          throw new Error(errorData.error || 'Failed to detect crisis in batch')
        }

        // Parse response
        const data = (await response?.json()) as CrisisDetectionResult[]

        // Check if any crisis was detected in the batch
        const crisisDetected = data?.some((result) => result?.isCrisis)

        if (crisisDetected && onCrisisDetected) {
          // Call onCrisisDetected with the first crisis result
          const firstCrisis = data?.find((result) => result?.isCrisis)
          if (firstCrisis) {
            onCrisisDetected(firstCrisis)
          }
        }

        // We don't set result for batch analysis since it's multiple results
        // But we can call onComplete with the first result if needed
        if (onComplete && data?.length > 0) {
          onComplete(data[0])
        }

        return data
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)

        // Call onError callback
        if (onError && err instanceof Error) {
          onError(err)
        }

        return null
      } finally {
        setIsLoading(false)
      }
    },
    [
      isLoading,
      model,
      sensitivityLevel,
      apiEndpoint,
      onError,
      onCrisisDetected,
      onComplete,
    ],
  )

  return {
    result,
    isLoading,
    error,
    detectCrisis,
    detectBatch,
    reset,
  }
}
