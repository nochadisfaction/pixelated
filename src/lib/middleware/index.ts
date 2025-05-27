import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import { sequence } from 'astro:middleware'
import { corsMiddleware } from './cors'
import { csrfMiddleware } from './csrf'
import { loggingMiddleware } from './logging'

/**
 * Content Type middleware to ensure proper MIME types
 * This helps resolve issues with CSS files being served with incorrect MIME types
 */
const contentTypeMiddleware: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext,
) => {
  // Process the request first
  const response = await next()

  if (!response) {
    return response
  }

  const url = new URL(context.request.url)
  const path = url.pathname

  // Set correct content types based on file extensions
  if (path.endsWith('.css')) {
    response.headers.set('Content-Type', 'text/css; charset=utf-8')
  } else if (path.endsWith('.js')) {
    response.headers.set(
      'Content-Type',
      'application/javascript; charset=utf-8',
    )
  } else if (path.endsWith('.json')) {
    response.headers.set('Content-Type', 'application/json; charset=utf-8')
  } else if (path.endsWith('.svg')) {
    response.headers.set('Content-Type', 'image/svg+xml')
  } else if (path.endsWith('.png')) {
    response.headers.set('Content-Type', 'image/png')
  } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    response.headers.set('Content-Type', 'image/jpeg')
  } else if (path.endsWith('.webp')) {
    response.headers.set('Content-Type', 'image/webp')
  } else if (path.endsWith('.woff2')) {
    response.headers.set('Content-Type', 'font/woff2')
  } else if (path.endsWith('.woff')) {
    response.headers.set('Content-Type', 'font/woff')
  }

  return response
}

/**
 * Apply security headers to all responses
 * Based on best practices and penetration testing results
 */
const securityHeadersMiddleware: MiddlewareHandler = async (
  _context: APIContext,
  next: MiddlewareNext,
) => {
  // Process the request firs
  const response = await next()

  // Add security headers
  response?.headers.set('X-Content-Type-Options', 'nosniff')
  response?.headers.set('X-Frame-Options', 'DENY')
  response?.headers.set('X-XSS-Protection', '1; mode=block')
  response?.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  )
  response?.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response?.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  )

  // Set Content-Security-Policy
  response?.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://api.together.xyz; " +
      "img-src 'self' data: blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';",
  )

  return response
}

export interface ExtendedMiddleware extends MiddlewareHandler {
  (context: APIContext, next: MiddlewareNext): Promise<Response | undefined>
}

/**
 * Combined middleware sequence that applies our middleware in the correct order
 */
export const middlewareSequence = sequence(
  loggingMiddleware,
  corsMiddleware,
  csrfMiddleware,
  securityHeadersMiddleware,
  contentTypeMiddleware,
)
