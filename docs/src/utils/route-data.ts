import type { Route } from './routing'

import { render } from 'astro:content'
import config from 'virtual:vitesse/user-config'
import { formatPath } from './format-path'
import { getNavBar, type NavBarEntry } from './navigation'
import { generateToc, type TocHeading } from './toc'

export interface PageProps extends Route {

}

export interface VitesseRouteData extends Route {
  /** Title of the site. */
  siteTitle: string
  /** URL or path used as the link when clicking on the site title. */
  siteTitleHref: string
  isFullWidthLayout?: boolean
  /** Site navigation sidebar entries for this page. */
  navBar: NavBarEntry[]
  hasToc: boolean
  headings: TocHeading[]
}

/** Get the site title for a given language. */
export function getSiteTitle(lang: string): string {
  const defaultLang = config.defaultLocale.lang as string
  if (lang && config.title[lang]) {
    return config.title[lang] as string
  }
  return config.title[defaultLang] as string
}

export function getSiteTitleHref(locale: string | undefined): string {
  return formatPath(locale || '/')
}

export async function generateRouteData({
  props,
  url,
}: {
  props: PageProps
  url: URL
}): Promise<VitesseRouteData> {
  const { entry, locale, lang } = props
  const navBar = getNavBar(url.pathname, locale)
  let tocHeading: TocHeading[] = []

  const { remarkPluginFrontmatter: { hasToc = false }, headings } = await render(entry)

  if (hasToc) {
    tocHeading = generateToc(headings, 1, 4)
  }

  const siteTitle = getSiteTitle(lang)
  return {
    ...props,
    siteTitle,
    navBar,
    siteTitleHref: getSiteTitleHref(locale),
    isFullWidthLayout: entry?.data.layoutFullWidth,
    hasToc,
    headings: tocHeading,
  }
}
