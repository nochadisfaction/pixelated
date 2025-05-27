/*
 * This file imports the original `i18next` types and extends them to configure the
 * Vitesse namespace.
 *
 * Note that the top-level `import` makes this module non-ambient, so can’t be
 * combined with other `.d.ts` files such as `locals.d.ts`.
 */

import 'i18next'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof import('./utils/create-translation-system').I18nextNamespace
    resources: {
      vitesse: Record<import('./utils/create-translation-system').I18nKeys, string>
    }
  }
}
