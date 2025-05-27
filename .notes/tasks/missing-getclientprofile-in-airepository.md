---
title: "Missing getClientProfile in AIRepository"
status: "todo"
priority: "high"
date: "2025-05-17" # Assuming current date based on roadmap update
assignee: ""
blockers: []
---

## Issue Description

The `PersonalizationServiceImpl` (in `src/lib/ai/services/PersonalizationServiceImpl.ts`) expects the `AIRepository` (from `src/lib/db/ai/repository.ts`) to have a method `getClientProfile(clientId: string)`. This method is supposed to return a `ClientProfile` object, which includes `history.pastTechniques` – vital for comprehensive session history integration.

However, the actual `AIRepository` class in `src/lib/db/ai/repository.ts` currently **does not** implement this `getClientProfile` method.

## Location

- Missing method in: `src/lib/db/ai/repository.ts` (class `AIRepository`)
- Expected by: `src/lib/ai/services/PersonalizationServiceImpl.ts` (via `ExtendedAIRepository` interface and casting)

## Potential Impact

- Inability to fetch `pastTechniques` history for clients.
- Blocks full implementation of "Session history integration" for `ContextManager`.
- Affects personalization features that rely on detailed client history and preferences.

## Suggested Action

Implement the `getClientProfile(clientId: string): Promise<ClientProfile | null>` method in `src/lib/db/ai/repository.ts`. This will likely involve:
1. Defining how client profiles (preferences, characteristics, history of techniques) are stored in the Supabase database (e.g., a new table `client_profiles` or extending existing user/client tables).
2. Writing the Supabase query to fetch this data.
3. Mapping the database result to the `ClientProfile` interface structure (defined in `PersonalizationServiceImpl.ts`).

## Priority

High – This is a foundational piece for several AI personalization and contextual awareness features. 