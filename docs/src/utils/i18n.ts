import type { AstroConfig } from 'astro'
import type { VitesseConfig } from './user-config'
import { AstroError } from 'astro/errors'

/**
 * A list of well-known right-to-left languages used as a fallback when determining the text
 * direction of a locale is not supported by the `Intl.Locale` API in the current environment.
 *
 * @see getLocaleDir()
 * @see https://en.wikipedia.org/wiki/IETF_language_tag#List_of_common_primary_language_subtags
 */
const wellKnownRTL = ['ar', 'fa', 'he', 'prs', 'ps', 'syc', 'ug', 'ur']

/** Informations about the built-in default locale used as a fallback when no locales are defined. */
export const BuiltInDefaultLocale = { ...getLocaleInfo('en'), lang: 'en' }

/**
 * Processes the Astro and Vitesse i18n configurations to generate/update them accordingly:
 *
 *  - If no Astro and Vitesse i18n configurations are provided, the built-in default locale is
 * used in Vitesse and the generated Astro i18n configuration will match it.
 *  - If only a Vitesse i18n configuration is provided, an equivalent Astro i18n configuration is
 * generated.
 *  - If only an Astro i18n configuration is provided, an equivalent Vitesse i18n configuration is
 * used.
 *  - If both an Astro and Vitesse i18n configurations are provided, an error is thrown.
 */
// eslint-disable-next-line ts/explicit-function-return-type
export function processI18nConfig(
  vitesseConfig: VitesseConfig,
  astroI18nConfig: AstroConfig['i18n'],
) {
  // We don't know what to do if both an Astro and Vitesse i18n configuration are provided.
  if (astroI18nConfig && !vitesseConfig.isUsingBuiltInDefaultLocale) {
    throw new AstroError(
      'Cannot provide both an Astro `i18n` configuration and a Vitesse `locales` configuration.',
      'Remove one of the two configurations.\nSee more at https://vitesse.astro.build/guides/i18n/',
    )
  }
  else if (astroI18nConfig) {
    // If a Vitesse compatible Astro i18n configuration is provided, we generate the matching
    // Vitesse configuration.
    return {
      astroI18nConfig,
      vitesseConfig: {
        ...vitesseConfig,
        ...getVitesseI18nConfig(astroI18nConfig),
      } as VitesseConfig,
    }
  }
  // Otherwise, we generate the Astro i18n configuration based on the Vitesse configuration.
  return { astroI18nConfig: getAstroI18nConfig(vitesseConfig), vitesseConfig }
}

/** Generate an Astro i18n configuration based on a Vitesse configuration. */
function getAstroI18nConfig(config: VitesseConfig): NonNullable<AstroConfig['i18n']> {
  return {
    defaultLocale:
      config.defaultLocale.lang ?? config.defaultLocale.locale ?? BuiltInDefaultLocale.lang,
    locales: config.locales
      ? Object.entries(config.locales).map(([locale, localeConfig]) => {
        return {
          codes: [localeConfig?.lang ?? locale],
          path: locale === 'root' ? localeConfig?.lang ?? BuiltInDefaultLocale.lang : locale,
        }
      })
      : [config.defaultLocale.lang],
    routing: {
      prefixDefaultLocale:
        // Sites with multiple languages without a root locale.
        (config.isMultilingual && config.locales?.root === undefined)
        // Sites with a single non-root language different from the built-in default locale.
        || (!config.isMultilingual && config.locales !== undefined),
      redirectToDefaultLocale: false,
      // TODO: remove this ignore comment for Astro v5
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore — Only used in Astro >=4.15.0, but Vitesse supports ^4.8.6
      fallbackType: 'redirect',
    },
  }
}

