/**
 * Global setup for Vitest
 * This file is automatically loaded by Vitest before tests are run
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

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
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  expire: vi.fn().mockResolvedValue(1),
  ttl: vi.fn().mockResolvedValue(-1),
  keys: vi.fn().mockResolvedValue([]),
  flushall: vi.fn().mockResolvedValue('OK'),
  quit: vi.fn().mockResolvedValue('OK'),
  disconnect: vi.fn().mockResolvedValue(undefined),
}

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})) as any

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn()
global.URL.revokeObjectURL = vi.fn()

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
      return `mocked-test-uuid-${Math.random().toString(36).substring(2, 9)}`
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
  ;(global as Record<string, unknown>)['FHE'] = mockFHE

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
