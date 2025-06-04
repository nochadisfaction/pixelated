---
title: 'Convex Integration'
description: 'Real-time data syncing with Convex'
pubDate: '2025-03-29'
author: 'Pixelated Empathy Team'
order: '6'
draft: false
toc: true
share: true
sidebar: ''
---

import { Steps } from '@/components/ui/steps'
import { Callout } from '@/components/ui/callout'

## Convex Integration

Pixelated Empathy uses [Convex](https://convex.dev) for real-time data synchronization and
backend functionality. This enables real-time collaborative features and ensures data is
always up-to-date across devices without complex state management.

## Overview

Convex is a backend platform that combines a database, backend functions, and
real-time data synchronization in one solution. Here's how we use it:

- **Real-time data sync**: Automatic updates across clients
- **Backend functions**: Server-side logic for data operations
- **Database**: Structured data storage with schema validation
- **Authentication**: Secure access control
- **TypeScript support**: End-to-end type safety

<Callout type="info">
  Convex handles real-time data sync automatically. You don't need to write any
  special code to keep data in sync across clients.
</Callout>

## Setting up Convex

<Steps>
  ### Install the Convex package

```bash
pnpm add convex
```

### Configure environment variables

Add your Convex deployment URL to your environment variables:

```bash
# .env.local
CONVEX_URL=https://your-deployment-id.convex.cloud
```

### Initialize Convex

Create a basic schema in the `convex` directory:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  messages: defineTable({
    text: v.string(),
    author: v.string(),
    timestamp: v.number(),
  }),
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    lastSeen: v.optional(v.number()),
  }),
})
```

### Create a Convex provider

We've created a ConvexProvider component that wraps the Convex client:

```tsx
// src/lib/providers/ConvexProvider.tsx
import type { ReactNode } from 'react'
import { getEnv } from '@/config/env.config'
import {
  ConvexProvider as BaseConvexProvider,
  ConvexReactClient,
} from 'convex/react'

const convex = new ConvexReactClient(getEnv().CONVEX_URL || '')

export function ConvexProvider({ children, initialState }) {
  return (
    <BaseConvexProvider client={convex} initialState={initialState}>
      {children}
    </BaseConvexProvider>
  )
}
```

</Steps>

## Using Convex in Components

We've created custom hooks to simplify Convex integration in components:

```tsx
// src/lib/hooks/useConvex.ts
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/generated/api'

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
```

### Example Component

Here's a simple example of using Convex in a component:

```tsx
import { useMessages } from '@/lib/hooks/useConvex'
import { withConvex } from '@/lib/providers/ConvexProvider'

function MessagesComponent() {
  const { messages, sendMessage } = useMessages()

  // Display messages and handle sending new ones
  return (
    <div>
      {messages?.map((message) => (
        <div key={message._id}>
          <strong>{message.author}</strong>: {message.text}
        </div>
      ))}

      <button
        onClick={() =>
          sendMessage({
            text: 'Hello from Convex!',
            author: 'Example User',
          })
        }
      >
        Send Message
      </button>
    </div>
  )
}

// Wrap component with Convex provider
export default withConvex(MessagesComponent)
```

## Authentication

For secure data access, Convex supports various authentication methods. We currently use a
simple approach, but plan to implement more robust authentication in the future.

<Callout type="warning">
  Always validate user permissions in your Convex functions to ensure data
  security.
</Callout>

## Deployment

To deploy your Convex functions:

1. Install the Convex CLI: `pnpm install -g convex`
2. Login to Convex: `npx convex login`
3. Initialize a new project: `npx convex init`
4. Deploy your functions: `npx convex deploy`

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [React Integration Guide](https://docs.convex.dev/react)
- [Convex Data Modeling](https://docs.convex.dev/database/schemas)
- [Authentication Guide](https://docs.convex.dev/auth)
