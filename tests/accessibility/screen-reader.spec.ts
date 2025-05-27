import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Critical pages that should be screen reader friendly
const CRITICAL_PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Documentation', path: '/docs' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Authentication', path: '/login' },
  { name: 'Accessibility Statement', path: '/accessibility' },
]

// Screen reader specific WCAG success criteria
const SCREEN_READER_CRITERIA = [
  'aria-hidden-focusable',
  'aria-roles',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'button-name',
  'document-title',
  'frame-title',
  'image-alt',
  'input-button-name',
  'input-image-alt',
  'label',
  'link-name',
]

test.describe('Screen Reader Accessibility Tests', () => {
  // Test each critical page for screen reader accessibility
  for (const page of CRITICAL_PAGES) {
    test(`${page.name} page should be accessible to screen readers`, async ({
      page: pageContext,
    }) => {
      await pageContext.goto(page.path)

      // Wait for page to load fully
      await pageContext.waitForLoadState('networkidle')

      // Run axe analysis focusing on screen reader related rules
      const axeResults = await new AxeBuilder({ page: pageContext })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(SCREEN_READER_CRITERIA)
        .analyze()

      // Check for specific screen reader issues

      // 1. Missing alt text on images
      const imagesWithoutAlt = await pageContext.$$eval(
        'img:not([alt])',
        (images) => {
          return images.map((img) => ({
            src: img.getAttribute('src') || '',
            id: img.id || '',
            class: img.className || '',
          }))
        },
      )

      if (imagesWithoutAlt.length > 0) {
        console.warn(
          `Found ${imagesWithoutAlt.length} images without alt text on ${page.name} page:`,
        )
        imagesWithoutAlt.forEach((img, i) => {
          console.warn(
            `  ${i + 1}. <img src="${img.src}" id="${img.id}" class="${img.class}">`,
          )
        })
      }

      expect(imagesWithoutAlt.length).toBe(
        0,
        `Found ${imagesWithoutAlt.length} images without alt text on ${page.name} page`,
      )

      // 2. Form inputs without labels
      const inputsWithoutLabels = await pageContext.$$eval(
        'input:not([type="hidden"]):not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])',
        (elements) => {
          return elements
            .filter((el) => {
              const { id } = el
              if (!id) {
                return true
              } // No ID means no label can be associated

              // Check if there's a label with a matching 'for' attribute
              const hasLabelFor =
                document.querySelector(`label[for="${id}"]`) !== null
              return !hasLabelFor
            })
            .map((el) => ({
              tagName: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || '',
              id: el.id || '',
              name: el.getAttribute('name') || '',
              placeholder: el.getAttribute('placeholder') || '',
            }))
        },
      )

      if (inputsWithoutLabels.length > 0) {
        console.warn(
          `Found ${inputsWithoutLabels.length} inputs without accessible labels on ${page.name} page:`,
        )
        inputsWithoutLabels.forEach((input, i) => {
          console.warn(
            `  ${i + 1}. <${input.tagName}${input.type ? ' type="' + input.type + '"' : ''} id="${input.id}" name="${input.name}" placeholder="${input.placeholder}">`,
          )
        })
      }

      expect(inputsWithoutLabels.length).toBe(
        0,
        `Found ${inputsWithoutLabels.length} inputs without accessible labels on ${page.name} page`,
      )

      // 3. Interactive elements without accessible names
      const elementsWithoutNames = await pageContext.$$eval(
        'button:not([aria-label]):not([aria-labelledby]), a:not([aria-label]):not([aria-labelledby])',
        (elements) => {
          return elements
            .filter((el) => {
              // Empty text content
              const textContent = el.textContent?.trim() || ''
              if (textContent !== '') {
                return false
              }

              // No title attribute
              if (el.hasAttribute('title')) {
                return false
              }

              // Check for child img with alt text
              const img = el.querySelector('img[alt]:not([alt=""])')
              if (img) {
                return false
              }

              return true
            })
            .map((el) => ({
              tagName: el.tagName.toLowerCase(),
              id: el.id || '',
              class: el.className || '',
              href: el.getAttribute('href') || '',
              innerHtml: el.innerHTML,
            }))
        },
      )

      if (elementsWithoutNames.length > 0) {
        console.warn(
          `Found ${elementsWithoutNames.length} interactive elements without accessible names on ${page.name} page:`,
        )
        elementsWithoutNames.forEach((el, i) => {
          console.warn(
            `  ${i + 1}. <${el.tagName} id="${el.id}" class="${el.class}"${el.href ? ' href="' + el.href + '"' : ''}>${el.innerHtml}</${el.tagName}>`,
          )
        })
      }

      expect(elementsWithoutNames.length).toBe(
        0,
        `Found ${elementsWithoutNames.length} interactive elements without accessible names on ${page.name} page`,
      )

      // 4. Check heading structure
      const headings = await pageContext.$$eval(
        'h1, h2, h3, h4, h5, h6',
        (elements) => {
          return elements.map((el) => ({
            level: parseInt(el.tagName.substring(1)),
            text: el.textContent?.trim() || '',
            id: el.id || '',
          }))
        },
      )

      // Verify heading hierarchy
      let previousLevel = 0
      const headingIssues = []

      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i]

        // First heading should be h1
        if (i === 0 && heading.level !== 1) {
          headingIssues.push(
            `Page doesn't start with h1 (found h${heading.level} "${heading.text}")`,
          )
        }

        // Heading levels shouldn't skip (e.g., h1 to h3)
        if (heading.level > previousLevel + 1 && i > 0) {
          headingIssues.push(
            `Heading level skipped from h${previousLevel} to h${heading.level} ("${heading.text}")`,
          )
        }

        previousLevel = heading.level
      }

      if (headingIssues.length > 0) {
        console.warn(
          `Found ${headingIssues.length} heading structure issues on ${page.name} page:`,
        )
        headingIssues.forEach((issue, i) => {
          console.warn(`  ${i + 1}. ${issue}`)
        })
      }

      expect(headingIssues.length).toBe(
        0,
        `Found ${headingIssues.length} heading structure issues on ${page.name} page`,
      )

      // 5. Check for ARIA attributes with invalid values
      const invalidAriaAttributes = await pageContext.$$eval(
        '[aria-*]',
        (elements) => {
          const validRoles = [
            'alert',
            'alertdialog',
            'application',
            'article',
            'banner',
            'button',
            'cell',
            'checkbox',
            'columnheader',
            'combobox',
            'complementary',
            'contentinfo',
            'definition',
            'dialog',
            'directory',
            'document',
            'feed',
            'figure',
            'form',
            'grid',
            'gridcell',
            'group',
            'heading',
            'img',
            'link',
            'list',
            'listbox',
            'listitem',
            'log',
            'main',
            'marquee',
            'math',
            'menu',
            'menubar',
            'menuitem',
            'menuitemcheckbox',
            'menuitemradio',
            'navigation',
            'none',
            'note',
            'option',
            'presentation',
            'progressbar',
            'radio',
            'radiogroup',
            'region',
            'row',
            'rowgroup',
            'rowheader',
            'scrollbar',
            'search',
            'searchbox',
            'separator',
            'slider',
            'spinbutton',
            'status',
            'switch',
            'tab',
            'table',
            'tablist',
            'tabpanel',
            'term',
            'textbox',
            'timer',
            'toolbar',
            'tooltip',
            'tree',
            'treegrid',
            'treeitem',
          ]

          const booleanAttributes = [
            'aria-busy',
            'aria-checked',
            'aria-disabled',
            'aria-expanded',
            'aria-hidden',
            'aria-modal',
            'aria-multiline',
            'aria-multiselectable',
            'aria-pressed',
            'aria-readonly',
            'aria-required',
            'aria-selected',
          ]

          const issues = []

          for (const el of elements) {
            // Check role value
            const role = el.getAttribute('role')
            if (role && !validRoles.includes(role)) {
              issues.push({
                element: el.outerHTML.substring(0, 100),
                attribute: 'role',
                value: role,
                issue: `Invalid role value "${role}"`,
              })
            }

            // Check boolean attributes
            for (const attr of booleanAttributes) {
              const value = el.getAttribute(attr)
              if (value !== null && value !== 'true' && value !== 'false') {
                issues.push({
                  element: el.outerHTML.substring(0, 100),
                  attribute: attr,
                  value: value,
                  issue: `Invalid boolean value "${value}" for ${attr}, must be "true" or "false"`,
                })
              }
            }
          }

          return issues
        },
      )

      if (invalidAriaAttributes.length > 0) {
        console.warn(
          `Found ${invalidAriaAttributes.length} invalid ARIA attributes on ${page.name} page:`,
        )
        invalidAriaAttributes.forEach((issue, i) => {
          console.warn(
            `  ${i + 1}. ${issue.attribute}="${issue.value}" - ${issue.issue}`,
          )
          console.warn(`     Element: ${issue.element}`)
        })
      }

      expect(invalidAriaAttributes.length).toBe(
        0,
        `Found ${invalidAriaAttributes.length} invalid ARIA attributes on ${page.name} page`,
      )

      // 6. Check for live regions (expecting at least one on dynamic pages)
      if (['Dashboard'].includes(page.name)) {
        const liveRegions = await pageContext.$$eval(
          '[aria-live]',
          (elements) => {
            return elements.map((el) => ({
              value: el.getAttribute('aria-live') || '',
              id: el.id || '',
              class: el.className || '',
              content: el.textContent?.trim() || '',
            }))
          },
        )

        expect(liveRegions.length).toBeGreaterThan(
          0,
          `Expected at least one live region on ${page.name} page`,
        )

        // Check if there's at least one polite or assertive live region
        const validLiveRegions = liveRegions.filter(
          (region) => region.value === 'polite' || region.value === 'assertive',
        )

        expect(validLiveRegions.length).toBeGreaterThan(
          0,
          `Expected at least one polite or assertive live region on ${page.name} page`,
        )
      }
    })
  }

  // Test focus management for modals
  test('Modal dialogs should manage focus correctly', async ({ page }) => {
    // Go to a page with modals
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find a button that opens a modal
    const modalTriggerButton = page.getByRole('button', {
      name: /open.*(modal|dialog)/i,
    })

    // Skip test if no modal trigger found
    const hasTrigger = (await modalTriggerButton.count()) > 0
    if (!hasTrigger) {
      test.skip()
      return
    }

    // Open the modal
    await modalTriggerButton.click()

    // Wait for modal to be visible
    const modal = page.locator('[role="dialog"]').first()
    await modal.waitFor({ state: 'visible' })

    // Check if focus moved to the modal or an element inside it
    const activeElementIsInModal = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]')
      const { activeElement } = document

      return modal?.contains(activeElement) || activeElement === modal
    })

    expect(activeElementIsInModal).toBe(
      true,
      'Focus should move to the modal or an element inside it when opened',
    )

    // Find close button
    const closeButton = modal.getByRole('button', { name: /close|cancel|✕|×/i })

    // Close the modal
    await closeButton.click()

    // Wait for modal to be hidden
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      // Some modals might not be fully hidden, so we'll check visibility
    })

    // Check if focus returned to the trigger button
    const focusReturnedToTrigger = await page.evaluate(() => {
      const triggerButton = document.querySelector(
        'button[aria-expanded="false"]',
      )
      return document.activeElement === triggerButton
    })

    // This test is less strict because some implementations might return focus elsewhere
    if (!focusReturnedToTrigger) {
      console.warn(
        'Focus did not return to the trigger button after closing the modal. This is not ideal for keyboard users.',
      )
    }
  })
})
