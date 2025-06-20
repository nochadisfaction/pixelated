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
        project: 'pixelated',
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
  adapter: vercel(),
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
    
    // Simplified build configuration
    build: {
      chunkSizeWarningLimit: 1500,
      target: 'node18',
      sourcemap: true, // Disable sourcemaps to avoid warnings during build
      rollupOptions: {
        // Only essential externals
        external: [
          'flexsearch',
          'flexsearch/dist/module/document',
          // Core Node.js modules
          /^node:/,
          'fs', 'path', 'crypto', 'http', 'https', 'util', 'buffer', 'stream', 'events', 'url'
        ],
        output: {
          // Simplified chunking - let Rollup handle most of it
          manualChunks: {
            'react-core': ['react', 'react-dom'],
            'ui-lib': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            'ai-ml': ['openai', '@ai-sdk/openai'],
          },
        },
        onwarn: (warning, warn) => {
          // Suppress sourcemap warnings
          if (warning.code === 'SOURCEMAP_ERROR') {
            return
          }
          if (warning.message?.includes('sourcemap')) {
            return
          }
          if (warning.message?.includes('Can\'t resolve original location')) {
            return
          }
          warn(warning)
        },
      },
    },

    ssr: {
      noExternal: ['@google-cloud/storage', 'sharp'],
      external: ['flexsearch', 'flexsearch/dist/module/document'],
    },

    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@unocss/astro', 'flexsearch'],
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
