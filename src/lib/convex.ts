/**
 * Convex client for production
 * This file provides real connection to Convex functions for use in production
 */

import { ConvexHttpClient } from 'convex/browser'
import { ConvexReactClient } from 'convex/react'
import { getLogger } from './logging'

const logger = getLogger()

// Define the possible connection states
type ConnectionStateValue =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'failed'

// Get the Convex URL from environment variables
const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.PUBLIC_CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL

// Create a Convex client with proper error handling
export function getConvexClient() {
  if (!CONVEX_URL) {
    logger.error('Missing Convex URL. Check CONVEX_URL environment variable.')
    throw new Error('Missing Convex URL. Set CONVEX_URL environment variable.')
  }

  try {
    // For browser environments, use the WebSocket-based client for subscriptions
    if (typeof window !== 'undefined') {
      return new ConvexReactClient(CONVEX_URL)
    }

    // For server environments, use the HTTP client
    return new ConvexHttpClient(CONVEX_URL)
  } catch (error) {
    logger.error('Failed to initialize Convex client', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// Initialize the client with proper configuration
export function initializeConvexClient() {
  const client = getConvexClient()

  // Set up error handling for browser environments
  if (typeof window !== 'undefined' && client instanceof ConvexReactClient) {
    // Log initial state
    const initialState = client.connectionState() as any
    logger.info(
      `Initial Convex connection state: ${JSON.stringify(initialState)}`,
    )

    // Use polling to monitor connection state changes
    let previousState = getSimplifiedState(client.connectionState() as any)
    const interval = setInterval(() => {
      const currentState = getSimplifiedState(client.connectionState() as any)
      if (currentState !== previousState) {
        if (currentState === 'disconnected' || currentState === 'connecting') {
          logger.warn(`Convex connection state changed: ${currentState}`)
        } else if (currentState === 'connected') {
          logger.info('Connected to Convex')
        } else if (currentState === 'failed') {
          logger.error('Failed to connect to Convex')
        }
        previousState = currentState
      }
    }, 2000)

    // Clean up interval on window unload
    window.addEventListener('beforeunload', () => {
      clearInterval(interval)
    })
  }

  return client
}

// Helper function to simplify connection state into a string
function getSimplifiedState(state: any): ConnectionStateValue {
  if (!state) {
    return 'disconnected'
  }

  if (state.isWebSocketConnected) {
    return 'connected'
  } else if (state.connectionRetries > 3) {
    return 'failed'
  } else if (state.connectionRetries > 0) {
    return 'connecting'
  } else {
    return 'disconnected'
  }
}

// Export the client creation function
export const useConvexClient = getConvexClient
