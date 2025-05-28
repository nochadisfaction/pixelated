import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import SimulatorDashboardReact from '../SimulatorDashboardReact'

// Mock the dependencies
vi.mock('@/simulator', () => ({
  SimulatorProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="simulator-provider">{children}</div>
  ),

  SimulationContainer: ({
    scenarioId,
    className,
  }: {
    scenarioId: string
    className: string
  }) => (
    <div
      data-testid="simulation-container"
      data-scenario={scenarioId}
      className={className}
    >
      Simulation Container
    </div>
  ),

  ScenarioSelector: ({
    onSelect,
    className,
  }: {
    onSelect: (id: string) => void
    className: string
  }) => (
    <div data-testid="scenario-selector" className={className}>
      <button onClick={() => onSelect('test-scenario')}>
        Select Test Scenario
      </button>
    </div>
  ),

  useAnonymizedMetrics: () => ({
    metrics: {},
    recordEvent: vi.fn(),
  }),
}))

vi.mock('../../MetricsDialog', () => ({
  MetricsDialog: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean
    onClose: () => void
  }) =>
    isOpen ? (
      <div data-testid="metrics-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

describe('SimulatorDashboardReact', () => {
  it('renders the component with scenario selector initially', () => {
    render(<SimulatorDashboardReact />)

    // Check that the title and provider are rendered
    expect(
      screen.getByText('Therapeutic Practice Simulator'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('simulator-provider')).toBeInTheDocument()

    // Initially should show scenario selector, not simulation container
    expect(screen.getByTestId('scenario-selector')).toBeInTheDocument()
    expect(screen.queryByTestId('simulation-container')).not.toBeInTheDocument()

    // Metrics dialog should not be shown initially
    expect(screen.queryByTestId('metrics-dialog')).not.toBeInTheDocument()
  })

  it('switches to simulation container when scenario is selected', async () => {
    render(<SimulatorDashboardReact />)

    // Select a scenario
    const selectButton = screen.getByText('Select Test Scenario')
    await selectButton.click()

    // Now should show simulation container, not scenario selector
    expect(screen.queryByTestId('scenario-selector')).not.toBeInTheDocument()
    expect(screen.getByTestId('simulation-container')).toBeInTheDocument()
    expect(screen.getByTestId('simulation-container')).toHaveAttribute(
      'data-scenario',
      'test-scenario',
    )

    // Should show back button
    expect(screen.getByText('Back to Scenarios')).toBeInTheDocument()
  })

  it('shows metrics dialog when metrics button is clicked', async () => {
    render(<SimulatorDashboardReact />)

    // Click metrics button
    const metricsButton = screen.getByText('Progress Metrics')
    await metricsButton.click()

    // Metrics dialog should be shown
    expect(screen.getByTestId('metrics-dialog')).toBeInTheDocument()

    // Close dialog
    const closeButton = screen.getByText('Close')
    await closeButton.click()

    // Metrics dialog should be hidden again
    expect(screen.queryByTestId('metrics-dialog')).not.toBeInTheDocument()
  })

  it('returns to scenario selection when back button is clicked', async () => {
    render(<SimulatorDashboardReact />)

    // Select a scenario to show simulation
    const selectButton = screen.getByText('Select Test Scenario')
    await selectButton.click()

    // Now click back button
    const backButton = screen.getByText('Back to Scenarios')
    await backButton.click()

    // Should show scenario selector again
    expect(screen.getByTestId('scenario-selector')).toBeInTheDocument()
    expect(screen.queryByTestId('simulation-container')).not.toBeInTheDocument()
  })
})
