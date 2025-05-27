import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/generated/api'

/**
 * Hook for accessing Convex message functionality
 */
export function useMessages() {
  const messages = useQuery(api.messages.list)
  const sendMessage = useMutation(api.messages.send)
  const deleteMessage = useMutation(api.messages.remove)

  return {
    messages,
    sendMessage,
    deleteMessage,
  }
}

/**
 * Hook for accessing Convex user functionality
 */
export function useUsers() {
  const users = useQuery(api.users.list)
  const upsertUser = useMutation(api.users.upsert)
  const getUserByEmail = (email: string) =>
    useQuery(api.users.getByEmail, { email })

  return {
    users,
    upsertUser,
    getUserByEmail,
  }
}
