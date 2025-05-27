import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { FEATURES } from '../lib/browser/feature-detection'

// Define types for compatibility results
interface PageResult {
  navigationSuccessful?: boolean
  visualIssues?: string[]
  criticalElements?: Record<string, boolean>
  interactions?: Record<string, { success: boolean; details?: string }>
  jsErrors?: string[]
  viewportAdaption?: {
    viewport: { width: number; height: number }
    hasViewportMeta: boolean
    hasHorizontalOverflow: boolean
    tooSmallTapTargets: Element[]
  }
  touchInputResults?: Record<string, { success: boolean; details?: string }>
}

interface CompatibilityResults {
  browsers: Record<
    string,
    {
      pages: Record<string, PageResult>
      features: Record<string, boolean>
    }
  >
}

// Skip browser compatibility tests in CI environment
const skipTests = process.env.SKIP_BROWSER_COMPAT_TESTS === 'true'

// Use conditional test execution with Playwright's test.describe
const testGroup = skipTests ? test.describe.skip : test.describe

testGroup('Cross-Browser Compatibility', () => {
  test('should test browser features and compatibility', async ({ page }) => {
    const compatibilityResults: CompatibilityResults = {
      browsers: {},
    }

    // Test each feature
    for (const [featureKey, feature] of Object.entries(FEATURES)) {
      const detectionCode = feature.detectionFn.toString()
      const result = await page.evaluate(`(${detectionCode})()`)
      compatibilityResults.browsers['chromium'] = {
        ...compatibilityResults.browsers['chromium'],
        features: {
          ...compatibilityResults.browsers['chromium']?.features,
          [featureKey]: Boolean(result),
        },
      }
    }

    // Save results
    const resultsPath = join(
      process.cwd(),
      'browser-compatibility-results.json',
    )
    await fs.writeFile(
      resultsPath,
      JSON.stringify(compatibilityResults, null, 2),
    )

    // Basic assertion to ensure test ran
    expect(Object.keys(compatibilityResults.browsers)).toHaveLength(1)
  })
})
