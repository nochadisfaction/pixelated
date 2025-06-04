import { render, screen, fireEvent } from '@testing-library/react'
import {
  getRecommendedStyles,
  therapyStyleConfigs,
} from '../../../lib/ai/types/TherapyStyles'
import type { TherapyStyleId } from '../../../lib/ai/types/TherapyStyles'
import { TherapyStyleSelector } from '../TherapyStyleSelector'

// Mock the therapy styles module
vi.mock('../../../lib/ai/types/TherapyStyles', () => {
  const originalModule = vi.importActual('../../../lib/ai/types/TherapyStyles')
  return {
    ...originalModule,
    getRecommendedStyles: vi.fn(),
  }
})

describe('TherapyStyleSelector', () => {
  const mockOnSelectStyle = vi.fn()

  beforeEach(() => {
    mockOnSelectStyle.mockReset()
    ;(getRecommendedStyles as ReturnType<typeof vi.fn>).mockReset()
    ;(getRecommendedStyles as ReturnType<typeof vi.fn>).mockReturnValue([])
  })

  it('renders all therapy styles', () => {
    render(
      <TherapyStyleSelector
        selectedStyle="cbt"
        onSelectStyle={mockOnSelectStyle}
      />,
    )

    // All therapy styles should be rendered as buttons
    Object.keys(therapyStyleConfigs).forEach((styleId) => {
      const style = therapyStyleConfigs[styleId as TherapyStyleId]
      expect(screen.getByText(style.name)).toBeInTheDocument()
    })
  })

  it('marks the selected style as active', () => {
    render(
      <TherapyStyleSelector
        selectedStyle="dbt"
        onSelectStyle={mockOnSelectStyle}
      />,
    )

    // Find the DBT button and verify it has the active class
    const dbtButton = screen.getByText(therapyStyleConfigs.dbt.name)
    expect(dbtButton.closest('button')).toHaveClass('active')

    // Other buttons should not have the active class
    const cbtButton = screen.getByText(therapyStyleConfigs.cbt.name)
    expect(cbtButton.closest('button')).not.toHaveClass('active')
  })

  it('calls onSelectStyle when a style is clicked', () => {
    render(
      <TherapyStyleSelector
        selectedStyle="cbt"
        onSelectStyle={mockOnSelectStyle}
      />,
    )

    // Click on the ACT therapy style
    const actButton = screen.getByText(therapyStyleConfigs.act.name)
    fireEvent.click(actButton)

    // Verify the callback was called with the correct style ID
    expect(mockOnSelectStyle).toHaveBeenCalledWith('act')
  })

  it('shows the detail panel for the selected style', () => {
    render(
      <TherapyStyleSelector
        selectedStyle="mindfulness"
        onSelectStyle={mockOnSelectStyle}
      />,
    )

    // Detail panel should show the description for mindfulness
    expect(
      screen.getByText(therapyStyleConfigs.mindfulness.description),
    ).toBeInTheDocument()

    // Detail panel should show techniques for mindfulness
    therapyStyleConfigs.mindfulness.techniquesUsed.forEach((technique) => {
      expect(screen.getByText(technique)).toBeInTheDocument()
    })
  })

  it('updates the detail panel on hover', () => {
    render(
      <TherapyStyleSelector
        selectedStyle="cbt"
        onSelectStyle={mockOnSelectStyle}
      />,
    )

    // Initially shows details for CBT (selected style)
    expect(
      screen.getByText(therapyStyleConfigs.cbt.description),
    ).toBeInTheDocument()

    // Hover over ACT
    const actButton = screen.getByText(therapyStyleConfigs.act.name)
    fireEvent.mouseEnter(actButton)

    // Now should show details for ACT
    expect(
      screen.getByText(therapyStyleConfigs.act.description),
    ).toBeInTheDocument()

    // Mouse leave should revert to selected style
    fireEvent.mouseLeave(actButton)
    expect(
      screen.getByText(therapyStyleConfigs.cbt.description),
    ).toBeInTheDocument()
  })

  it('gets and displays recommended styles based on issue', () => {
    // Mock the recommendation function to return specific styles
    const mockRecommendedStyles = [
      therapyStyleConfigs.cbt,
      therapyStyleConfigs.act,
    ]

    ;(getRecommendedStyles as ReturnType<typeof vi.fn>).mockReturnValue(
      mockRecommendedStyles,
    )

    render(
      <TherapyStyleSelector
        selectedStyle="mindfulness"
        onSelectStyle={mockOnSelectStyle}
        issue="trauma and nightmares"
        showRecommendations={true}
      />,
    )

    // Should have called getRecommendedStyles with the issue
    expect(getRecommendedStyles).toHaveBeenCalledWith('trauma and nightmares')

    // Recommended styles should have a special class or indicator
    const cbtButton = screen.getByText(therapyStyleConfigs.cbt.name)
    const actButton = screen.getByText(therapyStyleConfigs.act.name)

    expect(cbtButton.closest('button')).toHaveClass('recommended')
    expect(actButton.closest('button')).toHaveClass('recommended')

    // Non-recommended styles should not have this class
    const dbtButton = screen.getByText(therapyStyleConfigs.dbt.name)
    expect(dbtButton.closest('button')).not.toHaveClass('recommended')
  })

  it('does not show recommendations when showRecommendations is false', () => {
    // Mock recommended styles
    const mockRecommendedStyles = [therapyStyleConfigs.cbt]
    ;(getRecommendedStyles as ReturnType<typeof vi.fn>).mockReturnValue(
      mockRecommendedStyles,
    )

    render(
      <TherapyStyleSelector
        selectedStyle="cbt"
        onSelectStyle={mockOnSelectStyle}
        issue="trauma"
        showRecommendations={false}
      />,
    )

    // Should not have called getRecommendedStyles
    expect(getRecommendedStyles).not.toHaveBeenCalled()

    // No buttons should have the recommended class
    const cbtButton = screen.getByText(therapyStyleConfigs.cbt.name)
    expect(cbtButton.closest('button')).not.toHaveClass('recommended')
  })
})
