/**
 * Unit tests for MetaAligner explainability visualization components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import {
  ObjectiveScoreVisualization,
  CriteriaBreakdownVisualization,
  AlignmentTrendVisualization,
  AlignmentComparisonVisualization,
  ObjectiveInfluenceVisualization,
  generateAlignmentExplanation
} from './visualization';
import {
  ObjectiveMetrics,
  AlignmentMetrics,
  CriteriaMetrics,
  TimestampedEvaluation,
  EvaluationTrend
} from '../core/objective-metrics';
import { ObjectiveDefinition, CORE_MENTAL_HEALTH_OBJECTIVES } from '../core/objectives';

// Mock the chart components since they depend on Chart.js
jest.mock('@/components/ui/charts', () => ({
  LineChart: ({ data, labels, label }: any) => (
    <div data-testid="line-chart" data-label={label} data-data={JSON.stringify(data)} data-labels={JSON.stringify(labels)} />
  ),
  PieChart: ({ data, labels }: any) => (
    <div data-testid="pie-chart" data-data={JSON.stringify(data)} data-labels={JSON.stringify(labels)} />
  )
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}));

describe('MetaAligner Visualization Components', () => {
  let mockObjectiveMetrics: Record<string, ObjectiveMetrics>;
  let mockAlignmentMetrics: AlignmentMetrics;
  let mockCriteriaMetrics: CriteriaMetrics[];
  let mockTimestampedEvaluations: TimestampedEvaluation[];

  beforeEach(() => {
    // Setup mock data
    const mockTrend: EvaluationTrend = {
      direction: 'improving',
      magnitude: 0.1,
      period: 5,
      confidence: 0.8
    };

    mockCriteriaMetrics = [
      {
        criterion: 'factual_accuracy',
        score: 0.85,
        weight: 0.4,
        contribution: 0.34,
        confidence: 0.9,
        evidence: ['Evidence 1', 'Evidence 2']
      },
      {
        criterion: 'evidence_based',
        score: 0.75,
        weight: 0.3,
        contribution: 0.225,
        confidence: 0.8,
        evidence: ['Evidence 3']
      },
      {
        criterion: 'clinical_soundness',
        score: 0.9,
        weight: 0.3,
        contribution: 0.27,
        confidence: 0.95,
        evidence: ['Evidence 4', 'Evidence 5']
      }
    ];

    mockObjectiveMetrics = {
      correctness: {
        objectiveId: 'correctness',
        score: 0.8,
        criteriaBreakdown: mockCriteriaMetrics,
        confidence: 0.85,
        reliability: 0.9,
        consistency: 0.88,
        improvement: 0.05,
        trend: mockTrend,
        contextualFit: 0.92
      },
      empathy: {
        objectiveId: 'empathy',
        score: 0.7,
        criteriaBreakdown: [],
        confidence: 0.75,
        reliability: 0.85,
        consistency: 0.8,
        improvement: 0.02,
        trend: mockTrend,
        contextualFit: 0.88
      },
      safety: {
        objectiveId: 'safety',
        score: 0.95,
        criteriaBreakdown: [],
        confidence: 0.95,
        reliability: 0.98,
        consistency: 0.95,
        improvement: 0.0,
        trend: mockTrend,
        contextualFit: 0.99
      }
    };

    mockAlignmentMetrics = {
      overallScore: 0.82,
      objectiveMetrics: mockObjectiveMetrics,
      balanceScore: 0.78,
      consistencyScore: 0.85,
      improvementScore: 0.03,
      contextualAlignment: 0.9,
      qualityIndicators: {
        reliability: 0.88,
        validity: 0.85,
        sensitivity: 0.82,
        specificity: 0.9,
        coverage: 0.95
      },
      performanceProfile: {
        strengths: ['Safety', 'Correctness'],
        weaknesses: ['Empathy'],
        opportunities: ['Improve empathy scoring'],
        risks: ['Low empathy could impact user experience']
      }
    };

    mockTimestampedEvaluations = [
      {
        timestamp: new Date('2023-01-01'),
        evaluation: {
          objectiveResults: {},
          overallScore: 0.75,
          evaluationContext: {
            userQuery: 'Test query',
            detectedContext: 'general' as any
          },
          explanation: 'Test explanation'
        },
        context: {
          userQuery: 'Test query',
          detectedContext: 'general' as any
        },
        metrics: { ...mockAlignmentMetrics, overallScore: 0.75 }
      },
      {
        timestamp: new Date('2023-01-02'),
        evaluation: {
          objectiveResults: {},
          overallScore: 0.82,
          evaluationContext: {
            userQuery: 'Test query 2',
            detectedContext: 'general' as any
          },
          explanation: 'Test explanation 2'
        },
        context: {
          userQuery: 'Test query 2',
          detectedContext: 'general' as any
        },
        metrics: mockAlignmentMetrics
      }
    ];
  });

  describe('ObjectiveScoreVisualization', () => {
    it('should render objective scores with proper color coding', () => {
      const { getByTestId, getByText } = render(
        <ObjectiveScoreVisualization
          objectiveMetrics={mockObjectiveMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 3)}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByText('Objective Performance')).toBeInTheDocument();
      expect(getByText('Correctness')).toBeInTheDocument();
      expect(getByText('80.0%')).toBeInTheDocument();
    });

    it('should show low confidence badges when appropriate', () => {
      const lowConfidenceMetrics = {
        ...mockObjectiveMetrics,
        correctness: {
          ...mockObjectiveMetrics.correctness,
          confidence: 0.6
        }
      };

      const { getByText } = render(
        <ObjectiveScoreVisualization
          objectiveMetrics={lowConfidenceMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 1)}
        />
      );

      expect(getByText('Low Confidence')).toBeInTheDocument();
    });

    it('should handle missing objective metrics gracefully', () => {
      const { getByText } = render(
        <ObjectiveScoreVisualization
          objectiveMetrics={{}}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 1)}
        />
      );

      expect(getByText('Correctness')).toBeInTheDocument();
      expect(getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('CriteriaBreakdownVisualization', () => {
    it('should render criteria breakdown with pie chart', () => {
      const { getByTestId, getByText } = render(
        <CriteriaBreakdownVisualization
          criteriaMetrics={mockCriteriaMetrics}
          objectiveName="Correctness"
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByTestId('pie-chart')).toBeInTheDocument();
      expect(getByText('Correctness - Criteria Breakdown')).toBeInTheDocument();
      expect(getByText('Factual Accuracy')).toBeInTheDocument();
      expect(getByText('85.0%')).toBeInTheDocument();
    });

    it('should display weight information for each criterion', () => {
      const { getByText } = render(
        <CriteriaBreakdownVisualization
          criteriaMetrics={mockCriteriaMetrics}
          objectiveName="Correctness"
        />
      );

      expect(getByText('Weight: 40%')).toBeInTheDocument();
      expect(getByText('Weight: 30%')).toBeInTheDocument();
    });

    it('should format criterion names properly', () => {
      const { getByText } = render(
        <CriteriaBreakdownVisualization
          criteriaMetrics={mockCriteriaMetrics}
          objectiveName="Correctness"
        />
      );

      expect(getByText('Factual Accuracy')).toBeInTheDocument();
      expect(getByText('Evidence Based')).toBeInTheDocument();
      expect(getByText('Clinical Soundness')).toBeInTheDocument();
    });
  });

  describe('AlignmentTrendVisualization', () => {
    it('should render overall alignment trend by default', () => {
      const { getByTestId, getByText } = render(
        <AlignmentTrendVisualization
          evaluationHistory={mockTimestampedEvaluations}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByTestId('line-chart')).toBeInTheDocument();
      expect(getByText('Overall Alignment Trend')).toBeInTheDocument();
    });

    it('should render specific objective trend when objectiveId provided', () => {
      const { getByText } = render(
        <AlignmentTrendVisualization
          evaluationHistory={mockTimestampedEvaluations}
          objectiveId="correctness"
        />
      );

      expect(getByText('Correctness Trend')).toBeInTheDocument();
    });

    it('should show trend direction with appropriate badge', () => {
      const { getByText } = render(
        <AlignmentTrendVisualization
          evaluationHistory={mockTimestampedEvaluations}
        />
      );

      // Should show positive trend since overall score improved from 0.75 to 0.82
      expect(getByText(/\+7\.0%/)).toBeInTheDocument();
    });

    it('should handle empty evaluation history', () => {
      const { getByTestId } = render(
        <AlignmentTrendVisualization
          evaluationHistory={[]}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('AlignmentComparisonVisualization', () => {
    it('should render before and after comparison', () => {
      const beforeMetrics = {
        ...mockAlignmentMetrics,
        overallScore: 0.65,
        objectiveMetrics: {
          ...mockObjectiveMetrics,
          correctness: { ...mockObjectiveMetrics.correctness, score: 0.6 }
        }
      };

      const { getByTestId, getByText } = render(
        <AlignmentComparisonVisualization
          beforeMetrics={beforeMetrics}
          afterMetrics={mockAlignmentMetrics}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByText('Before vs After Alignment')).toBeInTheDocument();
      expect(getByText('Correctness')).toBeInTheDocument();
    });

    it('should calculate and display improvements correctly', () => {
      const beforeMetrics = {
        ...mockAlignmentMetrics,
        overallScore: 0.65,
        objectiveMetrics: {
          ...mockObjectiveMetrics,
          correctness: { ...mockObjectiveMetrics.correctness, score: 0.6 }
        }
      };

      const { getByText } = render(
        <AlignmentComparisonVisualization
          beforeMetrics={beforeMetrics}
          afterMetrics={mockAlignmentMetrics}
        />
      );

      // Overall improvement: (0.82 - 0.65) * 100 = +17.0%
      expect(getByText(/Overall: \+17\.0%/)).toBeInTheDocument();
      
      // Correctness improvement: (0.8 - 0.6) * 100 = +20.0%
      expect(getByText(/\+20\.0%/)).toBeInTheDocument();
    });

    it('should show negative improvements correctly', () => {
      const afterMetrics = {
        ...mockAlignmentMetrics,
        overallScore: 0.6,
        objectiveMetrics: {
          ...mockObjectiveMetrics,
          correctness: { ...mockObjectiveMetrics.correctness, score: 0.5 }
        }
      };

      const { getByText } = render(
        <AlignmentComparisonVisualization
          beforeMetrics={mockAlignmentMetrics}
          afterMetrics={afterMetrics}
        />
      );

      // Should show negative overall improvement
      expect(getByText(/Overall: -22\.0%/)).toBeInTheDocument();
    });
  });

  describe('ObjectiveInfluenceVisualization', () => {
    it('should render objective influence with pie chart', () => {
      const { getByTestId, getByText } = render(
        <ObjectiveInfluenceVisualization
          objectiveMetrics={mockObjectiveMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 3)}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByTestId('pie-chart')).toBeInTheDocument();
      expect(getByText('Objective Influence on Overall Score')).toBeInTheDocument();
    });

    it('should calculate contributions correctly', () => {
      const { container } = render(
        <ObjectiveInfluenceVisualization
          objectiveMetrics={mockObjectiveMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 3)}
        />
      );

      // Correctness: 0.8 score * 0.25 weight = 0.2 (20%)
      expect(container.textContent).toContain('20.0%');
    });

    it('should show weight, score, and context fit information', () => {
      const { getByText } = render(
        <ObjectiveInfluenceVisualization
          objectiveMetrics={mockObjectiveMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 1)}
        />
      );

      expect(getByText('Weight')).toBeInTheDocument();
      expect(getByText('Score')).toBeInTheDocument();
      expect(getByText('Context Fit')).toBeInTheDocument();
    });
  });

  describe('generateAlignmentExplanation', () => {
    it('should generate appropriate explanation for high scores', () => {
      const highScoreMetrics = {
        ...mockAlignmentMetrics,
        overallScore: 0.85
      };

      const explanation = generateAlignmentExplanation(
        highScoreMetrics,
        CORE_MENTAL_HEALTH_OBJECTIVES
      );

      expect(explanation).toContain('85.0%');
      expect(explanation).toContain('excellent alignment');
    });

    it('should generate appropriate explanation for medium scores', () => {
      const mediumScoreMetrics = {
        ...mockAlignmentMetrics,
        overallScore: 0.65
      };

      const explanation = generateAlignmentExplanation(
        mediumScoreMetrics,
        CORE_MENTAL_HEALTH_OBJECTIVES
      );

      expect(explanation).toContain('65.0%');
      expect(explanation).toContain('good alignment with room for improvement');
    });

    it('should generate appropriate explanation for low scores', () => {
      const lowScoreMetrics = {
        ...mockAlignmentMetrics,
        overallScore: 0.45
      };

      const explanation = generateAlignmentExplanation(
        lowScoreMetrics,
        CORE_MENTAL_HEALTH_OBJECTIVES
      );

      expect(explanation).toContain('45.0%');
      expect(explanation).toContain('significant alignment issues');
    });

    it('should identify best and worst performing objectives', () => {
      const explanation = generateAlignmentExplanation(
        mockAlignmentMetrics,
        CORE_MENTAL_HEALTH_OBJECTIVES
      );

      expect(explanation).toContain('Safety'); // Best performer (95%)
      expect(explanation).toContain('Empathy'); // Worst performer (70%)
    });

    it('should mention balance issues when present', () => {
      const unbalancedMetrics = {
        ...mockAlignmentMetrics,
        balanceScore: 0.6
      };

      const explanation = generateAlignmentExplanation(
        unbalancedMetrics,
        CORE_MENTAL_HEALTH_OBJECTIVES
      );

      expect(explanation).toContain('imbalance');
      expect(explanation).toContain('over-optimizing');
    });

    it('should handle empty objectives gracefully', () => {
      const explanation = generateAlignmentExplanation(
        mockAlignmentMetrics,
        []
      );

      expect(explanation).toContain('82.0%');
      expect(explanation).toContain('Unknown'); // Should default to Unknown for objectives
    });
  });

  describe('Component Props Validation', () => {
    it('should handle className prop correctly', () => {
      const { getByTestId } = render(
        <ObjectiveScoreVisualization
          objectiveMetrics={mockObjectiveMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 1)}
          className="custom-class"
        />
      );

      expect(getByTestId('card')).toHaveClass('custom-class');
    });

    it('should use default className when not provided', () => {
      const { getByTestId } = render(
        <ObjectiveScoreVisualization
          objectiveMetrics={mockObjectiveMetrics}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 1)}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined metrics gracefully', () => {
      const { getByTestId } = render(
        <ObjectiveScoreVisualization
          objectiveMetrics={{}}
          objectives={CORE_MENTAL_HEALTH_OBJECTIVES.slice(0, 1)}
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
    });

    it('should handle empty criteria metrics', () => {
      const { getByTestId } = render(
        <CriteriaBreakdownVisualization
          criteriaMetrics={[]}
          objectiveName="Test"
        />
      );

      expect(getByTestId('card')).toBeInTheDocument();
      expect(getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should handle malformed evaluation history', () => {
      const malformedHistory = [
        {
          ...mockTimestampedEvaluations[0],
          timestamp: 'invalid-date' as any
        }
      ];

      // Should not throw error
      expect(() => {
        render(
          <AlignmentTrendVisualization
            evaluationHistory={malformedHistory}
          />
        );
      }).not.toThrow();
    });
  });
}); 