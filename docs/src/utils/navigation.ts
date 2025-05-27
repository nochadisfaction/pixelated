import type {
  InternalSidebarLinkItem,
  LinkHTMLAttributes,
  NavBarItem,
  SidebarLinkItem,
  SubNavBarItem,
} from '../schemas/navbar'
import type { Route } from './routing'

import type { VitesseConfig } from './user-config'
import { AstroError } from 'astro/errors'
import config from 'virtual:vitesse/user-config'
import { createPathFormatter } from './create-path-formatter'
import { formatPath } from './format-path'
import { pickLang } from './i18n'
import { ensureLeadingSlash, stripLeadingAndTrailingSlashes } from './path'
import { routes } from './routing'
import { localeToLang } from './slugs'

export interface Link {
  label: string
  href: string
  isCurrent: boolean
  attrs: LinkHTMLAttributes
  icon?: string
  hideLabel: boolean
  labelClass: string
  iconClass: string
  wrapperClass: string
}

export type NavBarEntry = Link

/** Check if a string starts with one of `http://` or `https://`. */
const isAbsolute = (link: string): boolean => /^https?:\/\//.test(link)

/** Test if two paths are equivalent even if formatted differently. */
function pathsMatch(pathA: string, pathB: string): boolean {
  const format = createPathFormatter({ trailingSlash: 'never' })
  return format(pathA) === format(pathB)
}

/** Create a link entry */
function makeLink({
  isCurrent = false,
  attrs = {},
  hideLabel = false,
  ...opts
}: {
  label: string
  href: string
  hideLabel: boolean
  isCurrent?: boolean
  attrs?: LinkHTMLAttributes | undefined
  icon?: string
  labelClass: string
  iconClass: string
  wrapperClass: string
}): Link {
  return { ...opts, isCurrent, hideLabel, attrs }
}

/** Process sidebar link options to create a link entry. */
function makeNavBarLink({ currentPathname, href, label, attrs, hideLabel, icon, iconClass, labelClass, wrapperClass }: {
  href: string
  label: string
  currentPathname: string
  hideLabel: boolean
  attrs?: LinkHTMLAttributes
  icon?: string
  labelClass: string
  iconClass: string
  wrapperClass: string
}): Link {
  if (!isAbsolute(href)) {
    href = formatPath(href)
  }
  const isCurrent = pathsMatch(encodeURI(href), currentPathname)
  return makeLink({ label, href, isCurrent, attrs, hideLabel, icon, iconClass, labelClass, wrapperClass })
}

/** Create a link entry from a manual link item in user config. */
function linkFromNavBarLinkItem(
  item: SidebarLinkItem,
  locale: string | undefined,
  currentPathname: string,
): Link {
  let href = item.link
  if (!isAbsolute(href)) {
    href = ensureLeadingSlash(href)
    // Inject current locale into link.
    if (locale)
      href = `/${locale}${href}`
  }
  const label = pickLang(item.translations, localeToLang(locale)) || item.label
  return makeNavBarLink(
    {
      href,
      label,
      currentPathname,
      attrs: item.attrs,
      hideLabel: item.hideLabel,
      icon: item.icon,
      labelClass: item.labelClass,
      iconClass: item.iconClass,
      wrapperClass: item.wrapperClass,
    },
  )
}

function getLocalizedSlugAndEntry(item: { slug: string }, locale: string | undefined, routes: Route[]): { entry: Route } {
  const slug = item.slug === 'index' ? '' : item.slug
  const localizedSlug = locale ? (slug ? `${locale}/${slug}` : locale) : slug
  const entry = routes.find(entry => localizedSlug === entry.slug)
  if (!entry) {
    const hasExternalSlashes = item.slug.at(0) === '/' || item.slug.at(-1) === '/'
    if (hasExternalSlashes) {
      throw new AstroError(
        `The slug \`"${item.slug}"\` specified in the Vitesse navBar config must not start or end with a slash.`,
        `Please try updating \`"${item.slug}"\` to \`"${stripLeadingAndTrailingSlashes(item.slug)}"\`.`,
      )
    }
    else {
      throw new AstroError(
        `The slug \`"${item.slug}"\` specified in the Vitesse navBar config does not exist.`,
        'Update the Vitesse config to reference a valid entry slug in the docs content collection.\n'
        + 'Learn more about Astro content collection slugs at https://docs.astro.build/en/reference/api-reference/#getentry',
      )
    }
  }
  return { entry }
}

