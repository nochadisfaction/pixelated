import type { AstroIntegration } from 'astro'
import type { VitesseConfig } from '../../types'
import type { createTranslationSystemFromFs } from '../../utils/translations-fs'
import {
  astroExpressiveCode,
  type AstroExpressiveCodeOptions,
  type CustomConfigPreprocessors,
  setLuminance,
} from 'astro-expressive-code'
import { addClassName } from 'astro-expressive-code/hast'
import { pathToLocale } from '../shared/path-to-locale'
import { slugToLocale } from '../shared/slug-to-locale'
import {
  preprocessThemes,
  type ThemeObjectOrBundledThemeName,
} from './theming'
import { addTranslations } from './translations'

export type VitesseExpressiveCodeOptions = Omit<AstroExpressiveCodeOptions, 'themes'> & {
  /**
   * Set the themes used to style code blocks.
   *
   * See the [Expressive Code `themes` documentation](https://github.com/expressive-code/expressive-code/blob/main/packages/astro-expressive-code/README.md#themes)
   * for details of the supported theme formats.
   *
   * If you provide at least one dark and one light theme, Vitesse will automatically keep
   * the active code block theme in sync with the current site theme. Configure this behavior
   * with the [`useVitesseDarkModeSwitch`](#usevitessedarkmodeswitch) option.
   *
   * Defaults to `['vitesse-dark', 'vitesse-light']`.
   */
  themes?: ThemeObjectOrBundledThemeName[] | undefined
  /**
   * When `true`, code blocks automatically switch between light and dark themes when the
   * site theme changes.
   *
   * When `false`, you must manually add CSS to handle switching between multiple themes.
   *
   * **Note**: When setting `themes`, you must provide at least one dark and one light theme
   * for the Vitesse dark mode switch to work.
   *
   * Defaults to `true`.
   */
  useVitesseDarkModeSwitch?: boolean | undefined
  /**
   * When `true`, Vitesse's CSS variables are used for the colors of code block UI elements
   * (backgrounds, buttons, shadows etc.), matching the
   * [site color theme](/guides/css-and-tailwind/#theming).
   *
   * When `false`, the colors provided by the active syntax highlighting theme are used for
   * these elements.
   *
   * Defaults to `true` if the `themes` option is not set (= you are using Vitesse's
   * default themes), and `false` otherwise.
   *
   * **Note**: When manually setting this to `true` with your custom set of `themes`, you must
   * provide at least one dark and one light theme to ensure proper color contrast.
   */
  useVitesseUiThemeColors?: boolean | undefined
}

interface VitesseEcIntegrationOptions {
  vitesseConfig: VitesseConfig
  useTranslations?: ReturnType<typeof createTranslationSystemFromFs> | undefined
}

/**
 * Create an Expressive Code configuration preprocessor based on Vitesse config.
 * Used internally to set up Expressive Code and by the `<Code>` component.
 */
