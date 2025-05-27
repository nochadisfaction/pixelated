import type { AstroIntegration } from 'astro'
import type { VitesseConfig } from '../types'
import sitemap, { type SitemapOptions } from '@astrojs/sitemap'

export function getSitemapConfig(opts: VitesseConfig): SitemapOptions {
  const sitemapConfig: SitemapOptions = {}
  if (opts.isMultilingual) {
    sitemapConfig.i18n = {
      defaultLocale: opts.defaultLocale.locale || 'root',
      locales: Object.fromEntries(
        // eslint-disable-next-line ts/no-non-null-asserted-optional-chain
        Object.entries(opts.locales).map(([locale, config]) => [locale, config?.lang!]),
      ),
    }
  }
  return sitemapConfig
}

/**
 * A wrapped version of the `@astrojs/sitemap` integration configured based
 * on Vitesse i18n config.
 */
export function vitesseSitemap(opts: VitesseConfig): AstroIntegration {
  return sitemap(getSitemapConfig(opts))
}
