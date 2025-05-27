import { z } from 'astro/zod'
import { parse as bcpParse, stringify as bcpStringify } from 'bcp-47'

import { ComponentConfigSchema } from '../schemas/components'
import { ExpressiveCodeSchema } from '../schemas/expressive-code'
import { FaviconSchema } from '../schemas/favicon'
import { HeadConfigSchema } from '../schemas/head'
import { LogoConfigSchema } from '../schemas/logo'
import { NavBarItemSchema, SubNavBarItemSchema } from '../schemas/navbar'
import { TitleConfigSchema, TitleTransformConfigSchema } from '../schemas/site-title'
import { SocialLinksSchema } from '../schemas/social'
import { BuiltInDefaultLocale } from './i18n'

const LocaleSchema = z.object({
  /** The label for this language to show in UI, e.g. `"English"`, `"العربية"`, or `"简体中文"`. */
  label: z
    .string()
    .describe(
      'The label for this language to show in UI, e.g. `"English"`, `"العربية"`, or `"简体中文"`.',
    ),
  /** The BCP-47 tag for this language, e.g. `"en"`, `"ar"`, or `"zh-CN"`. */
  lang: z
    .string()
    .optional()
    .describe('The BCP-47 tag for this language, e.g. `"en"`, `"ar"`, or `"zh-CN"`.'),
  /** The writing direction of this language; `"ltr"` for left-to-right (the default) or `"rtl"` for right-to-left. */
  dir: z
    .enum(['rtl', 'ltr'])
    .optional()
    .default('ltr')
    .describe(
      'The writing direction of this language; `"ltr"` for left-to-right (the default) or `"rtl"` for right-to-left.',
    ),
})

