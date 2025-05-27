// This file is a workaround to make Vitest globals available
// Export the globals from here to use in test files

// Import Buffer and other Node.js polyfills
import '../../../polyfills/node-polyfills'

export const { describe } = globalThis as any
export const { it } = globalThis as any
export const { expect } = globalThis as any
export const { vi } = globalThis as any
export const { beforeEach } = globalThis as any
export const { afterEach } = globalThis as any
