import type { APIRoute } from 'astro'
import { createAuditLog } from '../../../lib/audit/log.js'
import { supabase } from '../../../lib/supabase'

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Get the current user before signing out for audit logging
    const accessToken = cookies.get('sb-access-token')?.value
    const refreshToken = cookies.get('sb-refresh-token')?.value

    let userId = null
    if (accessToken && refreshToken) {
      try {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        userId = data?.user?.id
      } catch (error) {
        console.error('Error getting user session:', error)
        // Continue with signout event if we can't get the user ID
      }
    }

    // Sign out the user
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return new Response(error.message, { status: 500 })
    }

    // Clear cookies
    cookies.delete('sb-access-token', { path: '/' })
    cookies.delete('sb-refresh-token', { path: '/' })

    // Log the sign out for HIPAA compliance
    if (userId) {
      await createAuditLog({
        userId,
        action: 'auth.signout',
        resource: 'auth',
      })
    }

    return redirect('/signin?signedout=true')
  } catch (error) {
    console.error('Sign out error:', error)
    return new Response('An unexpected error occurred', { status: 500 })
  }
}
