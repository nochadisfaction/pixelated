import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/generated/api'
import type { Id } from '../../../convex/generated/dataModel'

export type AnalyticsAction =
  | 'session_start'
  | 'session_end'
  | 'message_sent'
  | 'assessment_created'
  | 'assessment_updated'
  | 'exercise_completed'
  | 'resource_accessed'
  | 'custom'

export interface AnalyticsMetadata {
  duration?: number
  messageId?: Id<'messages'>
  assessmentId?: Id<'assessments'>
  exerciseId?: string
  resourceUrl?: string
  custom_data?: Record<string, any>
}

export interface AnalyticsEvent {
  _id: Id<'analytics'>
  userId: Id<'users'>
  sessionId?: Id<'sessions'>
  action: AnalyticsAction
  metadata?: AnalyticsMetadata
  timestamp: number
}

export interface AnalyticsStats {
  total_events: number
  events_by_action: Record<string, number>
  average_session_duration: number
  total_messages: number
  total_assessments: number
  total_exercises: number
  total_resources: number
}

export interface AnalyticsQueryOptions {
  userId?: Id<'users'>
  sessionId?: Id<'sessions'>
  action?: AnalyticsAction
  startAfter?: number
  startBefore?: number
  limit?: number
  cursor?: string
}

export function useAnalyticsEvents(options: AnalyticsQueryOptions = {}) {
  return useQuery(api.analytics.list, options)
}

export function useTrackEvent() {
  return useMutation(api.analytics.track)
}

export function useAnalyticsStats(options: {
  userId?: Id<'users'>
  sessionId?: Id<'sessions'>
  startAfter?: number
  startBefore?: number
}) {
  return useQuery(api.analytics.getStats, options)
}

// Helper hooks for common analytics scenarios
export function useUserAnalytics(userId: Id<'users'>, days = 30) {
  const startAfter = Date.now() - days * 24 * 60 * 60 * 1000
  return useQuery(api.analytics.getStats, { userId, startAfter })
}

export function useSessionAnalytics(sessionId: Id<'sessions'>) {
  return useQuery(api.analytics.getStats, { sessionId })
}

// Utility hook for tracking events with proper typing
export function useEventTracker() {
  const trackEvent = useTrackEvent()

  return {
    trackSessionStart: (userId: Id<'users'>, sessionId: Id<'sessions'>) =>
      trackEvent({ userId, sessionId, action: 'session_start' }),

    trackSessionEnd: (
      userId: Id<'users'>,
      sessionId: Id<'sessions'>,
      duration: number,
    ) =>
      trackEvent({
        userId,
        sessionId,
        action: 'session_end',
        metadata: { duration },
      }),

    trackMessageSent: (
      userId: Id<'users'>,
      sessionId: Id<'sessions'>,
      messageId: Id<'messages'>,
    ) =>
      trackEvent({
        userId,
        sessionId,
        action: 'message_sent',
        metadata: { messageId },
      }),

    trackAssessment: (
      userId: Id<'users'>,
      sessionId: Id<'sessions'>,
      assessmentId: Id<'assessments'>,
      isUpdate = false,
    ) =>
      trackEvent({
        userId,
        sessionId,
        action: isUpdate ? 'assessment_updated' : 'assessment_created',
        metadata: { assessmentId },
      }),

    trackExercise: (
      userId: Id<'users'>,
      sessionId: Id<'sessions'>,
      exerciseId: string,
    ) =>
      trackEvent({
        userId,
        sessionId,
        action: 'exercise_completed',
        metadata: { exerciseId },
      }),

    trackResource: (
      userId: Id<'users'>,
      sessionId: Id<'sessions'>,
      resourceUrl: string,
    ) =>
      trackEvent({
        userId,
        sessionId,
        action: 'resource_accessed',
        metadata: { resourceUrl },
      }),
  }
}
