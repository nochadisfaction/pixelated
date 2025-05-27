import type { APIRoute } from 'astro'
import { getRouteBySlugParam } from '../../utils/routing'
import { generateOGImage } from '../og.common'

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const route = getRouteBySlugParam(params.slug)

  if (route === undefined) {
    return new Response(null, { status: 404 })
  }

  const response = await generateOGImage(route)

  return new Response(response, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
    },
  })
}