function linkFromInternalNavBarLinkItem(
  item: InternalSidebarLinkItem,
  locale: string | undefined,
  currentPathname: string,
): Link {
  const { entry } = getLocalizedSlugAndEntry(item, locale, routes)
  const label = pickLang(item.translations, localeToLang(locale)) || item.label || entry.entry.data.title
  return makeNavBarLink({
    href: entry.slug,
    label,
    currentPathname,
    attrs: item.attrs,
    hideLabel: item.hideLabel,
    icon: item.icon,
    labelClass: item.labelClass,
    iconClass: item.iconClass,
    wrapperClass: item.wrapperClass,
  })
}

/** Convert an item in a user’s navBar config to a navBar entry. */
function configItemToEntry(
  item: NavBarItem,
  currentPathname: string,
  locale: string | undefined,
): NavBarEntry {
  if ('link' in item) {
    return linkFromNavBarLinkItem(item, locale, currentPathname)
  }

  return linkFromInternalNavBarLinkItem(item, locale, currentPathname)
}

/** Get the navBar for the current page using the specified navBar config. */
export function getNavbarFromConfig(
  navBarConfig: VitesseConfig['navBar'],
  pathname: string,
  locale: string | undefined,
): NavBarEntry[] {
  if (!navBarConfig) {
    return []
  }

  return navBarConfig.map(group => configItemToEntry(group, pathname, locale))
}

export function getNavBar(pathname: string, locale: string | undefined): NavBarEntry[] {
  return getNavbarFromConfig(config.navBar, pathname, locale)
}

export type SubNavBarEntry = Pick<Link, 'label' | 'href' | 'isCurrent' | 'attrs'>

export type SubNavBarLink = SubNavBarEntry

function makeSubNavLink({
  isCurrent = false,
  attrs = {},
  ...opts
}: {
  label: string
  href: string
  isCurrent?: boolean
  attrs?: LinkHTMLAttributes | undefined
}): SubNavBarLink {
  return { ...opts, isCurrent, attrs }
}

function makeSubNavBarLink({ currentPathname, href, label, attrs }: {
  href: string
  label: string
  currentPathname: string
  attrs?: LinkHTMLAttributes
}): SubNavBarLink {
  if (!isAbsolute(href)) {
    href = formatPath(href)
  }
  const isCurrent = pathsMatch(encodeURI(href), currentPathname)
  return makeSubNavLink({ label, href, isCurrent, attrs })
}

function linkFromInternalSubNavBarLinkItem(
  item: SubNavBarItem,
  locale: string | undefined,
  currentPathname: string,
): SubNavBarLink {
  const { entry } = getLocalizedSlugAndEntry(item, locale, routes)
  const label = pickLang(item.translations, localeToLang(locale)) || item.label || entry.entry.data.title
  return makeSubNavBarLink({
    href: entry.slug,
    label,
    currentPathname,
    attrs: item.attrs,
  })
}

function configItemToEntrySubNavBar(
  item: SubNavBarItem,
  currentPathname: string,
  locale: string | undefined,
): SubNavBarEntry {
  return linkFromInternalSubNavBarLinkItem(item, locale, currentPathname)
}

export function getSubNavbarFromConfig(subNavBarConfig: VitesseConfig['subNavBar'], pathname: string, locale: string | undefined): SubNavBarEntry[] {
  if (!subNavBarConfig) {
    return []
  }

  return subNavBarConfig.map(subNavBar => configItemToEntrySubNavBar(subNavBar, pathname, locale))
}
