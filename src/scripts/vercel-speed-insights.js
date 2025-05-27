/**
 * Vercel Speed Insights Integration
 *
 * This module provides safe ways to load Vercel Speed Insights while
 * avoiding common conflicts with custom element registries.
 */

// List of known custom elements used by Vercel Speed Insights
const VERCEL_CUSTOM_ELEMENTS = [
  'vercel-analytics',
  'vercel-speed-insights',
  'va-collecting',
]

// Set to true to enable debug logs
const DEBUG =
  typeof window !== 'undefined' &&
  (window.location.search.includes('debug=speed-insights') ||
    localStorage.getItem('debug-speed-insights') === 'true')

/**
 * Debug logger that only outputs when debugging is enabled
 */
function debugLog(...args) {
  if (DEBUG) {
    console.log('[Speed Insights Debug]', ...args)
  }
}

/**
 * Get if we're in development mode (safe for browser)
 */
function isDevelopment() {
  // Use import.meta which is supported in Vite/Astro
  return (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.DEV === true
  )
}

/**
 * Check if using Vercel environment or production environment
 */
export function isVercelOrProduction() {
  // Safe check for Vercel or production
  const isProd =
    typeof window !== 'undefined' &&
    // Vercel deployment indicators
    (window.location.hostname.endsWith('.vercel.app') ||
      // Look for Vercel env indicator in import.meta (Vite/Astro)
      (typeof import.meta !== 'undefined' &&
        import.meta.env &&
        (import.meta.env.PROD === true || import.meta.env.VERCEL === '1')) ||
      // Common production domains
      ['pixelatedempathy.com', 'www.pixelatedempathy.com'].includes(
        window.location.hostname,
      ))

  debugLog('Environment check:', {
    isProd,
    hostname:
      typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    isDev: isDevelopment(),
  })

  return isProd
}

/**
 * Safely loads Vercel Speed Insights script with conflict prevention
 */
export function loadSpeedInsights() {
  // Skip if not in production or Vercel environment
  if (!isVercelOrProduction()) {
    debugLog('Skipping in development environment')
    return
  }

  // Check if script already exists to prevent duplicate loading
  if (document.querySelector('script[src*="speed-insights"]')) {
    debugLog('Script already loaded, skipping duplicate load')
    return
  }

  debugLog('Attempting to load Speed Insights')

  // Use a better approach for Astro/Vite to load the module
  if (typeof window !== 'undefined') {
    // Method 1: Load via NPM package with a safe dynamic import pattern
    // This pattern works better with Vite and prevents build errors
    const loadModule = async () => {
      try {
        debugLog('Trying to import @vercel/speed-insights package')
        // This pattern is more compatible with Vite/Rollup tree-shaking
        const speedInsightsModule = await import('@vercel/speed-insights')
        if (
          speedInsightsModule &&
          typeof speedInsightsModule.inject === 'function'
        ) {
          debugLog('Package loaded successfully, calling inject()')
          speedInsightsModule.inject()
          console.debug('[Speed Insights] Successfully initialized via package')
        } else {
          debugLog(
            'Package loaded but inject() not found, falling back to script',
          )
          // Fallback if module loaded but inject not found
          loadSpeedInsightsScript()
        }
      } catch (error) {
        debugLog('Package import failed:', error)
        console.debug(
          '[Speed Insights] Package import failed, falling back to script:',
          error,
        )
        loadSpeedInsightsScript()
      }
    }

    // Execute the load function
    loadModule().catch((error) => {
      debugLog('Async module loading failed:', error)
      // Final fallback if the entire async function fails
      loadSpeedInsightsScript()
    })
  }
}

/**
 * Fallback method to load the script directly
 */
function loadSpeedInsightsScript() {
  debugLog('Loading via script tag directly')
  // Create script element
  const script = document.createElement('script')
  script.src = '/_vercel/speed-insights/script.js'
  script.defer = true
  script.dataset.sdkn = 'astro'
  script.dataset.sdkv = '1.0.0'

  // Add error handling
  script.onerror = (error) => {
    debugLog('Script loading failed:', error)
    console.error('Failed to load Vercel Speed Insights script:', error)
    // Don't attempt to retry - prevent console spam
  }

  script.onload = () => {
    debugLog('Script loaded successfully via script tag')
  }

  // Append to document
  document.head.appendChild(script)
  debugLog('Script tag appended to document head')
}

/**
 * Initialize Speed Insights with conflict prevention
 * This should be called in client-side code
 */
export function initSpeedInsights() {
  // Only run in browser context
  if (typeof window === 'undefined') {
    return
  }

  debugLog('Initializing Speed Insights')

  // Check if Speed Insights is already loaded through another method
  if (window.va || window.SI_CONFIGURATION) {
    debugLog('Speed Insights already initialized, skipping')
    return
  }

  // Check for conflicts first in development
  if (isDevelopment()) {
    checkForCustomElementConflicts()
  }

  // Allow time for other custom elements to register first
  // Use a shorter delay if in production
  const delay = isDevelopment() ? 1000 : 100

  debugLog(`Scheduling load with ${delay}ms delay`)

  setTimeout(() => {
    try {
      debugLog('Delay completed, loading Speed Insights')
      loadSpeedInsights()
    } catch (error) {
      debugLog('Error during Speed Insights initialization:', error)
      console.error('Error initializing Speed Insights:', error)
    }
  }, delay)
}

/**
 * Diagnose potential custom element registry conflicts
 * This is helpful for identifying the source of conflicts
 */
export function checkForCustomElementConflicts() {
  if (typeof window === 'undefined' || !window.customElements) {
    return
  }

  // Check if any Vercel custom elements are already defined
  VERCEL_CUSTOM_ELEMENTS.forEach((elementName) => {
    if (window.customElements.get(elementName)) {
      console.warn(
        `[Speed Insights] Potential conflict: Custom element "${elementName}" is already registered.`,
      )
    }
  })

  // Store original define method to monitor registrations
  const originalDefine = window.customElements.define
  window.customElements.define = function (name, constructor, options) {
    console.debug(`[Custom Elements] Registering: ${name}`)
    return originalDefine.call(this, name, constructor, options)
  }
}

// Export default function for direct import
export default initSpeedInsights
