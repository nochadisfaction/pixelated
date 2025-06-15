import path from 'node:path'
import vercel from '@astrojs/vercel'
import react from '@astrojs/react'
import icon from 'astro-icon'
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
    functionPerRoute: false,
    maxDuration: 30,
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
      '**/scripts/**/*',
      '**/bin/**/*',
      '**/deploy/**/*',
      '**/templates/**/*',
      '**/lint/**/*',
      '**/plugins/**/*',
      '**/workers/**/*',
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
      'src/lib/fhe/**/*',
      'src/lib/metaaligner/**/*',
      'src/lib/providers/**/*',
      'src/lib/repositories/**/*',
      'src/lib/scripts/**/*',
      'src/lib/security/**/*',
      'src/lib/services/**/*',
      'src/lib/websocket/**/*',
      'src/components/three/**/*',
      'src/components/ui/charts/**/*',
      'src/components/admin/bias-detection/**/*',
      'src/components/ai/mental-llama/**/*',
      'src/components/analytics/**/*',
      'src/components/audit/**/*',
      'src/components/dashboard/Multidimensional*',
      'src/components/session/Multidimensional*',
      'src/components/widgets/**/*',
      'src/components/testing/**/*',
      'src/simulator/**/*',
      'src/@types/**/*',
      'src/e2e/**/*',
      'src/load-tests/**/*',
      'src/test/**/*',
      'src/test-utils/**/*',
      'src/tests/**/*',
      'src/workers/**/*',
      'src/services/**/*',
      'src/integrations/**/*',
    ],
  }),
  
  // Minimal integrations - only essential ones
  integrations: [
    react({
      include: ['**/components/**/*'],
      experimentalReactChildren: false,
    }),
    icon({
      include: {
        lucide: ['*'],
      },
      svgdir: './src/icons',
    }),
  ],
  
  vite: {
    resolve: {
      alias: {
        '~': path.resolve('./src'),
        '@': path.resolve('./src'),
      },
    },
    
    // Disable all optimizations
    optimizeDeps: {
      noDiscovery: true,
      include: [],
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
          
          // ALL large third-party packages (except React which we need)
          '@astrojs/mdx', '@unocss/astro',
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
          '@google-cloud/storage', '@aws-sdk/client-s3', '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-kms', '@aws-sdk/lib-dynamodb', '@aws-sdk/util-dynamodb',
          'nodemailer', 'stripe', 'twilio',
          '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
          '@radix-ui/react-checkbox', '@radix-ui/react-dialog',
          '@radix-ui/react-label', '@radix-ui/react-popover',
          '@radix-ui/react-select', '@radix-ui/react-slider',
          '@radix-ui/react-slot', '@radix-ui/react-switch',
          '@radix-ui/react-tabs', '@radix-ui/react-tooltip',
          'lucide-react', 'astro-icon',
          'clsx', 'class-variance-authority', 'tailwind-merge',
          'react-hot-toast',
          'crypto-js', 'buffer', 'jotai', 'zustand',
          '@vercel/analytics', '@vercel/speed-insights',
          '@sentry/astro', 'newrelic',
          'gray-matter', 'fast-glob',
          'axios', 'commander', 'composio-core',
          'mem0ai', 'mcp-remote',
          'circomlib', 'aws-sdk',
          'astro-compress', 'astro-seo', 'expressiveCode',
          '@emotion/react', '@emotion/styled',
          '@mui/material', '@neondatabase/serverless',
          '@libsql/client', '@mem0/vercel-ai-provider',
          '@testing-library/dom', '@types/ws',
          '@codesandbox/sdk', '@axe-core/react',
          '@clerk/astro',
          '@next/font', '@iconify-json/lucide',
          '@tailwindcss/vite', '@unocss/reset',
          'biome', 'eslint-plugin-import-x', 'eslint-plugin-pnpm',
          'eslint-plugin-react', 'eslint-plugin-react-hooks',
          'eslint-plugin-unicorn', 'eslint-plugin-vue',
          // Add any other large dependencies found in package.json
        ],
        output: {
          manualChunks: undefined, // No manual chunking
        },
        // No plugins for now - let's focus on externalization
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
        
        // ALL npm packages (except React which we need)
        '@astrojs/mdx', '@unocss/astro',
        'flexsearch', 'three', 'framer-motion', 'chart.js',
        '@tensorflow/tfjs', '@supabase/supabase-js', 'convex',
        'openai', 'ai', 'sharp', 'canvas', 'zod', 'nanoid',
        'ws', '@google-cloud/storage', '@radix-ui/react-accordion',
        'lucide-react', 'clsx', 'crypto-js', 'buffer',
        'react-hot-toast',
        '@vercel/analytics', '@sentry/astro', 'axios',
        'mem0ai', 'mcp-remote', 'composio-core',
        '@aws-sdk/client-s3', '@aws-sdk/client-dynamodb',
        '@emotion/react', '@emotion/styled', '@mui/material',
        // And all others...
      ],
      noExternal: [
        // Only include absolute essentials
        'react', 'react-dom', '@astrojs/react',
      ],
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
  
  // Remove experimental flags that are no longer valid
  
  // Disable features that add bundle size
  server: {
    host: true,
    port: 4321,
  },
  
  // Minimal markdown config
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
}) 