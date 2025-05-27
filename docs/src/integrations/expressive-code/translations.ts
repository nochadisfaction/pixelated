import type { VitesseConfig } from '../../types'
import type { createTranslationSystemFromFs } from '../../utils/translations-fs'
import { pluginFramesTexts } from 'astro-expressive-code'
import { localeToLang } from '../shared/locale-to-lang'

export function addTranslations(
  config: VitesseConfig,
  useTranslations: ReturnType<typeof createTranslationSystemFromFs>,
): void {
  addTranslationsForLocale(config.defaultLocale.locale, config, useTranslations)
  if (config.isMultilingual) {
    for (const locale in config.locales) {
      if (locale === config.defaultLocale.locale || locale === 'root')
        continue
      addTranslationsForLocale(locale, config, useTranslations)
    }
  }
}

function addTranslationsForLocale(
  locale: string | undefined,
  config: VitesseConfig,
  useTranslations: ReturnType<typeof createTranslationSystemFromFs>,
): void {
  const lang = localeToLang(config, locale)
  const t = useTranslations(lang)
  const translationKeys = [
    'expressiveCode.copyButtonCopied',
    'expressiveCode.copyButtonTooltip',
    'expressiveCode.terminalWindowFallbackTitle',
  ] as const
  translationKeys.forEach((key) => {
    const translation = t.exists(key) ? t(key) : undefined
    if (!translation)
      return
    const ecId = key.replace(/^expressiveCode\./, '')
    pluginFramesTexts.overrideTexts(lang, { [ecId]: translation })
  })
}
