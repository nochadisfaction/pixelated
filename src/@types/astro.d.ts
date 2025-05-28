/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    vercel?: {
      edge: {
        // Vercel Edge Runtime context
        requestId: string
        ip: string
        geo?: {
          city?: string
          country?: string
          region?: string
          latitude?: string
          longitude?: string
        }
        userAgent?: {
          browser: string
          os: string
          isMobile: boolean
        }
      }
    }
    // Request metadata
    timestamp: string
    requestId: string
    // Rate limiting
    rateLimit?: {
      limit: number
      remaining: number
      reset: number
    }
    // Auth context that will be passed to serverless functions
    auth?: {
      userId?: string
      role?: string
      session?: string
      organization?: string
    }
    // CSP nonce for Content Security Policy
    cspNonce?: string
  }
}
