import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import icon from 'astro-icon'

// Minimal Vercel-specific configuration to prevent build hanging
export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: 'error', // Reduce logging
  adapter: vercel(),
  
  // Minimal integrations for Vercel
  integrations: [
    react(),
    mdx(),
    UnoCSS({
      injectReset: true,
      mode: 'global',
      configFile: './uno.config.vitesse.ts',
      content: {
        filesystem: [
          'src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}',
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
    
    // Completely disable dependency optimization
    optimizeDeps: {
      noDiscovery: true,
      include: [],
      exclude: ['flexsearch', '@unocss/astro'],
      force: false,
      holdUntilCrawlEnd: false,
    },
    
    // Minimal build configuration
    build: {
      target: 'node18',
      minify: false,
      cssMinify: false,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        external: [
          // Node.js built-ins
          'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib',
          'child_process', 'os', 'util', 'net', 'tls', 'stream', 'events',
          // Node.js built-ins with node: prefix
          'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
          'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
          'node:util', 'node:net', 'node:tls', 'node:stream', 'node:events',
        ],
      },
    },
    
    ssr: {
      noExternal: ['@google-cloud/storage'],
      external: [
        'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib',
        'child_process', 'os', 'util', 'net', 'tls', 'stream', 'events',
        'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
        'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
        'node:util', 'node:net', 'node:tls', 'node:stream', 'node:events',
      ],
    },
    
    // Prevent any caching issues
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
  },
  
  // Minimal image configuration
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  
  // Strict TypeScript
  typescript: {
    strict: true,
    allowJS: true,
  },
  
  // Disable compression
  compressHTML: false,
  scopedStyleStrategy: 'class',
}) 