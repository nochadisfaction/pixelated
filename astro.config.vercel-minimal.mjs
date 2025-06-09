import path from 'node:path'
import vercel from '@astrojs/vercel'
import { defineConfig } from 'astro/config'

// Ultra-minimal configuration for Vercel deployment
// Designed to stay well under the 300MB serverless function limit
export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: 'error',
  
  adapter: vercel({
    isr: false,
    edgeMiddleware: false,
    includeFiles: [],
    excludeFiles: [
      // Exclude everything that's not absolutely essential
      '**/*.md',
      '**/*.mdx',
      '**/test/**/*',
      '**/__tests__/**/*',
      '**/*.test.*',
      '**/*.spec.*',
      '**/docs/**/*',
      '**/examples/**/*',
      '**/demos/**/*',
      '**/ai/**/*',
      '**/models/**/*',
      '**/performance-results/**/*',
      '**/test-results/**/*',
      '**/security-scan-artifacts/**/*',
      '**/secret-scan-artifacts/**/*',
      '**/reports/**/*',
      '**/memory/**/*',
      '**/patches/**/*',
      '**/fixes/**/*',
      '**/tests/**/*',
      '**/collections/**/*',
      '**/types/**/*',
      '**/supabase/**/*',
      '**/dbt-mcp/**/*',
      'public/css/**/*',
      'public/fonts/**/*',
      'public/js/**/*',
      'public/katex/**/*',
      'public/polyfills/**/*',
      'public/styles/**/*',
      'public/models/**/*',
      'public/test-results/**/*',
      'public/icons/**/*',
      'public/images/backgrounds/**/*',
      'public/images/features/**/*',
      'src/lib/ai/**/*',
      'src/components/three/**/*',
      'src/components/ui/charts/**/*',
      'src/components/admin/bias-detection/**/*',
      'src/components/ai/mental-llama/**/*',
      'src/components/dashboard/Multidimensional*',
      'src/components/session/Multidimensional*',
      'src/@types/**/*',
    ],
  }),
  
  // No integrations - keep it absolutely minimal
  integrations: [],
  
  vite: {
    resolve: {
      alias: {
        '~': path.resolve('./src'),
        '@': path.resolve('./src'),
      },
    },
    
    // Disable all optimizations
    optimizeDeps: {
      disabled: true,
      noDiscovery: true,
      include: [],
      exclude: ['**/*'],
    },
    
    build: {
      target: 'node18',
      minify: false,
      cssMinify: false,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 50000, // Increase warning threshold
      cssCodeSplit: false,
      rollupOptions: {
        // Externalize absolutely everything possible
        external: [
          // All Node.js built-ins
          'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib', 'stream',
          'child_process', 'os', 'util', 'net', 'tls', 'assert', 'buffer', 'events',
          'url', 'querystring', 'timers', 'cluster', 'dns', 'domain', 'inspector',
          'perf_hooks', 'punycode', 'readline', 'repl', 'string_decoder', 'tty',
          'v8', 'vm', 'worker_threads', 'async_hooks', 'diagnostics_channel', 'constants',
          
          // Node.js with node: prefix
          'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
          'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
          'node:util', 'node:net', 'node:tls', 'node:assert', 'node:buffer',
          'node:stream', 'node:stream/web', 'node:events', 'node:url', 'node:querystring',
          'node:timers', 'node:cluster', 'node:dns', 'node:domain', 'node:inspector',
          'node:perf_hooks', 'node:punycode', 'node:readline', 'node:repl',
          'node:string_decoder', 'node:tty', 'node:v8', 'node:vm', 'node:worker_threads',
          'node:async_hooks', 'node:diagnostics_channel', 'node:constants',
          
          // ALL large third-party packages
          'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime',
          '@astrojs/mdx', '@astrojs/react', '@unocss/astro',
          'flexsearch', 'flexsearch/dist/module/document',
          '@tensorflow/tfjs', '@tensorflow/tfjs-node', '@tensorflow/tfjs-layers',
          'sharp', 'canvas', 'puppeteer', 'playwright',
          'three', 'three-stdlib', '@react-three/fiber',
          'framer-motion', 'chart.js', 'react-chartjs-2',
          '@supabase/supabase-js', '@supabase/ssr',
          'convex', 'postgres', 'redis', 'ioredis', '@upstash/redis',
          'openai', '@ai-sdk/openai', 'ai', '@langchain/core', '@langchain/openai',
          'zod', 'nanoid', 'uuid', 'dayjs', 'date-fns',
          'ws', 'web-streams-polyfill', 'stream-browserify',
          '@google-cloud/storage', '@aws-sdk/client-s3',
          'nodemailer', 'stripe', 'twilio',
          '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
          '@radix-ui/react-checkbox', '@radix-ui/react-dialog',
          '@radix-ui/react-label', '@radix-ui/react-popover',
          '@radix-ui/react-select', '@radix-ui/react-slider',
          '@radix-ui/react-slot', '@radix-ui/react-switch',
          '@radix-ui/react-tabs', '@radix-ui/react-tooltip',
          'lucide-react', 'astro-icon',
          'clsx', 'class-variance-authority', 'tailwind-merge',
          'crypto-js', 'buffer', 'jotai', 'zustand',
          '@vercel/analytics', '@vercel/speed-insights',
          '@sentry/astro', 'newrelic',
          'gray-matter', 'fast-glob',
          'axios', 'commander', 'composio-core',
          'mem0ai', 'mcp-remote',
          'circomlib', 'aws-sdk',
          'astro-compress', 'astro-seo', 'expressiveCode',
          // Add any other large dependencies found in package.json
        ],
        output: {
          manualChunks: undefined, // No manual chunking
        },
      },
    },
    
    ssr: {
      // Externalize everything for SSR too
      external: [
        // Node.js built-ins
        'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib', 'stream',
        'child_process', 'os', 'util', 'net', 'tls', 'assert', 'buffer', 'events',
        'url', 'querystring', 'timers', 'cluster', 'dns', 'domain', 'inspector',
        'perf_hooks', 'punycode', 'readline', 'repl', 'string_decoder', 'tty',
        'v8', 'vm', 'worker_threads', 'async_hooks', 'diagnostics_channel', 'constants',
        
        // Node.js with node: prefix  
        'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
        'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
        'node:util', 'node:net', 'node:tls', 'node:assert', 'node:buffer',
        'node:stream', 'node:stream/web', 'node:events', 'node:url', 'node:querystring',
        'node:timers', 'node:cluster', 'node:dns', 'node:domain', 'node:inspector',
        'node:perf_hooks', 'node:punycode', 'node:readline', 'node:repl',
        'node:string_decoder', 'node:tty', 'node:v8', 'node:vm', 'node:worker_threads',
        'node:async_hooks', 'node:diagnostics_channel', 'node:constants',
        
        // ALL npm packages
        'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime',
        '@astrojs/mdx', '@astrojs/react', '@unocss/astro',
        'flexsearch', 'three', 'framer-motion', 'chart.js',
        '@tensorflow/tfjs', '@supabase/supabase-js', 'convex',
        'openai', 'ai', 'sharp', 'canvas', 'zod', 'nanoid',
        'ws', '@google-cloud/storage', '@radix-ui/react-accordion',
        'lucide-react', 'clsx', 'crypto-js', 'buffer',
        '@vercel/analytics', '@sentry/astro', 'axios',
        // And all others...
      ],
      noExternal: [], // Don't bundle anything
      target: 'node',
    },
    
    esbuild: {
      platform: 'node',
      target: 'node18',
      format: 'esm',
      treeShaking: true,
      define: {
        'global': 'globalThis',
        'process.env.NODE_ENV': '"production"',
      },
    },
  },
  
  // Minimal image service
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  
  // Relaxed TypeScript for faster builds
  typescript: {
    strict: false,
    allowJS: true,
  },
  
  // Disable everything that adds size
  compressHTML: false,
  scopedStyleStrategy: 'where',
  build: {
    inlineStylesheets: 'never',
  },
  
  // No prefetching
  prefetch: false,
}) 