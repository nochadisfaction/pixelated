import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import cloudflare from '@astrojs/cloudflare'
import UnoCSS from '@unocss/astro'
import compress from 'astro-compress'
import { defineConfig } from 'astro/config'
import flexsearchIntegration from './src/integrations/search'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import sentry from '@sentry/astro'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'

// Check build environment
const isProduction = process.env.NODE_ENV === 'production'
const isCloudflare = process.env.CLOUDFLARE_BUILD === '1'
const verboseOutput = process.env.CLOUDFLARE_VERBOSE === '1'

// Set SSR environment variable
process.env.SSR = 'true'

// Set build environment for esbuild
if (isCloudflare) {
  process.env.BUILDING_FOR_CLOUDFLARE = '1'
  process.env.ESBUILD_PLATFORM = 'browser'
}

// Check if web fonts fetching should be disabled
const disableWebFonts = process.env.DISABLE_WEB_FONTS === 'true'

export default defineConfig({
  site: 'https://pixelated-backup.pages.dev', // Cloudflare Pages URL
  output: 'server',
  logLevel: verboseOutput ? 'info' : 'warn',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    routes: {
      include: ['/*'],
      exclude: ['/api/webhooks/*'], // Exclude sensitive webhooks from Cloudflare
    },
    mode: 'advanced',
    functionPerRoute: false,
  }),
  prefetch: {
    defaultStrategy: 'hover',
    throttle: 3,
  },
  // Cloudflare-specific headers
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
          key: 'X-XSS-Protection',
          value: '1; mode=block; report=https://pixelated-backup.pages.dev/api/security/xss-report',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://www.googletagmanager.com https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; font-src 'self' https://fonts.gstatic.com https://fonts.bunny.net https://cdn.jsdelivr.net data:; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; upgrade-insecure-requests",
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'same-origin',
        },
        {
          key: 'X-Permitted-Cross-Domain-Policies',
          value: 'none',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'off',
        },
      ],
    },
  ],
  server: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost',
  },
  integrations: [
    sentry({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: true,
      sourceMapsUploadOptions: {
        project: "pixelated-cloudflare",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      styleOverrides: {
        borderRadius: '0.5rem',
        frames: {
          frameBoxShadowCssValue: '0 0 10px rgba(0, 0, 0, 0.1)',
        },
      },
    }),
    react(),
    mdx(),
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-sans', 'font-mono', 'font-condensed'],
      configFile: './uno.config.ts',
      presets: {
        web: {
          timeout: 30000,
          disable: disableWebFonts,
        },
      },
      content: {
        filesystem: [
          'src/**/*.{astro,js,ts,jsx,tsx,vue}',
          'components/**/*.{astro,js,ts,jsx,tsx,vue}',
        ],
      },
    }),
    compress({
      css: true,
      html: true,
      img: false, // Let Cloudflare handle image optimization
      js: true,
      svg: false,
    }),
    flexsearchIntegration(),
    icon({
      include: {
        lucide: ['*'],
      },
      svgdir: './src/icons',
    }),
  ],
  content: {
    collections: ['blog', 'docs', 'guides'],
  },
  vite: {
    resolve: {
      alias: {
        '~': path.resolve('./src'),
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@utils': path.resolve('./src/utils'),
        '@lib': path.resolve('./src/lib'),
        'flexsearch': path.resolve('./node_modules/flexsearch'),
        'flexsearch/dist/module/document': path.resolve(
          './node_modules/flexsearch/dist/module/document',
        ),
      },
      conditions: ['import', 'module', 'browser', 'default'],
    },
    plugins: [flexsearchSSRPlugin()],
    ssr: {
      noExternal: [
        '@google-cloud/storage',
        'stream-browserify',
        'util',
        'events',
        'path-browserify',
      ],
      external: [
        'flexsearch',
        'flexsearch/dist/module/document',
      ],
      target: 'webworker',
    },
    build: {
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      minify: true,
      cssMinify: true,
      reportCompressedSize: false, // Faster builds for backup
      target: 'esnext',
      ssr: true,
      rollupOptions: {
        external: [
          'flexsearch',
          'flexsearch/dist/module/document',
        ],
        output: {
          manualChunks: (id) => {
            // Simplified chunking for Cloudflare
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-core'
            }
            if (id.includes('node_modules/@radix-ui/')) {
              return 'radix-ui'
            }
            if (id.includes('node_modules/framer-motion/')) {
              return 'motion'
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons'
            }
            return undefined
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@unocss/astro', 'flexsearch'],
      esbuildOptions: {
        target: 'esnext',
        format: 'esm',
        define: {
          'global': 'globalThis',
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        },
      },
    },
    esbuild: {
      target: 'esnext',
      format: 'esm',
      define: {
        'global': 'globalThis',
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      },
    },
    css: {
      devSourcemap: false, // Disabled for Cloudflare builds
    },
    server: {
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
    },
  },
  // Use compile service instead of Sharp for Cloudflare compatibility
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop', // No server-side image processing
      config: {},
    },
    domains: ['pixelated-backup.pages.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.pages.dev',
      },
      {
        protocol: 'https',
        hostname: '**.pixelatedempathy.com',
      },
    ],
  },
  typescript: {
    strict: true,
    allowJS: true,
    reportTypeErrors: true,
    target: 'ESNext',
  },
  compressHTML: true, // Enable for Cloudflare
  scopedStyleStrategy: 'class',
  build: {
    inlineStylesheets: 'auto',
  },
}) 