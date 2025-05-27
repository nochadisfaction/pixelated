/// <reference types="astro/client" />

type EdgeLocals = import('@astrojs/vercel').EdgeLocals

interface ImportMetaEnv {
  readonly SITE_URL: string
  readonly PUBLIC_SITE_URL: string
  readonly DATABASE_URL: string
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals extends EdgeLocals {
    requestId?: string
    timestamp?: string
    user?: {
      id: string
      email: string
      name?: string
    }
    vercelEdge?: {
      country: string
      region: string
      ip: string
      isAuthPage: boolean
      userAgent: string
    }
  }
}
