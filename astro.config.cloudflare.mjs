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
const isVercel = process.env.VERCEL === '1'
const verboseOutput = process.env.VERCEL_VERBOSE === '1'

// Set SSR environment variable
process.env.SSR = 'true'

// Set build environment for esbuild
if (isVercel) {
  process.env.BUILDING_FOR_VERCEL = '1'
  process.env.ESBUILD_PLATFORM = 'browser'
}

// Check if web fonts fetching should be disabled
const disableWebFonts =
  process.env.DISABLE_WEB_FONTS === 'true' || process.env.CI === 'true'

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: verboseOutput ? 'info' : 'error',
  adapter: cloudflare(),
  prefetch: false,
  experimental: {
    // Note: experimental flags available in Astro 5.x
    // contentIntellisense: true, // Enable if needed
  },
  server: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost',
  },
  integrations: [
    sentry({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: true,
      sourceMapsUploadOptions: {
        project: 'pixelated-cloudflare',
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
      safelist: ['font-sans', 'font-mono'],
      presets: {
        web: {
          timeout: 5000,
          disable: true, // Disable web fonts for faster builds
        },
      },
      content: {
        filesystem: ['src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}'],
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
      },
      conditions: ['import', 'module', 'browser', 'default'],
    },
    plugins: [],
    ssr: {
      noExternal: ['sharp'],
      external: [
        'fs',
        'fs/promises',
        'path',
        'crypto',
        'http',
        'https',
        'zlib',
        'child_process',
        'os',
        'util',
        'net',
        'tls',
        'assert',
        'buffer',
        'stream',
        'events',
        'url',
        'querystring',
        'timers',
        'cluster',
        'dns',
        'domain',
        'inspector',
        'perf_hooks',
        'punycode',
        'readline',
        'repl',
        'string_decoder',
        'tty',
        'v8',
        'vm',
        'worker_threads',
        'async_hooks',
        'diagnostics_channel',
      ],
      target: 'node',
    },
    build: {
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      minify: isProduction ? 'esbuild' : false,
      cssMinify: isProduction,
      reportCompressedSize: false,
      target: 'node18',
      ssr: true,
      sourcemap: false,
      rollupOptions: {
        external: [
          'fs',
          'fs/promises',
          'path',
          'crypto',
          'http',
          'https',
          'zlib',
          'child_process',
          'os',
          'util',
          'net',
          'tls',
          'assert',
          'buffer',
          'stream',
          'events',
          'url',
          'querystring',
          'timers',
          'cluster',
          'dns',
          'domain',
          'inspector',
          'perf_hooks',
          'punycode',
          'readline',
          'repl',
          'string_decoder',
          'tty',
          'v8',
          'vm',
          'worker_threads',
          'async_hooks',
          'diagnostics_channel',
        ],
        output: {
          manualChunks: (id) => {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/')
            ) {
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
      include: ['react', 'react-dom', 'buffer'],
      exclude: ['@unocss/astro'],
      esbuildOptions: {
        platform: 'node',
        target: 'node18',
        format: 'esm',
        define: {
          'global': 'globalThis',
          'process.env.NODE_ENV': JSON.stringify(
            process.env.NODE_ENV || 'production',
          ),
        },
      },
    },
    esbuild: {
      platform: 'node',
      target: 'node18',
      format: 'esm',
      define: {
        'global': 'globalThis',
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV || 'production',
        ),
      },
    },
    css: {
      devSourcemap: true,
    },
    server: {
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
      fs: {
        strict: true,
        deny: [
          '.env',
          '.env.*',
          '*.{crt,pem,key,cert}',
          'config.*.json',
          'credentials/**',
          '.git/**',
          '**/.DS_Store',
          '**/node_modules/.vite/**',
          'custom.secret',
        ],
      },
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        quality: 80,
        format: ['webp', 'png', 'jpg'],
        cacheDir: './.astro/image-cache',
      },
    },
    domains: ['pixelatedempathy.com'],
  },
  typescript: {
    strict: true,
    allowJS: true,
    reportTypeErrors: false, // Disable for faster builds
    target: 'ESNext',
  },
  compressHTML: false,
  scopedStyleStrategy: 'class',
  build: {
    inlineStylesheets: 'auto',
  },
})
