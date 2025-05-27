import type { Database } from '../../types/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// Create mock client for builds
function createMockClient() {
  console.warn(
    'Using mock Supabase client in the client module. This should not be used in production.',
  )
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

// Use real client if credentials are available, otherwise use mock
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient<Database>(supabaseUrl, supabaseKey)
    : (createMockClient() as any)
