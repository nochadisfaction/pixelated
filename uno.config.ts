import type {
  IconNavItem,
  IconSocialItem,
  ResponsiveNavItem,
  ResponsiveSocialItem,
} from './src/types'
import transformerDirectives from '@unocss/transformer-directives'
import transformerVariantGroup from '@unocss/transformer-variant-group'
import presetAttributify from '@unocss/preset-attributify'
import presetIcons from '@unocss/preset-icons'
import presetUno from '@unocss/preset-uno'
import presetWebFonts from '@unocss/preset-web-fonts'
import { defineConfig } from 'unocss'
import { UI } from './src/config'
import projecstData from './src/content/projects/data.json'
import { extractIconsStartingWithI } from './src/utils/common'
import { VERSION_COLOR } from './src/utils/data'

// Add this:
// Check for environment variable to disable web font fetching
const disableWebFonts = process.env.DISABLE_WEB_FONTS === 'true'

const { internalNavs, socialLinks, githubView } = UI
const navIcons = internalNavs
  .filter(
    (item) =>
      item.displayMode !== 'alwaysText' &&
      item.displayMode !== 'textHiddenOnMobile',
  )
  .map((item) => (item as IconNavItem | ResponsiveNavItem).icon)
const socialIcons = socialLinks
  .filter(
    (item) =>
      item.displayMode !== 'alwaysText' &&
      item.displayMode !== 'textHiddenOnMobile',
  )
  .map((item) => (item as IconSocialItem | ResponsiveSocialItem).icon)

const projectIcons = extractIconsStartingWithI(projecstData.projects)

const versionClass = Object.values(VERSION_COLOR).flatMap((colorString) =>
  colorString.split(' '),
)

const subLogoIcons = githubView.subLogoMatches.map((item) => item[1])

