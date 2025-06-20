import type { AstroCookies } from 'astro'
import type { AuthRole } from '../config/auth.config'
import type { AuditMetadata } from './audit/types'
import { authConfig, hasRolePrivilege } from '../config/auth.config'
import {
  createHIPAACompliantAuditLog,
  AuditEventType,
  AuditEventStatus,
  AuditDetails,
} from './audit'
import { supabase } from './supabase'
// Note: This is an Astro project, Next.js types are not needed here
// TODO: Replace with Astro-compatible types when implementing API auth

export interface AuthUser {
  id: string
  email: string
  role: AuthRole
  fullName?: string | null
  avatarUrl?: string | null
  lastLogin?: Date | null
  metadata?: Record<string, unknown>
}

/**
 * Get the current authenticated user from cookies
 */
export async function getCurrentUser(
  cookies: AstroCookies,
): Promise<AuthUser | null> {
  const accessToken = cookies.get(authConfig.cookies.accessToken)?.value
  const refreshToken = cookies.get(authConfig.cookies.refreshToken)?.value

  console.log(
    `Auth debug - tokens present: access=${!!accessToken}, refresh=${!!refreshToken}`,
  )

  if (!accessToken || !refreshToken) {
    console.log('Auth debug - missing tokens, returning null')
    return null
  }

  try {
    // Set the session using the tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error || !data?.user) {
      console.error('Session error:', error)
      console.log('Auth debug - session error or no user data')
      return null
    }

    // Get the user's profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    console.log(`Auth debug - user authenticated: ${data.user.id}`)

    // Return user with profile data
    return {
      id: data.user.id,
      email: data.user.email || '',
      role: (profileData?.role as AuthRole) || authConfig.roles.default,
      fullName: profileData?.full_name || data.user.user_metadata?.full_name,
      avatarUrl: profileData?.avatar_url || data.user.user_metadata?.avatar_url,
      lastLogin: profileData?.last_login
        ? new Date(profileData.last_login)
        : null,
      metadata: {
        ...data.user.user_metadata,
        ...profileData?.metadata,
      },
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(cookies: AstroCookies): Promise<boolean> {
  // Always return false in the browser context to prevent redirects
  if (typeof window !== 'undefined') {
    return false
  }

  // In server context, we can actually check authentication
  const accessToken = cookies.get(authConfig.cookies.accessToken)?.value
  const refreshToken = cookies.get(authConfig.cookies.refreshToken)?.value

  // If no tokens, not authenticated
  if (!accessToken || !refreshToken) {
    return false
  }

  try {
    // For now, just having valid tokens is enough
    // In production, you'd validate the tokens
    return true
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Check if the user has the required role
 */
export async function hasRole(
  cookies: AstroCookies,
  requiredRole: AuthRole,
): Promise<boolean> {
  const user = await getCurrentUser(cookies)
  if (!user) {
    return false
  }

  return hasRolePrivilege(user.role, requiredRole)
}

/**
 * Log an audit event from auth module
 */
export async function createAuthAuditLog(entry: {
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: AuditMetadata
}): Promise<void> {
  try {
    await createHIPAACompliantAuditLog({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.metadata as AuditDetails | undefined,
      eventType: AuditEventType.SECURITY,
      status: AuditEventStatus.SUCCESS,
    })
  } catch (error) {
    console.error('Error logging auth audit event:', error)
  }
}

/**
 * Log an audit event using positional parameters
 */
export async function createAuditLogFromParams(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string | null,
  metadata?: AuditMetadata | null,
): Promise<void> {
  await createHIPAACompliantAuditLog({
    userId: userId || 'system',
    action,
    resource,
    resourceId: resourceId || undefined,
    details: (metadata as AuditDetails | undefined) || undefined,
    eventType: AuditEventType.SYSTEM,
    status: AuditEventStatus.SUCCESS,
  })
}

/**
 * Require authentication for a route
 */
export async function requireAuth({
  cookies,
  redirect,
  request,
}: {
  cookies: AstroCookies
  redirect: (url: string) => Response
  request: Request
}) {
  const user = await getCurrentUser(cookies)

  if (!user) {
    const loginUrl = new URL(authConfig.redirects.authRequired, request.url)
    loginUrl.searchParams.set('redirect', request.url)
    return redirect(loginUrl.toString())
  }

  return null
}

/**
 * Require a specific role for a route
 */
export async function requireRole({
  cookies,
  redirect,
  request,
  role,
}: {
  cookies: AstroCookies
  redirect: (url: string) => Response
  request: Request
  role: AuthRole
}) {
  const user = await getCurrentUser(cookies)

  if (!user) {
    const loginUrl = new URL(authConfig.redirects.authRequired, request.url)
    loginUrl.searchParams.set('redirect', request.url)
    return redirect(loginUrl.toString())
  }

  if (!hasRolePrivilege(user.role, role)) {
    return redirect(authConfig.redirects.forbidden)
  }

  return null
}

export class Auth {
  async verifySession(request: Request) {
    const cookies = this.getCookiesFromRequest(request)
    const user = await getCurrentUser(cookies)
    return user ? { userId: user.id } : null
  }

  private getCookiesFromRequest(request: Request): AstroCookies {
    // Convert Request headers to AstroCookies format
    const cookieHeader = request.headers.get('cookie') || ''
    return {
      get: (name: string) => {
        const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
        return match ? { value: match[1] } : undefined
      },
    } as AstroCookies
  }
}

export const auth = new Auth()

/**
 * Authenticate a Next.js API request
 * @param req Next.js API request
 * @param res Next.js API response
 * @param requiredRole Optional role to check
 * @returns Promise that resolves to user if authenticated, or null if not
 */
export async function authenticateRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRole?: AuthRole,
): Promise<AuthUser | null> {
  // Get the bearer token from the Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    return null
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' })
      return null
    }

    // Get the user's profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || '',
      role: (profileData?.role as AuthRole) || authConfig.roles.default,
      fullName: profileData?.full_name || data.user.user_metadata?.full_name,
      avatarUrl: profileData?.avatar_url || data.user.user_metadata?.avatar_url,
      lastLogin: profileData?.last_login
        ? new Date(profileData.last_login)
        : null,
      metadata: {
        ...data.user.user_metadata,
        ...profileData?.metadata,
      },
    }

    // Check if a specific role is required
    if (requiredRole && !hasRolePrivilege(user.role, requiredRole)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' })
      return null
    }

    return user
  } catch (error) {
    console.error('Authentication error:', error)
    res
      .status(500)
      .json({ error: 'Internal server error during authentication' })
    return null
  }
}
