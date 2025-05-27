/**
 * Node.js polyfills for browser compatibility
 * This file ensures that Node.js-specific APIs like Buffer are
 * properly polyfilled in browser environments.
 */

// Import the Buffer class from the buffer package
import { Buffer as BufferClass } from 'buffer'

// Make Buffer available globally
if (typeof globalThis.Buffer === 'undefined') {
  // @ts-expect-error
  globalThis.Buffer = BufferClass
}

// Export the Buffer for use in other modules
export const Buffer = BufferClass

// Ensure process is available
if (typeof globalThis.process === 'undefined') {
  // @ts-expect-error
  globalThis.process = {
    env: {},
    version: '',
    versions: {},
    platform: '',
    argv: [],
    nextTick: (fn: Function, ...args: any[]) => {
      setTimeout(() => fn(...args), 0)
    },
  }
}

// Add other Node.js APIs as needed
export default {
  Buffer: BufferClass,
  // Export other polyfilled APIs if needed
}
