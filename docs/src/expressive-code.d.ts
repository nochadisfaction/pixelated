/**
 * @file This file provides the types for Vitesse's `astro-vitesse/expressive-code` export.
 */

import type { VitesseExpressiveCodeOptions } from './integrations/expressive-code'

export * from 'astro-expressive-code'

export type { VitesseExpressiveCodeOptions }

/**
 * A utility function that helps you define an Expressive Code configuration object. It is meant
 * to be used inside the optional config file `ec.config.mjs` located in the root directory
 * of your Vitesse project, and its return value to be exported as the default export.
 *
 * Expressive Code will automatically detect this file and use the exported configuration object
 * to override its own default settings.
 *
 * Using this function is recommended, but not required. It just passes through the given object,
 * but it also provides type information for your editor's auto-completion and type checking.
 *
 * @example
 * ```js
 * // ec.config.mjs
 * import { defineEcConfig } from 'astro-vitesse/expressive-code'
 *
 * export default defineEcConfig({
 *   themes: ['vitesse-dark', 'github-light'],
 *   styleOverrides: {
 *     borderRadius: '0.5rem',
 *   },
 * })
 * ```
 */
export function defineEcConfig(
  config: VitesseExpressiveCodeOptions
): VitesseExpressiveCodeOptions
