import '@testing-library/dom'
import {
  TextEncoder as NodeTextEncoder,
  TextDecoder as NodeTextDecoder,
} from 'util'

// Add type declarations for DOM testing matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeInTheDocument(): T
      toHaveAttribute(attr: string, value?: string): T
      toHaveClass(...classNames: string[]): T
    }
  }
}

// Add custom DOM testing matchers
expect.extend({
  toBeInTheDocument(received: any) {
    const pass = received !== null && received !== undefined
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be in the document`
          : `Expected element to be in the document`,
    }
  },
  toHaveAttribute(received: any, attr: string, value?: string) {
    const hasAttr = received?.hasAttribute(attr)
    const attrValue = received?.getAttribute(attr)
    const pass = value !== undefined ? hasAttr && attrValue === value : hasAttr

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have attribute "${attr}"${value ? ` with value "${value}"` : ''}`
          : `Expected element to have attribute "${attr}"${value ? ` with value "${value}"` : ''}`,
    }
  },
  toHaveClass(received: any, ...classNames: string[]) {
    const classList = received?.classList
    const pass = classNames.every((className) => classList?.contains(className))

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have classes "${classNames.join(', ')}"`
          : `Expected element to have classes "${classNames.join(', ')}"`,
    }
  },
})

// Polyfill for TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = NodeTextEncoder as typeof global.TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = NodeTextDecoder as unknown as typeof global.TextDecoder
}

// Mock ResizeObserver
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  callback: IntersectionObserverCallback
  root: Element | Document | null = null
  rootMargin: string = '0px'
  thresholds: ReadonlyArray<number> = [0]
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

// Setup global mocks
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
global.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi
  .fn()
  .mockImplementation((cb: FrameRequestCallback) => setTimeout(cb, 0))
global.cancelAnimationFrame = vi
  .fn()
  .mockImplementation((id: number) => clearTimeout(id))

// Mock crypto for FHE operations
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      return arr.map(() => Math.floor(Math.random() * 256))
    },
    subtle: {
      generateKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
})

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

// Clean up after each test
afterEach(() => {
  vi.clearAllTimers()
})
