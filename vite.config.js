import { defineConfig } from 'vite'
import path from 'path'

// Import our custom plugins
import nodePolyfillPlugin from './src/plugins/vite-plugin-node-polyfill'
import nodeExcludePlugin from './src/plugins/vite-plugin-node-exclude'
import externalNodePlugin from './src/plugins/vite-plugin-external-node'

export default defineConfig({
  plugins: [
    // Apply our custom plugins
    nodePolyfillPlugin(),
    nodeExcludePlugin(),
    externalNodePlugin(),
    flexsearchSSRPlugin(),
    middlewarePatchPlugin(),
  ],
  resolve: {
    alias: {
      // Add aliases for Node.js built-in modules - use a single shim file
      'node:stream': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:zlib': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:util': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:os': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:path': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:fs': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:child_process': path.resolve(
        __dirname,
        'src/lib/polyfills/node-shims.js',
      ),
      'node:http': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:https': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:crypto': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:net': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:tls': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:events': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
      'node:inspector': path.resolve(
        __dirname,
        'src/lib/polyfills/node-shims.js',
      ),
      'node:worker_threads': path.resolve(
        __dirname,
        'src/lib/polyfills/node-shims.js',
      ),
      'node:diagnostics_channel': path.resolve(
        __dirname,
        'src/lib/polyfills/node-shims.js',
      ),
      'node:readline': path.resolve(
        __dirname,
        'src/lib/polyfills/node-shims.js',
      ),
      'fsevents': path.resolve(__dirname, 'src/lib/polyfills/node-shims.js'),
    },
    conditions: ['node', 'import', 'module', 'default'],
  },
  build: {
    target: 'node22',
    minify: false, // Disable minification for easier debugging
    emptyOutDir: false, // Don't empty the output directory
    sourcemap: true, // Generate sourcemaps for debugging
    ssr: {
      external: ['@fastify/otel'],
    },
    rollupOptions: {
      external: [
        'node:fs',
        'node:path',
        'node:os',
        'node:http',
        'node:https',
        'node:util',
        'node:child_process',
        'node:diagnostics_channel',
        'node:worker_threads',
        'node:stream',
        'node:zlib',
        'node:net',
        'node:tls',
        'node:inspector',
        'node:readline',
        'node:events',
        'node:crypto',
        '@fastify/otel',
      ],
      output: {
        format: 'esm',
        // Ensure Node.js environment
        intro: `
          // Polyfill Node.js globals
          if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
          }
          if (typeof Buffer === 'undefined') {
            globalThis.Buffer = { from: () => new Uint8Array() };
          }
        `,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      platform: 'node',
      target: 'node22',
      define: {
        'process.env.BUILDING_FOR_VERCEL': JSON.stringify('1'),
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV || 'development',
        ),
      },
    },
    exclude: ['@fastify/otel'],
  },
  ssr: {
    target: 'node',
    optimizeDeps: {
      disabled: false,
    },
    external: [
      'node:fs',
      'node:path',
      'node:os',
      'node:http',
      'node:https',
      'node:util',
      'node:child_process',
      'node:diagnostics_channel',
      'node:worker_threads',
      'node:stream',
      'node:zlib',
      'node:net',
      'node:tls',
      'node:inspector',
      'node:readline',
      'node:events',
      'node:crypto',
      '@fastify/otel',
    ],
  },
})
