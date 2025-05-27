// Define the RequestContext interface inline instead of importing it
interface RequestContext {
  geo?: {
    city?: string
    country?: string
    region?: string
  }
  ip?: string
  [key: string]: any
}

export interface VercelRequestContext extends RequestContext {
  geo?: {
    city?: string
    country?: string
    region?: string
  }
  ip?: string
}

export default function ({ context }: { context: VercelRequestContext }) {
  // Get the user's IP address using Vercel's Edge helpers
  const { ip } = context

  // Get geolocation data
  const geo = context.geo ?? {
    city: undefined,
    country: undefined,
    region: undefined,
  }

  // Return data to be available in Astro.locals
  return {
    vercel: {
      edge: context,
      ip,
      geo,
    },
    // Add any other data you want available in Astro.locals
    timestamp: new Date().toISOString(),
  }
}
