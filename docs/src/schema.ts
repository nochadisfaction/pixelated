import type { SchemaContext } from 'astro:content'

import { z } from 'astro/zod'
import { HeadConfigSchema } from './schemas/head'

export { i18nSchema } from './schemas/i18n'

// eslint-disable-next-line ts/explicit-function-return-type
function VitessePageFrontmatterSchema(context: SchemaContext) {
  return z.object({
    title: z.string(),
    display: z.string().optional(),
    description: z.string().optional(),
    image: context.image().optional(),
    layoutFullWidth: z.boolean().optional().default(false),
    date: z.string().optional(),
    tocAlwaysOn: z.boolean().optional().default(false),
    subtitle: z.string().optional(),
    draft: z.boolean().optional().default(false),
    wrapperClass: z.string().optional(),
    class: z.string().optional(),
    place: z.string().optional(),
    placeLink: z.string().url().optional(),
    duration: z.string().optional(),
    redirect: z.string().url().optional(),
    inperson: z.boolean().optional().default(false),
    recording: z.boolean().optional().default(false),
    platform: z.string().optional(),
    radio: z.boolean().optional().default(false),
    video: z.boolean().optional().default(false),
    path: z.string().url().optional(),
    /** Set custom `<head>` tags just for this page. */
    head: HeadConfigSchema(),
  })
}

type DefaultSchema = ReturnType<typeof VitessePageFrontmatterSchema>
type BaseSchema = BaseSchemaWithoutEffects | z.ZodEffects<BaseSchemaWithoutEffects>

type BaseSchemaWithoutEffects =
  | z.AnyZodObject
  | z.ZodUnion<[BaseSchemaWithoutEffects, ...BaseSchemaWithoutEffects[]]>
  | z.ZodDiscriminatedUnion<string, z.AnyZodObject[]>
  | z.ZodIntersection<BaseSchemaWithoutEffects, BaseSchemaWithoutEffects>

type ExtendedSchema<T extends BaseSchema | never = never> = [T] extends [never]
  ? DefaultSchema
  : T extends BaseSchema
    ? z.ZodIntersection<DefaultSchema, T>
    : DefaultSchema

interface PagesSchemaOpts<T extends BaseSchema> {
  /**
   * Extend Pages schema with additional fields.
   *
   * @example
   * // Extend the built-in schema with a Zod schema.
   * pagesSchema({
   *  extend: z.object({
   *    // Add a new field to the schema.
   *    category: z.enum(['tutorial', 'guide', 'reference']).optional(),
   *  }),
   * })
   *
   * // Use the Astro image helper.
   * pagesSchema({
   *  extend: ({ image }) => {
   *    return z.object({
   *      cover: image(),
   *    });
   *  },
   * })
   */
  extend?: T | ((context: SchemaContext) => T)
}

export function pagesSchema<T extends BaseSchema | never = never>(
  ...args: [PagesSchemaOpts<T>?]
): (context: SchemaContext) => ExtendedSchema<T> {
  const [options = {}] = args
  const { extend } = options

  return (context: SchemaContext) => {
    const UserSchema = typeof extend === 'function' ? extend(context) : extend

    return (
      UserSchema
        ? VitessePageFrontmatterSchema(context).and(UserSchema)
        : VitessePageFrontmatterSchema(context)
    ) as ExtendedSchema<T>
  }
}
