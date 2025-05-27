import type { RequestContext } from '@vercel/edge'

// This is a specific middleware for Vercel Edge Functions
// It runs before your Astro middleware and can enhance Astro.locals
export default function ({
  request,
  context,
}: {
  request: Request
  context: RequestContext
}) {
  // Get the URL and pathname
  const url = new URL(request.url)
  const { pathname } = url

  // Check if this is an auth-related page
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/auth/')

  // You can use Vercel's Edge features like geolocation here
  const country = context.geo?.country || 'unknown'
  const region = context.geo?.region || 'unknown'

  // Return any data you want to add to Astro.locals
  return {
    vercelEdge: {
      country,
      region,
      ip: context.ip || '',
      isAuthPage,
      userAgent: request.headers.get('user-agent') || '',
    },
  }
}
