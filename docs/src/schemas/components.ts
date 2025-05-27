import { z } from 'astro/zod'

// eslint-disable-next-line ts/explicit-function-return-type
export function ComponentConfigSchema() {
  return z
    .object({
      ToggleTheme: z.string().default('astro-vitesse/components/ToggleTheme.astro'),
      Footer: z.string().default('astro-vitesse/components/Footer.astro'),
      ScrollToTop: z.string().default('astro-vitesse/components/ScrollToTop.astro'),
      SiteTitle: z.string().default('astro-vitesse/components/SiteTitle.astro'),
      NavBar: z.string().default('astro-vitesse/components/NavBar.astro'),
      Head: z.string().default('astro-vitesse/components/Head.astro'),
    })
    .default({})
}
