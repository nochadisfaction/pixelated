/**
 * Audit logging system
 * Provides HIPAA-compliant audit logging
 */

import type { Database } from '@/types/supabase'
import { createClient } from '@supabase/supabase-js'
import { generateUUID } from '../utils/ids'

// Define structured metadata types
export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: AuditMetadataValue }
  | AuditMetadataValue[]

export interface AuditMetadata {
  reason?: string
  ipAddress?: string
  userAgent?: string
  requiredRole?: string
  userRole?: string
  method?: string
  path?: string
  sessionId?: string
  [key: string]: unknown
}

export interface AuditResource {
  id: string
  type: string
}

// Define type for the database log record
export interface DbAuditLog {
  id: string
  user_id: string
  action: string
  resource_id: string
  resource_type: string
  metadata: AuditMetadata
  timestamp: Date
  ip_address?: string | null
  user_agent?: string | null
}

// Define audit log entry type
export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resource: AuditResource
  metadata: AuditMetadata
  timestamp: Date
}

// Determine if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production'

// Initialize Supabase client or use mock if not available
let supabase: any

// Check if environment variables are available
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// Log critical error in production if credentials are missing
if (isProduction && (!supabaseUrl || !supabaseKey)) {
  console.error(
    'CRITICAL: Missing Supabase credentials for audit logging in production',
  )
}

if (supabaseUrl && supabaseKey) {
  // Initialize real Supabase client
  supabase = createClient<Database>(supabaseUrl, supabaseKey)
} else {
  // Create a mock implementation for builds without Supabase credentials
  const message = isProduction
    ? 'CRITICAL: Using mock Supabase client for audit logging in production. This should never happen.'
    : 'Using mock Supabase client for audit logging in development. This should not be used in production.'

  console.warn(message)

  supabase = {
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

/**
 * Generate a unique ID for audit logs
 * This wrapper makes the function easier to mock in tests
 */
export function generateUniqueId(): string {
  return generateUUID()
}

/**
 * Create an audit log entry
 * @param entry Complete audit log entry object
 */
/**
 * Create an audit log entry
 * @param userId The ID of the user
 * @param action The action being audited
 * @param resource The resource identifier
 * @param metadata Additional metadata
 * @param request Optional request object containing headers
 */
export async function createAuditLog(
  entryOrUserId: AuditLogEntry | string,
  action?: string,
  resource?: string,
  metadata: AuditMetadata = {},
  request?: { headers: { get: (name: string) => string | null } },
): Promise<void> {
  try {
    // Add timestamp
    const timestamp = new Date()

    // Extract IP and user agent if request is provided
    let ip_address = null
    let user_agent = null
    if (request) {
      ip_address =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip')
      user_agent = request.headers.get('user-agent')
    }

    // Handle both function signatures
    if (typeof entryOrUserId === 'string') {
      // Called with individual parameters
      const userId = entryOrUserId

      // Insert the audit log entry
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId,
        action,
        resource_id: resource,
        resource_type: 'unknown',
        metadata,
        timestamp: timestamp.toISOString(),
        ip_address,
        user_agent,
      })

      if (error) {
        const errorMsg = `Error creating audit log: ${error.message}`
        console.error(errorMsg, { userId, action, resource })
        if (isProduction) {
          // In production, we should report this to an error monitoring service
          // reportErrorToMonitoring(errorMsg, { userId, action, resource })
        }
      }
    } else {
      // Called with entry object
      const entry = entryOrUserId

      // Insert the audit log entry
      const { error } = await supabase.from('audit_logs').insert({
        id: entry.id,
        user_id: entry.userId,
        action: entry.action,
        resource_id: entry.resource.id,
        resource_type: entry.resource.type,
        metadata: entry.metadata,
        timestamp: entry.timestamp.toISOString(),
      })

      if (error) {
        const errorMsg = `Error creating audit log: ${error.message}`
        console.error(errorMsg, { entry })
        if (isProduction) {
          // In production, we should report this to an error monitoring service
          // reportErrorToMonitoring(errorMsg, { entry })
        }
      }
    }
  } catch (error) {
    const errorMsg = `Exception in audit logging: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMsg)
    if (isProduction) {
      // In production, we should report this to an error monitoring service
      // reportErrorToMonitoring(errorMsg)
    }
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 100,
  offset = 0,
): Promise<AuditLogEntry[]> {
  try {
    // Get the audit logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting audit logs:', error)
      return []
    }

    // Transform the data to match our interface
    return (data || []).map((log: DbAuditLog) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      resource: {
        id: log.resource_id,
        type: log.resource_type,
      },
      metadata: log.metadata,
      timestamp: new Date(log.timestamp),
    }))
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return []
  }
}

/**
 * Get audit logs for a specific action
 */
export async function getActionAuditLogs(
  action: string,
  limit = 100,
  offset = 0,
): Promise<AuditLogEntry[]> {
  try {
    // Get the audit logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting audit logs:', error)
      return []
    }

    // Transform the data to match our interface
    return (data || []).map((log: DbAuditLog) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      resource: {
        id: log.resource_id,
        type: log.resource_type,
      },
      metadata: log.metadata,
      timestamp: new Date(log.timestamp),
    }))
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return []
  }
}

/**
 * Log an audit event with resource details
 */
export async function logAuditEvent(
  action: string,
  userId: string,
  resourceId: string,
  resourceType: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    id: generateUniqueId(),
    user_id: userId,
    action,
    resource_id: resourceId,
    resource_type: resourceType,
    metadata: details || {},
    timestamp: new Date().toISOString(),
  })

  if (error) {
    console.error('Error logging audit event:', error)
  }
}

/**
 * Creates an audit log entry
 */
export async function createResourceAuditLog(
  action: string,
  userId: string,
  resource: AuditResource,
  metadata: AuditMetadata,
): Promise<AuditLogEntry> {
  const timestamp = new Date()
  const id = generateUniqueId()

  const { error } = await supabase.from('audit_logs').insert({
    id,
    user_id: userId,
    action,
    resource_id: resource.id,
    resource_type: resource.type,
    metadata,
    timestamp: timestamp.toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`)
  }

  return {
    id,
    timestamp,
    action,
    userId,
    resource,
    metadata,
  }
}

/**
 * Gets audit logs for a specific user
 */
export async function getAuditLogsByUser(
  userId: string,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error getting user audit logs:', error)
    return []
  }

  return (data || []).map((log: DbAuditLog) => ({
    id: log.id,
    timestamp: new Date(log.timestamp),
    action: log.action,
    userId: log.user_id,
    resource: {
      id: log.resource_id,
      type: log.resource_type,
    },
    metadata: log.metadata,
  }))
}

/**
 * Gets all audit logs
 */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error getting audit logs:', error)
    return []
  }

  return (data || []).map((log: DbAuditLog) => ({
    id: log.id,
    timestamp: new Date(log.timestamp),
    action: log.action,
    userId: log.user_id,
    resource: {
      id: log.resource_id,
      type: log.resource_type,
    },
    metadata: log.metadata,
  }))
}
