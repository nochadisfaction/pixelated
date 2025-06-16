import { defineConfig, presetAttributify, presetTypography, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetTypography(),
  ],
  shortcuts: [
    // Base buttons with mental health theme
    [
      'btn',
      'px-4 py-2 rounded-lg inline-block bg-gradient-to-r from-blue-500 to-teal-500 text-white cursor-pointer hover:from-blue-600 hover:to-teal-600 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50 transition-all duration-200',
    ],
    ['btn-primary', 'bg-blue-600 hover:bg-blue-700 text-white'],
    [
      'btn-secondary',
      'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
    ],
    [
      'btn-mental-health',
      'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white',
    ],

    // Icon buttons
    [
      'icon-btn',
      'text-[0.9em] inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400',
    ],

    // Cards and containers
    [
      'card',
      'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6',
    ],
    [
      'card-hover',
      'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200',
    ],

    // Professional gradient styles
    [
      'mental-health-gradient',
      'bg-gradient-to-br from-blue-50 to-gray-50 dark:from-blue-900/10 dark:to-gray-900/10',
    ],
    [
      'therapy-card',
      'bg-gradient-to-br from-blue-50 to-gray-50 dark:from-blue-900/10 dark:to-gray-900/10 border-l-4 border-blue-500',
    ],
    [
      'research-card',
      'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-l-4 border-purple-500',
    ],
    [
      'ai-card',
      'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-l-4 border-cyan-500',
    ],

    // Navigation
    [
      'nav-link',
      'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md transition-colors duration-200',
    ],
    [
      'nav-link-active',
      'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    ],

    // Text utilities
    [
      'text-mental-health',
      'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600',
    ],
    ['text-therapy', 'text-emerald-600 dark:text-emerald-400'],
    ['text-research', 'text-purple-600 dark:text-purple-400'],
    ['text-ai', 'text-cyan-600 dark:text-cyan-400'],
  ],
  theme: {
    colors: {
      // Mental health color palette
      'mental-health': {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
      'therapy': {
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
      },
      'research': {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7c3aed',
        800: '#6b21a8',
        900: '#581c87',
      },
      'ai': {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        700: '#0e7490',
        800: '#155e75',
        900: '#164e63',
      },
    },
    fontFamily: {
      sans: ['system-ui', 'sans-serif'],
      mono: ['monospace'],
      display: ['system-ui', 'sans-serif'],
    },
    animation: {
      'fade-in': 'fadeIn 0.5s ease-in-out',
      'slide-up': 'slideUp 0.3s ease-out',
      'pulse-soft': 'pulseSoft 2s infinite',
    },
  },
  safelist: [
    // Prose classes for markdown content
    'prose',
    'prose-sm',
    'prose-lg',
    'prose-xl',
    'prose-2xl',
    'dark:prose-invert',

    // Mental health specific classes
    'mental-health-gradient',
    'therapy-card',
    'research-card',
    'ai-card',

    // Blog and content classes
    'prose-blue',
    'prose-emerald',
    'prose-purple',
    'prose-cyan',
  ],
  rules: [
    // Custom animation keyframes
    [
      /^animate-fade-in$/,
      () => `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      animation: fadeIn 0.5s ease-in-out;
    `,
    ],
    [
      /^animate-slide-up$/,
      () => `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      animation: slideUp 0.3s ease-out;
    `,
    ],
    [
      /^animate-pulse-soft$/,
      () => `
      @keyframes pulseSoft {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      animation: pulseSoft 2s infinite;
    `,
    ],
  ],
})
