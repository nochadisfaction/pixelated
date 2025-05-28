import { defineConfig } from 'vite'
import path from 'path'

// Import our custom plugins
import nodePolyfillPlugin from './src/plugins/vite-plugin-node-polyfill'
import nodeExcludePlugin from './src/plugins/vite-plugin-node-exclude'
import externalNodePlugin from './src/plugins/vite-plugin-external-node'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'
import middlewarePatchPlugin from './src/plugins/vite-plugin-middleware-patch'

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
      'node:process': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:crypto': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:path': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:fs': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:child_process': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:stream': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:util': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:events': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:os': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:http': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:https': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:zlib': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:net': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'node:tls': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'process': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'crypto': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'path': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'fs/promises': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'fs': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'child_process': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'stream': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'util': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'events': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'os': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'http': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'https': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'zlib': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'net': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
      'tls': path.resolve('./src/lib/polyfills/browser-polyfills.ts'),
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
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: [
        // Node.js built-ins with node: prefix
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:os',
        'node:http',
        'node:https',
        'node:util',
        'node:child_process',
        'node:diagnostics_channel',
        'node:worker_threads',
        'node:stream',
        'node:stream/web',
        'node:zlib',
        'node:net',
        'node:tls',
        'node:inspector',
        'node:readline',
        'node:events',
        'node:crypto',
        'node:buffer',
        'node:async_hooks',
        'node:process',
        // Standard Node.js built-ins
        'fs',
        'fs/promises',
        'path',
        'os',
        'http',
        'https',
        'util',
        'child_process',
        'diagnostics_channel',
        'worker_threads',
        'stream',
        'zlib',
        'net',
        'tls',
        'inspector',
        'readline',
        'events',
        'crypto',
        'buffer',
        'async_hooks',
        'process',
        // Third-party externals
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
        manualChunks: {
          // Fix circular dependency warnings by grouping related modules
          astroMiddleware: [
            'astro/dist/core/middleware/sequence',
            'astro/dist/core/middleware/index',
            'astro-internal:middleware'
          ],
          // Split vendor libraries into separate chunks
          react: ['react', 'react-dom', 'react/jsx-runtime'],
          // Split large visualization libraries
          three: [/three/, /OrbitControls/],
          chart: [/chart\.js/, /Line\.js$/, /generateCategoricalChart/],
          // Split large data processing modules
          fhe: [/fhe/],
          // Split large visualization components
          emotionViz: [
            /MultidimensionalEmotionChart/,
            /EmotionTemporalAnalysisChart/,
            /EmotionDimensionalAnalysis/,
            /EmotionProgressDemo/,
            /EmotionVisualization/
          ],
          // Split large UI components
          uiComponents: [
            /Particle/,
            /SwiperCarousel/,
            /TherapyChatSystem/
          ],
          // Dashboard components
          dashboards: [
            /AnalyticsDashboard/,
            /AuditLogDashboard/,
            /ConversionDashboard/,
            /TreatmentPlanManager/
          ],
          // Auth related code
          auth: [/useAuth/, /LoginForm/, /RegisterForm/],
          // Form components
          forms: [
            /Form/,
            /input/,
            /select/,
            /checkbox/,
            /button/,
            /label/,
            /slider/,
            /switch/
          ]
        }
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
      // Node.js built-ins with node: prefix
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:os',
      'node:http',
      'node:https',
      'node:util',
      'node:child_process',
      'node:diagnostics_channel',
      'node:worker_threads',
      'node:stream',
      'node:stream/web',
      'node:zlib',
      'node:net',
      'node:tls',
      'node:inspector',
      'node:readline',
      'node:events',
      'node:crypto',
      'node:buffer',
      'node:async_hooks',
      'node:process',
      // Standard Node.js built-ins
      'fs',
      'fs/promises',
      'path',
      'os',
      'http',
      'https',
      'util',
      'child_process',
      'diagnostics_channel',
      'worker_threads',
      'stream',
      'zlib',
      'net',
      'tls',
      'inspector',
      'readline',
      'events',
      'crypto',
      'buffer',
      'async_hooks',
      'process',
      // Third-party externals
      '@fastify/otel',
    ],
  },
})
