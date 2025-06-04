import type { APIRoute } from 'astro'
import { AuthService } from '../../../services/auth.service'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse the request body to get the new password
    const { password } = await request.json()

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password must be at least 8 characters long',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Update the password using the AuthService
    await AuthService.updatePassword(password)

    // Clear the recovery cookies
    cookies.delete('auth_recovery_token')
    cookies.delete('auth_recovery_email')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password successfully updated',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error updating password:', error)

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to update password',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
