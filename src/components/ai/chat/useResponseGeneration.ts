import type { AIMessage } from '../../../lib/ai'
import { useCallback, useState } from 'react'

interface UseResponseGenerationOptions {
  apiEndpoint?: string
  model?: string
  temperature?: number
  maxResponseTokens?: number
  onError?: (error: Error) => void
  onComplete?: (response: string) => void
}

interface UseResponseGenerationResult {
  response: string | null
  isLoading: boolean
  error: string | null
  generateResponse: (messages: AIMessage[]) => Promise<string | null>
  generateResponseWithContext: (
    currentMessage: string,
  ) => Promise<string | null>
  generateResponseWithInstructions: (
    messages: AIMessage[],
    instructions: string,
  ) => Promise<string | null>
  reset: () => void
}

/**
 * Custom hook for therapeutic response generation
 */
export function useResponseGeneration({
  apiEndpoint = '/api/ai/response',
  model = 'gpt-4o',
  temperature = 0.7,
  maxResponseTokens = 1024,
  onError,
  onComplete,
}: UseResponseGenerationOptions = {}): UseResponseGenerationResult {
  const [response, setResponse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state
  const reset = useCallback(() => {
    setResponse(null)
    setIsLoading(false)
    setError(null)
  }, [])

  // Generate response from messages
  const generateResponse = useCallback(
    async (messages: AIMessage[]) => {
      if (messages.length === 0 || isLoading) {
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Prepare request body
        const requestBody = {
          messages,
          model,
          temperature,
          maxResponseTokens,
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
          throw new Error(errorData.error || 'Failed to generate response')
        }

        // Parse response
        const data = await response?.json()
        const responseContent = data?.response

        setResponse(responseContent)

        // Call onComplete callback
        if (onComplete) {
          onComplete(responseContent)
        }

        return responseContent
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
      temperature,
      maxResponseTokens,
      apiEndpoint,
      onError,
      onComplete,
    ],
  )

  // Generate response with context from current message
  const generateResponseWithContext = useCallback(
    async (currentMessage: string) => {
      if (!currentMessage.trim() || isLoading) {
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Prepare request body
        const requestBody = {
          currentMessage,
          model,
          temperature,
          maxResponseTokens,
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
          throw new Error(
            errorData.error || 'Failed to generate response with context',
          )
        }

        // Parse response
        const data = await response?.json()
        const responseContent = data?.response

        setResponse(responseContent)

        // Call onComplete callback
        if (onComplete) {
          onComplete(responseContent)
        }

        return responseContent
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
      temperature,
      maxResponseTokens,
      apiEndpoint,
      onError,
      onComplete,
    ],
  )

  // Generate response with additional instructions
  const generateResponseWithInstructions = useCallback(
    async (messages: AIMessage[], instructions: string) => {
      if (messages.length === 0 || !instructions.trim() || isLoading) {
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Prepare request body
        const requestBody = {
          messages,
          instructions,
          model,
          temperature,
          maxResponseTokens,
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
          throw new Error(
            errorData.error || 'Failed to generate response with instructions',
          )
        }

        // Parse response
        const data = await response?.json()
        const responseContent = data?.response

        setResponse(responseContent)

        // Call onComplete callback
        if (onComplete) {
          onComplete(responseContent)
        }

        return responseContent
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
      temperature,
      maxResponseTokens,
      apiEndpoint,
      onError,
      onComplete,
    ],
  )

  return {
    response,
    isLoading,
    error,
    generateResponse,
    generateResponseWithContext,
    generateResponseWithInstructions,
    reset,
  }
}
