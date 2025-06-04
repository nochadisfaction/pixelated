/**
 * Basic type definitions for the application
 */

// Background types for the layout
export type BgType =
  | 'default'
  | 'plum'
  | 'gradient'
  | 'pulse'
  | 'light'
  | 'dark'
  | 'stars'
  | 'dot'
  | 'rose'
  | 'particle'
  | 'animated'

// Navigation bar layout
export type NavBarLayout = {
  left: string[]
  right: string[]
  mergeOnMobile?: boolean
}

// Navigation item
export type NavItem = {
  name: string
  link: string
  icon?: string
  desc?: string
}

// For type compatibility
export type InternalNav = NavItem
export type SocialLink = NavItem

// Define re-exports from other type files
export * from './auth'
export * from './chat'
export * from './user'
