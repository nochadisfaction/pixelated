import type { ReactNode } from 'react'
import React from 'react'

interface AdminLayoutAdapterProps {
  title?: string
  description?: string
  activeItem?: string
  children: ReactNode
}

/**
 * Admin Layout Adapter Component
 *
 * This adapter exists to make migration from React pages to Astro easier.
 * It provides a bridge between the React AdminLayout and Astro AdminLayout.
 *
 * Usage:
 * 1. In Astro files: import AdminLayout from '@/components/admin/AdminLayout.astro'
 * 2. In React files: import AdminLayout from '@/components/layout/AdminLayout'
 */
const AdminLayoutAdapter: React.FC<AdminLayoutAdapterProps> = ({
  _title,
  _description,
  _activeItem,
  children,
}) => {
  // This component simply passes props through to the relevant layout
  // Implementation details can be modified to suit the project's needs
  return <div id="admin-layout-adapter-root">{children}</div>
}

export default AdminLayoutAdapter
