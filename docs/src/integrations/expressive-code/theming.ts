import type { ThemeObjectOrShikiThemeName } from 'astro-expressive-code'

export type ThemeObjectOrBundledThemeName = ThemeObjectOrShikiThemeName

/**
 * Converts the Vitesse `themes` config option into a format understood by Expressive Code,
 * loading any bundled themes and using the Vitesse defaults if no themes were provided.
 */
export function preprocessThemes(
  themes: ThemeObjectOrBundledThemeName[] | undefined,
): ThemeObjectOrShikiThemeName[] {
  // Try to gracefully handle cases where the user forgot to use an array in the config
  themes = themes && !Array.isArray(themes) ? [themes] : themes
  // If no themes were provided, use our bundled default themes
  if (!themes || !themes.length)
    themes = ['vitesse-dark', 'vitesse-light']

  return themes
}
