import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import clerk from '@clerk/astro'
import icon from 'astro-icon'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  integrations: [clerk(), icon(), react(), sitemap()],
  adapter: vercel(),
  output: 'server',
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': buildCsp(),
    },
  },
})

/**
 * Generates a Content Security Policy (CSP) header string with directives tailored for trusted external services and enhanced security.
 *
 * The CSP includes specific sources for scripts, styles, fonts, frames, and other resources to support authentication, analytics, CDN assets, and deployment on Vercel.
 *
 * @returns {string} The constructed CSP header value.
 */
function buildCsp() {
  const clerkFapiHostname = 'https://clerk.pixelatedempathy.com'
  const cloudflareChallenges = 'https://challenges.cloudflare.com'
  const clerkImg = 'https://img.clerk.com'
  const vercelInsights = 'https://cdn.vercel-insights.com'
  const googleTagManager = 'https://www.googletagmanager.com'
  const vercelLive = 'https://vercel.live'
  const googleFonts = 'https://fonts.googleapis.com'
  const cdnJsdelivr = 'https://cdn.jsdelivr.net'
  const googleFontsStatic = 'https://fonts.gstatic.com'

  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      `https://${clerkFapiHostname}`,
      cloudflareChallenges,
      vercelInsights,
      googleTagManager,
      vercelLive,
      'data:',
    ].filter(Boolean),
    'style-src': ["'self'", "'unsafe-inline'", googleFonts, cdnJsdelivr, 'data:'],
    'connect-src': ["'self'", `https://${clerkFapiHostname}`],
    'img-src': ["'self'", 'data:', clerkImg],
    'font-src': ["'self'", googleFontsStatic, 'data:'],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'", cloudflareChallenges, vercelLive],
    'frame-ancestors': ["'self'", vercelLive],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  }

  return Object.entries(directives)
    .map(([key, value]) => {
      if (value.length === 0) {
        return key
      }
      return `${key} ${value.join(' ')}`
    })
    .join('; ')
}
