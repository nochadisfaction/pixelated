export * from './middleware'
// Re-export session functions
export { createSession, endSession, getSession } from './session'

export type { SessionData } from './session'
// Export authentication types and middleware
export * from './types'

// Export server-side auth functionality
export {
  verifyServerAuth,
  protectRoute,
  requirePageAuth,
  trackSuspiciousActivity,
} from './serverAuth'
