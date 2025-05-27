declare module '@vercel/edge' {
  export interface RequestContext {
    geo?: {
      city?: string
      country?: string
      region?: string
    }
    ip?: string
    [key: string]: any
  }
}
