// Feature detection for critical features
(function() {
  // Define the polyfill check property
  const polyfillsCheckedKey = '__POLYFILLS_CHECKED';
  
  // Prevent duplicate polyfill loading
  if (window[polyfillsCheckedKey]) {
    return;
  }

  // Define the polyfill check property
  window[polyfillsCheckedKey] = true;

  // Log polyfill status
  const missingFeatures = [];

  // Check for critical features
  if (!('IntersectionObserver' in window)) {
    missingFeatures.push('IntersectionObserver');
  }
  if (!('ResizeObserver' in window)) {
    missingFeatures.push('ResizeObserver');
  }
  if (!('fetch' in window)) {
    missingFeatures.push('fetch');
  }
  if (!('Promise' in window)) {
    missingFeatures.push('Promise');
  }
  if (!('CustomElements' in window)) {
    missingFeatures.push('CustomElements');
  }
  if (!('fromEntries' in Object)) {
    missingFeatures.push('Object.fromEntries');
  }
  if (!('Buffer' in window)) {
    missingFeatures.push('Buffer');
  }

  // Load critical polyfills
  if (missingFeatures.length > 0) {
    console.warn('Browser is missing features that may affect functionality:', missingFeatures.join(', '));
    console.warn('Loading polyfills for critical features...');

    // Load Buffer polyfill which is critical for many features
    if (!('Buffer' in window)) {
      const script = document.createElement('script');
      script.src = '/polyfills/buffer-polyfill.js';
      script.async = false; // Load synchronously to ensure it's available before other scripts
      document.head.appendChild(script);
    }
  } else {
    console.log('All required browser features are supported.');
  }
})();

// Check if required features are supported
(function() {
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
    intersectionObserver: 'IntersectionObserver' in window,
    customElements: 'customElements' in window,
    modules: 'noModule' in document.createElement('script'),
    es6: (function() {
      try {
        eval('let a = 0; const b = () => {}; class C {}');
        return true;
      } catch (e) {
        return false;
      }
    })()
  };

  // Add class to HTML element for feature detection in CSS
  const html = document.documentElement;
  for (const feature in features) {
    if (features[feature]) {
      html.classList.add(feature + '-supported');
    } else {
      html.classList.add('no-' + feature);
    }
  }

  // Check for WebGL specifically and add fallback if not supported
  if (!features.webgl) {
    // Create a warning element for WebGL
    window.addEventListener('DOMContentLoaded', function() {
      const globeContainer = document.getElementById('globe-container');
      if (globeContainer) {
        globeContainer.innerHTML = '<div class="webgl-fallback">3D graphics not supported in your browser</div>';
        globeContainer.classList.add('fallback-active');
      }

      // Add fallback for background effects
      const bgPlum = document.querySelector('bg-plum');
      if (bgPlum) {
        bgPlum.innerHTML = '<div class="bg-fallback"></div>';
      }
    });
  }
})(); 