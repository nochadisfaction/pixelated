import { fheService } from '@/lib/fhe'
import { AnalyticsType, fheAnalytics } from '@/lib/fhe/analytics'
import { EncryptionMode } from '@/lib/fhe/exports'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AnalyticsDashboardReact from '../AnalyticsDashboardReact'

// Mock dependencies
vi.mock('@/lib/fhe', () => ({
  fheService: {
    initialize: vi.fn(),
  },
}))

vi.mock('@/lib/fhe/analytics', () => ({
  fheAnalytics: {
    initialize: vi.fn(),
    createAnalyticsDashboard: vi.fn(),
  },
  AnalyticsType: {
    SENTIMENT_TREND: 'SENTIMENT_TREND',
    TOPIC_CLUSTERING: 'TOPIC_CLUSTERING',
    RISK_ASSESSMENT: 'RISK_ASSESSMENT',
    INTERVENTION_EFFECTIVENESS: 'INTERVENTION_EFFECTIVENESS',
    EMOTIONAL_PATTERNS: 'EMOTIONAL_PATTERNS',
  },
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock icons
vi.mock('../icons', () => ({
  IconAlertTriangle: () => <span data-testid="icon-alert-triangle" />,

  IconBarChart: () => <span data-testid="icon-bar-chart" />,
  IconLineChart: () => <span data-testid="icon-line-chart" />,

  IconLock: () => <span data-testid="icon-lock" />,
  IconPieChart: () => <span data-testid="icon-pie-chart" />,
  IconRefresh: () => <span data-testid="icon-refresh" />,
}))

describe('analyticsDashboard', () => {
  const mockMessages = [
    {
      role: 'user' as const,
      content: 'Hello',
      encrypted: true,
      verified: true,
      name: 'User',
    },
    {
      role: 'assistant' as const,
      content: 'Hi there',
      encrypted: true,
      verified: true,
      name: 'Assistant',
    },
    {
      role: 'user' as const,
      content: 'How are you?',
      encrypted: true,
      verified: true,
      name: 'User',
    },
  ]

  const mockAnalyticsData = [
    {
      type: AnalyticsType.SENTIMENT_TREND,
      data: {
        sentimentData: [
          { messageIndex: 0, sentiment: 0.8 },
          { messageIndex: 1, sentiment: 0.6 },
        ],

        userMessageCount: 2,
        processedCount: 2,
        errorCount: 0,
      },
      isEncrypted: false,
      timestamp: Date.now(),
      encryptionMode: EncryptionMode.NONE,
    },
  ]

  const defaultProps = {
    messages: mockMessages,
    securityLevel: 'maximum' as const,
    encryptionEnabled: true,
    scenario: 'test-scenario',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful FHE initialization
    vi.mocked(fheService.initialize).mockResolvedValue(undefined)
    vi.mocked(fheAnalytics.initialize).mockResolvedValue(undefined)
    // Introduce a small delay to simulate loading
    vi.mocked(fheAnalytics.createAnalyticsDashboard).mockImplementation(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 50)) // 50ms delay
        return mockAnalyticsData
      },
    )
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })
    expect(screen.getByText('Therapy Analytics')).toBeInTheDocument()
  })

  it('shows loading state during initialization', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })
    // Wait for the loading text to appear
    await waitFor(() => {
      expect(
        screen.getByText('Initializing FHE analytics...'),
      ).toBeInTheDocument()
    })
  })

  it('shows privacy warning when encryption is disabled', async () => {
    await act(async () => {
      render(
        <AnalyticsDashboardReact {...defaultProps} encryptionEnabled={false} />,
      )
    })
    expect(screen.getByText(/Privacy Notice/)).toBeInTheDocument()
  })

  it('shows FHE badge when security level is maximum', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })
    expect(screen.getByText('FHE Secured')).toBeInTheDocument()
  })

  it('initializes FHE with correct configuration', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })
    expect(fheService.initialize).toHaveBeenCalledWith({
      mode: 'fhe',
      keySize: 2048,
      securityLevel: 'high',
    })
  })

  it('loads analytics data after initialization', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })
    await waitFor(() => {
      expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalled()
    })
  })

  it('handles analytics tabs correctly', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })

    await waitFor(() => {
      expect(
        screen.queryByText('Initializing FHE analytics...'),
      ).not.toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Topic Clustering'))
    })
    // Wait for the tab content to render
    await waitFor(() => {
      expect(screen.getByText('Topic Distribution')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Emotional Patterns'))
    })
    expect(screen.getByText('Emotional Patterns')).toBeInTheDocument()
  })

  it('handles refresh button click', async () => {
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })

    await waitFor(() => {
      expect(
        screen.queryByText('Initializing FHE analytics...'),
      ).not.toBeInTheDocument()
    })

    vi.mocked(fheAnalytics.createAnalyticsDashboard).mockClear()

    await act(async () => {
      fireEvent.click(screen.getByTitle('Refresh Analytics'))
    })

    expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalled()
  })

  it('handles errors gracefully', async () => {
    vi.mocked(fheAnalytics.createAnalyticsDashboard).mockRejectedValueOnce(
      new Error('Test error'),
    )

    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Failed to generate analytics'),
      ).toBeInTheDocument()
    })

    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(retryButton)
    })
    expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalledTimes(2)
  })

  it('updates analytics on message changes', async () => {
    const { rerender } = render(<AnalyticsDashboardReact {...defaultProps} />)

    await waitFor(() => {
      expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalledTimes(1)
    })

    const newMessages = [
      ...mockMessages,
      {
        role: 'user' as const,
        content: 'New message',
        encrypted: true,
        verified: true,
        name: 'User',
      },
    ]

    await act(async () => {
      rerender(
        <AnalyticsDashboardReact {...defaultProps} messages={newMessages} />,
      )
    })

    await waitFor(() => {
      expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalledTimes(2)
    })
  })

  it('handles auto-refresh correctly', async () => {
    vi.useFakeTimers()
    await act(async () => {
      render(<AnalyticsDashboardReact {...defaultProps} />)
    })

    await waitFor(() => {
      expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    expect(fheAnalytics.createAnalyticsDashboard).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  describe('visualization Components', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<AnalyticsDashboardReact {...defaultProps} />)
      })
      await waitFor(() => {
        expect(
          screen.queryByText('Initializing FHE analytics...'),
        ).not.toBeInTheDocument()
      })
    })

    it('renders sentiment trend visualization', () => {
      expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument()
      expect(screen.getByText('Messages Analyzed:')).toBeInTheDocument()
    })

    it('renders topic clustering visualization', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Topic Clustering'))
      })
      expect(screen.getByText('Topic Distribution')).toBeInTheDocument()
    })

    it('renders risk assessment visualization', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Risk Assessment'))
      })
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
    })

    it('renders intervention effectiveness visualization', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Intervention Effectiveness'))
      })
      expect(screen.getByText('Intervention Effectiveness')).toBeInTheDocument()
    })

    it('renders emotional patterns visualization', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Emotional Patterns'))
      })
      expect(screen.getByText('Emotional Patterns')).toBeInTheDocument()
    })
  })
})
