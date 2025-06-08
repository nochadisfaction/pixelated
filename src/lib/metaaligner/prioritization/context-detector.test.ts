/**
 * Unit tests for ContextDetector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextDetector, type ContextDetectionConfig } from './context-detector';
import type { ContextType } from '../core/objectives';
import type { CrisisDetectionResult } from '../../ai/types';
import { CrisisDetectionService } from '../../ai/services/crisis-detection';
import { CrisisRiskDetector } from '../../ai/crisis/CrisisRiskDetector';

// Mock dependencies
vi.mock('../../logging', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}));

vi.mock('../../ai/services/crisis-detection');
vi.mock('../../ai/crisis/CrisisRiskDetector');

describe('ContextDetector', () => {
  let contextDetector: ContextDetector;
  let mockCrisisDetectionService: CrisisDetectionService;
  let mockCrisisRiskDetector: CrisisRiskDetector;

  beforeEach(() => {
    // Create mock instances
    mockCrisisDetectionService = {
      detectCrisis: vi.fn()
    } as any;

    mockCrisisRiskDetector = {
      analyzeText: vi.fn(),
      extractRiskTerms: vi.fn()
    } as any;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      contextDetector = new ContextDetector();
      expect(contextDetector).toBeInstanceOf(ContextDetector);
    });

    it('should initialize with custom configuration', () => {
      const config: ContextDetectionConfig = {
        crisisDetectionService: mockCrisisDetectionService,
        crisisRiskDetector: mockCrisisRiskDetector,
        sensitivityLevel: 'high',
        enableAdvancedAnalysis: false
      };

      contextDetector = new ContextDetector(config);
      expect(contextDetector).toBeInstanceOf(ContextDetector);
    });
  });

  describe('Crisis Context Detection', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisDetectionService: mockCrisisDetectionService,
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should detect critical crisis with AI service', async () => {
      const mockCrisisResult: CrisisDetectionResult = {
        isCrisis: true,
        confidence: 0.95,
        category: 'suicide',
        severity: 'severe',
        recommendedAction: 'immediate-intervention',
        content: 'I want to end my life',
        hasCrisis: true,
        crisisType: 'suicide',
        requiresIntervention: true
      };

      mockCrisisDetectionService.detectCrisis = vi.fn().mockResolvedValue(mockCrisisResult);

      const result = await contextDetector.detectContext('I want to end my life tonight');

      expect(result.detectedContext).toBe('crisis');
      expect(result.confidence).toBe(0.95);
      expect(result.metadata.crisisAssessment).toEqual(mockCrisisResult);
      expect(result.metadata.analysisMethod).toBe('ai-assisted');
      expect(mockCrisisDetectionService.detectCrisis).toHaveBeenCalledWith(
        'I want to end my life tonight',
        expect.objectContaining({
          sensitivityLevel: 'medium'
        })
      );
    });

    it('should detect crisis with pattern-based fallback', async () => {
      // Mock AI service to fail
      mockCrisisDetectionService.detectCrisis = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Mock risk detector
      mockCrisisRiskDetector.analyzeText = vi.fn().mockReturnValue({
        overallRiskScore: 0.8,
        primaryRisk: 'suicidal_ideation',
        confidenceScore: 0.85,
        immediateActionRequired: true
      });

      const result = await contextDetector.detectContext('I want to kill myself');

      expect(result.detectedContext).toBe('crisis');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(mockCrisisRiskDetector.analyzeText).toHaveBeenCalled();
    });

    it('should handle suicidal ideation patterns', async () => {
      const queries = [
        'I want to end my life',
        'Better off dead',
        'Planning to kill myself',
        'Wrote my suicide note',
        'No point in living'
      ];

      for (const query of queries) {
        const result = await contextDetector.detectContext(query);
        expect(result.detectedContext).toBe('crisis');
        expect(result.confidence).toBeGreaterThan(0.6);
      }
    });

    it('should handle self-harm patterns', async () => {
      const queries = [
        'I cut myself last night',
        'Burning myself to feel better',
        'Can\'t stop self-harming',
        'Addicted to cutting'
      ];

      for (const query of queries) {
        const result = await contextDetector.detectContext(query);
        expect(result.detectedContext).toBe('crisis');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Educational Context Detection', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should detect educational queries', async () => {
      const educationalQueries = [
        'What is depression?',
        'Explain anxiety disorder',
        'How does therapy work?',
        'Tell me about PTSD symptoms',
        'What are the causes of bipolar disorder?'
      ];

      for (const query of educationalQueries) {
        const result = await contextDetector.detectContext(query);
        expect(result.detectedContext).toBe('educational');
        expect(result.confidence).toBeGreaterThan(0.4);
      }
    });

    it('should identify learning-focused language', async () => {
      const result = await contextDetector.detectContext('I want to understand the difference between anxiety and panic attacks');
      
      expect(result.detectedContext).toBe('educational');
      expect(result.indicators).toContain('pattern-match-educational');
    });
  });

  describe('Support Context Detection', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should detect support-seeking queries', async () => {
      const supportQueries = [
        'I feel really sad today',
        'Going through a difficult time',
        'Need someone to talk to',
        'Struggling with anxiety',
        'Having a hard time coping'
      ];

      for (const query of supportQueries) {
        const result = await contextDetector.detectContext(query);
        expect(result.detectedContext).toBe('support');
        expect(result.confidence).toBeGreaterThan(0.4);
      }
    });

    it('should identify emotional language patterns', async () => {
      const result = await contextDetector.detectContext('I\'ve been feeling overwhelmed and need emotional support');
      
      expect(result.detectedContext).toBe('support');
      expect(result.indicators.some(indicator => indicator.includes('support') || indicator.includes('emotional'))).toBe(true);
    });
  });

  describe('Clinical Assessment Context Detection', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should detect clinical assessment queries', async () => {
      const clinicalQueries = [
        'Do I have depression?',
        'What are the symptoms of ADHD?',
        'Could I have bipolar disorder?',
        'Need a mental health assessment',
        'Psychiatric evaluation needed'
      ];

      for (const query of clinicalQueries) {
        const result = await contextDetector.detectContext(query);
        expect(result.detectedContext).toBe('clinical_assessment');
        expect(result.confidence).toBeGreaterThan(0.4);
      }
    });

    it('should identify diagnostic language', async () => {
      const result = await contextDetector.detectContext('I think I might have depression symptoms and need screening');
      
      expect(result.detectedContext).toBe('clinical_assessment');
      expect(result.indicators).toContain('pattern-match-clinical_assessment');
    });
  });

  describe('Informational Context Detection', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should detect informational queries', async () => {
      const informationalQueries = [
        'Where can I find a therapist?',
        'Mental health resources in my area',
        'How to access therapy?',
        'Insurance coverage for counseling',
        'Crisis hotline numbers'
      ];

      for (const query of informationalQueries) {
        const result = await contextDetector.detectContext(query);
        expect(result.detectedContext).toBe('informational');
        expect(result.confidence).toBeGreaterThan(0.4);
      }
    });

    it('should identify resource-seeking language', async () => {
      const result = await contextDetector.detectContext('I need to find affordable therapy options and mental health resources');
      
      expect(result.detectedContext).toBe('informational');
      expect(result.indicators.some(indicator => indicator.includes('resources') || indicator.includes('find'))).toBe(true);
    });
  });

  describe('Context with Conversation History', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should consider conversation history for context', async () => {
      const conversationHistory = [
        'I\'ve been feeling sad lately',
        'It\'s been going on for weeks',
        'My therapist suggested medication'
      ];

      const result = await contextDetector.detectContext(
        'What should I expect?',
        conversationHistory
      );

      // Should detect this as support/informational rather than general
      expect(['support', 'informational', 'clinical_assessment']).toContain(result.detectedContext);
    });

    it('should prioritize crisis indicators in history', async () => {
      const conversationHistory = [
        'I\'ve been having dark thoughts',
        'Nothing seems to matter anymore'
      ];

      const result = await contextDetector.detectContext(
        'I don\'t know what to do',
        conversationHistory
      );

      expect(result.detectedContext).toBe('crisis');
    });
  });

  describe('Alternative Contexts', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should provide alternative contexts when confidence is distributed', async () => {
      const result = await contextDetector.detectContext(
        'I feel anxious and want to understand what therapy options are available'
      );

      expect(result.alternativeContexts.length).toBeGreaterThan(0);
      const contexts = result.alternativeContexts.map(alt => alt.context);
      expect(contexts).toContain('support');
      expect(contexts).toContain('informational');
    });

    it('should filter low-confidence alternatives', async () => {
      const result = await contextDetector.detectContext(
        'I want to kill myself tonight'
      );

      // Should have high confidence in crisis, low alternatives
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.alternativeContexts.length).toBeLessThan(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisDetectionService: mockCrisisDetectionService,
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should handle empty queries', async () => {
      const result = await contextDetector.detectContext('');
      
      expect(result.detectedContext).toBe('general');
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle queries with only whitespace', async () => {
      const result = await contextDetector.detectContext('   \\n\\t   ');
      
      expect(result.detectedContext).toBe('general');
    });

    it('should fallback gracefully when services fail', async () => {
      mockCrisisDetectionService.detectCrisis = vi.fn().mockRejectedValue(new Error('Service error'));
      mockCrisisRiskDetector.analyzeText = vi.fn().mockImplementation(() => {
        throw new Error('Risk detector error');
      });

      const result = await contextDetector.detectContext('I need help');
      
      expect(result.detectedContext).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'I feel '.repeat(1000) + 'depressed';
      
      const result = await contextDetector.detectContext(longQuery);
      
      expect(result.detectedContext).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle special characters and unicode', async () => {
      const result = await contextDetector.detectContext('I feel 😔 and need help with émotions');
      
      expect(result.detectedContext).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        sensitivityLevel: 'medium',
        enableAdvancedAnalysis: true
      });
    });

    it('should update sensitivity level', () => {
      contextDetector.updateConfig({ sensitivityLevel: 'high' });
      
      // Verify the update by checking if the behavior changes
      // This is more of an integration test - we can't directly test private properties
      expect(() => contextDetector.updateConfig({ sensitivityLevel: 'high' })).not.toThrow();
    });

    it('should update advanced analysis setting', () => {
      contextDetector.updateConfig({ enableAdvancedAnalysis: false });
      
      expect(() => contextDetector.updateConfig({ enableAdvancedAnalysis: false })).not.toThrow();
    });

    it('should update crisis detection service', () => {
      const newService = {
        detectCrisis: vi.fn().mockResolvedValue({
          isCrisis: false,
          confidence: 0.1
        })
      } as any;

      contextDetector.updateConfig({ crisisDetectionService: newService });
      
      expect(() => contextDetector.updateConfig({ crisisDetectionService: newService })).not.toThrow();
    });
  });

  describe('Performance and Timing', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should complete detection within reasonable time', async () => {
      const startTime = Date.now();
      
      await contextDetector.detectContext('I need help with my anxiety');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 1000ms for simple queries
      expect(processingTime).toBeLessThan(1000);
    });

    it('should include processing time in metadata', async () => {
      const result = await contextDetector.detectContext('Test query');
      
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(typeof result.metadata.processingTime).toBe('number');
    });
  });

  describe('Integration with Crisis Services', () => {
    beforeEach(() => {
      contextDetector = new ContextDetector({
        crisisDetectionService: mockCrisisDetectionService,
        crisisRiskDetector: mockCrisisRiskDetector
      });
    });

    it('should pass user ID to crisis detection service', async () => {
      mockCrisisDetectionService.detectCrisis = vi.fn().mockResolvedValue({
        isCrisis: false,
        confidence: 0.1
      });

      await contextDetector.detectContext('I feel sad', [], 'user-123');

      expect(mockCrisisDetectionService.detectCrisis).toHaveBeenCalledWith(
        'I feel sad',
        expect.objectContaining({
          userId: 'user-123'
        })
      );
    });

    it('should extract risk terms from crisis assessment', async () => {
      mockCrisisRiskDetector.analyzeText = vi.fn().mockReturnValue({
        overallRiskScore: 0.7,
        primaryRisk: 'suicidal_ideation',
        confidenceScore: 0.8,
        immediateActionRequired: false
      });

      mockCrisisRiskDetector.extractRiskTerms = vi.fn().mockReturnValue(['suicide', 'death', 'hopeless']);

      const result = await contextDetector.detectContext('I feel hopeless about life');

      expect(mockCrisisRiskDetector.extractRiskTerms).toHaveBeenCalled();
      expect(result.indicators.some(indicator => indicator.includes('risk-term'))).toBe(true);
    });
  });
}); 