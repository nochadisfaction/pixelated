/**
 * These triple-slash directives defines dependencies to various declaration files that will be
 * loaded when a user imports the Vitesse integration in their Astro configuration file. These
 * directives must be first at the top of the file and can only be preceded by this comment.
 */
/// <reference path="./locals.d.ts" />
/// <reference path="./i18n.d.ts" />
/// <reference path="./virtual.d.ts" />

import type { AstroIntegration } from 'astro'
import type { PluginTranslations, VitesseUserConfigWithPlugins } from './utils/plugins'

import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'

import { vitesseExpressiveCode } from './integrations/expressive-code'
import { vitesseSitemap } from './integrations/sitemap'
import { vitePluginVitesseUserConfig } from './integrations/virtual-user-config'
import { rehypeToc } from './plugins/rehype-toc'
import { processI18nConfig } from './utils/i18n'
import { injectPluginTranslationsTypes, runPlugins } from './utils/plugins'
import { createTranslationSystemFromFs } from './utils/translations-fs'

export default function VitesseIntegration({
  plugins,
  ...opts
}: VitesseUserConfigWithPlugins): AstroIntegration {
  let pluginTranslations: PluginTranslations = {}
  return {
    name: 'astro-vitesse',
    hooks: {
      'astro:config:setup': async ({ injectRoute, updateConfig, config, command, isRestart, logger, addMiddleware }) => {
        const pluginResult = await runPlugins(opts, plugins, {
          command,
          config,
          isRestart,
          logger,
        })

        // Process the Astro and Vitesse configurations for i18n and translations.
        const { vitesseConfig, astroI18nConfig } = processI18nConfig(
          pluginResult.vitesseConfig,
          config.i18n,
        )

        const integrations = pluginResult.integrations
        pluginTranslations = pluginResult.pluginTranslations

        // TODO: is required to use translations in the future

        const useTranslations = createTranslationSystemFromFs(
          vitesseConfig,
          config,
          pluginTranslations,
        )

        addMiddleware({ entrypoint: 'astro-vitesse/locals', order: 'pre' })

        if (!vitesseConfig.disable404Route) {
          injectRoute({
            pattern: '404',
            entrypoint: vitesseConfig.prerender
              ? 'astro-vitesse/routes/static/404.astro'
              : 'astro-vitesse/routes/ssr/404.astro',
            prerender: vitesseConfig.prerender,
          })
        }

        injectRoute({
          pattern: '[...slug]',
          entrypoint: vitesseConfig.prerender
            ? 'astro-vitesse/routes/static/index.astro'
            : 'astro-vitesse/routes/ssr/index.astro',
          prerender: vitesseConfig.prerender,
        })

        injectRoute({
          pattern: '[...slug]/og.png',
          entrypoint: vitesseConfig.prerender
            ? 'astro-vitesse/routes/static/og.ts'
            : 'astro-vitesse/routes/ssr/og.ts',
          prerender: vitesseConfig.prerender,
        })

        // Add built-in integrations only if they are not already added by the user through the
        // config or by a plugin.
        const allIntegrations = [...config.integrations, ...integrations]
        if (!allIntegrations.find(({ name }) => name === 'astro-expressive-code')) {
          integrations.push(...vitesseExpressiveCode({ vitesseConfig, useTranslations }))
        }
        if (!allIntegrations.find(({ name }) => name === '@astrojs/sitemap')) {
          integrations.push(vitesseSitemap(vitesseConfig))
        }
        if (!allIntegrations.find(({ name }) => name === '@astrojs/mdx')) {
          integrations.push(mdx({ optimize: true }))
        }

        // Add integrations immediately after Vitesse in the config array.
        // e.g. if a user has `integrations: [vitesse(), tailwind()]`, then the order will be
        // `[vitesse(), expressiveCode(), sitemap(), mdx(), tailwind()]`.
        // This ensures users can add integrations before/after Vitesse and we respect that order.
        const selfIndex = config.integrations.findIndex(i => i.name === 'astro-vitesse')
        config.integrations.splice(selfIndex + 1, 0, ...integrations)

        updateConfig({
          vite: {
            plugins: [
              vitePluginVitesseUserConfig(vitesseConfig, config, pluginTranslations),
            ],
          },
          markdown: {
            rehypePlugins: [
              rehypeToc,
              rehypeHeadingIds,
              [
                rehypeAutolinkHeadings,
                {
                  behavior: 'append',
                  content: {
                    type: 'text',
                    value: '#',
                  },
                  properties: {
                    ariaHidden: true,
                    tabIndex: -1,
                    className: 'header-anchor',
                  },
                },
              ],
            ],
            shikiConfig:
              // Configure Shiki theme if the user is using the default github-dark theme.
              config.markdown.shikiConfig.theme !== 'github-dark' ? {} : { theme: 'css-variables' },
          },
          scopedStyleStrategy: 'where',
          // If not already configured, default to prefetching all links on hover.
          prefetch: config.prefetch ?? { prefetchAll: true },
          i18n: astroI18nConfig,
        })
      },
      'astro:config:done': ({ injectTypes }) => {
        injectPluginTranslationsTypes(pluginTranslations, injectTypes)
      },
    },
  }
}
