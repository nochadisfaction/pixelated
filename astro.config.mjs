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
import vitesse from 'astro-vitesse'
import tailwind from '@astrojs/tailwind'

import cloudflare from '@astrojs/cloudflare'

// Check build environment
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = process.env.VERCEL === '1'
const verboseOutput = process.env.VERCEL_VERBOSE === '1'

// Set SSR environment variable
process.env.SSR = 'true'

// Set build environment for esbuild
if (isVercel) {
  process.env.BUILDING_FOR_VERCEL = '1'
  process.env.ESBUILD_PLATFORM = 'node'
}

// Check if web fonts fetching should be disabled
const disableWebFonts =
  process.env.DISABLE_WEB_FONTS === 'true' || process.env.CI === 'true'

// Disable resource-intensive features on Vercel
const vercelIntegrations = isVercel ? [
  tailwind(),
  react(),
  mdx(),
  // UnoCSS({
  //   injectReset: true,
  //   mode: 'global',
  //   safelist: ['font-sans', 'font-mono', 'font-condensed'],
  //   configFile: './uno.config.vitesse.ts',
  //   content: {
  //     filesystem: [
  //       'src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}',
  //       'components/**/*.{astro,js,ts,jsx,tsx,vue}',
  //     ],
  //   },
  //   transformers: [
  //     {
  //       name: 'unocss:reset',
  //       transform(code) {
  //         if (!code || typeof code !== 'string') {
  //           return code
  //         }
  //         if (code.includes('@unocss/reset/reset.css')) {
  //           return code.replace(
  //             '@unocss/reset/reset.css',
  //             '@unocss/reset/tailwind.css',
  //           )
  //         }
  //         return code
  //       },
  //     },
  //   ],
  // }),
  icon({
    include: {
      lucide: ['*'],
    },
    svgdir: './src/icons',
  }),
] : [
  tailwind(),
  vitesse({
    title: 'Pixelated Empathy',
    description: 'AI-Powered Mental Health Research & Innovation',
    disable404Route: true,
  }),
  sentry({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
    telemetry: false,
    sourceMapsUploadOptions: {
      project: 'pixelated',
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
  // UnoCSS({
  //   injectReset: true,
  //   mode: 'global',
  //   safelist: ['font-sans', 'font-mono', 'font-condensed'],
  //   configFile: './uno.config.vitesse.ts',
  //   content: {
  //     filesystem: [
  //       'src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}',
  //       'components/**/*.{astro,js,ts,jsx,tsx,vue}',
  //     ],
  //   },
  //   transformers: [
  //     {
  //       name: 'unocss:reset',
  //       transform(code) {
  //         if (!code || typeof code !== 'string') {
  //           return code
  //         }
  //         if (code.includes('@unocss/reset/reset.css')) {
  //           return code.replace(
  //             '@unocss/reset/reset.css',
  //             '@unocss/reset/tailwind.css',
  //           )
  //         }
  //         return code
  //       },
  //     },
  //   ],
  // }),
  icon({
    include: {
      lucide: ['*'],
    },
    svgdir: './src/icons',
  }),
]

// Vercel-specific configuration to prevent hanging builds
const vercelOptimizations = isVercel ? {
  optimizeDeps: {
    noDiscovery: true, // Disable dependency discovery on Vercel
    include: [], // Don't include any dependencies for optimization
    exclude: ['**/*'], // Exclude everything from optimization
    force: false, // Don't force re-optimization
    holdUntilCrawlEnd: false, // Don't wait for crawling to end
  },
  define: {
    'import.meta.env.VITE_DISABLE_DEPS_OPTIMIZATION': 'true',
  },
  build: {
    chunkSizeWarningLimit: 2000,
    cssCodeSplit: false, // Reduce complexity
    minify: false, // Disable minification to speed up build
    cssMinify: false,
    reportCompressedSize: false,
    target: 'node18',
    ssr: true,
    sourcemap: false, // Disable sourcemaps to speed up build
    rollupOptions: {
      external: [
        // Standard Node.js built-ins
        'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib',
        'child_process', 'os', 'util', 'net', 'tls', 'assert', 'buffer',
        'stream', 'events', 'url', 'querystring', 'timers', 'cluster',
        'dns', 'domain', 'inspector', 'perf_hooks', 'punycode', 'readline',
        'repl', 'string_decoder', 'tty', 'v8', 'vm', 'worker_threads',
        'async_hooks', 'diagnostics_channel',
        // Node.js built-ins with node: prefix
        'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
        'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
        'node:util', 'node:net', 'node:tls', 'node:assert', 'node:buffer',
        'node:stream', 'node:stream/web', 'node:events', 'node:url',
        'node:querystring', 'node:timers', 'node:cluster', 'node:dns',
        'node:domain', 'node:inspector', 'node:perf_hooks', 'node:punycode',
        'node:readline', 'node:repl', 'node:string_decoder', 'node:tty',
        'node:v8', 'node:vm', 'node:worker_threads', 'node:async_hooks',
        'node:diagnostics_channel',
        // Project specific externals
        'flexsearch', 'flexsearch/dist/module/document',
      ],
      output: {
        // Simplified chunking for Vercel
        manualChunks: undefined
      },
    },
  }
} : {
  // Normal development/production configuration
  optimizeDeps: {
    noDiscovery: false, // Allow discovery in non-Vercel environments
    include: ['react', 'react-dom', 'buffer'],
    exclude: ['@unocss/astro', 'flexsearch'],
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
  build: {
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: true,
    minify: isProduction ? 'esbuild' : false,
    cssMinify: isProduction,
    reportCompressedSize: false,
    target: 'node18',
    ssr: true,
    sourcemap: 'hidden',
    rollupOptions: {
      external: [
        // Standard Node.js built-ins
        'fs', 'fs/promises', 'path', 'crypto', 'http', 'https', 'zlib',
        'child_process', 'os', 'util', 'net', 'tls', 'assert', 'buffer',
        'stream', 'events', 'url', 'querystring', 'timers', 'cluster',
        'dns', 'domain', 'inspector', 'perf_hooks', 'punycode', 'readline',
        'repl', 'string_decoder', 'tty', 'v8', 'vm', 'worker_threads',
        'async_hooks', 'diagnostics_channel',
        // Node.js built-ins with node: prefix
        'node:fs', 'node:fs/promises', 'node:path', 'node:crypto', 'node:process',
        'node:http', 'node:https', 'node:zlib', 'node:child_process', 'node:os',
        'node:util', 'node:net', 'node:tls', 'node:assert', 'node:buffer',
        'node:stream', 'node:stream/web', 'node:events', 'node:url',
        'node:querystring', 'node:timers', 'node:cluster', 'node:dns',
        'node:domain', 'node:inspector', 'node:perf_hooks', 'node:punycode',
        'node:readline', 'node:repl', 'node:string_decoder', 'node:tty',
        'node:v8', 'node:vm', 'node:worker_threads', 'node:async_hooks',
        'node:diagnostics_channel',
        // Project specific externals
        'flexsearch', 'flexsearch/dist/module/document',
      ],
      output: {
        manualChunks: (id) => {
          if (id.includes('/components/chat/AnalyticsDashboardReact.')) {
            return 'analytics-dashboard'
          }
          if (id.includes('/components/MentalHealthChatDemoReact.')) {
            return 'mental-health-chat'
          }
          if (id.includes('/components/chat/TherapyChatSystem.')) {
            return 'therapy-chat-system'
          }

          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
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
          if (
            id.includes('node_modules/chart.js/') ||
            id.includes('node_modules/react-chartjs-2/')
          ) {
            return 'chartjs'
          }
          if (id.includes('node_modules/@tensorflow/')) {
            return 'tensorflow'
          }
          if (
            id.includes('node_modules/@supabase/') ||
            id.includes('node_modules/convex/') ||
            id.includes('node_modules/postgres/') ||
            id.includes('node_modules/redis/') ||
            id.includes('node_modules/ioredis/') ||
            id.includes('node_modules/@upstash/redis/')
          ) {
            return 'db-clients'
          }
          if (
            id.includes('node_modules/openai/') ||
            id.includes('node_modules/ai/') ||
            id.includes('node_modules/@ai-sdk/') ||
            id.includes('node_modules/@langchain/')
          ) {
            return 'ai-ml'
          }
          if (id.includes('node_modules/three/')) {
            return 'three-js'
          }
          if (
            id.includes('node_modules/remark/') ||
            id.includes('node_modules/rehype/') ||
            id.includes('node_modules/react-markdown/') ||
            id.includes('node_modules/unified/')
          ) {
            return 'content-processing'
          }
          if (id.includes('node_modules/@unocss/')) {
            return 'unocss'
          }
          if (
            id.includes('node_modules/jotai/') ||
            id.includes('node_modules/zustand/')
          ) {
            return 'state-management'
          }
          if (
            id.includes('node_modules/zod/') ||
            id.includes('node_modules/nanoid/') ||
            id.includes('node_modules/uuid/') ||
            id.includes('node_modules/clsx/') ||
            id.includes('node_modules/tailwind-merge/')
          ) {
            return 'utilities'
          }
          if (
            id.includes('node_modules/ws/') ||
            id.includes('node_modules/web-streams-polyfill/')
          ) {
            return 'web-standards'
          }
          if (id.includes('node_modules/flexsearch/')) {
            return 'flexsearch'
          }

          return undefined
        },
      },
    },
  }
}

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: verboseOutput ? 'info' : 'error',
  adapter: isVercel ? vercel() : cloudflare(),
  prefetch: {
    defaultStrategy: 'hover',
    throttle: 3,
  },
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
          value:
            '1; mode=block; report=https://pixelatedempathy.com/api/security/xss-report',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value:
            'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
        },
        {
          key: 'Content-Security-Policy',
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com https://cdn.pixelatedempathy.com https://www.googletagmanager.com https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://cdn.pixelatedempathy.com https://fonts.googleapis.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; font-src 'self' https://cdn.pixelatedempathy.com https://fonts.gstatic.com https://fonts.bunny.net https://cdn.jsdelivr.net data:; object-src 'none'; media-src 'self' https://cdn.pixelatedempathy.com; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; upgrade-insecure-requests",
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
          key: 'NEL',
          value:
            '{"report_to":"default","max_age":31536000,"include_subdomains":true}',
        },
        {
          key: 'Report-To',
          value:
            '{"group":"default","max_age":31536000,"endpoints":[{"url":"https://pixelatedempathy.com/api/security/reports"}],"include_subdomains":true}',
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
  integrations: vercelIntegrations,
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
        'sharp',
      ],
      external: [
        // Standard Node.js built-ins
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
        // Node.js built-ins with node: prefix
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:crypto',
        'node:process',
        'node:http',
        'node:https',
        'node:zlib',
        'node:child_process',
        'node:os',
        'node:util',
        'node:net',
        'node:tls',
        'node:assert',
        'node:buffer',
        'node:stream',
        'node:stream/web',
        'node:events',
        'node:url',
        'node:querystring',
        'node:timers',
        'node:cluster',
        'node:dns',
        'node:domain',
        'node:inspector',
        'node:perf_hooks',
        'node:punycode',
        'node:readline',
        'node:repl',
        'node:string_decoder',
        'node:tty',
        'node:v8',
        'node:vm',
        'node:worker_threads',
        'node:async_hooks',
        'node:diagnostics_channel',
        // Project specific externals
        'flexsearch',
        'flexsearch/dist/module/document',
      ],
      target: 'node',
    },
    ...vercelOptimizations,
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
        usePolling: true,
        interval: 1000,
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
        format: ['avif', 'webp', 'png', 'jpg'],
        cacheDir: './.astro/image-cache',
      },
    },
    domains: ['pixelatedempathy.com'],
    remotePatterns: [
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
  compressHTML: false,
  scopedStyleStrategy: 'class',
  build: {
    inlineStylesheets: 'auto',
  },
})
