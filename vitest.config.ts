/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'src/tests/simple-browser-compatibility.test.ts',
      'src/tests/browser-compatibility.test.ts',
      'src/tests/mobile-compatibility.test.ts',
      'src/tests/cross-browser-compatibility.test.ts',
      'src/e2e/breach-notification.spec.ts',
      // Add more Playwright/E2E test files here as needed
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    poolOptions: {
      threads: {},
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        'test/**',
        'tests/**',
        'vitest.config.ts',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    sourcemap: true,
  },
})
