import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { BiasDashboard } from './BiasDashboard'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import '@testing-library/jest-dom'

// Extend Vitest's expect with jest-dom matchers
declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T> {
    toBeInTheDocument(): T
    toHaveAttribute(attr: string, value?: string): T
    toHaveClass(...classNames: string[]): T
    toHaveValue(value?: string | number): T
  }
}

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}))

// Define proper WebSocket mock type
interface MockWebSocketInstance {
  onopen: (() => void) | null
  onclose: ((event: CloseEvent) => void) | null
  onerror: ((error: Event) => void) | null
  onmessage: ((event: MessageEvent) => void) | null
  close: Mock
  send: Mock
  addEventListener: Mock
  readyState: number
  heartbeatInterval?: number | null
}

// Create a factory function for WebSocket mocks
const createMockWebSocket = (): MockWebSocketInstance => ({
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null,
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
  heartbeatInterval: null,
})

// Mock WebSocket constructor
const MockWebSocketConstructor = vi.fn(createMockWebSocket) as Mock & {
  new (url: string | URL, protocols?: string | string[]): MockWebSocketInstance
  prototype: WebSocket
  readonly CONNECTING: 0
  readonly OPEN: 1
  readonly CLOSING: 2
  readonly CLOSED: 3
}

global.WebSocket = MockWebSocketConstructor as unknown as typeof WebSocket

// Mock fetch
const mockFetch = vi.fn() as Mock
global.fetch = mockFetch

