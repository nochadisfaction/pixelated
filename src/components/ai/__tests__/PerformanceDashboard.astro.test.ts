import { renderAstro } from '@/test/utils/astro'
import PerformanceDashboard from '../PerformanceDashboard.astro'

// Mock service for testing
const mockAIService = {
  getCacheService: () => ({
    getStats: () => ({
      size: 100,
      maxSize: 1000,
      enabled: true,
      ttl: 60000,
      hitRate: 0.75,
    }),
    clear: () => {},
  }),
}

describe('PerformanceDashboard.astro', () => {
  it('renders with custom title and description', async () => {
    const { html } = await renderAstro(PerformanceDashboard, {
      aiService: mockAIService,
      title: 'Custom Dashboard Title',
      description: 'Custom dashboard description for testing',
    })

    // Check if the custom title and description are included in the rendered HTML
    expect(html).toContain('Custom Dashboard Title')
    expect(html).toContain('Custom dashboard description for testing')

    // Check if the component includes the container
    expect(html).toContain('dashboard-container')
    expect(html).toContain('performance-dashboard')
  })

  it('renders with default title and description when not provided', async () => {
    const { html } = await renderAstro(PerformanceDashboard, {
      aiService: mockAIService,
    })

    // Check if default values are used
    expect(html).toContain('AI Performance Dashboard')
    expect(html).toContain('Real-time metrics on AI service performance')
  })

  it('includes client:load directive for React component', async () => {
    const { html } = await renderAstro(PerformanceDashboard, {
      aiService: mockAIService,
    })

    // Check if client:load directive is included
    expect(html).toContain('client:load')
    expect(html).toContain('PerformanceDashboardReact')
  })
})
