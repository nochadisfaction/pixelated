import { customMatchers } from './test-utils'
import type { RedisErrorCode } from '../types'

// Extend Vitest's expect with custom matchers
// Make sure this is called exactly once
expect.extend(customMatchers)

// Augment the global scope with custom matcher types
declare global {
  namespace Vi {
    interface Assertion {
      toBeRedisError(expectedCode: RedisErrorCode): void
      toBeInRedis(expectedValue: unknown): Promise<void>
      toExistInRedis(): Promise<void>
      toHaveTTL(expectedTTL: number): Promise<void>
    }
    // Ensure we're not accidentally using JestAssertion
    type AsymmetricMatchersContaining = Assertion
  }
}

export {}
