import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'
import { generateCspNonce } from './lib/middleware/csp';
import { sequence } from 'astro:middleware';

const isProtectedRoute = createRouteMatcher([
  '/api/clerk-protected-example(.*)',
])

const clerkAuthMiddleware = clerkMiddleware((auth, context) => {
  const { redirectToSignIn, userId } = auth()

  if (!userId && isProtectedRoute(context.request)) {
    // Add custom logic to run before redirecting
    return redirectToSignIn()
  }
})

export const onRequest = sequence(generateCspNonce, clerkAuthMiddleware);
