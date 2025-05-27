import type { i18nSchemaOutput } from '../schemas/i18n'
import type { RemoveIndexSignature } from './types'
import { type CollectionEntry, type DataCollectionKey, getCollection } from 'astro:content'

import pluginTranslations from 'virtual:vitesse/plugin-translations'
import config from 'virtual:vitesse/user-config'
import { createTranslationSystem } from './create-translation-system'

// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore - This may be a type error in projects without an i18n collection and running
// `tsc --noEmit` in their project. Note that it is not possible to inline this type in
// `UserI18nSchema` because this would break types for users having multiple data collections.
type i18nCollection = CollectionEntry<'i18n'>

export type UserI18nSchema = 'i18n' extends DataCollectionKey
  ? i18nCollection extends { data: infer T }
    ? i18nSchemaOutput & T
    : i18nSchemaOutput
  : i18nSchemaOutput
export type UserI18nKeys = keyof RemoveIndexSignature<UserI18nSchema>

/** Get all translation data from the i18n collection, keyed by `id`, which matches locale. */
async function loadTranslations(): Promise<Record<string, UserI18nSchema>> {
  let userTranslations: Record<string, UserI18nSchema> = {}
  // Briefly override `console.warn()` to silence logging when a project has no i18n collection.
  const warn = console.warn
  console.warn = () => {}
  try {
    // Load the user’s i18n collection and ignore the error if it doesn’t exist.
    userTranslations = Object.fromEntries(
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore — may be an error in projects without an i18n collection
      (await getCollection('i18n')).map(({ id, data }) => [id, data] as const),
    )
  }
  catch {}
  // Restore the original warn implementation.
  console.warn = warn
  return userTranslations
}

/**
 * Generate a utility function that returns UI strings for the given `locale`.
 * @param {string | undefined} [locale]
 * @example
 * const t = useTranslations('en');
 * const label = t('search.label'); // => 'Search'
 */
export const useTranslations = createTranslationSystem(
  config,
  // eslint-disable-next-line antfu/no-top-level-await
  await loadTranslations(),
  pluginTranslations,
)
