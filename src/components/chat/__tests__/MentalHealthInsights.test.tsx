import { render, screen } from '@testing-library/react'
import MentalHealthInsights from '../MentalHealthInsights'
import {
  mockMentalHealthAnalysis,
  mockLowSeverityAnalysis,
  mockHighSeverityAnalysis,
} from '../../../lib/ai/mock/mentalHealthMockData'

describe('MentalHealthInsights', () => {
  test('renders loading state', () => {
    render(<MentalHealthInsights analysis={null} isLoading={true} />)
    expect(screen.getByText('Analyzing session data...')).toBeInTheDocument()
    expect(screen.getByTestId('insights-loading-spinner')).toBeInTheDocument()
  })

  test('renders empty state when no analysis is provided', () => {
    render(<MentalHealthInsights analysis={null} isLoading={false} />)
    expect(screen.getByText('No analysis available')).toBeInTheDocument()
  })

  test('renders analysis with moderate severity', () => {
    render(
      <MentalHealthInsights
        analysis={mockMentalHealthAnalysis}
        isLoading={false}
      />,
    )

    // Test emotional state section
    expect(screen.getByText('Emotional State')).toBeInTheDocument()
    expect(
      screen.getByText(/Client presents with moderate anxiety/),
    ).toBeInTheDocument()

    // Test cognitive patterns section
    expect(screen.getByText('Cognitive Patterns')).toBeInTheDocument()
    expect(
      screen.getByText('Catastrophizing in relation to career uncertainties'),
    ).toBeInTheDocument()

    // Test therapeutic recommendations
    expect(screen.getByText('Therapeutic Recommendations')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cognitive restructuring focused on career-related thoughts',
      ),
    ).toBeInTheDocument()

    // Test strengths section
    expect(screen.getByText('Client Strengths')).toBeInTheDocument()
    expect(
      screen.getByText('Strong problem-solving abilities'),
    ).toBeInTheDocument()

    // Test risk assessment section
    expect(screen.getByText('Clinical Risk Assessment')).toBeInTheDocument()
    // Should show moderate severity for our mock data
    expect(screen.getByText('Moderate')).toBeInTheDocument()
  })

  test('renders analysis with low severity', () => {
    render(
      <MentalHealthInsights
        analysis={mockLowSeverityAnalysis}
        isLoading={false}
      />,
    )

    // Check that emotional state is updated
    expect(
      screen.getByText(/Client presents with mild situational anxiety/),
    ).toBeInTheDocument()

    // Should show low severity
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  test('renders analysis with high severity', () => {
    render(
      <MentalHealthInsights
        analysis={mockHighSeverityAnalysis}
        isLoading={false}
      />,
    )

    // Check that emotional state is updated
    expect(
      screen.getByText(/Client presents with significant emotional distress/),
    ).toBeInTheDocument()

    // Should show high severity
    expect(screen.getByText('High')).toBeInTheDocument()
  })
})
