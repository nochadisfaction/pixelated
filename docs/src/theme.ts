import type { UserConfig } from 'unocss'

import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { mergeConfigs, presetAttributify, presetIcons, presetUno, presetWebFonts, transformerDirectives } from 'unocss'

const { globSync, convertPathToPattern } = fg
const require = createRequire(import.meta.url)

export function defineConfig(config: UserConfig): UserConfig<object> {
  return mergeConfigs([{
    content: {
      inline: getInlineContentForPackage({
        name: 'astro-vitesse',
        pattern: '/dist/**/*.{astro,js,mjs,jsx,ts,tsx}',
        root: process.cwd(),
      }),
    },
    shortcuts: [
      {
        'bg-base': 'bg-white dark:bg-black',
        'color-base': 'text-black dark:text-white',
        'border-base': 'border-[#8884]',
      },
      [
        /^btn-(\w+)$/,
        ([_, color]) =>
          `op50 px2.5 py1 transition-all duration-200 ease-out no-underline! hover:(op100 text-${color} bg-${color}/10) border border-base! rounded`,
      ],
    ],
    rules: [
      [
        /^slide-enter-(\d+)$/,
        ([_, n]) => ({
          '--enter-stage': n,
        }),
      ],
    ],
    presets: [
      presetIcons({
        extraProperties: {
          'display': 'inline-block',
          'height': '1.2em',
          'width': '1.2em',
          'vertical-align': 'text-bottom',
        },
      }),
      presetAttributify(),
      presetUno(),
      presetWebFonts({
        fonts: {
          sans: 'Inter:400,600,800',
          mono: 'DM Mono:400,600',
          condensed: 'Roboto Condensed',
          wisper: 'Bad Script',
        },
      }),
    ],
    transformers: [transformerDirectives()],
    safelist: [
      'i-ri-menu-2-fill',
    ],
  }, config])
}

export function getInlineContentForPackage({ name, pattern, root }: { name: string, pattern: string, root: string }): (() => Promise<string>)[] {
  try {
    const packageRoot = resolve(require.resolve(`${name}/package.json`, { paths: [root] }), '..')

    const packagePattern = convertPathToPattern(packageRoot.replace('\\@', '/@'))

    return globSync(`${packagePattern}${pattern}`).map(filePath => () => fs.readFile(filePath, { encoding: 'utf8' }))
  }
  catch {
    return []
  }
}
