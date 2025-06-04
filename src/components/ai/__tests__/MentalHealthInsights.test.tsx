import { render, screen } from '@testing-library/react'
import { MentalHealthInsights } from '../MentalHealthInsights'
import {
  mockMentalHealthAnalysis,
  mockEmptyAnalysis,
} from '../../chat/__tests__/mockMentalHealthData'

describe('MentalHealthInsights', () => {
  test('renders analysis data correctly', () => {
    render(<MentalHealthInsights analysis={mockMentalHealthAnalysis} />)

    // Check heading
    expect(screen.getByText('Mental Health Analysis')).toBeInTheDocument()

    // Check emotional state
    expect(screen.getByText('Emotional State')).toBeInTheDocument()
    expect(
      screen.getByText(mockMentalHealthAnalysis.emotionalState),
    ).toBeInTheDocument()

    // Check section headings
    expect(screen.getByText('Cognitive Patterns')).toBeInTheDocument()
    expect(screen.getByText('Strengths')).toBeInTheDocument()
    expect(screen.getByText('Primary Concerns')).toBeInTheDocument()
    expect(screen.getByText('Therapeutic Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Risk Factors')).toBeInTheDocument()

    // Check specific items from lists
    expect(
      screen.getByText(mockMentalHealthAnalysis.cognitivePatterns[0]),
    ).toBeInTheDocument()
    expect(
      screen.getByText(mockMentalHealthAnalysis.strengths[0]),
    ).toBeInTheDocument()
    expect(
      screen.getByText(mockMentalHealthAnalysis.primaryConcerns[0]),
    ).toBeInTheDocument()
    expect(
      screen.getByText(mockMentalHealthAnalysis.therapeuticRecommendations[0]),
    ).toBeInTheDocument()
    expect(
      screen.getByText(mockMentalHealthAnalysis.riskFactors[0]),
    ).toBeInTheDocument()

    // Check session ID
    expect(
      screen.getByText(`Session ID: ${mockMentalHealthAnalysis.sessionId}`),
    ).toBeInTheDocument()

    // Check timestamp but not confidence score (default is hidden)
    expect(screen.getByText(/Assessment time:/)).toBeInTheDocument()
    expect(screen.queryByText(/Confidence:/)).not.toBeInTheDocument()
  })

  test('displays confidence score when showConfidenceScore is true', () => {
    render(
      <MentalHealthInsights
        analysis={mockMentalHealthAnalysis}
        showConfidenceScore={true}
      />,
    )

    expect(screen.getByText(/Confidence:/)).toBeInTheDocument()
    const confidenceText =
      (mockMentalHealthAnalysis.confidenceScore * 100).toFixed(1) + '%'
    expect(screen.getByText(/Confidence:/).textContent).toContain(
      confidenceText,
    )
  })

  test('handles empty analysis data gracefully', () => {
    render(<MentalHealthInsights analysis={mockEmptyAnalysis} />)

    // Check heading always shows
    expect(screen.getByText('Mental Health Analysis')).toBeInTheDocument()

    // These sections shouldn't be rendered
    expect(screen.queryByText('Cognitive Patterns')).not.toBeInTheDocument()
    expect(screen.queryByText('Risk Factors')).not.toBeInTheDocument()

    // Check timestamp still shows
    expect(screen.getByText(/Assessment time:/)).toBeInTheDocument()
  })

  test('applies custom className when provided', () => {
    const { container } = render(
      <MentalHealthInsights
        analysis={mockMentalHealthAnalysis}
        className="custom-class-name"
      />,
    )

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement.classList.contains('custom-class-name')).toBe(true)
  })
})
