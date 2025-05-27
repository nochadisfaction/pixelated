import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for accessibility testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../../playwright-report/accessibility' }],
    ['list'],
    ['json', { outputFile: '../../test-results/accessibility/results.json' }],
  ],
  use: {
    actionTimeout: 10000,
    baseURL: process.env.CI ? 'http://localhost:3000' : 'http://localhost:4321',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  outputDir: '../../test-results/accessibility/',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        forcedColors: 'active', // Simulate forced colors mode (high contrast)
      },
    },
    {
      name: 'keyboard-only',
      use: {
        ...devices['Desktop Chrome'],
        // No specific configuration for keyboard-only - tests themselves will restrict to keyboard navigation
      },
    },
  ],
  webServer: {
    command: process.env.CI ? 'pnpm preview' : 'pnpm dev',
    port: process.env.CI ? 3000 : 4321,
    reuseExistingServer: !process.env.CI,
  },
})
