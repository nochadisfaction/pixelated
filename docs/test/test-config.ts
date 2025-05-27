/// <reference types="vitest" />

import type { AstroConfig } from 'astro'
import process from 'node:process'
import { getViteConfig } from 'astro/config'
import { vitePluginVitesseUserConfig } from '../src/integrations/virtual-user-config'
import { runPlugins, type VitesseUserConfigWithPlugins } from '../src/utils/plugins'
import { createTestPluginContext } from './test-plugin-utils'

const testLegacyCollections = process.env.LEGACY_COLLECTIONS === 'true'

// eslint-disable-next-line ts/explicit-function-return-type
export async function defineVitestConfig(
  { plugins, ...config }: VitesseUserConfigWithPlugins,
  opts?: {
    build?: Pick<AstroConfig['build'], 'format'>
    trailingSlash?: AstroConfig['trailingSlash']
    command?: 'dev' | 'build' | 'preview'
  },
) {
  const root = new URL('./', import.meta.url)
  const srcDir = new URL('./src/', root)
  const build = opts?.build ?? { format: 'directory' }
  const trailingSlash = opts?.trailingSlash ?? 'ignore'

  const { vitesseConfig, pluginTranslations } = await runPlugins(
    config,
    plugins,
    createTestPluginContext(),
  )
  return getViteConfig({
    plugins: [
      vitePluginVitesseUserConfig(
        vitesseConfig,
        {
          root,
          srcDir,
          build,
          trailingSlash,
          legacy: { collections: testLegacyCollections },
        },
        pluginTranslations,
      ),
    ],
    test: {
      snapshotSerializers: ['./snapshot-serializer-astro-error.ts'],
    },
  })
}
