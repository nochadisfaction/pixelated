import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import icon from 'astro-icon'

// Ultra-minimal Vercel configuration to stay under 300MB limit
export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: 'error',
  adapter: vercel({
    isr: false, // Disable ISR to reduce complexity
    edgeMiddleware: false, // Disable edge middleware
    includeFiles: [], // Don't include any extra files
    excludeFiles: [
      '**/*.md',
      '**/*.mdx',
      '**/test/**/*',
      '**/__tests__/**/*',
      '**/*.test.*',
      '**/*.spec.*',
      '**/docs/**/*',
      '**/examples/**/*',
      '**/demos/**/*',
      '**/ai/**/*', // Exclude large AI models/files
      '**/models/**/*',
      '**/performance-results/**/*',
      '**/test-results/**/*',
    ],
  }),
  
  // Absolute minimal integrations
  integrations: [
    react({
      include: ['**/components/**/*'],
      experimentalReactChildren: false,
    }),
    mdx({
      optimize: false,
      gfm: false,
      smartypants: false,
    }),
    UnoCSS({
      injectReset: false, // Disable reset CSS
      mode: 'global',
      configFile: './uno.config.vitesse.ts',
      content: {
        filesystem: [
          'src/pages/**/*.{astro,js,ts,jsx,tsx}',
          'src/components/**/*.{astro,js,ts,jsx,tsx}',
          'src/layouts/**/*.{astro,js,ts,jsx,tsx}',
        ],
      },
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
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@utils': path.resolve('./src/utils'),
        '@lib': path.resolve('./src/lib'),
      },
    },
    
    // Completely disable optimization
    optimizeDeps: {
      disabled: true,
      noDiscovery: true,
      include: [],
      exclude: ['**/*'],
    },
    
    // Ultra-minimal build settings
    build: {
      target: 'node18',
      minify: false,
      cssMinify: false,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 10000,
      cssCodeSplit: false,
      rollupOptions: {
        // Externalize as much as possible
        external: [
          // Core Node.js modules
          'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib', 'stream',
          'child_process', 'os', 'util', 'net', 'tls', 'assert', 'buffer', 'events',
          'url', 'querystring', 'timers', 'cluster', 'dns', 'domain', 'inspector',
          'perf_hooks', 'punycode', 'readline', 'repl', 'string_decoder', 'tty',
          'v8', 'vm', 'worker_threads', 'async_hooks', 'diagnostics_channel',
          
          // Node.js modules with node: prefix
          'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
          'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
          'node:util', 'node:net', 'node:tls', 'node:assert', 'node:buffer',
          'node:stream', 'node:stream/web', 'node:events', 'node:url', 'node:querystring',
          'node:timers', 'node:cluster', 'node:dns', 'node:domain', 'node:inspector',
          'node:perf_hooks', 'node:punycode', 'node:readline', 'node:repl',
          'node:string_decoder', 'node:tty', 'node:v8', 'node:vm', 'node:worker_threads',
          'node:async_hooks', 'node:diagnostics_channel',
          
          // Large dependencies to externalize
          'flexsearch', 'flexsearch/dist/module/document',
          '@tensorflow/tfjs', '@tensorflow/tfjs-node',
          'sharp', 'canvas', 'puppeteer', 'playwright',
          'three', 'framer-motion', 'chart.js',
          '@supabase/supabase-js', 'convex', 'postgres', 'redis', 'ioredis',
          'openai', '@langchain/core', '@langchain/openai',
          'zod', 'nanoid', 'uuid', 'dayjs', 'date-fns',
          'ws', 'web-streams-polyfill', 'stream-browserify',
          '@google-cloud/storage', '@aws-sdk/client-s3',
          'nodemailer', 'stripe', 'twilio',
        ],
        output: {
          // No manual chunking to keep it simple
          manualChunks: undefined,
        },
      },
    },
    
    ssr: {
      // Externalize everything possible for SSR
      external: [
        // All Node.js built-ins
        'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib', 'stream',
        'child_process', 'os', 'util', 'net', 'tls', 'assert', 'buffer', 'events',
        'url', 'querystring', 'timers', 'cluster', 'dns', 'domain', 'inspector',
        'perf_hooks', 'punycode', 'readline', 'repl', 'string_decoder', 'tty',
        'v8', 'vm', 'worker_threads', 'async_hooks', 'diagnostics_channel',
        
        // Node.js built-ins with node: prefix
        'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
        'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
        'node:util', 'node:net', 'node:tls', 'node:assert', 'node:buffer',
        'node:stream', 'node:stream/web', 'node:events', 'node:url', 'node:querystring',
        'node:timers', 'node:cluster', 'node:dns', 'node:domain', 'node:inspector',
        'node:perf_hooks', 'node:punycode', 'node:readline', 'node:repl',
        'node:string_decoder', 'node:tty', 'node:v8', 'node:vm', 'node:worker_threads',
        'node:async_hooks', 'node:diagnostics_channel',
        
        // Large npm packages
        'flexsearch', 'flexsearch/dist/module/document',
        '@tensorflow/tfjs', '@tensorflow/tfjs-node',
        'sharp', 'canvas', 'puppeteer', 'playwright',
        'three', 'framer-motion', 'chart.js',
        '@supabase/supabase-js', 'convex', 'postgres', 'redis', 'ioredis',
        'openai', '@langchain/core', '@langchain/openai',
        'zod', 'nanoid', 'uuid', 'dayjs', 'date-fns',
        'ws', 'web-streams-polyfill', 'stream-browserify',
        '@google-cloud/storage', '@aws-sdk/client-s3',
        'nodemailer', 'stripe', 'twilio',
      ],
      noExternal: [
        // Only include absolute essentials
        'react', 'react-dom', '@astrojs/mdx', '@astrojs/react',
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
      config: {
        quality: 60, // Lower quality for smaller files
        format: ['webp'], // Only modern format
      },
    },
  },
  
  // TypeScript config
  typescript: {
    strict: false, // Relax TypeScript to speed up build
    allowJS: true,
  },
  
  // Disable all optimizations that add size
  compressHTML: false,
  scopedStyleStrategy: 'where',
  build: {
    inlineStylesheets: 'never', // Keep styles external
  },
  
  // Disable prefetching to reduce bundle size
  prefetch: false,
}) 