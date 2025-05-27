import { defineCollection, z } from 'astro:content'
import { i18nLoader, pagesLoader } from 'astro-vitesse/loaders'
import { i18nSchema, pagesSchema } from 'astro-vitesse/schema'

export const collections = {
  pages: defineCollection({
    loader: pagesLoader(),
    schema: pagesSchema(),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema({
      extend: z.object({
        'sponsor.thanks': z.string().optional(),
        'sponsor.to-suport': z.string().optional(),
      }),
    }),
  }),
}
