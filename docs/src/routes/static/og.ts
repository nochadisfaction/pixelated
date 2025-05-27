import type { APIRoute, GetStaticPaths } from 'astro'
import { paths, type Route } from '../../utils/routing'
import { generateOGImage } from '../og.common'

export const prerender = true

export const getStaticPaths: GetStaticPaths = async () => {
  return paths.filter(path => !path.props.entry.data.image)
}

export const GET: APIRoute = async ({ props }) => {
  const route = props as Route
  const response = await generateOGImage(route)

  return new Response(response, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
    },
  })
}
