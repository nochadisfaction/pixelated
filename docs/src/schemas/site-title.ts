/* eslint-disable ts/explicit-function-return-type */
import { z } from 'astro/zod'

export function TitleConfigSchema() {
  return z
    .union([z.string(), z.record(z.string())])
    .describe('Title for your website')
}

// transform the title for runtime use
export function TitleTransformConfigSchema(defaultLang: string) {
  return TitleConfigSchema().transform((title, ctx) => {
    if (typeof title === 'string') {
      return { [defaultLang]: title }
    }
    if (!title[defaultLang] && title[defaultLang] !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Title must have a key for the default language "${defaultLang}"`,
      })
      return z.NEVER
    }
    return title
  })
}
