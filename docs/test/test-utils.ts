/* eslint-disable ts/explicit-function-return-type */
import type { VitessePagesCollectionEntry } from '../src/utils/routing'
import { z } from 'astro/zod'
import project from 'virtual:vitesse/project-context'
import { vi } from 'vitest'
import { i18nSchema, pagesSchema } from '../src/schema'

const frontmatterSchema = pagesSchema()({
  image: () =>
    z.object({
      src: z.string(),
      width: z.number(),
      height: z.number(),
      format: z.union([
        z.literal('png'),
        z.literal('jpg'),
        z.literal('jpeg'),
        z.literal('tiff'),
        z.literal('webp'),
        z.literal('gif'),
        z.literal('svg'),
        z.literal('avif'),
      ]),
    }),
})

function mockDoc(
  pagesFilePath: string,
  data: z.input<typeof frontmatterSchema>,
  body = '',
): VitessePagesCollectionEntry {
  const slug = pagesFilePath.replace(/\.[^.]+$/, '').replace(/\/index$/, '')

  const doc: VitessePagesCollectionEntry = {
    id: project.legacyCollections ? pagesFilePath : slug,
    body,
    collection: 'pages',
    data: frontmatterSchema.parse(data),
  }

  if (project.legacyCollections) {
    doc.slug = slug
  }
  else {
    doc.filePath = `src/content/pages/${pagesFilePath}`
  }

  return doc
}

function mockDict(id: string, data: z.input<ReturnType<typeof i18nSchema>>) {
  return {
    id,
    data: i18nSchema().parse(data),
  }
}

export async function mockedAstroContent({
  pages = [],
  i18n = [],
}: {
  pages?: Parameters<typeof mockDoc>[]
  i18n?: Parameters<typeof mockDict>[]
}) {
  const mod = await vi.importActual<typeof import('astro:content')>('astro:content')
  const mockPages = pages.map(page => mockDoc(...page))
  const mockDicts = i18n.map(dict => mockDict(...dict))
  return {
    ...mod,
    getCollection: (
      collection: 'pages' | 'i18n',
      filter?: (entry: ReturnType<typeof mockDoc> | ReturnType<typeof mockDict>) => unknown,
    ) => {
      const entries = collection === 'i18n' ? mockDicts : mockPages
      return filter ? entries.filter(filter) : entries
    },
  }
}

export async function mockedCollectionConfig(pagesUserSchema?: Parameters<typeof pagesSchema>[0]) {
  const content = await vi.importActual<typeof import('astro:content')>('astro:content')
  const schemas = await vi.importActual<typeof import('../src/schema')>('../src/schema')
  const loaders = await vi.importActual<typeof import('../src/loaders')>('../src/loaders')

  return {
    collections: {
      pages: content.defineCollection(
        project.legacyCollections
          ? { schema: schemas.pagesSchema(pagesUserSchema) }
          : { loader: loaders.pagesLoader(), schema: schemas.pagesSchema(pagesUserSchema) },
      ),
      i18n: content.defineCollection(
        project.legacyCollections
          ? { type: 'data', schema: schemas.i18nSchema() }
          : { loader: loaders.i18nLoader(), schema: schemas.i18nSchema() },
      ),
    },
  }
}
