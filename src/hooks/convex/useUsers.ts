import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/generated/api'
import type { Id } from '../../../convex/generated/dataModel'

export type UserRole = 'therapist' | 'client' | 'admin'
export type ThemePreference = 'light' | 'dark' | 'system'

export interface UserSettings {
  theme?: ThemePreference
  notifications?: boolean
  timezone?: string
}

export interface User {
  _id: Id<'users'>
  name: string
  email: string
  avatar?: string
  lastSeen?: number
  role: UserRole
  settings?: UserSettings
}

export function useUsers(role?: UserRole, search?: string) {
  return useQuery(api.users.list, { role, search })
}

export function useUserByEmail(email: string) {
  return useQuery(api.users.getByEmail, { email })
}

export function useCreateUser() {
  return useMutation(api.users.create)
}

export function useUpdateUser() {
  return useMutation(api.users.update)
}

export function useUpdateLastSeen() {
  return useMutation(api.users.updateLastSeen)
}
