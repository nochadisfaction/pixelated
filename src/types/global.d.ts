/// <reference types="vitest/globals" />
/// <reference types="vite/client" />

/**
 * Global type definitions to resolve conflicts between testing libraries
 */

// Declare global testing variables with correct types
// This helps resolve conflicts between Vitest and Mocha
declare global {
  // Use Vitest's types for these globals
  const describe: vi.Describe
  const test: vi.It
  const it: vi.It
  const expect: vi.Expect
  const beforeEach: vi.Lifecycle
  const afterEach: vi.Lifecycle
  const beforeAll: vi.Lifecycle
  const afterAll: vi.Lifecycle
  const xdescribe: vi.Describe
  const xit: vi.It

  // Add any other globals that might have conflicts
  namespace NodeJS {
    interface Global {
      document: Document
      window: Window
      navigator: Navigator
    }
  }

  namespace Vi {
    interface Assertion<T = any> {
      toHaveNoViolations(): Promise<void>
      // DOM testing matchers
      toBeInTheDocument(): void
      toHaveAttribute(attr: string, value?: string): void
      toHaveClass(...classNames: string[]): void
    }
  }

  interface Window {
    ResizeObserver: typeof ResizeObserver
    IntersectionObserver: typeof IntersectionObserver
  }

  // Add any other global types needed

  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
  }

  // Enhanced global type utilities for strict typing
  type StrictNonNullable<T> = T extends null | undefined ? never : T
  type Exact<T> = T & Record<Exclude<keyof T, keyof T>, never>
  type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>
}

export {}
