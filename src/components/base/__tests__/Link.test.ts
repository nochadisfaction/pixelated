import { screen } from '@testing-library/dom'
import { renderAstro } from '@/test/utils/astro'
import Link from '../Link.astro'

// Mock UI config
vi.mock('~/config', () => ({
  UI: {
    externalLink: {
      newTab: true,
      showNewTabIcon: true,
      cursorType: 'help',
    },
  },
}))

describe('Link', () => {
  it('renders basic link with href', async () => {
    const { container } = await renderAstro(Link, {
      href: '/test',
      children: 'Test Link',
    })

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/test')
    expect(screen.getByText('Test Link')).toBeInTheDocument()
  })

  it('renders external link with correct attributes', async () => {
    const { container } = await renderAstro(Link, {
      href: 'https://example.com',
      external: true,
      children: 'External Link',
    })

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('aria-label', 'Open in new tab')
  })

  it('shows new tab warning icon for external links when enabled', async () => {
    const { container } = await renderAstro(Link, {
      href: 'https://example.com',
      external: true,
      enableNewTabWarning: true,
      children: 'External Link',
    })

    expect(container.querySelector('.new-tab-icon')).toBeInTheDocument()
  })

  it('applies custom cursor for external links when configured', async () => {
    const { container } = await renderAstro(Link, {
      href: 'https://example.com',
      external: true,
      enableNewTabWarning: true,
      children: 'External Link',
    })

    const link = container.querySelector('a')
    expect(link).toHaveClass('external-link-cursor')
  })

  it('renders with custom title', async () => {
    const { container } = await renderAstro(Link, {
      href: '/test',
      title: 'Custom Title',
      children: 'Link Text',
    })

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('title', 'Custom Title')
    expect(link).toHaveAttribute('aria-label', 'Custom Title')
  })

  it('renders with custom rel attribute', async () => {
    const { container } = await renderAstro(Link, {
      href: '/test',
      rel: 'nofollow',
      children: 'Link Text',
    })

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('rel', 'nofollow')
  })

  it('combines custom rel with external link rel', async () => {
    const { container } = await renderAstro(Link, {
      href: 'https://example.com',
      external: true,
      rel: 'nofollow',
      children: 'External Link',
    })

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  })

  it('renders with custom class', async () => {
    const { container } = await renderAstro(Link, {
      href: '/test',
      class: 'custom-link',
      children: 'Link Text',
    })

    const link = container.querySelector('a')
    expect(link).toHaveClass('custom-link')
  })

  it('renders title slot', async () => {
    const { container } = await renderAstro(Link, {
      href: '/test',
      slots: {
        title: 'Title Slot',
      },
    })

    expect(screen.getByText('Title Slot')).toBeInTheDocument()
    expect(container.querySelector('.text-lg')).toBeInTheDocument()
  })

  it('renders end slot', async () => {
    expect(screen.getByText('End Content')).toBeInTheDocument()
  })

  it('shows new tab icon in title slot when enabled', async () => {
    const { container } = await renderAstro(Link, {
      href: 'https://example.com',
      external: true,
      enableNewTabWarning: true,
      slots: {
        title: 'Title with Icon',
      },
    })

    const titleContainer = container.querySelector('.text-lg')
    expect(titleContainer?.querySelector('.new-tab-icon')).toBeInTheDocument()
  })

  it('applies base opacity classes', async () => {
    const { container } = await renderAstro(Link, {
      href: '/test',
      children: 'Link Text',
    })

    const link = container.querySelector('a')
    expect(link).toHaveClass('op-60', 'hover:op-100')
  })

  it('handles undefined href gracefully', async () => {
    const { container } = await renderAstro(Link, {
      children: 'Link without href',
    })

    const link = container.querySelector('a')
    expect(link).not.toHaveAttribute('href')
    expect(screen.getByText('Link without href')).toBeInTheDocument()
  })
})
