import type { APIContext, APIRoute } from 'astro'
import type { AuthRole } from '../../config/auth.config'
import type { AuthUser } from './types'

/**
 * Extended APIContext with auth user information added by protectRoute
 */
export interface AuthAPIContext<
  Props extends Record<string, any> = Record<string, any>,
  Params extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
> extends APIContext<Props, Params> {
  locals: {
    user: AuthUser
    [key: string]: unknown
  }
}

/**
 * Protected API route handler function with typed auth context
 * The return type is widened to be compatible with Astro's APIRoute
 */
export type ProtectedAPIRoute<
  Props extends Record<string, any> = Record<string, any>,
  Params extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
> = (context: AuthAPIContext<Props, Params>) => Response | Promise<Response>

/**
 * Options for protecting an API route
 */
export interface ProtectRouteOptions {
  requiredRole?: AuthRole
  validateIPMatch?: boolean
  validateUserAgent?: boolean
}

/**
 * Utility type to help convert AuthAPIContext to APIContext
 * This handles the structural typing compatibility issue
 */
export type APIContextConverter<
  Props extends Record<string, any> = Record<string, any>,
  Params extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
> = (context: APIContext<Props, Params>) => AuthAPIContext<Props, Params>

/**
 * Higher-order function to apply protection to an API route
 * This typing makes protectRoute return a valid APIRoute
 */
export type ProtectRouteFunction = <
  Props extends Record<string, any> = Record<string, any>,
  Params extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
>(
  options: ProtectRouteOptions,
) => (
  handler: (
    context: AuthAPIContext<Props, Params>,
  ) => Response | Promise<Response>,
) => APIRoute
