import {
  defineConfig,
  presetIcons,
  presetUno,
  presetAttributify,
  presetTypography,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    [
      'btn',
      'px-4 py-1 rounded inline-block bg-teal-600 text-white cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50',
    ],
    [
      'icon-btn',
      'text-[0.9em] inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600',
    ],
    // Responsive layout shortcuts
    ['container-responsive', 'w-full mx-auto px-4 sm:px-6 lg:px-8'],
    ['grid-responsive', 'grid gap-4 sm:gap-6 lg:gap-8'],
    ['flex-responsive', 'flex gap-4 sm:gap-6 lg:gap-8'],
    [
      'card-responsive',
      'bg-card border border-border rounded-lg p-4 sm:p-6 lg:p-8',
    ],
    ['text-responsive', 'text-sm sm:text-base lg:text-lg'],
    [
      'touch-target',
      'min-h-11 min-w-11 inline-flex items-center justify-center cursor-pointer select-none',
    ],
  ],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetTypography(),
  ],
  theme: {
    colors: {
      // Design system colors using CSS custom properties
      card: 'rgb(var(--color-card))',
      border: 'rgb(var(--color-border))',
      background: 'rgb(var(--color-background))',
      foreground: 'rgb(var(--color-foreground))',
      muted: 'rgb(var(--color-muted))',
      primary: 'rgb(var(--color-primary))',
      secondary: 'rgb(var(--color-secondary))',
      accent: 'rgb(var(--color-accent))',
      success: 'rgb(var(--color-success))',
      info: 'rgb(var(--color-info))',
      warning: 'rgb(var(--color-warning))',
      error: 'rgb(var(--color-error))',
      // Aliases for common patterns
      'card-foreground': 'rgb(var(--color-foreground))',
    },
    breakpoints: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    spacing: {
      'responsive-xs': 'clamp(0.25rem, 1vw, 0.5rem)',
      'responsive-sm': 'clamp(0.5rem, 2vw, 1rem)',
      'responsive-md': 'clamp(1rem, 3vw, 1.5rem)',
      'responsive-lg': 'clamp(1.5rem, 4vw, 2.5rem)',
      'responsive-xl': 'clamp(2rem, 5vw, 4rem)',
    },
    fontSize: {
      'responsive-xs': 'clamp(0.75rem, 1.5vw, 0.875rem)',
      'responsive-sm': 'clamp(0.875rem, 2vw, 1rem)',
      'responsive-base': 'clamp(1rem, 2.5vw, 1.125rem)',
      'responsive-lg': 'clamp(1.125rem, 3vw, 1.25rem)',
      'responsive-xl': 'clamp(1.25rem, 3.5vw, 1.5rem)',
      'responsive-2xl': 'clamp(1.5rem, 4vw, 2rem)',
      'responsive-3xl': 'clamp(2rem, 5vw, 3rem)',
    },
  },
  transformers: [],
  safelist: [
    'prose',
    'prose-sm',
    'prose-lg',
    'prose-xl',
    'prose-2xl',
    'dark:prose-invert',
    // Responsive utilities
    'container-responsive',
    'grid-responsive',
    'flex-responsive',
    'card-responsive',
    'text-responsive',
    'touch-target',
    // Responsive visibility
    'hidden-xs',
    'visible-xs',
    'hidden-sm',
    'visible-sm',
    'hidden-md',
    'visible-md',
    'hidden-lg',
    'visible-lg',
    // Mobile-specific
    'mobile-stack',
    'mobile-full-width',
    'mobile-center',
    'mobile-hide',
  ],
})
