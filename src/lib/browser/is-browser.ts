/**
 * Simple utility to detect browser environment
 */

export const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined'

export default isBrowser
