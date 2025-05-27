import type { AstroBuiltinAttributes } from 'astro'
import type { HTMLAttributes } from 'astro/types'
import { z } from 'astro/zod'

const NavBarBaseSchema = z.object({
  /** The visible label for this item in the sidebar. */
  label: z.string(),
  /** Translations of the `label` for each supported language. */
  translations: z.record(z.string()).default({}),
})

const NavBarWithIconSchema = NavBarBaseSchema.extend({
  icon: z.string().optional(),
  hideLabel: z.boolean().default(false),
  labelClass: z.string().optional().default(''),
  iconClass: z.string().optional().default(''),
  wrapperClass: z.string().optional().default(''),
})

// HTML attributes that can be added to an anchor element, validated as
// `Record<string, string | number | boolean | undefined>` but typed as `HTMLAttributes<'a'>`
// for user convenience.
const linkHTMLAttributesSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.undefined()]),
) as z.Schema<Omit<HTMLAttributes<'a'>, keyof AstroBuiltinAttributes | 'children'>>
export type LinkHTMLAttributes = z.infer<typeof linkHTMLAttributesSchema>

export const NavBarLinkItemHTMLAttributesSchema = (): z.ZodDefault<typeof linkHTMLAttributesSchema> => linkHTMLAttributesSchema.default({})

const NavBarLinkItemSchema = NavBarWithIconSchema.extend({
  /** The link to this item’s content. Can be a relative link to local files or the full URL of an external page. */
  link: z.string(),
  /** HTML attributes to add to the link item. */
  attrs: NavBarLinkItemHTMLAttributesSchema(),
}).strict()
export type SidebarLinkItem = z.infer<typeof NavBarLinkItemSchema>

const InternalNavBarLinkItemSchema = NavBarWithIconSchema.extend({
  /** The link to this item’s content. Must be a slug of a Content Collection entry. */
  slug: z.string(),
  /** HTML attributes to add to the link item. */
  attrs: NavBarLinkItemHTMLAttributesSchema(),
})
const InternalNavBarLinkItemShorthandSchema = z
  .string()
  .transform(slug => InternalNavBarLinkItemSchema.parse({ slug }))
export type InternalSidebarLinkItem = z.output<typeof InternalNavBarLinkItemSchema>

export const NavBarItemSchema = z.union([
  NavBarLinkItemSchema,
  InternalNavBarLinkItemSchema,
  InternalNavBarLinkItemShorthandSchema,
])
export type NavBarItem = z.infer<typeof NavBarItemSchema>

export const SubNavBarItemSchema = NavBarBaseSchema.extend({
  /** The link to this item’s content. Must be a slug of a Content Collection entry. */
  slug: z.string(),
  /** HTML attributes to add to the link item. */
  attrs: NavBarLinkItemHTMLAttributesSchema(),
})
export type SubNavBarItem = z.infer<typeof SubNavBarItemSchema>
