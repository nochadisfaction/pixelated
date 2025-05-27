import type { AstroConfig } from 'astro'
import type { VitesseConfig } from '../../types'
import { getCollectionPath } from '../../loaders'
import { slugToLocale } from './slug-to-locale'

/** Get current locale from the full file path. */
export function pathToLocale(
  path: string | undefined,
  {
    vitesseConfig,
    astroConfig,
  }: {
    vitesseConfig: Pick<VitesseConfig, 'defaultLocale' | 'locales'>
    astroConfig: { root: AstroConfig['root'], srcDir: AstroConfig['srcDir'] }
  },
): string | undefined {
  const pagesPath = getCollectionPath('pages', astroConfig.srcDir)
  // Format path to unix style path.
  path = path?.replace(/\\/g, '/')
  // Ensure that the page path starts with a slash if the docs directory also does,
  // which makes stripping the docs path in the next step work on Windows, too.
  if (path && !path.startsWith('/') && pagesPath.startsWith('/'))
    path = `/${path}`
  // Strip docs path leaving only content collection file ID.
  // Example: /Users/houston/repo/src/content/docs/en/guide.md => en/guide.md
  const slug = path?.replace(pagesPath, '')
  return slugToLocale(slug, vitesseConfig)
}
