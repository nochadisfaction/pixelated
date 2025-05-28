# Admin Layout Architecture Guide

## Overview

This document outlines the admin layout architecture for the Pixelated project, explaining the relationship between different layout components and their usage.

Admin layouts provide a consistent structure for administrative pages, including navigation, authentication checks, and responsive design. The project is currently transitioning from React-based admin pages to Astro-based pages for improved performance.

## Layout Files

- **Primary Astro Admin Layout:** `src/components/admin/AdminLayout.astro`
- **Secondary Astro Admin Layout:** `src/layouts/AdminLayout.astro` (Legacy - to be consolidated)
- **React Admin Layout:** `src/components/layout/AdminLayout.tsx`
- **Migration Adapter:** `src/components/admin/AdminLayoutAdapter.tsx`

## Usage Guidelines

### Using Admin Layout in Astro Pages

```astro
---
import AdminLayout from '@/components/admin/AdminLayout.astro';
---

<AdminLayout activeItem="dashboard">
  <div>
    <!-- Your admin page content here -->
    <h1>Admin Dashboard</h1>
    <!-- More content... -->
  </div>
</AdminLayout>
```

### Using Admin Layout in React Pages

```tsx
import { AdminLayout } from '@/components/layout/AdminLayout';

const AdminPage = () => {
  return (
    <AdminLayout activeItem="dashboard">
      <div>
        {/* Your admin page content here */}
        <h1>Admin Dashboard</h1>
        {/* More content... */}
      </div>
    </AdminLayout>
  );
};

export default AdminPage;
```

## Migration Path

To migrate an admin page from React to Astro for improved performance:

1. Create a new Astro page in the corresponding location
2. Move the content from the React component to the Astro component
3. Replace `AdminLayout` import from React to Astro version
4. Use `<AdminLayout>` component as shown in the Astro example
5. Remove any client-side only functionality or move it to island components
6. Delete the React page after successful migration

## Navigation Items

The admin layout includes the following standard navigation items:

- Dashboard
- Users
- AI Performance
- Security
- DLP Rules
- Backup Security
- Audit Logs
- Settings

To add a new section to the navigation:

1. Update the navigation items array in `AdminLayout.astro`
2. Update the `activeItem` type in the Props interface
3. Update the corresponding navigation items in `AdminLayout.tsx`

## Active Item Handling

The admin layout highlights the currently active navigation item based on the `activeItem` prop. When creating a new admin page, ensure you pass the correct `activeItem` value to identify the current section.

```astro
<AdminLayout activeItem="dlp">
  <!-- DLP related content -->
</AdminLayout>
```

## Authentication

Both admin layouts include a check to ensure the user is authenticated and has admin privileges. The React version uses the `withAdminAuth` higher-order component for this purpose.

If a user without proper permissions attempts to access an admin page, they will be redirected to the login page.

## Implementation Progress

### Completed (100%)
- ✅ Created consistent React AdminLayout component
- ✅ Updated Astro AdminLayout with accessibility features
- ✅ Added transition support for smooth page navigation
- ✅ Created AdminLayoutAdapter for migration support
- ✅ Added clear documentation and migration path
- ✅ Migrated DLP page from React to Astro

### In Progress
- ⏳ Migrating Backup Security page from React to Astro
- ⏳ Cleaning up duplicate AdminLayout in `/src/layouts/AdminLayout.astro`
- ⏳ Updating import paths in all admin pages

### Future Tasks
- 📋 Complete migration of all admin pages to Astro
- 📋 Implement dynamic navigation based on user permissions
- 📋 Add breadcrumb navigation for improved UX
- 📋 Enhance mobile responsiveness for complex admin interfaces

## Future Improvements

Potential improvements to the admin layout system:

1. Complete migration from React to Astro for all admin pages
2. Implement dynamic navigation based on user roles and permissions
3. Add breadcrumb navigation for better user orientation
4. Enhance mobile responsiveness for complex admin interfaces
5. Implement lazy loading for admin page sections to improve performance
6. Add search functionality within the admin area