/** Generate a Vitesse i18n configuration based on an Astro configuration. */
function getVitesseI18nConfig(
  astroI18nConfig: NonNullable<AstroConfig['i18n']>,
): Pick<VitesseConfig, 'isMultilingual' | 'locales' | 'defaultLocale'> {
  if (astroI18nConfig.routing === 'manual') {
    throw new AstroError(
      'Vitesse is not compatible with the `manual` routing option in the Astro i18n configuration.',
    )
  }

  const prefixDefaultLocale = astroI18nConfig.routing.prefixDefaultLocale
  const isMultilingual = astroI18nConfig.locales.length > 1
  const isMonolingualWithRootLocale = !isMultilingual && !prefixDefaultLocale

  const locales = isMonolingualWithRootLocale
    ? undefined
    : Object.fromEntries(
      astroI18nConfig.locales.map(locale => [
        isDefaultAstroLocale(astroI18nConfig, locale) && !prefixDefaultLocale
          ? 'root'
          : isAstroLocaleExtendedConfig(locale)
            ? locale.path
            : locale,
        inferVitesseLocaleFromAstroLocale(locale),
      ]),
    )

  const defaultAstroLocale = astroI18nConfig.locales.find(locale =>
    isDefaultAstroLocale(astroI18nConfig, locale),
  )

  // This should never happen as Astro validation should prevent this case.
  if (!defaultAstroLocale) {
    throw new AstroError(
      'Astro default locale not found.',
      'This should never happen. Please open a new issue: https://github.com/adrian-ub/astro-vitesse/issues/new',
    )
  }

  return {
    isMultilingual,
    locales,
    defaultLocale: {
      ...inferVitesseLocaleFromAstroLocale(defaultAstroLocale),
      locale:
        isMonolingualWithRootLocale || (isMultilingual && !prefixDefaultLocale)
          ? undefined
          : isAstroLocaleExtendedConfig(defaultAstroLocale)
            ? defaultAstroLocale.codes[0]
            : defaultAstroLocale,
    },
  }
}

/** Infer Vitesse locale informations based on a locale from an Astro i18n configuration. */
function inferVitesseLocaleFromAstroLocale(astroLocale: AstroLocale): { lang: string, label: string, dir: 'ltr' | 'rtl' } {
  const lang = isAstroLocaleExtendedConfig(astroLocale) ? astroLocale.codes[0] : astroLocale
  return { ...getLocaleInfo(lang), lang }
}

/** Check if the passed locale is the default locale in an Astro i18n configuration. */
function isDefaultAstroLocale(
  astroI18nConfig: NonNullable<AstroConfig['i18n']>,
  locale: AstroLocale,
): boolean {
  return (
    (isAstroLocaleExtendedConfig(locale) ? locale.path : locale) === astroI18nConfig.defaultLocale
  )
}

/**
 * Check if the passed Astro locale is using the object variant.
 * @see AstroLocaleExtendedConfig
 */
function isAstroLocaleExtendedConfig(locale: AstroLocale): locale is AstroLocaleExtendedConfig {
  return typeof locale !== 'string'
}

/** Returns the locale informations such as a label and a direction based on a BCP-47 tag. */
function getLocaleInfo(lang: string): { label: string, dir: 'ltr' | 'rtl' } {
  try {
    const locale = new Intl.Locale(lang)
    const label = new Intl.DisplayNames(locale, { type: 'language' }).of(lang)
    if (!label || lang === label)
      throw new Error('Label not found.')
    return {
      label: label[0]?.toLocaleUpperCase(locale) + label.slice(1),
      dir: getLocaleDir(locale),
    }
  }
  catch {
    throw new AstroError(
      `Failed to get locale informations for the '${lang}' locale.`,
      'Make sure to provide a valid BCP-47 tags (e.g. en, ar, or zh-CN).',
    )
  }
}

/**
 * Returns the direction of the passed locale.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getTextInfo
 */
function getLocaleDir(locale: Intl.Locale): 'ltr' | 'rtl' {
  if ('textInfo' in locale) {
    // @ts-expect-error - `textInfo` is not typed but is available in v8 based environments.
    return locale.textInfo.direction
  }
  else if ('getTextInfo' in locale) {
    // @ts-expect-error - `getTextInfo` is not typed but is available in some non-v8 based environments.
    return locale.getTextInfo().direction
  }
  // Firefox does not support `textInfo` or `getTextInfo` yet so we fallback to a well-known list
  // of right-to-left languages.
  return wellKnownRTL.includes(locale.language) ? 'rtl' : 'ltr'
}

/**
 * Get the string for the passed language from a dictionary object.
 *
 * TODO: Make this clever. Currently a simple key look-up, but should use
 * BCP-47 mapping so that e.g. `en-US` returns `en` strings, and use the
 * site’s default locale as a last resort.
 *
 * @example
 * pickLang({ en: 'Hello', fr: 'Bonjour' }, 'en'); // => 'Hello'
 */
export function pickLang<T extends Record<string, string>>(
  dictionary: T,
  lang: keyof T,
): string | undefined {
  return dictionary[lang]
}

type AstroLocale = NonNullable<AstroConfig['i18n']>['locales'][number]
type AstroLocaleExtendedConfig = Exclude<AstroLocale, string>