export function getVitesseEcConfigPreprocessor({
  vitesseConfig,
  useTranslations,
}: VitesseEcIntegrationOptions): CustomConfigPreprocessors['preprocessAstroIntegrationConfig'] {
  return (input): AstroExpressiveCodeOptions => {
    const astroConfig = input.astroConfig
    const ecConfig = input.ecConfig as VitesseExpressiveCodeOptions

    const {
      themes: themesInput,
      customizeTheme,
      styleOverrides: { textMarkers: textMarkersStyleOverrides, frames: framesStyleOverrides, ...otherStyleOverrides } = {},
      useVitesseDarkModeSwitch,
      useVitesseUiThemeColors = ecConfig.themes === undefined,
      plugins = [],
      ...rest
    } = ecConfig

    // Handle the `themes` option
    const themes = preprocessThemes(themesInput)
    if (useVitesseUiThemeColors === true && themes.length < 2) {
      console.warn(
        `*** Warning: Using the config option "useVitesseUiThemeColors: true" `
        + `with a single theme is not recommended. For better color contrast, `
        + `please provide at least one dark and one light theme.\n`,
      )
    }

    // Add the `not-content` class to all rendered blocks to prevent them from being affected
    // by Vitesse's default content styles
    plugins.push({
      name: 'Vitesse Plugin',
      hooks: {
        postprocessRenderedBlock: ({ renderData }) => {
          addClassName(renderData.blockAst, 'not-content')
        },
      },
    })

    // Add Expressive Code UI translations (if any) for all defined locales
    if (useTranslations)
      addTranslations(vitesseConfig, useTranslations)

    return {
      themes,
      defaultLocale: vitesseConfig.defaultLocale?.lang ?? vitesseConfig.defaultLocale?.locale,
      themeCssRoot: ':root',
      themeCssSelector: theme =>
        theme.name === 'vitesse-dark' ? ':root.dark' : ':root:not(.dark)',
      styleOverrides: {
        uiFontFamily: '\'DM Mono\', \'Input Mono\', \'Fira Code\', \'monospace\'',
        uiFontSize: '1em',
        codeBackground: context =>
          context.theme.name === 'vitesse-dark' ? '#0e0e0e' : '#fafafa',
        codeFontFamily: '\'DM Mono\', \'Input Mono\', \'Fira Code\', \'monospace\'',
        codeFontSize: '14.72px',
        codeLineHeight: '1.4',
        codePaddingBlock: '0.8571429em',
        codePaddingInline: '1.1428571em',

        frames: {
          frameBoxShadowCssValue: 'none',
          inlineButtonBackgroundActiveOpacity: '0.2',
          inlineButtonBackgroundHoverOrFocusOpacity: '0.1',
          terminalBackground: ({ theme }) =>
            theme.name === 'vitesse-dark' ? '#0e0e0e' : '#fafafa',
          tooltipSuccessBackground: ({ theme }) =>
            setLuminance(theme.colors['terminal.ansiGreen'] || '#0dbc79', 0.22),
          ...framesStyleOverrides,
        },

        textMarkers: {
          backgroundOpacity: '0.25',
          borderOpacity: '0.5',
          ...textMarkersStyleOverrides,
        },

        ...otherStyleOverrides,
      },
      getBlockLocale: ({ file }) =>
        file.url
          ? slugToLocale(file.url.pathname.slice(1), vitesseConfig)
          : pathToLocale(file.path, { vitesseConfig, astroConfig }),
      plugins,
      ...rest,
    }
  }
}

export function vitesseExpressiveCode({
  vitesseConfig,
  useTranslations,
}: VitesseEcIntegrationOptions): AstroIntegration[] {
  // If Expressive Code is disabled, add a shim to prevent build errors and provide
  // a helpful error message in case the user tries to use the `<Code>` component
  if (vitesseConfig.expressiveCode === false) {
    const modules: Record<string, string> = {
      'virtual:astro-expressive-code/api': 'export default {}',
      'virtual:astro-expressive-code/config': 'export default {}',
      'virtual:astro-expressive-code/preprocess-config': `throw new Error("Vitesse's
        Code component requires Expressive Code, which is disabled in your Vitesse config.
        Please remove \`expressiveCode: false\` from your config or import Astro's built-in
        Code component from 'astro:components' instead.")`.replace(/\s+/g, ' '),
    }

    return [
      {
        name: 'astro-expressive-code-shim',
        hooks: {
          'astro:config:setup': ({ updateConfig }) => {
            updateConfig({
              vite: {
                plugins: [
                  {
                    name: 'vite-plugin-astro-expressive-code-shim',
                    enforce: 'post',
                    resolveId: id => (id in modules ? `\0${id}` : undefined),
                    load: id => (id?.[0] === '\0' ? modules[id.slice(1)] : undefined),
                  },
                ],
              },
            })
          },
        },
      },
    ]
  }

  const configArgs
    = typeof vitesseConfig.expressiveCode === 'object'
      ? (vitesseConfig.expressiveCode as AstroExpressiveCodeOptions)
      : {}
  return [
    astroExpressiveCode({
      ...configArgs,
      customConfigPreprocessors: {
        preprocessAstroIntegrationConfig: getVitesseEcConfigPreprocessor({
          vitesseConfig,
          useTranslations,
        }),
        preprocessComponentConfig: `
          import vitesseConfig from 'virtual:vitesse/user-config'
          import { useTranslations, getVitesseEcConfigPreprocessor } from 'astro-vitesse/internal'

          export default getVitesseEcConfigPreprocessor({ vitesseConfig, useTranslations })
        `,
      },
    }),
  ]
}
