import { z } from 'astro/zod'

// eslint-disable-next-line ts/explicit-function-return-type
export function LogoConfigSchema() {
  return z
    .union([
      z.object({
        /** Source of the image file to use. */
        src: z.string(),
        /** Alternative text description of the logo. */
        alt: z.string().default(''),
        /** Set to `true` to hide the site title text and only show the logo. */
        replacesTitle: z.boolean().default(false),
      }),
      z.object({
        /** Source of the image file to use in dark mode. */
        dark: z.string(),
        /** Source of the image file to use in light mode. */
        light: z.string(),
        /** Alternative text description of the logo. */
        alt: z.string().default(''),
        /** Set to `true` to hide the site title text and only show the logo. */
        replacesTitle: z.boolean().default(false),
      }),
    ])
    .optional()
}

export type LogoUserConfig = z.input<ReturnType<typeof LogoConfigSchema>>
export type LogoConfig = z.output<ReturnType<typeof LogoConfigSchema>>
