import { z } from 'astro/zod'

export const socialLinks = [
  'twitter',
  'github',
  'mastodon',
] as const

// eslint-disable-next-line ts/explicit-function-return-type
export function SocialLinksSchema() {
  return z
    .record(
      z.enum(socialLinks),
      // Link to the respective social profile for this site
      z.string().url(),
    )
    .transform((links) => {
      const labelledLinks: Partial<Record<keyof typeof links, { label: string, url: string }>> = {}
      for (const _k in links) {
        const key = _k as keyof typeof links
        const url = links[key]
        if (!url)
          continue
        const label = {
          github: 'GitHub',
          twitter: 'Twitter',
          mastodon: 'Mastodon',
        }[key]
        labelledLinks[key] = { label, url }
      }
      return labelledLinks
    })
    .optional()
}
