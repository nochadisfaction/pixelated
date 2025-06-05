import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import UnoCSS from '@unocss/astro'
import compress from 'astro-compress'
import { defineConfig } from 'astro/config'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import sentry from '@sentry/astro'
import vitesse from 'astro-vitesse'

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

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server',
  logLevel: verboseOutput ? 'info' : 'warn',
  adapter: cloudflare(),
  prefetch: {
    defaultStrategy: 'hover',
    throttle: 3,
  },
  integrations: [
    // Astro-Vitesse integration - minimal, clean blog theme
    vitesse({
      title: 'Pixelated Empathy',
      description: 'AI-Powered Mental Health Research & Innovation',
      logo: '/images/logo.svg',
      author: {
        name: 'Pixelated Team',
        email: 'hello@pixelatedempathy.com',
        links: {
          github: 'https://github.com/pixelated-labs',
          twitter: 'https://twitter.com/pixelatedlabs',
        },
      },
      unocss: true,
      themeConfig: {
        // Navigation configuration
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Blog', link: '/posts' },
          { text: 'Research', link: '/research' },
          { text: 'About', link: '/about' },
          { text: 'Dashboard', link: '/dashboard' },
        ],
        // Social links in footer
        socialLinks: [
          { icon: 'github', link: 'https://github.com/pixelated-labs' },
          { icon: 'twitter', link: 'https://twitter.com/pixelatedlabs' },
        ],
        // Footer configuration
        footer: {
          message: 'Advancing Mental Health Through AI Innovation',
          copyright: 'Copyright © 2024 Pixelated Empathy',
        },
        // Enable search
        search: {
          provider: 'local',
        },
        // Theme colors
        colorScheme: 'auto', // auto, light, dark
        // Custom CSS variables for mental health theme
        cssVars: {
          '--vt-c-brand': '#00D4FF', // Mental health blue
          '--vt-c-brand-light': '#58E5FF',
          '--vt-c-brand-dark': '#0099CC',
        },
      },
    }),
    sentry({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: true,
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
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-sans', 'font-mono', 'font-condensed'],
      configFile: './uno.config.vitesse.ts',
      presets: {
        web: {
          timeout: 30000,
          disable: disableWebFonts,
        },
      },
      content: {
        filesystem: [
          'src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}',
          'components/**/*.{astro,js,ts,jsx,tsx,vue}',
        ],
      },
      transformers: [
        {
          name: 'unocss:reset',
          transform(code) {
            if (!code || typeof code !== 'string') {
              return code
            }
            if (code.includes('@unocss/reset/reset.css')) {
              return code.replace(
                '@unocss/reset/reset.css',
                '@unocss/reset/tailwind.css',
              )
            }
            return code
          },
        },
      ],
    }),
    compress({
      css: true,
      html: true,
      img: false,
      js: true,
      svg: false,
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
      conditions: ['import', 'module', 'browser', 'default'],
    },
    ssr: {
      noExternal: [
        '@google-cloud/storage',
        'stream-browserify',
        'util',
        'events',
        'path-browserify',
        'sharp',
      ],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      minify: false,
      cssMinify: true,
      reportCompressedSize: true,
      target: 'node18',
      ssr: true,
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
