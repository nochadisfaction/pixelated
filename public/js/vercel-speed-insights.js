// Vercel Speed Insights with conflict prevention approach
export function initSpeedInsights() {
  // Check if already initialized
  if (window.__VERCEL_SPEED_INSIGHTS_INITIALIZED) {
    return;
  }
  
  // Set flag to prevent duplicate initialization
  window.__VERCEL_SPEED_INSIGHTS_INITIALIZED = true;
  
  // Actual initialization logic would go here
  console.log('Speed Insights initialized');
}

// Initialize on DOMContentLoaded and again on Astro page transitions
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initSpeedInsights, 0); // Immediate queue for initial page
});
document.addEventListener('astro:page-load', () => {
  setTimeout(initSpeedInsights, 0); // Immediate queue for page transitions
}); 