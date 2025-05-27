import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

export type SessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface SessionMetrics {
  duration?: number
  engagement?: number
  progress?: number
  exercises_completed?: number
  custom_metrics?: Record<string, unknown>
}

export interface Session {
  _id: Id<'sessions'>
  clientId: Id<'users'>
  therapistId: Id<'users'>
  startTime: number
  endTime?: number
  status: SessionStatus
  notes?: string
  metrics?: SessionMetrics
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface SessionQueryOptions {
  clientId?: Id<'users'>
  therapistId?: Id<'users'>
  status?: SessionStatus
  startAfter?: number
  startBefore?: number
  limit?: number
  cursor?: string
}

export function useSessions(options: SessionQueryOptions = {}) {
  return useQuery(api.sessions.list, options)
}

export function useSession(sessionId: Id<'sessions'>) {
  return useQuery(api.sessions.getById, { sessionId })
}

export function useCreateSession() {
  return useMutation(api.sessions.create)
}

export function useUpdateSession() {
  return useMutation(api.sessions.update)
}

export function useCancelSession() {
  return useMutation(api.sessions.cancel)
}
