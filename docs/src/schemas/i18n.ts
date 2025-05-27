/* eslint-disable ts/explicit-function-return-type */
import { z } from 'astro/zod'

// eslint-disable-next-line ts/no-empty-object-type
interface i18nSchemaOpts<T extends z.AnyZodObject = z.ZodObject<{}>> {
  /**
   * Extend Vitesse’s i18n schema with additional fields.
   *
   * @example
   * // Add two optional fields to the default schema.
   * i18nSchema({
   *  extend: z
   *    .object({
   *      'customUi.heading': z.string(),
   *      'customUi.text': z.string(),
   *    })
   *    .partial(),
   * })
   */
  extend?: T
}

function defaultI18nSchema() {
  return vitesseI18nSchema()
}
/** Type of Vitesse’s default i18n schema, including extensions from Pagefind and Expressive Code. */
type DefaultI18nSchema = ReturnType<typeof defaultI18nSchema>

/**
 * Based on the the return type of Zod’s `merge()` method. Merges the type of two `z.object()` schemas.
 * Also sets them as “passthrough” schemas as that’s how we use them. In practice whether or not the types
 * are passthrough or not doesn’t matter too much.
 *
 * @see https://github.com/colinhacks/zod/blob/3032e240a0c227692bb96eedf240ed493c53f54c/src/types.ts#L2656-L2660
 */
type MergeSchemas<A extends z.AnyZodObject, B extends z.AnyZodObject> = z.ZodObject<
  z.objectUtil.extendShape<A['shape'], B['shape']>,
  'passthrough',
  B['_def']['catchall']
>
/** Type that extends Vitesse’s default i18n schema with an optional, user-defined schema. */
type ExtendedSchema<T extends z.AnyZodObject> = T extends z.AnyZodObject
  ? MergeSchemas<DefaultI18nSchema, T>
  : DefaultI18nSchema

/** Content collection schema for Vitesse’s optional `i18n` collection. */
// eslint-disable-next-line ts/no-empty-object-type
export function i18nSchema<T extends z.AnyZodObject = z.ZodObject<{}>>({
  extend = z.object({}) as T,
}: i18nSchemaOpts<T> = {}): ExtendedSchema<T> {
  return defaultI18nSchema().merge(extend).passthrough() as ExtendedSchema<T>
}
export type i18nSchemaOutput = z.output<ReturnType<typeof i18nSchema>>

export function builtinI18nSchema() {
  return vitesseI18nSchema()
    .required()
    .strict()
    .merge(expressiveCodeI18nSchema())
}

function vitesseI18nSchema() {
  return z
    .object({
      'toggleTheme.accessibleLabel': z
        .string()
        .describe('Accessible label for the theme selection dropdown.'),

      'languageSelect.accessibleLabel': z
        .string()
        .describe('Accessible label for the language selection dropdown.'),

      'i18n.untranslatedContent': z
        .string()
        .describe(
          'Notice informing users they are on a page that is not yet translated to their language.',
        ),

      'page.draft': z
        .string()
        .describe(
          'Development-only notice informing users they are on a page that is a draft which will not be included in production builds.',
        ),

      '404.text': z.string().describe('Text shown on Vitesse’s default 404 page'),

      'builtWithVitesse.label': z
        .string()
        .describe(
          'Label for the “Built with Vitesse” badge optionally displayed in the site footer.',
        ),

      'comment.on': z.string().describe('Label for the comment section'),
      'posts.empty': z.string().describe('Text shown when there are no posts to display'),
    })
    .partial()
}

function expressiveCodeI18nSchema() {
  return z
    .object({
      'expressiveCode.copyButtonCopied': z
        .string()
        .describe('Expressive Code UI translation. English default value: `"Copied!"`'),

      'expressiveCode.copyButtonTooltip': z
        .string()
        .describe('Expressive Code UI translation. English default value: `"Copy to clipboard"`'),

      'expressiveCode.terminalWindowFallbackTitle': z
        .string()
        .describe('Expressive Code UI translation. English default value: `"Terminal window"`'),
    })
    .partial()
}
