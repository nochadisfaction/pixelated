/**
 * Feature Detector
 *
 * Detects browser feature support and conditionally loads polyfills
 * for unsupported features. This provides progressive enhancement
 * while minimizing unnecessary code for modern browsers.
 */

// Feature Detection for critical browser features
(function() {
  // Check if required features are supported
  const features = {
    webgl: (function() {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch(e) {
        return false;
      }
    })(),
  }

  // Collect all unique polyfills to load (except Buffer, which is handled separately)
  for (const [feature, isUnsupported] of Object.entries(unsupportedFeatures)) {
    if (
      isUnsupported &&
      feature !== 'buffer' &&
      polyfillMap[feature] &&
      !polyfillsToLoad.includes(polyfillMap[feature])
    ) {
      polyfillsToLoad.push(polyfillMap[feature])
    }
  }

  // Buffer polyfill logic (async + fallback)
  let bufferPolyfillPromise = Promise.resolve()
  if (unsupportedFeatures.buffer) {
    const bufferPolyfillUrl = polyfillMap.buffer
    if (bufferPolyfillUrl) {
      bufferPolyfillPromise = loadScript(bufferPolyfillUrl).catch((err) => {
        console.error('Failed to load Buffer polyfill', err)
        // Fallback to inline BufferPolyfill if import fails
        window.Buffer = BufferPolyfill
        window.featureDetection.loadedPolyfills.push(
          'inline-buffer-polyfill-fallback',
        )
        console.log('Using inline Buffer polyfill as fallback')
      })
    } else {
      // No external polyfill, use inline immediately
      window.Buffer = BufferPolyfill
      window.featureDetection.loadedPolyfills.push('inline-buffer-polyfill')
      console.log('Buffer polyfill loaded successfully (inline)')
    }
  }

  // Log which polyfills are being loaded
  if (polyfillsToLoad.length > 0) {
    console.log('Loading polyfills for unsupported features:', polyfillsToLoad)
    if (window.navigator.sendBeacon) {
      try {
        const polyfillData = {
          unsupportedFeatures: Object.keys(unsupportedFeatures).filter(
            (f) => unsupportedFeatures[f],
          ),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
        const analyticsEndpoint =
          window.ANALYTICS_ENDPOINT || '/api/analytics/polyfill-usage'
        navigator.sendBeacon(analyticsEndpoint, JSON.stringify(polyfillData))
      } catch (e) {
        console.error('Failed to send polyfill analytics', e)
      }
    }
  }

  // Load all polyfills in parallel, including Buffer polyfill logic
  Promise.all([...polyfillsToLoad.map(loadScript), bufferPolyfillPromise])
    .then(() => {
      console.log('All polyfills loaded successfully')
      window.dispatchEvent(new CustomEvent('polyfills-loaded'))
    })
    .catch((error) => {
      console.error('Failed to load some polyfills', error)
      window.dispatchEvent(
        new CustomEvent('polyfills-loaded', { detail: { error } }),
      )
    })
})()
