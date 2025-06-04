import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BiasDetectionEngine } from '../BiasDetectionEngine';
import type { SessionData, BiasDetectionConfig } from '../types';

// Mock the Python service
vi.mock('../python-service/bias_detection_service.py', () => ({
  BiasDetectionService: vi.fn().mockImplementation(() => ({
    analyze_session: vi.fn().mockResolvedValue({
      session_id: 'test-session',
      overall_bias_score: 0.25,
      alert_level: 'low',
      layer_results: {
        preprocessing: { bias_score: 0.2, linguistic_bias: 0.1 },
        model_level: { bias_score: 0.3, fairness_metrics: {} },
        interactive: { bias_score: 0.2, counterfactual_analysis: {} },
        evaluation: { bias_score: 0.3, nlp_bias_metrics: {} }
      },
      recommendations: ['Use more inclusive language'],
      confidence: 0.85
    })
  }))
}));

describe('BiasDetectionEngine', () => {
  let biasEngine: BiasDetectionEngine;
  let mockConfig: BiasDetectionConfig;
  let mockSessionData: SessionData;

  beforeEach(() => {
    mockConfig = {
      warningThreshold: 0.3,
      highThreshold: 0.6,
      criticalThreshold: 0.8,
      enableHipaaCompliance: true,
      enableAuditLogging: true,
      layerWeights: {
        preprocessing: 0.25,
        modelLevel: 0.25,
        interactive: 0.25,
        evaluation: 0.25
      }
    };

    mockSessionData = {
      sessionId: 'test-session-001',
      participantDemographics: {
        gender: 'female',
        age: '28',
        ethnicity: 'hispanic',
        education: 'bachelors',
        experience: 'beginner'
      },
      trainingScenario: {
        type: 'anxiety_management',
        difficulty: 'intermediate',
        duration: 30,
        objectives: ['assess_anxiety', 'provide_coping_strategies']
      },
      content: {
        transcript: 'Patient expresses feeling overwhelmed with work stress...',
        aiResponses: [
          'I understand you\'re feeling stressed. Let\'s explore some coping strategies.',
          'Have you tried deep breathing exercises?'
        ],
        userInputs: [
          'I feel like I can\'t handle the pressure anymore',
          'No, I haven\'t tried breathing exercises'
        ]
      },
      aiResponses: [
        {
          id: 'response-1',
          content: 'I understand you\'re feeling stressed. Let\'s explore some coping strategies.',
          timestamp: new Date().toISOString(),
          confidence: 0.9
        }
      ],
      expectedOutcomes: [
        {
          metric: 'empathy_score',
          expected: 0.8,
          actual: 0.75
        }
      ],
      transcripts: [
        {
          speaker: 'participant',
          content: 'I feel overwhelmed',
          timestamp: new Date().toISOString()
        }
      ],
      metadata: {
        sessionDuration: 1800,
        completionRate: 0.95,
        technicalIssues: false
      }
    };

    biasEngine = new BiasDetectionEngine(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultEngine = new BiasDetectionEngine();
      expect(defaultEngine).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      expect(biasEngine).toBeDefined();
      expect(biasEngine['config'].warningThreshold).toBe(0.3);
      expect(biasEngine['config'].enableHipaaCompliance).toBe(true);
    });

    it('should validate configuration parameters', () => {
      expect(() => {
        new BiasDetectionEngine({
          warningThreshold: -0.1, // Invalid threshold
          highThreshold: 0.6,
          criticalThreshold: 0.8
        });
      }).toThrow('Invalid threshold values');
    });
  });

  describe('Session Analysis', () => {
    it('should analyze session and return bias results', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(mockSessionData.sessionId);
      expect(result.overallBiasScore).toBeTypeOf('number');
      expect(result.alertLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(result.layerResults).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle missing required fields', async () => {
      const invalidSessionData = { ...mockSessionData };
      delete invalidSessionData.sessionId;

      await expect(biasEngine.analyzeSession(invalidSessionData as any))
        .rejects.toThrow('Missing required session data');
    });

    it('should apply HIPAA compliance when enabled', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);
      
      // Check that sensitive data is masked or removed
      expect(result.demographics).not.toContain('specific_identifiers');
      expect(result.auditLog).toBeDefined();
    });

    it('should calculate correct alert levels', async () => {
      // Test low bias score
      const lowBiasResult = await biasEngine.analyzeSession({
        ...mockSessionData,
        sessionId: 'low-bias-session'
      });
      expect(lowBiasResult.alertLevel).toBe('low');

      // Mock high bias score
      vi.mocked(biasEngine['pythonService'].analyze_session).mockResolvedValueOnce({
        session_id: 'high-bias-session',
        overall_bias_score: 0.75,
        alert_level: 'high',
        layer_results: {},
        recommendations: [],
        confidence: 0.9
      });

      const highBiasResult = await biasEngine.analyzeSession({
        ...mockSessionData,
        sessionId: 'high-bias-session'
      });
      expect(highBiasResult.alertLevel).toBe('high');
    });
  });

  describe('Multi-Layer Analysis', () => {
    it('should perform preprocessing layer analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);
      
      expect(result.layerResults.preprocessing).toBeDefined();
      expect(result.layerResults.preprocessing.biasScore).toBeTypeOf('number');
    });

    it('should perform model-level analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);
      
      expect(result.layerResults.modelLevel).toBeDefined();
      expect(result.layerResults.modelLevel.fairnessMetrics).toBeDefined();
    });

    it('should perform interactive analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);
      
      expect(result.layerResults.interactive).toBeDefined();
      expect(result.layerResults.interactive.counterfactualAnalysis).toBeDefined();
    });

    it('should perform evaluation layer analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);
      
      expect(result.layerResults.evaluation).toBeDefined();
      expect(result.layerResults.evaluation.nlpBiasMetrics).toBeDefined();
    });
  });

  describe('Dashboard Data', () => {
    it('should generate dashboard data', async () => {
      const dashboardData = await biasEngine.getDashboardData({
        timeRange: '24h',
        demographicFilter: 'all'
      });

      expect(dashboardData).toBeDefined();
      expect(dashboardData.summary).toBeDefined();
      expect(dashboardData.alerts).toBeInstanceOf(Array);
      expect(dashboardData.trends).toBeDefined();
      expect(dashboardData.demographics).toBeDefined();
    });

    it('should filter dashboard data by time range', async () => {
      const data24h = await biasEngine.getDashboardData({ timeRange: '24h' });
      const data7d = await biasEngine.getDashboardData({ timeRange: '7d' });

      expect(data24h.trends.biasScoreOverTime.length).toBeLessThanOrEqual(
        data7d.trends.biasScoreOverTime.length
      );
    });

    it('should filter dashboard data by demographics', async () => {
      const allData = await biasEngine.getDashboardData({ demographicFilter: 'all' });
      const femaleData = await biasEngine.getDashboardData({ demographicFilter: 'female' });

      expect(allData.demographics.totalParticipants).toBeGreaterThanOrEqual(
        femaleData.demographics.totalParticipants
      );
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start monitoring', async () => {
      const mockCallback = vi.fn();
      await biasEngine.startMonitoring(mockCallback);
      
      expect(biasEngine['isMonitoring']).toBe(true);
    });

    it('should stop monitoring', async () => {
      const mockCallback = vi.fn();
      await biasEngine.startMonitoring(mockCallback);
      await biasEngine.stopMonitoring();
      
      expect(biasEngine['isMonitoring']).toBe(false);
    });

    it('should trigger alerts for high bias scores', async () => {
      const mockCallback = vi.fn();
      await biasEngine.startMonitoring(mockCallback);

      // Simulate high bias session
      vi.mocked(biasEngine['pythonService'].analyze_session).mockResolvedValueOnce({
        session_id: 'alert-session',
        overall_bias_score: 0.85,
        alert_level: 'critical',
        layer_results: {},
        recommendations: ['Immediate review required'],
        confidence: 0.95
      });

      await biasEngine.analyzeSession({
        ...mockSessionData,
        sessionId: 'alert-session'
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'critical',
          sessionId: 'alert-session'
        })
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should complete analysis within 100ms for simple sessions', async () => {
      const startTime = Date.now();
      await biasEngine.analyzeSession(mockSessionData);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle concurrent sessions', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        ...mockSessionData,
        sessionId: `concurrent-session-${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        sessions.map(session => biasEngine.analyzeSession(session))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should handle 10 sessions in under 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle Python service errors gracefully', async () => {
      vi.mocked(biasEngine['pythonService'].analyze_session).mockRejectedValueOnce(
        new Error('Python service unavailable')
      );

      await expect(biasEngine.analyzeSession(mockSessionData))
        .rejects.toThrow('Bias analysis failed');
    });

    it('should provide fallback analysis when toolkits are unavailable', async () => {
      // Mock toolkit unavailability
      vi.mocked(biasEngine['pythonService'].analyze_session).mockResolvedValueOnce({
        session_id: mockSessionData.sessionId,
        overall_bias_score: 0.5, // Fallback score
        alert_level: 'medium',
        layer_results: {
          preprocessing: { bias_score: 0.5, fallback: true },
          model_level: { bias_score: 0.5, fallback: true },
          interactive: { bias_score: 0.5, fallback: true },
          evaluation: { bias_score: 0.5, fallback: true }
        },
        recommendations: ['Limited analysis - some toolkits unavailable'],
        confidence: 0.3
      });

      const result = await biasEngine.analyzeSession(mockSessionData);
      
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.recommendations).toContain('Limited analysis');
    });
  });

  describe('Data Privacy and Security', () => {
    it('should mask sensitive demographic data', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData);
      
      // Check that specific identifiers are not present in the result
      const resultString = JSON.stringify(result);
      expect(resultString).not.toContain('social_security');
      expect(resultString).not.toContain('phone_number');
      expect(resultString).not.toContain('email');
    });

    it('should create audit logs when enabled', async () => {
      await biasEngine.analyzeSession(mockSessionData);
      
      // Verify audit log was created
      expect(biasEngine['auditLogs']).toBeDefined();
      expect(biasEngine['auditLogs'].length).toBeGreaterThan(0);
    });

    it('should not create audit logs when disabled', async () => {
      const noAuditEngine = new BiasDetectionEngine({
        ...mockConfig,
        enableAuditLogging: false
      });

      await noAuditEngine.analyzeSession(mockSessionData);
      
      expect(noAuditEngine['auditLogs']).toHaveLength(0);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should integrate with session management system', async () => {
      // Mock session retrieval
      const sessionId = 'existing-session-123';
      const result = await biasEngine.getSessionAnalysis(sessionId);
      
      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
    });

    it('should provide metrics for analytics dashboard', async () => {
      const metrics = await biasEngine.getMetrics({
        timeRange: '24h',
        includeDetails: true
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalSessions).toBeTypeOf('number');
      expect(metrics.averageBiasScore).toBeTypeOf('number');
      expect(metrics.alertCounts).toBeDefined();
    });
  });
}); 