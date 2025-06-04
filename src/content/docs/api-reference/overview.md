---
title: "API Documentation"
description: "API Documentation documentation"
pubDate: 2024-01-15
author: "Pixelated Team"
tags: ["documentation"]
draft: false
toc: true
---

# API Documentation

This document provides an overview of the API endpoints available in the application, focusing on the Convex backend.

## Convex API Structure

Our Convex API is organized into several functional areas:

- **Auth**: User authentication and authorization
- **Messages**: Message sending and retrieval
- **Security**: Security event logging and monitoring
- **Users**: User management
- **Admin**: Admin-specific functionality

## Authentication

Authentication is handled through Convex's authentication system. Most endpoints require authentication.

### User Authentication Flow

1. User signs in with email/password or OAuth provider
2. Authentication token is stored in the client
3. Subsequent requests include the authentication token
4. Token is validated on each request

## Endpoints

### Auth API

```typescript
// Get the current user
auth.getCurrentUser({ }) => User | null

// Sign out the current user
auth.signOut({ }) => void
```

### Messages API

```typescript
// Send a message
messages.send({ content: string, recipientId: string }) => MessageId

// Get messages for a conversation
messages.list({ conversationId: string, paginationOpts?: PaginationOpts })
  => PaginatedResult<Message>

// Mark messages as read
messages.markAsRead({ messageIds: string[] }) => void
```

### Security API

```typescript
// Get security events with optional filtering
security.getSecurityEvents({
  type?: string,
  severity?: 'critical' | 'high' | 'medium' | 'low'
}) => SecurityEvent[]

// Get security event statistics
security.getEventStats({ }) => SecurityStats
```

### Users API

```typescript
// Get user profile
users.getProfile({ userId: string }) => UserProfile

// Update user profile
users.updateProfile({
  name?: string,
  bio?: string,
  avatarUrl?: string
}) => UserProfile

// Search for users
users.search({ query: string }) => UserProfile[]
```

### Admin API

```typescript
// Get system metrics
admin.getSystemMetrics({ }) => SystemMetrics

// Get user analytics
admin.getUserAnalytics({ timeframe: 'day' | 'week' | 'month' }) => UserAnalytics

// Remove user account (admin only)
admin.removeUser({ userId: string }) => void
```

## Data Models

### User

```typescript
interface User {
  _id: Id<'users'>;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt: number;
}
```

### Message

```typescript
interface Message {
  _id: Id<'messages'>;
  content: string;
  senderId: Id<'users'>;
  recipientId: Id<'users'>;
  conversationId: string;
  read: boolean;
  createdAt: number;
}
```

### SecurityEvent

```typescript
interface SecurityEvent {
  _id: Id<'securityEvents'>;
  timestamp: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId?: Id<'users'>;
  ip?: string;
  metadata?: {
    details: string;
    source?: string;
    context?: string;
  };
}
```

### SystemMetrics

```typescript
interface SystemMetrics {
  activeUsers: number;
  activeSessions: number;
  sessionsToday: number;
  totalTherapists: number;
  totalClients: number;
  messagesSent: number;
  avgResponseTime: number;
  systemLoad: number;
  storageUsed: string;
  activeSecurityLevel: string;
}
```

## Working with Pagination

Many endpoints that return lists support pagination through the `PaginationOpts` parameter:

```typescript
interface PaginationOpts {
  numItems: number;  // Number of items per page
  cursor: string | null;  // Cursor for the next page
}

interface PaginatedResult<T> {
  page: T[];  // Current page of results
  isDone: boolean;  // Whether there are more results
  continueCursor: string | null;  // Cursor to use for the next page
}
```

Example usage:

```typescript
// First page
const firstPage = await convex.query(api.messages.list, {
  conversationId: "123",
  paginationOpts: { numItems: 20, cursor: null }
});

// Next page
if (!firstPage.isDone) {
  const secondPage = await convex.query(api.messages.list, {
    conversationId: "123",
    paginationOpts: { numItems: 20, cursor: firstPage.continueCursor }
  });
}
```

## Error Handling

API errors follow a standard format:

```typescript
interface ApiError {
  code: string;  // Error code (e.g., "not_found", "unauthorized")
  message: string;  // Human-readable error message
  details?: any;  // Additional error details
}
```

Common error codes:

- `unauthorized`: User is not authenticated
- `forbidden`: User does not have permission to perform the action
- `not_found`: Requested resource was not found
- `validation_error`: Request data failed validation
- `internal_error`: Server encountered an unexpected error

## Client Usage

### React Hooks

React components can use the provided hooks to interact with the API:

```jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/generated/api";

function MessagesComponent({ conversationId }) {
  // Query messages
  const messages = useQuery(api.messages.list, {
    conversationId,
    paginationOpts: { numItems: 20, cursor: null }
  });

  // Send message mutation
  const sendMessage = useMutation(api.messages.send);

  const handleSend = async (content) => {
    await sendMessage({ content, recipientId: "user123" });
  };

  return (
    <div>
      {messages?.page.map(message => (
        <div key={message._id}>{message.content}</div>
      ))}
      <button onClick={() => handleSend("Hello!")}>Send</button>
    </div>
  );
}
```

### Astro Components

Astro components can fetch data during server-side rendering:

```astro
---
import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/generated/api';

const client = await getConvexClient();
const messages = await client.query(api.messages.list, {
  conversationId: "123",
  paginationOpts: { numItems: 20, cursor: null }
});
---

<div>
  {messages.page.map(message => (
    <div>{message.content}</div>
  ))}
</div>
```

## Development

When developing new API endpoints:

1. Define your function in the appropriate file under `convex/`
2. Use the new function syntax with proper argument and return type validation
3. Add proper error handling and validation
4. Document the endpoint in this API documentation

For more details, see the [Convex Development Guide](./convex-development.md).
