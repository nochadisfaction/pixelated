/**
 * Global setup for Vitest
 * This file is automatically loaded by Vitest before tests are run
 */

// Add TextEncoder/TextDecoder polyfills for Node.js environment
// This prevents "TextEncoder is not a constructor" errors
import { TextEncoder, TextDecoder } from 'util'
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  // Use type assertion to resolve Node.js/browser type incompatibility
  global.TextDecoder = TextDecoder as typeof global.TextDecoder
}

// Mock Redis client
export const mockRedisClient = {
  // Basic operations
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  ttl: vi.fn().mockResolvedValue(60),

  // List operations
  lpush: vi.fn().mockResolvedValue(1),
  rpush: vi.fn().mockResolvedValue(1),
  lpop: vi.fn().mockResolvedValue(null),
  rpop: vi.fn().mockResolvedValue(null),
  lrange: vi.fn().mockResolvedValue([]),
  rpoplpush: vi.fn().mockResolvedValue(null),

  // Hash operations
  hset: vi.fn().mockResolvedValue(1),
  hget: vi.fn().mockResolvedValue(null),
  hdel: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  hmset: vi.fn().mockResolvedValue('OK'),

  // Set operations
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),

  // Sorted set operations
  zadd: vi.fn().mockResolvedValue(1),
  zrangebyscore: vi.fn().mockResolvedValue([]),
  zremrangebyscore: vi.fn().mockResolvedValue(1),

  // Other operations
  incr: vi.fn().mockResolvedValue(1),
  decr: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),

  // Method chaining support
  on: vi.fn(function (this: unknown) {
    return this
  }),

  // Connection management
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue('OK'),
}

// Define custom matchers for arrays

// Define global expect type extensions
declare module 'vitest' {
  interface Assertion {
    toBeNull(): void
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toBeInstanceOf(expected: unknown): void
    toBeGreaterThanOrEqual(expected: number): void
    toBeLessThanOrEqual(expected: number): void
  }
  interface AsymmetricMatchersContaining {
    arrayContaining(expected: unknown[]): void
  }
}

// Extend expect with custom matchers
expect.extend({
  toBeNull: (received: unknown) => ({
    pass: received === null,
    message: () => `expected ${received} to be null`,
  }),
  toBe: (received: unknown, expected: unknown) => ({
    pass: Object.is(received, expected),
    message: () => `expected ${received} to be ${expected}`,
  }),
  toEqual: (received: unknown, expected: unknown) => ({
    pass: JSON.stringify(received) === JSON.stringify(expected),
    message: () => `expected ${received} to equal ${expected}`,
  }),
  toBeInstanceOf: (received: unknown, expected: unknown) => ({
    pass: received instanceof (expected as new (...args: unknown[]) => unknown),
    message: () => `expected ${received} to be an instance of ${expected}`,
  }),
  toBeGreaterThanOrEqual: (received: unknown, expected: unknown) => ({
    pass: (received as number) >= (expected as number),
    message: () =>
      `expected ${received} to be greater than or equal to ${expected}`,
  }),
  toBeLessThanOrEqual: (received: unknown, expected: unknown) => ({
    pass: (received as number) <= (expected as number),
    message: () =>
      `expected ${received} to be less than or equal to ${expected}`,
  }),
})

// Define arrayContaining helper for expect
expect.arrayContaining = (arr: unknown[]) => ({
  asymmetricMatch: (actual: unknown[]) => {
    return Array.isArray(actual) && arr.every((item) => actual.includes(item))
  },
  toString: () => `ArrayContaining(${JSON.stringify(arr)})`,
})

// Ensure we are in test environment
if (process.env.NODE_ENV !== 'test') {
  console.warn('Warning: Running vitest.setup.ts outside of test environment')
}

// Mock crypto for tests
function setupCryptoMocks() {
  // Add randomUUID to global crypto object
  if (!crypto.randomUUID) {
    Object.defineProperty(crypto, 'randomUUID', {
      value: () => {
        // Simple UUID v4 implementation for testing
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0,
              v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          },
        )
      },
      configurable: true,
      writable: true,
    })
  }

  // Ensure our utility is properly loaded in tests
  vi.mock('src/lib/utils/ids', () => ({
    generateUUID: vi.fn(() => {
      return 'mocked-test-uuid-' + Math.random().toString(36).substring(2, 9)
    }),
    generatePrefixedId: vi.fn((prefix: string) => {
      return `${prefix}-mocked-id-${Math.random().toString(36).substring(2, 9)}`
    }),
    generateTimestampId: vi.fn(() => {
      return `timestamp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
    }),
  }))
}

// Setup function to mock crypto for FHE tests
function setupFHEMocks() {
  // Mock implementation for FHE
  const mockFHE = {
    encrypt: vi.fn().mockImplementation((data: unknown) => `encrypted-${data}`),
    decrypt: vi
      .fn()
      .mockImplementation((data: string) => data.replace('encrypted-', '')),
    verifySender: vi.fn().mockReturnValue(true),
  }

  // Add to global scope if needed
  ;(global as Record<string, unknown>).FHE = mockFHE

  return mockFHE
}

// Global setup function
export async function setup() {
  // Setup global test environment here
  console.log('Setting up test environment')

  // Setup crypto mocks
  setupCryptoMocks()

  // Add mock implementations for FHE
  setupFHEMocks()

  // Mock global localStorage
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
    })
  }

  // Make vi.fn().mockImplementation available in all threads
  vi.mock('node:timers', () => ({
    setInterval: vi.fn(() => 999),
  }))

  // Patch ObjectContaining to work properly with comparison tests
  const originalObjectContaining = expect.objectContaining
  expect.objectContaining = (obj: Record<string, unknown>) => {
    const matcher = originalObjectContaining(obj)
    matcher.toString = () => `ObjectContaining(${JSON.stringify(obj)})`
    return matcher
  }
}

// Global teardown function
export async function teardown() {
  // Clean up test environment here
  console.log('Tearing down test environment')
}

export default {
  mockRedisClient,
  setup,
  teardown,
}
