import ErrorBoundary from '../ErrorBoundary.astro'
import { renderAstro } from '@/test/utils/astro'

describe('ErrorBoundary', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders children when no error occurs', async () => {
    const { container } = await renderAstro(ErrorBoundary, {
      children: '<div data-testid="test-content">Test Content</div>',
    })

    const content = container.querySelector('[data-testid="test-content"]')
    expect(content).toBeInTheDocument()
    expect(content).toHaveTextContent('Test Content')
  })

  it('renders with custom fallback message', async () => {
    const customFallback = 'Custom error message'
    const { container } = await renderAstro(ErrorBoundary, {
      fallback: customFallback,
    })

    // Simulate error
    const errorBoundary = container.querySelector('error-boundary')
    const instance = customElements.get('error-boundary')
    const error = new Error('Test error')

    // Verify instance exists and then trigger error handler
    expect(instance).toBeDefined()
    instance!.prototype.handleError.call(
      errorBoundary,
      new ErrorEvent('error', { error }),
    )

    // Check fallback content
    expect(container.querySelector('h2')).toHaveTextContent('Oops!')
    expect(container.querySelector('p')).toHaveTextContent(customFallback)
    expect(container.querySelector('button')).toHaveTextContent('Refresh Page')
  })

  it('handles unhandled rejections', async () => {
    const { container } = await renderAstro(ErrorBoundary)

    // Simulate unhandled rejection
    const errorBoundary = container.querySelector('error-boundary')!
    const instance = customElements.get('error-boundary')
    const error = new Error('Test rejection')

    // Verify instance exists and then trigger error handler
    expect(instance).toBeDefined()
    instance!.prototype.handleError.call(
      errorBoundary,
      new PromiseRejectionEvent('unhandledrejection', {
        reason: error,
        promise: Promise.reject(error),
      }),
    )

    // Check error UI
    expect(container.querySelector('h2')).toHaveTextContent('Oops!')
    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('cleans up event listeners on disconnect', async () => {
    const { container } = await renderAstro(ErrorBoundary)

    const errorBoundary = container.querySelector('error-boundary')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    // Simulate disconnection
    errorBoundary?.remove()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    )
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    )
  })
})
