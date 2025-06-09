import vercel from '@astrojs/vercel'
import { defineConfig } from 'astro/config'

// Emergency ultra-minimal configuration for Vercel
// Goal: Get under 300MB serverless function limit
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
      // Exclude EVERYTHING except core pages
      '**/test/**/*',
      '**/__tests__/**/*',
      '**/*.test.*',
      '**/*.spec.*',
      '**/docs/**/*',
      '**/examples/**/*',
      '**/demos/**/*',
      '**/ai/**/*',
      '**/models/**/*',
      '**/lib/**/*',  // Exclude all lib files
      '**/components/admin/**/*',
      '**/components/ai/**/*',
      '**/components/analytics/**/*',
      '**/components/audit/**/*',
      '**/components/chat/**/*',
      '**/components/dashboard/**/*',
      '**/components/demo/**/*',
      '**/components/feedback/**/*',
      '**/components/memory/**/*',
      '**/components/monitoring/**/*',
      '**/components/notification/**/*',
      '**/components/patient/**/*',
      '**/components/profile/**/*',
      '**/components/security/**/*',
      '**/components/session/**/*',
      '**/components/testing/**/*',
      '**/components/therapy/**/*',
      '**/components/three/**/*',
      '**/components/treatment/**/*',
      '**/components/ui/charts/**/*',
      '**/components/utils/**/*',
      '**/components/views/**/*',
      '**/components/widgets/**/*',
      'src/pages/admin/**/*',
      'src/pages/api/**/*',
      'src/pages/dashboard/**/*',
      'src/pages/demo/**/*',
      'src/pages/mental-health-chat/**/*',
      'src/pages/simulator/**/*',
      'public/**/*',  // Exclude all public assets
    ],
  }),
  
  // NO integrations
  integrations: [],
  
  vite: {
    // Minimal Vite config
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
      rollupOptions: {
        // Externalize major packages
        external: [
          '@tensorflow/tfjs',
          '@supabase/supabase-js',
          'three',
          'framer-motion',
          '@aws-sdk/client-s3',
          'convex',
          'sharp',
          '@emotion/react',
          '@mui/material',
          'chart.js',
          'mem0ai'
        ],
        output: {
          manualChunks: undefined,
        },
      },
    },
    
    ssr: {
      external: [
        '@tensorflow/tfjs',
        '@supabase/supabase-js',
        'three',
        'framer-motion',
        '@aws-sdk/client-s3',
        'convex',
        'sharp',
        '@emotion/react',
        '@mui/material',
        'chart.js',
        'mem0ai'
      ],
      noExternal: [],
      target: 'node',
    },
  },
  
  // Minimal markdown config
  markdown: {
    syntaxHighlight: false,
  },
  
  // Disable features
  server: {
    host: true,
    port: 4321,
  },
}) 