const UserConfigSchema = z.object({
  title: TitleConfigSchema(),
  /** Description metadata for your website. Can be used in page metadata. */
  description: z
    .string()
    .optional()
    .describe('Description metadata for your website. Can be used in page metadata.'),
  /** Specify paths to components that should override Vitesse's default components */
  components: ComponentConfigSchema(),
  /** Set a logo image to show in the navigation bar alongside or instead of the site title. */
  logo: LogoConfigSchema(),
  /**
   * Provide CSS files to customize the look and feel of your Vitesse site.
   *
   * Supports local CSS files relative to the root of your project,
   * e.g. `'/src/custom.css'`, and CSS you installed as an npm
   * module, e.g. `'@fontsource/roboto'`.
   *
   * @example
   * vitesse({
   *  customCss: ['/src/custom-styles.css', '@fontsource/roboto'],
   * })
   */
  customCss: z.string().array().optional().default([]),

  /** The default favicon for your site which should be a path to an image in the `public/` directory. */
  favicon: FaviconSchema(),

  /**
   * Define how code blocks are rendered by passing options to Expressive Code,
   * or disable the integration by passing `false`.
   */
  expressiveCode: ExpressiveCodeSchema(),

  /** Configure locales for internationalization (i18n). */
  locales: z
    .object({
      /** Configure a “root” locale to serve a default language from `/`. */
      root: LocaleSchema.required({ lang: true }).optional(),
    })
    .catchall(LocaleSchema)
    .transform((locales, ctx) => {
      for (const key in locales) {
        const locale = locales[key]!
        // Fall back to the key in the locales object as the lang.
        let lang = locale.lang || key

        // Parse the lang tag so we can check it is valid according to BCP-47.
        const schema = bcpParse(lang, { forgiving: true })
        schema.region = schema.region?.toUpperCase()
        const normalizedLang = bcpStringify(schema)

        // Error if parsing the language tag failed.
        if (!normalizedLang) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Could not validate language tag "${lang}" at locales.${key}.lang.`,
          })
          return z.NEVER
        }

        // Let users know we’re modifying their configured `lang`.
        if (normalizedLang !== lang) {
          console.warn(
            `Warning: using "${normalizedLang}" language tag for locales.${key}.lang instead of "${lang}".`,
          )
          lang = normalizedLang
        }

        // Set the final value as the normalized lang, based on the key if needed.
        locale.lang = lang
      }
      return locales
    })
    .optional()
    .describe('Configure locales for internationalization (i18n).'),
  /**
   * Specify the default language for this site.
   *
   * The default locale will be used to provide fallback content where translations are missing.
   */
  defaultLocale: z.string().optional(),

  /**
   * Add extra tags to your site’s `<head>`.
   *
   * Can also be set for a single page in a page’s frontmatter.
   *
   * @example
   * // Add Fathom analytics to your site
   * vitesse({
   *  head: [
   *    {
   *      tag: 'script',
   *      attrs: {
   *        src: 'https://cdn.usefathom.com/script.js',
   *        'data-site': 'MY-FATHOM-ID',
   *        defer: true,
   *      },
   *    },
   *  ],
   * })
   */
  head: HeadConfigSchema(),

  /** Disable Vitesse's default 404 page. */
  disable404Route: z.boolean().default(false).describe('Disable Vitesse\'s default 404 page.'),

  /**
   * Define whether Vitesse pages should be prerendered or not.
   * Defaults to always prerender Vitesse pages, even when the project is
   * set to "server" output mode.
   */
  prerender: z.boolean().default(true),

  /** Enable displaying a “Built with Astro Vitesse link in your site’s footer. */
  credits: z
    .boolean()
    .default(true)
    .describe('Enable displaying a “Built with Astro Vitesse" link in your site’s footer.'),

  /**
   * Optional details about the social media accounts for this site.
   *
   * @example
   * social: {
   *   github: 'https://github.com/adrian-ub/astro-vitesse',
   *   twitter: 'https://twitter.com/adrianub',
   * }
   */
  social: SocialLinksSchema(),

  /** Configure your site’s sidebar navigation items. */
  navBar: NavBarItemSchema.array().optional(),
  subNavBar: SubNavBarItemSchema.array().optional(),
})

export const VitesseConfigSchema = UserConfigSchema.strict()
  .transform(({ title, locales, defaultLocale, ...config }, ctx) => {
    const configuredLocales = Object.keys(locales ?? {})

    // This is a multilingual site (more than one locale configured) or a monolingual site with
    // only one locale configured (not a root locale).
    // Monolingual sites with only one non-root locale needs their configuration to be defined in
    // `config.locales` so that slugs can be correctly generated by taking into consideration the
    // base path at which a language is served which is the key of the `config.locales` object.
    if (
      locales !== undefined
      && (configuredLocales.length > 1
        || (configuredLocales.length === 1 && locales.root === undefined))
    ) {
      // Make sure we can find the default locale and if not, help the user set it.
      // We treat the root locale as the default if present and no explicit default is set.
      const defaultLocaleConfig = locales[defaultLocale || 'root']

      if (!defaultLocaleConfig) {
        const availableLocales = configuredLocales.map(l => `"${l}"`).join(', ')
        ctx.addIssue({
          code: 'custom',
          message:
            `Could not determine the default locale. `
            + `Please make sure \`defaultLocale\` in your Vitesse config is one of ${availableLocales}`,
        })
        return z.NEVER
      }

      // Transform the title
      const TitleSchema = TitleTransformConfigSchema(defaultLocaleConfig.lang as string)
      const parsedTitle = TitleSchema.parse(title)

      return {
        ...config,
        title: parsedTitle,
        /** Flag indicating if this site has multiple locales set up. */
        isMultilingual: configuredLocales.length > 1,
        /** Flag indicating if the Vitesse built-in default locale is used. */
        isUsingBuiltInDefaultLocale: false,
        /** Full locale object for this site’s default language. */
        defaultLocale: { ...defaultLocaleConfig, locale: defaultLocale },
        locales,
      } as const
    }

    // This is a monolingual site with no locales configured or only a root locale, so things are
    // pretty simple.
    /** Full locale object for this site’s default language. */
    const defaultLocaleConfig = {
      label: BuiltInDefaultLocale.label,
      lang: BuiltInDefaultLocale.lang,
      dir: BuiltInDefaultLocale.dir,
      locale: undefined,
      ...locales?.root,
    }
    /** Transform the title */
    const TitleSchema = TitleTransformConfigSchema(defaultLocaleConfig.lang)
    const parsedTitle = TitleSchema.parse(title)
    return {
      ...config,
      title: parsedTitle,
      /** Flag indicating if this site has multiple locales set up. */
      isMultilingual: false,
      /** Flag indicating if the Vitesse built-in default locale is used. */
      isUsingBuiltInDefaultLocale: locales?.root === undefined,
      defaultLocale: defaultLocaleConfig,
      locales: undefined,
    } as const
  })

export type VitesseConfig = z.infer<typeof VitesseConfigSchema>
export type VitesseUserConfig = z.input<typeof VitesseConfigSchema>
