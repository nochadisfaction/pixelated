import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import icon from 'astro-icon'
import react from '@astrojs/react'

// Super minimal config to debug the hanging issue
export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: 'info',
  adapter: vercel(),
  
  // Minimal required integrations
  integrations: [
    icon(),
    react(),
  ],
  
  vite: {
    // Completely disable all optimizations
    optimizeDeps: {
      noDiscovery: true,
      include: [],
      entries: [],
    },
    
    // Minimal build config
    build: {
      target: 'node18',
      minify: false,
      cssMinify: false,
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        treeshake: false,
        external: [
          // Basic Node.js externals only
          'fs', 'path', 'crypto', 'http', 'https', 'os', 'child_process',
          'node:fs', 'node:path', 'node:crypto', 'node:http', 'node:https', 'node:os', 'node:child_process',
        ],
      },
    },
    
    ssr: {
      noExternal: [],
      external: [
        'fs', 'path', 'crypto', 'http', 'https', 'os', 'child_process',
        'node:fs', 'node:path', 'node:crypto', 'node:http', 'node:https', 'node:os', 'node:child_process',
      ],
    },
    
    // Disable all resolve features that might cause issues
    resolve: {
      alias: {},
      conditions: ['node', 'import'],
    },
    
    // Minimal esbuild config
    esbuild: {
      target: 'node18',
      platform: 'node',
      format: 'esm',
    },
  },
  
  // Disable everything else
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  
  compressHTML: false,
}) 