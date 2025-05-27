import type { VitesseExpressiveCodeOptions } from '../integrations/expressive-code'
import { z } from 'astro/zod'

// eslint-disable-next-line ts/explicit-function-return-type
export function ExpressiveCodeSchema() {
  return z
    .union([
      z.custom<VitesseExpressiveCodeOptions>(value => typeof value === 'object' && value),
      z.boolean(),
    ])
    .describe(
      'Define how code blocks are rendered by passing options to Expressive Code, or disable the integration by passing `false`.',
    )
    .optional()
}