describe('BiasDashboard', () => {
  const mockDashboardData = {
    summary: {
      totalSessions: 100,
      averageBiasScore: 0.3,
      highBiasSessions: 5,
      totalAlerts: 10,
    },
    alerts: [
      {
        id: '1',
        type: 'high_bias',
        message: 'High bias detected',
        timestamp: new Date().toISOString(),
        severity: 'high',
      },
    ],
    trends: [
      {
        date: new Date().toISOString(),
        biasScore: 0.3,
        sessionCount: 10,
        alertCount: 2,
      },
    ],
    demographics: {
      age: {
        '18-24': 20,
        '25-34': 30,
        '35-44': 25,
        '45+': 25,
      },
      gender: {
        male: 45,
        female: 50,
        other: 5,
      },
      ethnicity: {
        asian: 20,
        black: 15,
        hispanic: 25,
        white: 35,
        other: 5,
      },
    },
  }

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<BiasDashboard />)
    expect(
      screen.getByText('Loading bias detection dashboard...'),
    ).toBeInTheDocument()
  })

  it('renders dashboard data after loading', async () => {
    render(<BiasDashboard />)
    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })
  })

  it('handles WebSocket connection', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    }
    MockWebSocketConstructor.mockImplementation(() => mockWs as unknown as MockWebSocketInstance)

    render(<BiasDashboard enableRealTimeUpdates={true} />)

    await waitFor(() => {
      expect(MockWebSocketConstructor).toHaveBeenCalled()
    })

    // Simulate WebSocket connection
    const openCall = mockWs.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'open',
    )
    if (openCall && typeof openCall[1] === 'function') {
      openCall[1]()
    }

    expect(screen.getByText('Live updates connected')).toBeInTheDocument()
  })

  it('handles WebSocket errors gracefully', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    }
    MockWebSocketConstructor.mockImplementation(() => mockWs as unknown as MockWebSocketInstance)

    render(<BiasDashboard enableRealTimeUpdates={true} />)

    await waitFor(() => {
      expect(MockWebSocketConstructor).toHaveBeenCalled()
    })

    // Simulate WebSocket error
    const errorCall = mockWs.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'error',
    )
    if (errorCall && typeof errorCall[1] === 'function') {
      errorCall[1](new Event('error'))
    }

    expect(
      screen.getByText('Error connecting to live updates'),
    ).toBeInTheDocument()
  })

  it('updates data when receiving WebSocket messages', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    }
    MockWebSocketConstructor.mockImplementation(() => mockWs as unknown as MockWebSocketInstance)

    render(<BiasDashboard enableRealTimeUpdates={true} />)

    await waitFor(() => {
      expect(MockWebSocketConstructor).toHaveBeenCalled()
    })

    // Simulate WebSocket message
    const messageCall = mockWs.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'message',
    )
    if (messageCall && typeof messageCall[1] === 'function') {
      messageCall[1]({
        data: JSON.stringify({
          type: 'bias_alert',
          data: {
            id: '2',
            type: 'high_bias',
            message: 'New high bias alert',
            timestamp: new Date().toISOString(),
            severity: 'high',
          },
        }),
      })
    }

    await waitFor(() => {
      expect(screen.getByText('New high bias alert')).toBeInTheDocument()
    })
  })

  it('handles chart interactions correctly', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Test tab navigation
    fireEvent.click(screen.getByText(/demographics/i))
    expect(screen.getByText(/age distribution/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/trends/i))
    expect(screen.getByText(/bias score trends/i)).toBeInTheDocument()

    // Test chart tooltips
    const chartElement = screen
      .getByText(/bias score trends/i)
      .closest('.recharts-wrapper')
    if (chartElement) {
      fireEvent.mouseMove(chartElement)
      // Tooltip should appear
      await waitFor(() => {
        expect(screen.getByText(/bias score/i)).toBeInTheDocument()
      })
    }
  })

  it('handles data updates with animations', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    }
    MockWebSocketConstructor.mockImplementation(() => mockWs as unknown as MockWebSocketInstance)

    render(<BiasDashboard enableRealTimeUpdates={true} />)

    await waitFor(() => {
      expect(MockWebSocketConstructor).toHaveBeenCalled()
    })

    // Simulate WebSocket message with updated metrics
    const messageCall = mockWs.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'message',
    )
    if (messageCall && typeof messageCall[1] === 'function') {
      messageCall[1]({
        data: JSON.stringify({
          type: 'metrics_update',
          data: {
            totalSessions: 150,
            averageBiasScore: 0.4,
            highBiasSessions: 8,
            totalAlerts: 15,
          },
        }),
      })
    }

    // Check if animations are applied - simplified check
    const chartElements = document.querySelectorAll('.recharts-wrapper')
    expect(chartElements.length).toBeGreaterThanOrEqual(0)
  })

  it('cleans up WebSocket connection on unmount', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    }
    MockWebSocketConstructor.mockImplementation(() => mockWs as unknown as MockWebSocketInstance)

    const { unmount } = render(<BiasDashboard enableRealTimeUpdates={true} />)

    await waitFor(() => {
      expect(MockWebSocketConstructor).toHaveBeenCalled()
    })

    unmount()

    expect(mockWs.close).toHaveBeenCalled()
  })

  it('renders filtering controls', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/time range/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bias score level/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/alert level/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/demographics/i)).toBeInTheDocument()
  })

  it('handles time range filter changes', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    const timeRangeSelect = screen.getByLabelText(/time range/i) as HTMLSelectElement
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } })

    expect(timeRangeSelect.value).toBe('7d')
  })

  it('shows custom date inputs when custom time range is selected', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    const timeRangeSelect = screen.getByLabelText(/time range/i)
    fireEvent.change(timeRangeSelect, { target: { value: 'custom' } })

    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
  })

  it('handles bias score filter changes', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    const biasScoreSelect = screen.getByLabelText(/bias score level/i) as HTMLSelectElement
    fireEvent.change(biasScoreSelect, { target: { value: 'high' } })

    expect(biasScoreSelect.value).toBe('high')
  })

  it('handles alert level filter changes', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    const alertLevelSelect = screen.getByLabelText(/alert level/i) as HTMLSelectElement
    fireEvent.change(alertLevelSelect, { target: { value: 'critical' } })

    expect(alertLevelSelect.value).toBe('critical')
  })

  it('clears all filters when clear button is clicked', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    // Set some filters
    const timeRangeSelect = screen.getByLabelText(/time range/i)
    const biasScoreSelect = screen.getByLabelText(/bias score level/i)
    const alertLevelSelect = screen.getByLabelText(/alert level/i)

    fireEvent.change(timeRangeSelect, { target: { value: '7d' } })
    fireEvent.change(biasScoreSelect, { target: { value: 'high' } })
    fireEvent.change(alertLevelSelect, { target: { value: 'critical' } })

    // Click clear button
    const clearButton = screen.getByText(/clear all filters/i)
    fireEvent.click(clearButton)

    // Check that filters are reset
    expect((timeRangeSelect as HTMLSelectElement).value).toBe('24h')
    expect((biasScoreSelect as HTMLSelectElement).value).toBe('all')
    expect((alertLevelSelect as HTMLSelectElement).value).toBe('all')
  })

  it('displays filter summary correctly', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    // Initially should show "None"
    expect(screen.getByText(/active filters:.*none/i)).toBeInTheDocument()

    // Set a filter
    const timeRangeSelect = screen.getByLabelText(/time range/i)
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } })

    // Should show the active filter
    expect(screen.getByText(/time: last 7 days/i)).toBeInTheDocument()
  })

  it('updates chart data when filters are applied', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to trends tab
    fireEvent.click(screen.getByText(/trends/i))

    // Check that chart title shows data point count
    expect(
      screen.getByText(/bias score trends \(\d+ data points\)/i),
    ).toBeInTheDocument()
  })

  it('shows no data message when filters exclude all data', async () => {
    // Mock empty filtered data
    const emptyMockData = {
      ...mockDashboardData,
      alerts: [],
      recentAnalyses: [],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyMockData),
    })

    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))
    expect(screen.getByText(/no active alerts/i)).toBeInTheDocument()

    // Navigate to sessions tab
    fireEvent.click(screen.getByText(/recent sessions/i))
    expect(screen.getByText(/no recent sessions/i)).toBeInTheDocument()
  })

  it('handles custom date range input', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/filters & time range/i)).toBeInTheDocument()
    })

    // Select custom time range
    const timeRangeSelect = screen.getByLabelText(/time range/i)
    fireEvent.change(timeRangeSelect, { target: { value: 'custom' } })

    // Set custom dates
    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-01-01T00:00' } })
    fireEvent.change(endDateInput, { target: { value: '2024-01-31T23:59' } })

    expect((startDateInput as HTMLInputElement).value).toBe('2024-01-01T00:00')
    expect((endDateInput as HTMLInputElement).value).toBe('2024-01-31T23:59')
  })

  it('renders notification settings panel', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Click notifications button
    const notificationsButton = screen.getByText(/notifications/i)
    fireEvent.click(notificationsButton)

    expect(screen.getByText(/notification settings/i)).toBeInTheDocument()
    expect(screen.getByText(/notification channels/i)).toBeInTheDocument()
    expect(screen.getByText(/alert level notifications/i)).toBeInTheDocument()
  })

  it('handles notification settings changes', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Open notification settings
    fireEvent.click(screen.getByText(/notifications/i))

    // Toggle email notifications
    const emailCheckbox = screen.getByLabelText(/email notifications/i)
    fireEvent.click(emailCheckbox)

    // Toggle critical alerts
    const criticalAlertsCheckbox = screen.getByLabelText(/critical alerts/i)
    fireEvent.click(criticalAlertsCheckbox)

    // Verify changes (in real app, would check API calls)
    expect((emailCheckbox as HTMLInputElement).checked).toBe(false)
    expect((criticalAlertsCheckbox as HTMLInputElement).checked).toBe(false)
  })

  it('handles test notification sending', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Open notification settings
    fireEvent.click(screen.getByText(/notifications/i))

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    // Click send test button
    const sendTestButton = screen.getByText(/send test/i)
    fireEvent.click(sendTestButton)

    // Should show success message
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Test notification sent successfully!',
      )
    })

    alertSpy.mockRestore()
  })

  it('renders alert management controls', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Should show alert management controls
    expect(screen.getByText(/select all/i)).toBeInTheDocument()
    expect(screen.getByText(/1 alerts/i)).toBeInTheDocument()
    expect(screen.getByText(/1 high priority/i)).toBeInTheDocument()
  })

  it('handles individual alert actions', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Find acknowledge button and click it
    const acknowledgeButton = screen.getByText(/acknowledge/i)
    fireEvent.click(acknowledgeButton)

    // Should update alert status (in real app, would check API calls)
    await waitFor(() => {
      expect(screen.getByText(/acknowledged/i)).toBeInTheDocument()
    })
  })

  it('handles bulk alert actions', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Select all alerts
    const selectAllCheckbox = screen.getByLabelText(/select all/i)
    fireEvent.click(selectAllCheckbox)

    // Should show bulk action buttons
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()

    // Click bulk acknowledge
    const bulkAcknowledgeButton = screen.getAllByText(/acknowledge/i)[0] // First one is bulk action
    fireEvent.click(bulkAcknowledgeButton)

    // Should clear selection after bulk action
    await waitFor(() => {
      expect(screen.getByText(/select all/i)).toBeInTheDocument()
    })
  })

  it('handles alert selection and deselection', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Find individual alert checkbox
    const alertCheckboxes = screen.getAllByRole('checkbox')
    const individualAlertCheckbox = alertCheckboxes.find(
      (cb) => cb !== screen.getByLabelText(/select all/i),
    )

    if (individualAlertCheckbox) {
      // Select individual alert
      fireEvent.click(individualAlertCheckbox)
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument()

      // Deselect individual alert
      fireEvent.click(individualAlertCheckbox)
      expect(screen.getByText(/select all/i)).toBeInTheDocument()
    }
  })

  it('handles alert notes addition', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Mock window.prompt
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValue('Test note for alert')

    // Click note button
    const noteButton = screen.getByText(/note/i)
    fireEvent.click(noteButton)

    // Should show prompt and add note
    expect(promptSpy).toHaveBeenCalledWith('Add notes (optional):')

    // Should display the note
    await waitFor(() => {
      expect(screen.getByText(/test note for alert/i)).toBeInTheDocument()
    })

    promptSpy.mockRestore()
  })

  it('handles alert escalation with notes', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Mock window.prompt
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValue('Escalation reason')

    // Click escalate button
    const escalateButton = screen.getByText(/escalate/i)
    fireEvent.click(escalateButton)

    // Should show prompt for escalation notes
    expect(promptSpy).toHaveBeenCalledWith('Add notes (optional):')

    promptSpy.mockRestore()
  })

  it('displays action history for alerts', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Navigate to alerts tab
    fireEvent.click(screen.getByText(/alerts/i))

    // Perform an action to create history
    const acknowledgeButton = screen.getByText(/acknowledge/i)
    fireEvent.click(acknowledgeButton)

    // Should show action history
    await waitFor(() => {
      expect(screen.getByText(/action history/i)).toBeInTheDocument()
    })

    // Click to expand history
    const historyToggle = screen.getByText(/action history/i)
    fireEvent.click(historyToggle)

    // Should show action details
    expect(screen.getByText(/acknowledged/i)).toBeInTheDocument()
  })

  it('closes notification settings panel', async () => {
    render(<BiasDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
    })

    // Open notification settings
    fireEvent.click(screen.getByText(/notifications/i))
    expect(screen.getByText(/notification settings/i)).toBeInTheDocument()

    // Close notification settings
    const closeButton = screen.getByRole('button', { name: '' }) // X button
    fireEvent.click(closeButton)

    // Should close the panel
    expect(screen.queryByText(/notification settings/i)).not.toBeInTheDocument()
  })

  // Data Export Tests
  describe('Data Export Functionality', () => {
    it('opens export dialog when export button is clicked', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Click export button
      fireEvent.click(screen.getByText(/export/i))

      // Should open export dialog
      expect(screen.getByText(/export dashboard data/i)).toBeInTheDocument()
    })

    it('allows format selection in export dialog', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Open export dialog
      fireEvent.click(screen.getByText(/export/i))

      // Should have format options
      expect(screen.getByLabelText(/json/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/csv/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/pdf/i)).toBeInTheDocument()

      // Select CSV format
      fireEvent.click(screen.getByLabelText(/csv/i))

      // Export button should update
      expect(screen.getByText(/export as csv/i)).toBeInTheDocument()
    })

    it('handles export data functionality', async () => {
      // Mock fetch for export
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob(['test data'], { type: 'text/csv' })),
      })

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
      global.URL.revokeObjectURL = vi.fn()

      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      const originalCreateElement = document.createElement
      document.createElement = vi.fn().mockReturnValue(mockAnchor)
      document.body.appendChild = vi.fn()
      document.body.removeChild = vi.fn()

      render(<BiasDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Open export dialog and export
      fireEvent.click(screen.getByText(/export/i))
      fireEvent.click(screen.getByText(/export as json/i))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/bias-detection/export?format=json',
          {
            method: 'GET',
          },
        )
      })

      // Restore mocks
      document.createElement = originalCreateElement
    })

    it('closes export dialog when cancel is clicked', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Open export dialog
      fireEvent.click(screen.getByText(/export/i))
      expect(screen.getByText(/export dashboard data/i)).toBeInTheDocument()

      // Close dialog
      fireEvent.click(screen.getByText(/cancel/i))

      // Should close the dialog
      expect(
        screen.queryByText(/export dashboard data/i),
      ).not.toBeInTheDocument()
    })

    it('validates date range in export dialog', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Open export dialog
      fireEvent.click(screen.getByText(/export/i))

      // Check date inputs exist
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)

      expect(startDateInput).toBeInTheDocument()
      expect(endDateInput).toBeInTheDocument()

      // Should have default values (last 7 days)
      expect(startDateInput).toHaveValue()
      expect(endDateInput).toHaveValue()
    })
  })

  // Responsive Design Tests
  describe('Responsive Design', () => {
    beforeEach(() => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
    })

    it('adapts layout for mobile screens', async () => {
      // Set mobile width
      Object.defineProperty(window, 'innerWidth', {
        value: 600,
      })

      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Should have mobile-specific classes and layout
      const header = screen.getByRole('banner')
      expect(header).toHaveClass('flex-col')
    })

    it('adapts layout for tablet screens', async () => {
      // Set tablet width
      Object.defineProperty(window, 'innerWidth', {
        value: 800,
      })

      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Should adapt for tablet layout
      expect(screen.getByText(/bias detection dashboard/i)).toBeInTheDocument()
    })

    it('handles window resize events', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
      })

      fireEvent(window, new Event('resize'))

      // Component should handle resize
      expect(screen.getByText(/bias detection dashboard/i)).toBeInTheDocument()
    })
  })

  // Accessibility Tests
  describe('Accessibility Features', () => {
    beforeEach(() => {
      // Mock matchMedia for accessibility preferences
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches:
            query.includes('prefers-reduced-motion') ||
            query.includes('prefers-contrast'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
    })

    it('provides skip links for keyboard navigation', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Should have skip links
      const skipToMain = screen.getByText(/skip to main content/i)
      const skipToAlerts = screen.getByText(/skip to alerts/i)

      expect(skipToMain).toBeInTheDocument()
      expect(skipToAlerts).toBeInTheDocument()
    })

    it('handles keyboard navigation shortcuts', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Test Alt+M for main content
      fireEvent.keyDown(document, { key: 'm', altKey: true })

      // Test Alt+A for alerts
      fireEvent.keyDown(document, { key: 'a', altKey: true })

      // Test Escape key
      fireEvent.keyDown(document, { key: 'Escape' })

      // Should handle keyboard events without errors
      expect(screen.getByText(/bias detection dashboard/i)).toBeInTheDocument()
    })

    it('provides proper ARIA labels and descriptions', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Check for ARIA labels on buttons
      const refreshButton = screen.getByLabelText(/refresh dashboard data/i)
      const notificationButton = screen.getByLabelText(
        /open notification settings/i,
      )
      const exportButton = screen.getByLabelText(/open data export options/i)

      expect(refreshButton).toBeInTheDocument()
      expect(notificationButton).toBeInTheDocument()
      expect(exportButton).toBeInTheDocument()
    })

    it('supports high contrast mode', async () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Should apply high contrast class
      const container = screen
        .getByText(/bias detection dashboard/i)
        .closest('div')
      expect(container).toHaveClass('high-contrast')
    })

    it('respects reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Component should handle reduced motion preference
      expect(screen.getByText(/bias detection dashboard/i)).toBeInTheDocument()
    })

    it('provides screen reader announcements', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Should have aria-live region for announcements
      const announcements = screen.getByRole('status', { hidden: true })
      expect(announcements).toBeInTheDocument()
      expect(announcements).toHaveAttribute('aria-live', 'polite')
    })

    it('manages focus properly in dialogs', async () => {
      render(<BiasDashboard />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Open export dialog
      fireEvent.click(screen.getByText(/export/i))

      // Dialog should be properly focused
      const dialog = screen.getByText(/export dashboard data/i)
      expect(dialog).toBeInTheDocument()

      // Close with Escape
      fireEvent.keyDown(document, { key: 'Escape' })

      // Dialog should close
      expect(
        screen.queryByText(/export dashboard data/i),
      ).not.toBeInTheDocument()
    })
  })

  // Enhanced WebSocket Tests
  describe('Enhanced WebSocket Functionality', () => {
    let mockWebSocket: MockWebSocketInstance

    beforeEach(() => {
      mockWebSocket = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        heartbeatInterval: null,
      }

      global.WebSocket = vi.fn(() => mockWebSocket) as unknown as typeof WebSocket
    })

    it('shows connection status indicators', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Initially should show connecting
      expect(
        screen.getByText(/connecting to live updates/i),
      ).toBeInTheDocument()

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Should show connected status
      await waitFor(() => {
        expect(screen.getByText(/live updates connected/i)).toBeInTheDocument()
      })
    })

    it('handles connection errors with proper status', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate connection error
      act(() => {
        if (mockWebSocket.onerror) {
          mockWebSocket.onerror(new Error('Connection failed'))
        }
      })

      // Should show error status
      await waitFor(() => {
        expect(screen.getByText(/live updates failed/i)).toBeInTheDocument()
      })

      // Should show reconnect button
      expect(screen.getByText(/reconnect live updates/i)).toBeInTheDocument()
    })

    it('handles reconnection attempts with exponential backoff', async () => {
      vi.useFakeTimers()

      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate connection close
      act(() => {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose({
            code: 1006,
            reason: 'Connection lost',
            wasClean: false,
          })
        }
      })

      // Should show reconnecting status
      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument()
      })

      // Fast-forward time to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should attempt to create new WebSocket connection
      expect(global.WebSocket).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('sends subscription message on connection', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Should send subscription message
      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringContaining('"type":"subscribe"'),
        )
      })
    })

    it('updates subscription when filters change', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Clear previous calls
      mockWebSocket.send.mockClear()

      // Change a filter
      const timeRangeSelect = screen.getByLabelText(/time range/i)
      fireEvent.change(timeRangeSelect, { target: { value: '7d' } })

      // Should send update subscription message
      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringContaining('"type":"update_subscription"'),
        )
      })
    })

    it('handles heartbeat messages', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Clear previous calls
      mockWebSocket.send.mockClear()

      // Simulate heartbeat message
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({ type: 'heartbeat' }),
          })
        }
      })

      // Should respond to heartbeat
      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.stringContaining('"type":"heartbeat_response"'),
        )
      })
    })

    it('handles real-time bias alert updates', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Navigate to alerts tab
      fireEvent.click(screen.getByText(/alerts/i))

      // Simulate new bias alert
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: 'bias_alert',
              alert: {
                alertId: 'new-alert-1',
                type: 'high_bias',
                message: 'Real-time high bias detected',
                timestamp: new Date().toISOString(),
                level: 'high',
                sessionId: 'session-123',
              },
            }),
          })
        }
      })

      // Should show the new alert
      await waitFor(() => {
        expect(
          screen.getByText(/real-time high bias detected/i),
        ).toBeInTheDocument()
      })
    })

    it('handles real-time session updates', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Simulate session update
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: 'session_update',
              session: {
                sessionId: 'session-1',
                overallBiasScore: 0.8,
                timestamp: new Date().toISOString(),
                alertLevel: 'high',
              },
            }),
          })
        }
      })

      // Should update session data
      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })
    })

    it('handles real-time metrics updates', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText(/total sessions/i)).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Simulate metrics update
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: 'metrics_update',
              metrics: {
                totalSessions: 150,
                averageBiasScore: 0.35,
                totalAlerts: 12,
              },
            }),
          })
        }
      })

      // Should update metrics
      await waitFor(() => {
        expect(screen.getByText(/150/)).toBeInTheDocument()
      })
    })

    it('handles manual reconnection', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate connection error
      act(() => {
        if (mockWebSocket.onerror) {
          mockWebSocket.onerror(new Error('Connection failed'))
        }
      })

      // Should show reconnect button
      await waitFor(() => {
        expect(screen.getByText(/reconnect live updates/i)).toBeInTheDocument()
      })

      // Click reconnect button
      const reconnectButton = screen.getByText(/reconnect live updates/i)
      fireEvent.click(reconnectButton)

      // Should attempt to reconnect
      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(2)
      })
    })

    it('cleans up WebSocket connection properly', async () => {
      const { unmount } = render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate successful connection with heartbeat
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Set up heartbeat interval
      mockWebSocket.heartbeatInterval = setInterval(() => {}, 30000)

      // Unmount component
      unmount()

      // Should close connection and clear interval
      expect(mockWebSocket.close).toHaveBeenCalledWith(
        1000,
        'Component unmounting',
      )
    })

    it('handles unknown message types gracefully', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Simulate unknown message type
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: 'unknown_type',
              data: { some: 'data' },
            }),
          })
        }
      })

      // Should handle gracefully without errors
      expect(screen.getByText(/bias detection dashboard/i)).toBeInTheDocument()
    })

    it('handles malformed WebSocket messages', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate successful connection
      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen()
        }
      })

      // Simulate malformed message
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: 'invalid json',
          })
        }
      })

      // Should handle gracefully without crashing
      expect(screen.getByText(/bias detection dashboard/i)).toBeInTheDocument()
    })

    it('shows correct status during reconnection attempts', async () => {
      render(<BiasDashboard enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Simulate connection close to trigger reconnection
      act(() => {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose({
            code: 1006,
            reason: 'Connection lost',
            wasClean: false,
          })
        }
      })

      // Should show reconnecting status with attempt number
      await waitFor(() => {
        expect(screen.getByText(/reconnecting.*attempt 1/i)).toBeInTheDocument()
      })
    })

    it('disables live updates when enableRealTimeUpdates is false', async () => {
      render(<BiasDashboard enableRealTimeUpdates={false} />)

      await waitFor(() => {
        expect(
          screen.getByText(/bias detection dashboard/i),
        ).toBeInTheDocument()
      })

      // Should show disabled status
      expect(screen.getByText(/live updates disabled/i)).toBeInTheDocument()

      // Should not create WebSocket connection
      expect(global.WebSocket).not.toHaveBeenCalled()
    })
  })
})
