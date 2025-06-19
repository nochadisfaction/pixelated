"use client"

import * as Sentry from "@sentry/browser"

// Prevent double-initialisation in development hot-reload
let sentryInitialised = false

if (!sentryInitialised) {
  Sentry.init({
    dsn: "https://ef4ca2c0d2530a95efb0ef55c168b661@sentry.io/PROJECT_ID",
    tracesSampleRate: 0.2,
  })
  sentryInitialised = true
}

export default function SentryInit() {
  return null // runs once on the client to bootstrap Sentry
}
