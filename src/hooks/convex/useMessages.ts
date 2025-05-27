import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/generated/api'
import type { Id } from '../../../convex/generated/dataModel'

export type MessageType =
  | 'text'
  | 'note'
  | 'assessment'
  | 'exercise'
  | 'resource'

export interface MessageMetadata {
  assessmentId?: Id<'assessments'>
  exerciseId?: string
  resourceUrl?: string
  tags?: string[]
}

export interface Message {
  _id: Id<'messages'>
  sessionId?: Id<'sessions'>
  senderId: Id<'users'>
  recipientId: Id<'users'>
  text: string
  type: MessageType
  timestamp: number
  metadata?: MessageMetadata
}

export interface MessageQueryOptions {
  sessionId?: Id<'sessions'>
  senderId?: Id<'users'>
  recipientId?: Id<'users'>
  type?: MessageType
  limit?: number
  cursor?: string
}

export function useMessages(options: MessageQueryOptions = {}) {
  return useQuery(api.messages.list, options)
}

export function useSendMessage() {
  return useMutation(api.messages.send)
}

export function useUpdateMessage() {
  return useMutation(api.messages.update)
}

export function useDeleteMessage() {
  return useMutation(api.messages.remove)
}

// Helper hook for conversation between two users
export function useConversation(
  user1Id: Id<'users'>,
  user2Id: Id<'users'>,
  limit = 50,
) {
  return useQuery(api.messages.list, {
    senderId: user1Id,
    recipientId: user2Id,
    limit,
  })
}

// Helper hook for session messages
export function useSessionMessages(sessionId: Id<'sessions'>, limit = 100) {
  return useQuery(api.messages.list, {
    sessionId,
    limit,
  })
}
