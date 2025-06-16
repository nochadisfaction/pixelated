/**
 * Vite plugin to fix circular dependency issues with Astro middleware
 * This resolves the warning about sequence export causing circular dependencies
 */
export default function middlewarePatchPlugin() {
  return {
    name: 'vite-plugin-middleware-patch',
    enforce: 'pre',
    resolveId(id, importer) {
      // Intercept imports to astro:middleware and astro-internal:middleware
      if (id === 'astro:middleware' || id === 'astro-internal:middleware') {
        return 'virtual:patched-middleware'
      }

      // Also handle direct imports to sequence module to prevent circular deps
      if (id.includes('astro/dist/core/middleware/sequence')) {
        return 'virtual:sequence-module'
      }

      return null
    },
    load(id) {
      if (id === 'virtual:patched-middleware') {
        // Provide a clean export of middleware functions without circular dependencies
        return `
          // Import sequence function directly to avoid circular dependencies
          import { sequence } from 'virtual:sequence-module';

          // Re-export the sequence function
          export { sequence };

          // Export defineMiddleware function
          export function defineMiddleware(fn) {
            return fn;
          }

          // Export other commonly used middleware utilities
          export function createContext(request, params = {}) {
            return {
              request,
              params,
              url: new URL(request.url),
              locals: {}
            };
          }
        `
      }

      if (id === 'virtual:sequence-module') {
        // Provide a standalone sequence implementation
        return `
          // Standalone sequence implementation to avoid circular dependencies
          export function sequence(...handlers) {
            return async function sequenceHandler(context, next) {
              let index = 0;

              async function dispatch(i) {
                if (i <= index) return Promise.reject(new Error('next() called multiple times'));
                index = i;

                let fn = handlers[i];
                if (i === handlers.length) fn = next;
                if (!fn) return;

                try {
                  return await fn(context, dispatch.bind(null, i + 1));
                } catch (err) {
                  return Promise.reject(err);
                }
              }

              return dispatch(0);
            };
          }
        `
      }

      return null
    },
  }
}
