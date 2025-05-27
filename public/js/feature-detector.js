/**
 * Feature Detector
 *
 * Detects browser feature support and conditionally loads polyfills
 * for unsupported features. This provides progressive enhancement
 * while minimizing unnecessary code for modern browsers.
 */

;(function () {
  // Create a list of features and their detection methods
  const features = {
    cssVariables: () =>
      window.CSS && window.CSS.supports && window.CSS.supports('(--a: 0)'),
    flexbox: () =>
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports('display', 'flex'),
    grid: () =>
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports('display', 'grid'),
    position_sticky: () =>
      window.CSS &&
      window.CSS.supports &&
      (window.CSS.supports('position', 'sticky') ||
        window.CSS.supports('position', '-webkit-sticky')),
    scrollBehavior: () => 'scrollBehavior' in document.documentElement.style,
    objectFit: () => 'objectFit' in document.documentElement.style,
    viewTransitions: () => typeof document.startViewTransition === 'function',
    backdropFilter: () =>
      window.CSS &&
      window.CSS.supports &&
      (window.CSS.supports('backdrop-filter', 'blur(2px)') ||
        window.CSS.supports('-webkit-backdrop-filter', 'blur(2px)')),
    aspectRatio: () =>
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports('aspect-ratio', '16/9'),
    textWrapBalance: () =>
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports('text-wrap', 'balance'),
    customProperties: () =>
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports('color', 'var(--primary)'),
    intersectionObserver: () => 'IntersectionObserver' in window,
    resizeObserver: () => 'ResizeObserver' in window,
    fetch: () => 'fetch' in window,
    customElements: () => 'customElements' in window,
    objectFromEntries: () => 'fromEntries' in Object,
    arrayFindLast: () => 'findLast' in Array.prototype,
    stringReplaceAll: () => 'replaceAll' in String.prototype,
    buffer: () => typeof Buffer !== 'undefined',
  }

  // Keep track of unsupported features to load polyfills
  const unsupportedFeatures = {}

  // Check all features
  for (const [feature, testFn] of Object.entries(features)) {
    try {
      const isSupported = testFn()
      unsupportedFeatures[feature] = !isSupported

      // Add a class to the HTML element for each unsupported feature
      if (!isSupported) {
        document.documentElement.classList.add(`no-${feature}`)
      }
    } catch (error) {
      // If the test throws an error, consider the feature unsupported
      console.error(`Error testing feature '${feature}':`, error)
      unsupportedFeatures[feature] = true
      document.documentElement.classList.add(`no-${feature}`)
    }
  }

  // Save feature detection results to window for potential usage elsewhere
  window.featureDetection = {
    unsupportedFeatures,
    loadedPolyfills: [],
  }

  // Inline Buffer polyfill definition (but do not apply yet)
  const BufferPolyfill = function (arg, encodingOrOffset, length) {
    if (!(this instanceof BufferPolyfill)) {
      return new BufferPolyfill(arg, encodingOrOffset, length)
    }
    if (typeof arg === 'string') {
      const encoder = new TextEncoder()
      this._data = encoder.encode(arg)
    } else if (Array.isArray(arg) || arg instanceof Uint8Array) {
      this._data = new Uint8Array(arg)
    } else if (arg instanceof ArrayBuffer) {
      this._data = new Uint8Array(arg)
    } else if (typeof arg === 'number') {
      this._data = new Uint8Array(arg)
    } else {
      this._data = new Uint8Array(0)
    }
  }
  BufferPolyfill.prototype.toString = function (encoding) {
    const decoder = new TextDecoder(encoding || 'utf-8')
    return decoder.decode(this._data)
  }
  BufferPolyfill.prototype.slice = function (start, end) {
    return new BufferPolyfill(this._data.slice(start, end))
  }
  BufferPolyfill.from = function (data, encodingOrOffset, length) {
    return new BufferPolyfill(data, encodingOrOffset, length)
  }
  BufferPolyfill.alloc = function (size, fill, encoding) {
    const buffer = new BufferPolyfill(new Uint8Array(size))
    if (fill !== undefined) {
      const fillValue =
        typeof fill === 'string'
          ? new TextEncoder().encode(fill)[0]
          : typeof fill === 'number'
            ? fill
            : 0
      for (let i = 0; i < size; i++) {
        buffer._data[i] = fillValue
      }
    }
    return buffer
  }
  BufferPolyfill.isBuffer = function (obj) {
    return obj instanceof BufferPolyfill
  }

  // Map features to their corresponding polyfills
  const polyfillMap = {
    cssVariables: '/js/css-feature-fallbacks.js',
    position_sticky: '/js/css-feature-fallbacks.js',
    scrollBehavior: '/js/css-feature-fallbacks.js',
    textWrapBalance: '/js/css-feature-fallbacks.js',
    viewTransitions: '/js/css-feature-fallbacks.js',
    intersectionObserver: '/polyfills/intersection-observer.js',
    resizeObserver: '/polyfills/resize-observer-polyfill.js',
    fetch: '/polyfills/fetch.umd.js',
    customElements: '/polyfills/custom-elements.min.js',
    objectFromEntries: '/polyfills/object-fromentries.js',
    arrayFindLast: '/polyfills/array-findlast.js',
    stringReplaceAll: '/polyfills/string-replaceall.js',
    buffer: '/polyfills/buffer-polyfill.js', // hypothetical external polyfill
  }

  // Load all needed polyfills
  const polyfillsToLoad = []

  // Function to load a script
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = () => {
        window.featureDetection.loadedPolyfills.push(src)
        resolve()
      }
      script.onerror = () => reject(new Error(`Failed to load script ${src}`))
      document.head.appendChild(script)
    })
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
