// Vitest is imported via globals
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import { renderAstro } from '@/test/utils/astro'
import SecurityDashboard from '../SecurityDashboard.astro'
import { getConvexClient } from '@/lib/convex'

// Define a type for the mock client to help with type checking
type MockClient = {
  query: ReturnType<typeof vi.fn>
}

// Mock the Convex client and API
vi.mock('@/lib/convex', () => ({
  getConvexClient: vi.fn().mockResolvedValue({
    query: vi.fn(),
  }),
}))

vi.mock('@/convex/generated/api', () => ({
  api: {
    security: {
      getSecurityEvents: 'security.getSecurityEvents',
      getEventStats: 'security.getEventStats',
    },
  },
}))

describe('SecurityDashboard', () => {
  const mockInitialEvents = [
    {
      timestamp: 1710000000000,
      type: 'login',
      severity: 'high',
      metadata: { details: 'Failed login attempt' },
    },
    {
      timestamp: 1710000100000,
      type: 'access',
      severity: 'medium',
      metadata: { details: 'Unauthorized access attempt' },
    },
  ]

  const mockInitialStats = {
    total: 100,
    last24h: 25,
    last7d: 75,
    bySeverity: {
      critical: 5,
      high: 15,
      medium: 30,
      low: 50,
    },
  }

  beforeEach(() => {
    // Reset mocks before each test
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        if (query === 'security.getSecurityEvents') {
          return Promise.resolve(mockInitialEvents)
        }
        if (query === 'security.getEventStats') {
          return Promise.resolve(mockInitialStats)
        }
      }),
    }
    vi.mocked(getConvexClient).mockResolvedValue(mockClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial security events and stats', async () => {
    const { container } = await renderAstro(SecurityDashboard)

    // Check stats are rendered
    expect(screen.getByText('100')).toBeInTheDocument() // Total events
    expect(screen.getByText('25')).toBeInTheDocument() // Last 24h
    expect(screen.getByText('75')).toBeInTheDocument() // Last 7d

    // Check severity counts
    expect(screen.getByText('5')).toBeInTheDocument() // Critical
    expect(screen.getByText('15')).toBeInTheDocument() // High
    expect(screen.getByText('30')).toBeInTheDocument() // Medium
    expect(screen.getByText('50')).toBeInTheDocument() // Low

    // Check events table
    expect(container.querySelector('table')).toBeInTheDocument()
    expect(screen.getByText('Failed login attempt')).toBeInTheDocument()
    expect(screen.getByText('Unauthorized access attempt')).toBeInTheDocument()
  })

  it('filters events by type', async () => {
    await renderAstro(SecurityDashboard)

    const eventTypeSelect = screen.getByRole('combobox', {
      name: /event type/i,
    })

    // Mock filtered events
    const mockFilteredEvents = [mockInitialEvents[0]] // Only login event
    const mockQueryFn = vi.mocked(getConvexClient)()
      .query as MockClient['query']
    mockQueryFn.mockResolvedValueOnce(mockFilteredEvents)

    // Select 'login' type
    fireEvent.change(eventTypeSelect, { target: { value: 'login' } })

    await waitFor(() => {
      expect(
        screen.queryByText('Unauthorized access attempt'),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Failed login attempt')).toBeInTheDocument()
    })
  })

  it('filters events by severity', async () => {
    await renderAstro(SecurityDashboard)

    const severitySelect = screen.getByRole('combobox', { name: /severity/i })

    // Mock filtered events
    const mockFilteredEvents = [mockInitialEvents[0]] // Only high severity event
    const mockQueryFn = vi.mocked(getConvexClient)()
      .query as MockClient['query']
    mockQueryFn.mockResolvedValueOnce(mockFilteredEvents)

    // Select 'high' severity
    fireEvent.change(severitySelect, { target: { value: 'high' } })

    await waitFor(() => {
      expect(
        screen.queryByText('Unauthorized access attempt'),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Failed login attempt')).toBeInTheDocument()
    })
  })

  it('updates data automatically every 30 seconds', async () => {
    vi.useFakeTimers()
    await renderAstro(SecurityDashboard)

    // Mock updated data
    const mockUpdatedEvents = [
      {
        timestamp: 1710000200000,
        type: 'system',
        severity: 'critical',
        metadata: { details: 'New critical event' },
      },
    ]

    const mockUpdatedStats = {
      ...mockInitialStats,
      total: 101,
      last24h: 26,
    }

    const mockQueryFn = vi.mocked(getConvexClient)()
      .query as MockClient['query']
    mockQueryFn
      .mockResolvedValueOnce(mockUpdatedEvents)
      .mockResolvedValueOnce(mockUpdatedStats)

    // Advance timer by 30 seconds
    await vi.advanceTimersByTimeAsync(30000)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument() // Updated total
      expect(screen.getByText('26')).toBeInTheDocument() // Updated last 24h
      expect(screen.getByText('New critical event')).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('cleans up interval on page unload', async () => {
    // Simulate page unload
    const event = new Event('astro:beforeload')
    document.dispatchEvent(event)

    // Advance timer by 30 seconds
    vi.advanceTimersByTime(30000)

    // Verify that getConvexClient is not called after cleanup
    expect(vi.mocked(getConvexClient)).not.toHaveBeenCalled()
  })
})
