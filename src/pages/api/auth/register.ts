import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase'

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData()
  const email = formData.get('email')?.toString()
  const password = formData.get('password')?.toString()
  const fullName = formData.get('fullName')?.toString()

  if (!email || !password) {
    return new Response('Email and password are required', { status: 400 })
  }

  try {
    // Register the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
        },
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(authError.message, { status: 500 })
    }

    // Create a profile for the user
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: fullName || null,
        role: 'user',
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Continue anyway, as the auth record was created
      }

      // Log the registration for HIPAA compliance
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: 'user_registered',
        resource: 'auth',
        resource_id: authData.user.id,
        metadata: {
          email: authData.user.email,
        },
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      })

      if (auditError) {
        console.error('Audit logging error:', auditError)
        // Continue anyway, as this is just logging
      }
    }

    // Redirect to sign in page
    return redirect('/signin?registered=true')
  } catch (error) {
    console.error('Registration error:', error)
    return new Response('An unexpected error occurred', { status: 500 })
  }
}
