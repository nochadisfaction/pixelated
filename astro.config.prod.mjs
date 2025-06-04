import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import UnoCSS from '@unocss/astro'
import compress from 'astro-compress'
import { defineConfig } from 'astro/config'
import flexsearchIntegration from './src/integrations/search'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import sentry from '@sentry/astro'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'

/**
 * Production-Optimized Astro Configuration
 *
 * Designed for maximum performance, minimal bundle size, and production security
 */

// Force production environment
process.env.NODE_ENV = 'production'
process.env.ASTRO_TELEMETRY_DISABLED = '1'

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: 'error',

  adapter: vercel({
    maxDuration: 60,
    memory: 1024,
    analytics: true,
    speedInsights: { enabled: true },
    webAnalytics: { enabled: true },
    isr: {
      expiration: 3600,
      allowQuery: ['page', 'category', 'tag'],
    },
    edgeMiddleware: true,
  }),

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        quality: 85,
        formats: ['avif', 'webp', 'png', 'jpg'],
        progressive: true,
        mozjpeg: true,
      },
    },
  },

  prefetch: {
    defaultStrategy: 'viewport',
    throttle: 5,
  },

  integrations: [
    sentry({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: false,
      telemetry: false,
    }),

    expressiveCode({
      themes: ['github-dark', 'github-light'],
      useDarkModeMediaQuery: true,
      minifyInlineStyles: true,
    }),

    react({ experimentalReactChildren: true }),
    mdx({ optimize: true, gfm: true }),

    UnoCSS({
      injectReset: true,
      mode: 'global',
      configFile: './uno.config.vitesse.ts',
      inspector: false,
    }),

    compress({
      css: { level: 2, comments: false },
      html: {
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
        collapseWhitespace: true,
      },
      img: { quality: 85, progressive: true },
      js: { compress: true, mangle: true },
    }),

    flexsearchIntegration(),
    icon({ optimize: true, cache: true }),
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

    plugins: [flexsearchSSRPlugin()],

    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: 'esbuild',
      reportCompressedSize: false,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Critical components first
            if (id.includes('/components/base/') || id.includes('/layouts/')) {
              return 'critical'
            }

            // Framework chunks
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/')
            ) {
              return 'react-core'
            }

            // UI library chunks
            if (id.includes('node_modules/@radix-ui/')) {
              return 'radix-ui'
            }
            if (id.includes('node_modules/framer-motion/')) {
              return 'motion'
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons'
            }

            // Heavy libraries
            if (id.includes('node_modules/chart.js/')) {
              return 'chartjs'
            }
            if (id.includes('node_modules/@tensorflow/')) {
              return 'tensorflow'
            }
            if (id.includes('node_modules/three/')) {
              return 'three-js'
            }

            // AI/ML libraries
            if (
              id.includes('node_modules/openai/') ||
              id.includes('node_modules/ai/')
            ) {
              return 'ai-ml'
            }

            // Database clients
            if (
              id.includes('node_modules/@supabase/') ||
              id.includes('node_modules/postgres/')
            ) {
              return 'db-clients'
            }

            // Utilities
            if (
              id.includes('node_modules/zod/') ||
              id.includes('node_modules/clsx/')
            ) {
              return 'utilities'
            }

            return undefined
          },

          compact: true,
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },

        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'buffer'],
      exclude: ['@unocss/astro', 'flexsearch'],
      esbuildOptions: {
        target: 'es2022',
        minify: true,
        treeShaking: true,
      },
    },

    esbuild: {
      target: 'es2022',
      minify: true,
      treeShaking: true,
      legalComments: 'none',
      charset: 'utf8',
    },

    css: {
      devSourcemap: false,
      minify: true,
    },

    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.MODE': '"production"',
      '__DEV__': false,
    },
  },

  typescript: {
    strict: true,
    allowJS: false,
    reportTypeErrors: true,
    target: 'ESNext',
  },

  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },

  experimental: {
    contentCollectionCache: true,
    serverIslands: true,
    componentIslands: true,
  },
})
