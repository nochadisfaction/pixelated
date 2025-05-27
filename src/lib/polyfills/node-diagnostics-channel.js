/**
 * Polyfill for node:diagnostics_channel module
 */

export function channel(name) {
  return {
    hasSubscribers: false,
    publish: () => false,
    subscribe: () => {},
    unsubscribe: () => {},
  }
}

export function subscribe(name, onMessage) {}
export function unsubscribe(name, onMessage) {}
export const tracingChannel = channel('tracing')

export default {
  channel,
  subscribe,
  unsubscribe,
  tracingChannel,
}
