import type { ReactNode } from 'react'
import { getEnv } from '@/config/env.config'
import {
  ConvexProvider as BaseConvexProvider,
  ConvexReactClient,
} from 'convex/react'

/**
 * Configuration for the Convex client
 */
const convex = new ConvexReactClient(getEnv().CONVEX_URL || '')

interface ConvexProviderProps {
  children: ReactNode
  /**
   * Optional initial state to hydrate the provider
   */
  initialState?: Record<string, unknown>
}

/**
 * Wrapper component for Convex provider that handles SSR and hydration
 * @param props Provider props including children and optional initial state
 */
export function ConvexProvider({
  children,
  initialState,
}: ConvexProviderProps) {
  return (
    <BaseConvexProvider client={convex} initialState={initialState}>
      {children}
    </BaseConvexProvider>
  )
}

/**
 * HOC to wrap components that need Convex access
 * @param Component Component to wrap with Convex provider
 */
export function withConvex<T extends object>(
  Component: React.ComponentType<T>,
): React.FC<T> {
  return function WithConvexWrapper(props: T) {
    return (
      <ConvexProvider>
        <Component {...props} />
      </ConvexProvider>
    )
  }
}

// Export the client for direct usage if needed
// Export the client for direct usage if needed
export { convex, ConvexReactClient }
