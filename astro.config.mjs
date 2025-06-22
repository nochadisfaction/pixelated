import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import compress from 'astro-compress'
import { defineConfig } from 'astro/config'
import flexsearchIntegration from './src/integrations/search.js'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import sentry from '@sentry/astro'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'


// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = process.env.VERCEL === '1'

// Basic integrations - same for all environments
const integrations = [
  // expressiveCode must come before mdx for MDX code blocks to work
  expressiveCode({
    themes: ['github-dark', 'github-light'],
    styleOverrides: {
      borderRadius: '0.5rem',
    },
  }),
  react(),
  mdx({
    components: path.resolve('./mdx-components.js'),
  }),
  UnoCSS({
    injectReset: true,
    mode: 'global',
    safelist: ['font-sans', 'font-mono', 'font-condensed'],
    configFile: './uno.config.ts',
    content: {
      filesystem: [
        'src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}',
        'components/**/*.{astro,js,ts,jsx,tsx,vue}',
      ],
    },
  }),
  icon({
    include: {
      lucide: ['*'],
    },
    svgdir: './src/icons',
  }),
  flexsearchIntegration(),
  // Optional integrations for production/specific environments
  ...(isProduction && process.env.SENTRY_DSN && process.env.SENTRY_AUTH_TOKEN ? [
    sentry({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: true,
      telemetry: false,
      sourceMapsUploadOptions: {
        project: process.env.SENTRY_PROJECT || 'pixel-astro',
        org: process.env.SENTRY_ORG || 'pixelated-empathy-dq',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ] : []),
  ...(isProduction ? [
    compress({
      css: true,
      html: true,
      img: false,
      js: true,
      svg: false,
    }),
  ] : []),
]

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  adapter: vercel({
    // Minimize serverless function size
    includeFiles: [
      // Only include essential runtime files
      'package.json',
      'astro.config.mjs',
      'mdx-components.js',
    ],
    excludeFiles: [
      // Exclude large directories from serverless functions
      'tests/**',
      'test_pixel_logs/**',
      'logs/**',
      'memory/**',
      'screenshots/**',
      'reports/**',
      'security-scan-artifacts/**',
      'secret-scan-artifacts/**',
      'performance-results/**',
      'ai/**',
      'docs/**',
      'lint/**',
      'fixes/**',
      'patches/**',
      'dist/**',
      '.astro/**',
      // Heavy node_modules
      'node_modules/@tensorflow/**',
      'node_modules/three/**',
      'node_modules/@react-three/**',
      'node_modules/sharp/**',
      'node_modules/@google-cloud/**',
      'node_modules/puppeteer/**',
      'node_modules/playwright/**',
      'node_modules/@playwright/**',
      'node_modules/@testing-library/**',
      'node_modules/@types/**',
      'node_modules/typescript/**',
      'node_modules/eslint/**',
      'node_modules/biome/**',
      'node_modules/vitest/**',
    ],
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        quality: 80,
        format: ['avif', 'webp', 'png', 'jpg'],
      },
    },
  },
  
  prefetch: {
    defaultStrategy: 'hover',
    throttle: 3,
  },

  // Essential security headers only
  headers: [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; font-src 'self' https://fonts.gstatic.com data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
        },
      ],
    },
  ],

  server: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost',
  },

  integrations,

  vite: {
    logLevel: 'error', // Suppress warnings during build
    
    // Prevent UnoCSS timeout issues
    moduleRunner: {
      timeout: 120000, // 2 minutes instead of 1 minute
    },
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
    
    plugins: [flexsearchSSRPlugin()],
    
    // Aggressive build configuration for Vercel
    build: {
      chunkSizeWarningLimit: 1500,
      target: 'node18',
      sourcemap: false, // Disable sourcemaps to reduce size
      rollupOptions: {
        // Aggressive externals to reduce bundle size
        external: (id) => {
          // Never externalize Astro internals and integrations
          if (id.includes('@astro-page:') || 
              id.includes('astro/') || 
              id.includes('astro\\') ||
              id.startsWith('@astrojs/') ||
              id.includes('@astrojs/')) {
            return false;
          }
          
          // VERY aggressive externalization for Vercel size limits
          const patterns = [
            // Core Node.js modules - always external
            /^node:/,
            'fs', 'path', 'crypto', 'http', 'https', 'util', 'buffer', 'stream', 'events', 'url',
            'os', 'child_process', 'worker_threads', 'cluster', 'net', 'tls', 'dns',
            
            // Heavy ML/AI dependencies - MUST be external
            '@tensorflow/tfjs',
            '@tensorflow/tfjs-layers',
            '@tensorflow/tfjs-node',
            '@tensorflow/tfjs-backend-cpu',
            '@tensorflow/tfjs-backend-webgl',
            /^@tensorflow/,
            /tensorflow/,
            'pytorch',
            'torch',
            /^@pytorch/,
            'opencv',
            /^opencv/,
            
            // Heavy graphics/3D libraries
            'three',
            'three-stdlib',
            '@react-three/fiber',
            '@react-three/drei',
            'babylon',
            '@babylonjs/',
            'webgl',
            'canvas',
            'sharp',
            
            // Cloud services - externalize heavy SDKs
            '@google-cloud/storage',
            '@google-cloud/bigquery',
            '@google-cloud/firestore',
            /^@google-cloud/,
            /^@aws-sdk/,
            '@azure/',
            
            // Crypto/blockchain libraries
            'node-seal',
            'snarkjs',
            'circomlib',
            /^@noble/,
            'ethers',
            'web3',
            
            // Document processing
            'pdfkit',
            'puppeteer',
            'playwright',
            '@playwright/test',
            /^playwright/,
            'jsdom',
            
            // Search libraries (can be heavy)
            'flexsearch',
            'flexsearch/dist/module/document',
            'elasticsearch',
            '@elastic/',
            'solr',
            
            // AI/LLM libraries
            /^@langchain/,
            'langchain',
            /^composio-/,
            'openai',
            '@ai-sdk/',
            'anthropic',
            'groq-sdk',
            
            // Testing frameworks - not needed in production
            /@testing-library/,
            /^@playwright/,
            /vitest/,
            /^@vitest/,
            'jest',
            '@jest/',
            'mocha',
            'chai',
            'sinon',
            
            // Development tools - not needed in production
            /@types/,
            /eslint/,
            /biome/,
            'typescript',
            'ts-node',
            'nodemon',
            '@swc/',
            'esbuild',
            'vite',
            'rollup',
            'webpack',
            
            // Heavy UI libraries
            /@radix-ui/,
            'framer-motion',
            'recharts',
            /chart\.js/,
            'highcharts',
            'd3',
            '@d3-/',
            
            // Database drivers (can be heavy)
            'pg', 'mysql', 'mysql2', 'sqlite3', 'mongodb', 'redis',
            '@prisma/client',
            'mongoose',
            'sequelize',
            
            // Email libraries
            'nodemailer',
            '@sendgrid/',
            'mailgun',
            
            // Monitoring/APM
            'newrelic',
            '@sentry/node',
            'dd-trace',
            
            // Python/ML environments
            /bias_detection_env/,
            /.*\/bias_detection_env\/.*/,
            /python/,
            /conda/,
            /jupyter/,
            /notebook/,
            
            // Any package over 10MB typically
            /plotly/,
            /matplotlib/,
            /numpy/,
            /pandas/,
            /scipy/,
          ];
          
          // Check if any pattern matches
          return patterns.some(pattern => {
            if (typeof pattern === 'string') {
              return id === pattern;
            } else if (pattern instanceof RegExp) {
              return pattern.test(id);
            }
            return false;
          });
        },
        output: {
          // Minimal chunking for Vercel
          manualChunks: {
            'react-core': ['react', 'react-dom'],
            'ai-core': ['openai', '@ai-sdk/openai'],
          },
        },
        onwarn: (warning, warn) => {
          // Suppress all warnings during build
          if (warning.code === 'SOURCEMAP_ERROR') {
            return
          }
          if (warning.message?.includes('sourcemap')) {
            return
          }
          if (warning.message?.includes('Can\'t resolve original location')) {
            return
          }
          if (warning.code === 'UNRESOLVED_IMPORT') {
            return
          }
          if (warning.code === 'EXTERNAL_DEPENDENCY') {
            return
          }
          warn(warning)
        },
      },
    },

    ssr: {
      noExternal: [],
      external: [
        // Search libraries
        'flexsearch', 
        'flexsearch/dist/module/document',
        
        // Heavy ML/AI libraries
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-layers',
        '@tensorflow/tfjs-node',
        /^@tensorflow/,
        'pytorch',
        'torch',
        'opencv',
        
        // Heavy graphics/3D
        'three',
        'three-stdlib',
        '@react-three/fiber',
        '@react-three/drei',
        'babylon',
        'canvas',
        'sharp',
        
        // Cloud SDKs
        '@google-cloud/storage',
        '@google-cloud/bigquery',
        /^@google-cloud/,
        /^@aws-sdk/,
        '@azure/',
        
        // Crypto/blockchain
        'node-seal',
        'snarkjs',
        'circomlib',
        'ethers',
        'web3',
        
        // Document processing
        'pdfkit',
        'puppeteer',
        'playwright',
        
        // AI/LLM
        /^@langchain/,
        'langchain',
        'openai',
        '@ai-sdk/',
        'anthropic',
        
        // Monitoring
        'newrelic',
        '@sentry/node',
        'dd-trace',
        
        // Databases
        'pg', 'mysql', 'mysql2', 'sqlite3', 'mongodb', 'redis',
        '@prisma/client',
        'mongoose',
        'sequelize',
        
        // Email
        'nodemailer',
        '@sendgrid/',
        
        // Testing (not needed in SSR)
        /@testing-library/,
        /^@playwright/,
        /vitest/,
        'jest',
        
        // Development tools
        /@types/,
        /eslint/,
        /biome/,
        'typescript',
        'ts-node',
      ],
    },

    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: [
        '@unocss/astro', 
        'flexsearch',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-layers',
        'three',
        'three-stdlib',
        '@react-three/fiber',
      ],
    },

    // UnoCSS timeout prevention
    server: {
      fs: {
        strict: false,
      },
    },
  },

  typescript: {
    strict: true,
    allowJS: true,
  },

  build: {
    inlineStylesheets: 'auto',
  },
})
