// Global declarations for Vitest
declare module 'vitest' {
  export const describe: (name: string, fn: () => void) => void
  export const it: (name: string, fn: () => void) => void
  export const expect: any
  export const vi: {
    mock: (path: string, factory: () => any) => void
    fn: (implementation?: any) => any
    clearAllMocks: () => void
  }
  export const beforeEach: (fn: () => void) => void
  export const afterEach: (fn: () => void) => void
}
