import { render } from '@testing-library/react'
import type { AstroComponent } from 'astro'
import { vi } from 'vitest/globals'

/**
 * Renders an Astro component for testing
 * @param Component The Astro component to render
 * @param props Props to pass to the component
 * @param slotContent Optional content to pass to the default slot
 * @returns The rendered component
 */
export async function renderAstro<Props extends Record<string, any>>(
  Component: AstroComponent,
  props: Props = {} as Props,
  slotContent?: string,
) {
  const html = await Component.render({ ...props, slot: slotContent })
  const container = document.createElement('div')
  container.innerHTML = html

  return {
    container,
    html,
    ...render(container),
  }
}

/**
 * Creates a mock Astro global object for testing
 * @param props Props to override in the mock
 * @returns A mock Astro global object
 */
export function createMockAstro(props: Record<string, any> = {}) {
  return {
    props,
    request: new Request('http://localhost:3000'),
    url: new URL('http://localhost:3000'),
    redirect: vi.fn(),
    response: new Response(),
    slots: {},
    site: new URL('http://localhost:3000'),
    generator: 'Astro v4.0',
    ...props,
  }
}

/**
 * Type helper for mocking Astro props
 */
export type AstroMockProps<T> = T & {
  'client:load'?: boolean
  'client:visible'?: boolean
  'client:media'?: string
  'client:only'?: boolean
  'class'?: string
  'className'?: string
}