export default defineConfig({
  // Theme extensions
  extendTheme: (theme) => {
    return {
      ...theme,
      breakpoints: {
        ...theme.breakpoints,
        lgp: '1128px',
      },
    }
  },

  // Theme configuration
  theme: {
    fontFamily: {
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      mono: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      condensed: '"Roboto Condensed", Arial Narrow, Arial, sans-serif',
    },
    colors: {
      primary: '#3b82f6', // blue-500
      secondary: '#64748b', // slate-500
      success: '#22c55e', // green-500
      danger: '#ef4444', // red-500
      oauth: '#4f46e5', // indigo-600
      github: '#24292e', // GitHub color
      google: '#ea4335', // Google color
    },
    spacing: {
      '20': '5rem', // Adding the missing spacing.20 value (80px)
    },
  },

  // Custom rules
  rules: [
    [
      /^bg-radial-gradient-(\d+)$/,
      ([, n]) => {
        return {
          'background-image': `radial-gradient(ellipse at bottom left, #ffffff 0%, #fefefe 70%, #88888855 ${n}%)`,
        }
      },
    ],
  ],

  // Shortcuts
  shortcuts: [
    [
      /^(\w+)-transition(?:-(\d+))?$/,
      (match) =>
        `transition-${match[1] === 'op' ? 'opacity' : match[1]} duration-${match[2] || '300'} ease-in-out`,
    ],
    ['description-transition', 'transition-all duration-300 ease-in-out'],
    [
      /^shadow-custom_(-?\d+)_(-?\d+)_(-?\d+)_(-?\d+)$/,
      ([_, x, y, blur, spread]) =>
        `shadow-[${x}px_${y}px_${blur}px_${spread}px_rgba(0,0,0,0.2)] dark:shadow-[${x}px_${y}px_${blur}px_${spread}px_rgba(255,255,255,0.4)]`,
    ],
    // Define buttons with inline styles using arbitrary values
    [
      'btn-base',
      'px-2.5 py-1 border border-[#8884] rounded opacity-50 transition-all duration-200 ease-out no-underline',
    ],
    [
      'btn-primary',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#3b82f6] hover:[&]:bg-[rgba(59,130,246,0.1)]',
    ],
    [
      'btn-success',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#22c55e] hover:[&]:bg-[rgba(34,197,94,0.1)]',
    ],
    [
      'btn-danger',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#ef4444] hover:[&]:bg-[rgba(239,68,68,0.1)]',
    ],
    [
      'btn-secondary',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#64748b] hover:[&]:bg-[rgba(100,116,139,0.1)]',
    ],
    [
      'btn-github',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#24292e] hover:[&]:bg-[rgba(36,41,46,0.1)]',
    ],
    [
      'btn-google',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#ea4335] hover:[&]:bg-[rgba(234,67,53,0.1)]',
    ],
    [
      'btn-oauth',
      'btn-base hover:[&]:opacity-100 hover:[&]:text-[#4f46e5] hover:[&]:bg-[rgba(79,70,229,0.1)]',
    ],
  ],

  // Presets
  presets: [
    presetUno({
      // Add reset CSS configuration
      preflight: true,
      includeAll: true,
      reset: {
        include: true,
        nocompatible: true,
      },
    }),
    presetAttributify({
      strict: true,
      prefix: 'u-',
      prefixedOnly: false,
    }),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        'display': 'inline-block',
        'height': '1.2em',
        'width': '1.2em',
        'vertical-align': 'text-bottom',
      },
    }),
    ...(disableWebFonts
      ? []
      : [
          presetWebFonts({
            provider: 'none',
            injectFallback: true,
            extendTheme: false,
          }),
        ]),
  ],

  // Preflights
  preflights: [
    {
      layer: 'base',
      getCSS: () => `
        /* Base styles to ensure proper font rendering */
        html {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        code, pre, kbd, samp {
          font-family: DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
      `,
    },
    {
      layer: 'base',
      getCSS: () => `
        /* Local font definitions */
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url('/fonts/inter-regular.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 600;
          font-display: swap;
          src: url('/fonts/inter-semibold.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 800;
          font-display: swap;
          src: url('/fonts/inter-extrabold.woff2') format('woff2');
        }

        @font-face {
          font-family: 'DM Mono';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url('/fonts/dm-mono-regular.woff2') format('woff2');
        }

        @font-face {
          font-family: 'DM Mono';
          font-style: normal;
          font-weight: 500;
          font-display: swap;
          src: url('/fonts/dm-mono-medium.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Roboto Condensed';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url('/fonts/roboto-condensed-regular.woff2') format('woff2');
        }
      `,
    },
  ],

  // Transformers
  transformers: [transformerDirectives(), transformerVariantGroup()],

  // Safelist
  safelist: [
    ...navIcons,
    ...socialIcons,
    ...projectIcons,
    'font-sans',
    'font-mono',
    'font-condensed',

    /* remark-directive-sugar */
    'i-carbon-logo-github',

    /* BaseLayout */
    'focus:not-sr-only',
    'focus:fixed',
    'focus:start-1',
    'focus:top-1.5',
    'focus:op-20',

    /* GithubItem */
    ...versionClass,
    ...subLogoIcons,

    /* Toc */
    'i-ri-menu-2-fill',
    'i-ri-menu-3-fill',

    /* Button styles */
    'btn-base',
    'btn-primary',
    'btn-success',
    'btn-danger',
    'btn-secondary',
    'btn-github',
    'btn-google',
    'btn-oauth',
    'px-2.5',
    'py-1',
    'border',
    'border-[#8884]',
    'rounded',
    'opacity-50',
    'transition-all',
    'duration-200',
    'ease-out',
    'no-underline',
    'hover:[&]:opacity-100',
    'hover:[&]:text-[#3b82f6]',
    'hover:[&]:bg-[rgba(59,130,246,0.1)]',
    'hover:[&]:text-[#22c55e]',
    'hover:[&]:bg-[rgba(34,197,94,0.1)]',
    'hover:[&]:text-[#ef4444]',
    'hover:[&]:bg-[rgba(239,68,68,0.1)]',
    'hover:[&]:text-[#64748b]',
    'hover:[&]:bg-[rgba(100,116,139,0.1)]',
    'hover:[&]:text-[#24292e]',
    'hover:[&]:bg-[rgba(36,41,46,0.1)]',
    'hover:[&]:text-[#ea4335]',
    'hover:[&]:bg-[rgba(234,67,53,0.1)]',
    'hover:[&]:text-[#4f46e5]',
    'hover:[&]:bg-[rgba(79,70,229,0.1)]',

    /* Additional utility classes that might be needed */
    'flex',
    'flex-col',
    'items-center',
    'text-center',
    'mt-0',
    'prose',
    'mx-auto',
    'mb-8',
    'relative',
    'min-h-screen',
    'text-gray-700',
    'dark:text-gray-200',
    'px-7',
    'py-10',
  ],
})
