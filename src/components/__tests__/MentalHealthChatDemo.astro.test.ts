import { cleanup } from '@testing-library/react'
import MentalHealthChatDemo from '../MentalHealthChatDemo.astro'

// Define interface for component props
interface MentalHealthChatDemoProps {
  initialTab?: string
  showSettingsPanel?: boolean
  showAnalysisPanel?: boolean
  title?: string
  description?: string
  [key: string]: any
}

// Mock the MentalHealthChatDemoReact component
vi.mock('../MentalHealthChatDemoReact', () => {
  const mockFn = vi.fn()
  mockFn.mockImplementation((props: MentalHealthChatDemoProps) => {
    // Return a mock implementation description rather than JSX
    // This avoids TypeScript errors while still mocking the component
    return {
      type: 'div',
      props: {
        'data-testid': 'mental-health-chat-demo',
        'data-props': JSON.stringify(props),
        'children': [
          {
            type: 'div',
            props: {
              className: 'chat-window',
              children: [
                {
                  type: 'div',
                  props: {
                    className: 'chat-messages',
                    children: 'Sample chat message',
                  },
                },
                {
                  type: 'div',
                  props: {
                    className: 'chat-input',
                    children: [
                      {
                        type: 'input',
                        props: {
                          type: 'text',
                          placeholder: 'Type your message...',
                        },
                      },
                      {
                        type: 'button',
                        props: {
                          children: 'Send',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          props.showAnalysisPanel
            ? {
                type: 'div',
                props: {
                  className: 'analysis-panel',
                  children: 'Analysis Panel',
                },
              }
            : null,
          props.showSettingsPanel
            ? {
                type: 'div',
                props: {
                  className: 'settings-panel',
                  children: 'Settings Panel',
                },
              }
            : null,
        ].filter(Boolean),
      },
    }
  })
  return { default: mockFn }
})

// Helper function to render Astro components in tests
async function renderAstroComponent(Component: any, props = {}) {
  const { default: defaultExport } = Component
  const html = await defaultExport.render(props)
  const container = document.createElement('div')
  container.innerHTML = html.html
  document.body.appendChild(container)
  return { container }
}

describe('MentalHealthChatDemo.astro', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders with default props', async () => {
    const { container } = await renderAstroComponent(MentalHealthChatDemo)

    // Check if the title and description are rendered with default values
    expect(container.querySelector('h2')).toHaveTextContent(
      'Mental Health Chat Demo',
    )
    expect(container.querySelector('p')).toHaveTextContent(
      'This demonstration shows how mental health analysis can be integrated into chat experiences.',
    )

    // Check if client component placeholder exists
    expect(container.innerHTML).toContain('mental-health-chat-demo')
  })

  it('renders with custom props', async () => {
    const customProps = {
      initialTab: 'settings',
      showSettingsPanel: false,
      showAnalysisPanel: false,
      title: 'Custom Chat Demo',
      description: 'Custom mental health chat description',
    }

    const { container } = await renderAstroComponent(
      MentalHealthChatDemo,
      customProps,
    )

    // Check if the custom title and description are rendered
    expect(container.querySelector('h2')).toHaveTextContent('Custom Chat Demo')
    expect(container.querySelector('p')).toHaveTextContent(
      'Custom mental health chat description',
    )

    // Verify client:load component would receive the right props
    // In a real test, we'd check the props passed to the client component
    expect(container.innerHTML).toContain('initialTab="settings"')
    expect(container.innerHTML).toContain('showSettingsPanel={false}')
    expect(container.innerHTML).toContain('showAnalysisPanel={false}')
  })

  it('applies transition styles', async () => {
    const { container } = await renderAstroComponent(MentalHealthChatDemo)

    // Check if transition styles are applied
    const mainDiv = container.querySelector('div')
    expect(mainDiv).toHaveClass('transition-colors')
    expect(mainDiv).toHaveClass('duration-300')

    // Check if style element is included
    const styleElement = container.querySelector('style')
    expect(styleElement).toBeTruthy()
    expect(styleElement?.textContent).toContain('--transition-duration: 300ms')
  })

  it('has responsive layout classes', async () => {
    const { container } = await renderAstroComponent(MentalHealthChatDemo)

    const mainDiv = container.querySelector('div')
    expect(mainDiv).toHaveClass('w-full')
    expect(mainDiv).toHaveClass('max-w-6xl')
    expect(mainDiv).toHaveClass('mx-auto')
  })
})
