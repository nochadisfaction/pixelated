import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.config'

// Define types for Supabase
export type SupabaseClient = ReturnType<typeof createClient>

// Define type for process.env structure
interface ProcessEnv {
  NODE_ENV?: string
  SUPABASE_URL?: string
  PUBLIC_SUPABASE_URL?: string
  VITE_SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  PUBLIC_SUPABASE_ANON_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  // Allow indexing with string for dynamic access in getEnvVar
  [key: string]: string | undefined
}

// Create isomorphic process reference
const processEnv = (
  typeof process !== 'undefined' ? process.env : {}
) as ProcessEnv
const NODE_ENV = processEnv.NODE_ENV || 'development'

// Default values for development (will be overridden by actual env vars if present)
const FALLBACK_SUPABASE_URL = 'https://example.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example'

// Determine if we're in a production environment
const isProduction = NODE_ENV === 'production'

// Helper to get environment variables with proper fallbacks
const getEnvVar = (key: string, fallback?: string) => {
  // Try all possible prefixes
  const variants = [
    key, // Regular
    `PUBLIC_${key}`, // Public prefix
    `VITE_${key}`, // Vite prefix
  ]

  // Server-side
  if (typeof window === 'undefined') {
    for (const variant of variants) {
      if (processEnv[variant]) {
        return processEnv[variant]
      }
    }
    return fallback
  }

  // Client-side
  for (const variant of variants) {
    if (env?.[variant as keyof typeof env]) {
      return env[variant as keyof typeof env]
    }
  }
  return fallback
}

// Get Supabase URL and key with appropriate fallbacks
const supabaseUrl = getEnvVar(
  'SUPABASE_URL',
  isProduction ? undefined : FALLBACK_SUPABASE_URL,
) as string

const supabaseAnonKey = getEnvVar(
  'SUPABASE_ANON_KEY',
  isProduction ? undefined : FALLBACK_ANON_KEY,
) as string

const supabaseServiceRole = processEnv.SUPABASE_SERVICE_ROLE_KEY as
  | string
  | undefined

// In production, ensure we have valid credentials
if (isProduction && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'CRITICAL: Missing Supabase credentials in production environment. ' +
      'Check for SUPABASE_URL/PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL and ' +
      'SUPABASE_ANON_KEY/PUBLIC_SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY',
  )
}

// Create mock Supabase client for builds without proper credentials
function createMockClient() {
  const message = isProduction
    ? 'CRITICAL: Using mock Supabase client in production. This should never happen.'
    : 'Using mock Supabase client for development. This should not be used in production.'

  console.warn(message)

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      select: () => ({
        eq: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }
}

// Check if we have valid Supabase URL and key
const hasValidCredentials =
  supabaseUrl &&
  supabaseUrl !== FALLBACK_SUPABASE_URL &&
  supabaseAnonKey &&
  supabaseAnonKey !== FALLBACK_ANON_KEY

// Create a Supabase client
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (createMockClient() as any)

// Create an admin client with service role (for server-side only!)
export const supabaseAdmin =
  hasValidCredentials && supabaseServiceRole
    ? createClient(supabaseUrl, supabaseServiceRole, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : (createMockClient() as any)

// Create a server client (from headers)
export function createServerClient(headers: Headers) {
  const cookies = headers.get('cookie') || ''

  return hasValidCredentials
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            cookie: cookies,
          },
        },
      })
    : (createMockClient() as any)
}

// Example PHI audit logging - uncomment and customize as needed
// logger.info('Accessing PHI data', {
//   userId: 'user-id-here',
//   action: 'read',
//   dataType: 'patient-record',
//   recordId: 'record-id-here'
// });
