/**
 * Type definitions for scheduler/tracing module
 * These definitions fix the React type dependency issues
 */
declare module 'scheduler/tracing' {
  export interface Interaction {
    readonly id: number
    readonly name: string
    readonly timestamp: number
  }

  export interface InteractionsRef {
    current: Set<Interaction>
  }

  export function unstable_clear(callback: Function): any
  export function unstable_getCurrent(): Set<Interaction>
  export function unstable_getThreadID(): number
  export function unstable_trace(
    name: string,
    timestamp: number,
    callback: Function,
    ...args: any[]
  ): any
  export function unstable_wrap(callback: Function): Function
}
