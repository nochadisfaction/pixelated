/**
 * Unit tests for Context Detection System
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ContextDetector, createContextDetector, getDefaultContextDetectorConfig } from './context-detector';
import type { ContextDetectorConfig, ContextDetectionResult } from './context-detector';
import { ContextType } from '../core/objectives';
import type { AIService } from '../../ai/models/types';
import type { CrisisDetectionResult } from '../../ai/types';

// Mock dependencies
const mockAIService: AIService = {
  getModelInfo: vi.fn(),
  createChatCompletion: vi.fn(),
  createChatStream: vi.fn()
};

const mockCrisisDetectionService = {
  detectCrisis: vi.fn(),
  detectBatch: vi.fn(),
  mapSeverityToScore: vi.fn(),
  mapRiskLevelToSeverity: vi.fn(),
  aiService: mockAIService,
  model: 'gpt-4',
  defaultPrompt: 'default crisis prompt',
  sensitivityLevel: 'medium' as const
};

describe('ContextDetector', () => {
  let contextDetector: ContextDetector;
  let config: ContextDetectorConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      aiService: mockAIService,
      crisisDetectionService: mockCrisisDetectionService as any,
      model: 'gpt-4',
      enableCrisisIntegration: true
    };
    
    contextDetector = new ContextDetector(config);
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(contextDetector).toBeDefined();
    });

    it('should use default model when not specified', () => {
      const configWithoutModel = { ...config };
      delete configWithoutModel.model;
      
      const detector = new ContextDetector(configWithoutModel);
      expect(detector).toBeDefined();
    });

    it('should disable crisis integration when specified', async () => {
      const configWithoutCrisis = {
        ...config,
        enableCrisisIntegration: false
      };
      
      const detector = new ContextDetector(configWithoutCrisis);
      expect(detector).toBeDefined();

      // Mock AI response for general context detection
      const aiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              detectedContext: 'general',
              confidence: 0.5,
              contextualIndicators: [],
              needsSpecialHandling: false,
              urgency: 'low',
              metadata: {}
            })
          }
        }]
      };

      (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

      // Test that crisis detection service is not called when integration is disabled
      const result = await detector.detectContext('I need help with something');

      expect(result.detectedContext).toBe(ContextType.GENERAL);
      expect(mockCrisisDetectionService.detectCrisis).not.toHaveBeenCalled();
      expect(result.metadata.crisisAnalysis).toBeUndefined();
    });
  });

  describe('detectContext', () => {
    describe('crisis detection integration', () => {
      it('should return crisis context when crisis is detected', async () => {
        const crisisResult: CrisisDetectionResult = {
          isCrisis: true,
          confidence: 0.9,
          category: 'self-harm',
          severity: 'high',
          recommendedAction: 'immediate-intervention',
          content: 'I want to hurt myself'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);

        const result = await contextDetector.detectContext('I want to hurt myself', [], 'user123');

        expect(result.detectedContext).toBe(ContextType.CRISIS);
        expect(result.confidence).toBe(0.9);
        expect(result.needsSpecialHandling).toBe(true);
        expect(result.urgency).toBe('high');
        expect(result.contextualIndicators).toHaveLength(1);
        expect(result.contextualIndicators[0].type).toBe('crisis_detection');
        expect(mockCrisisDetectionService.detectCrisis).toHaveBeenCalledWith(
          'I want to hurt myself',
          { userId: 'user123', source: 'context-detection' }
        );
      });

      it('should proceed with general detection when no crisis is detected', async () => {
        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.2,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'What is anxiety?'
        };

        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'educational',
                confidence: 0.8,
                contextualIndicators: [
                  { type: 'question_pattern', description: 'Educational question detected', confidence: 0.8 }
                ],
                needsSpecialHandling: false,
                urgency: 'low',
                metadata: {}
              })
            }
          }]
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('What is anxiety?');

        expect(result.detectedContext).toBe(ContextType.EDUCATIONAL);
        expect(result.confidence).toBe(0.8);
        expect(result.metadata.crisisAnalysis).toBeDefined();
        expect(result.metadata.crisisAnalysis.confidence).toBe(0.2);
      });

      it('should skip crisis detection when integration is disabled', async () => {
        const configWithoutCrisis = {
          ...config,
          enableCrisisIntegration: false
        };
        
        const detector = new ContextDetector(configWithoutCrisis);
        
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'support',
                confidence: 0.7,
                contextualIndicators: [],
                needsSpecialHandling: false,
                urgency: 'medium',
                metadata: {}
              })
            }
          }]
        };

        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await detector.detectContext('I need help coping');

        expect(result.detectedContext).toBe(ContextType.SUPPORT);
        expect(mockCrisisDetectionService.detectCrisis).not.toHaveBeenCalled();
      });
    });

    describe('context classification', () => {
      it('should detect educational context', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: `{
                "detectedContext": "educational",
                "confidence": 0.85,
                "contextualIndicators": [
                  {"type": "question_pattern", "description": "Educational question about mental health", "confidence": 0.8}
                ],
                "needsSpecialHandling": false,
                "urgency": "low",
                "metadata": {"topic": "anxiety"}
              }`
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'What are the symptoms of anxiety?'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('What are the symptoms of anxiety?');

        expect(result.detectedContext).toBe(ContextType.EDUCATIONAL);
        expect(result.confidence).toBe(0.85);
        expect(result.urgency).toBe('low');
      });

      it('should detect support context', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'support',
                confidence: 0.75,
                contextualIndicators: [
                  { type: 'emotional_expression', description: 'Expressing feelings of sadness', confidence: 0.8 }
                ],
                needsSpecialHandling: false,
                urgency: 'medium',
                metadata: {}
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'I\'ve been feeling really sad lately'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('I\'ve been feeling really sad lately');

        expect(result.detectedContext).toBe(ContextType.SUPPORT);
        expect(result.confidence).toBe(0.75);
        expect(result.urgency).toBe('medium');
      });

      it('should detect clinical assessment context', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'clinical_assessment',
                confidence: 0.9,
                contextualIndicators: [
                  { type: 'diagnostic_inquiry', description: 'Asking about symptoms for diagnosis', confidence: 0.9 }
                ],
                needsSpecialHandling: true,
                urgency: 'high',
                metadata: { assessmentType: 'diagnostic' }
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Do I have depression? I have these symptoms...'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('Do I have depression? I have these symptoms...');

        expect(result.detectedContext).toBe(ContextType.CLINICAL_ASSESSMENT);
        expect(result.confidence).toBe(0.9);
        expect(result.needsSpecialHandling).toBe(true);
        expect(result.urgency).toBe('high');
      });

      it('should detect informational context', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'informational',
                confidence: 0.8,
                contextualIndicators: [
                  { type: 'resource_request', description: 'Requesting information about resources', confidence: 0.8 }
                ],
                needsSpecialHandling: false,
                urgency: 'low',
                metadata: { resourceType: 'therapy' }
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Where can I find affordable therapy?'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('Where can I find affordable therapy?');

        expect(result.detectedContext).toBe(ContextType.INFORMATIONAL);
        expect(result.confidence).toBe(0.8);
        expect(result.urgency).toBe('low');
      });
    });

    describe('conversation history integration', () => {
      it('should include conversation history in analysis', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'support',
                confidence: 0.7,
                contextualIndicators: [],
                needsSpecialHandling: false,
                urgency: 'medium',
                metadata: {}
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Can you help me?'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const conversationHistory = [
          'I\'ve been feeling down',
          'It\'s been going on for weeks',
          'I don\'t know what to do'
        ];

        await contextDetector.detectContext('Can you help me?', conversationHistory);

        expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Recent conversation context')
            })
          ]),
          expect.any(Object)
        );
      });
    });

    describe('error handling', () => {
      it('should handle AI service errors gracefully', async () => {
        mockCrisisDetectionService.detectCrisis.mockResolvedValue({ 
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Test message'
        });
        (mockAIService.createChatCompletion as Mock).mockRejectedValue(new Error('AI service error'));

        const result = await contextDetector.detectContext('Test message');

        expect(result.detectedContext).toBe(ContextType.GENERAL);
        expect(result.confidence).toBe(0.1);
        expect(result.urgency).toBe('low');
        expect(result.metadata.error).toBe('AI service error');
      });

      it('should handle malformed AI responses', async () => {
        const malformedResponse = {
          choices: [{
            message: {
              content: 'This is not valid JSON'
            }
          }]
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue({ 
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Test message'
        });
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(malformedResponse);

        const result = await contextDetector.detectContext('Test message');

        expect(result.detectedContext).toBe(ContextType.GENERAL);
        expect(result.confidence).toBe(0.3);
        expect(result.metadata.parseError).toBe(true);
      });

      it('should handle crisis service errors gracefully', async () => {
        mockCrisisDetectionService.detectCrisis.mockRejectedValue(new Error('Crisis service error'));
        
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'general',
                confidence: 0.5,
                contextualIndicators: [],
                needsSpecialHandling: false,
                urgency: 'low',
                metadata: {}
              })
            }
          }]
        };

        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('Test message');

        expect(result.detectedContext).toBe(ContextType.GENERAL);
        // Should continue with normal detection despite crisis service error
      });
    });

    describe('context validation', () => {
      it('should normalize invalid context types', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'invalid_context',
                confidence: 0.8,
                contextualIndicators: [],
                needsSpecialHandling: false,
                urgency: 'low',
                metadata: {}
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Test message'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('Test message');

        expect(result.detectedContext).toBe(ContextType.GENERAL);
      });

      it('should normalize context type variations', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'emergency',
                confidence: 0.8,
                contextualIndicators: [],
                needsSpecialHandling: false,
                urgency: 'critical',
                metadata: {}
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Test message'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('Test message');

        expect(result.detectedContext).toBe(ContextType.CRISIS);
      });

      it('should clamp confidence values to valid range', async () => {
        const aiResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                detectedContext: 'educational',
                confidence: 1.5, // Invalid - too high
                contextualIndicators: [],
                needsSpecialHandling: false,
                urgency: 'low',
                metadata: {}
              })
            }
          }]
        };

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          severity: 'none',
          recommendedAction: undefined,
          content: 'Test message'
        };

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
        (mockAIService.createChatCompletion as Mock).mockResolvedValue(aiResponse);

        const result = await contextDetector.detectContext('Test message');

        expect(result.confidence).toBe(1.0);
      });
    });
  });

  describe('detectContextBatch', () => {
    it('should process multiple inputs', async () => {
      const inputs = [
        { text: 'What is anxiety?', userId: 'user1' },
        { text: 'I need help coping', userId: 'user2' },
        { text: 'Where can I find therapy?', userId: 'user3' }
      ];

      const crisisResult: CrisisDetectionResult = {
        isCrisis: false,
        confidence: 0.1,
        category: undefined,
        severity: 'none',
        recommendedAction: undefined,
        content: 'batch processing'
      };

      mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult);
      
      const aiResponses = [
        { detectedContext: 'educational', confidence: 0.8 },
        { detectedContext: 'support', confidence: 0.7 },
        { detectedContext: 'informational', confidence: 0.9 }
      ].map((ctx, index) => ({
        choices: [{
          message: {
            content: JSON.stringify({
              ...ctx,
              contextualIndicators: [],
              needsSpecialHandling: false,
              urgency: 'low',
              metadata: {}
            })
          }
        }]
      }));

      (mockAIService.createChatCompletion as Mock)
        .mockResolvedValueOnce(aiResponses[0])
        .mockResolvedValueOnce(aiResponses[1])
        .mockResolvedValueOnce(aiResponses[2]);

      const results = await contextDetector.detectContextBatch(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].detectedContext).toBe(ContextType.EDUCATIONAL);
      expect(results[1].detectedContext).toBe(ContextType.SUPPORT);
      expect(results[2].detectedContext).toBe(ContextType.INFORMATIONAL);
    });
  });

  describe('createAlignmentContext', () => {
    it('should create properly structured alignment context', () => {
      const userQuery = 'I need help with anxiety';
      const detectionResult: ContextDetectionResult = {
        detectedContext: ContextType.SUPPORT,
        confidence: 0.8,
        contextualIndicators: [],
        needsSpecialHandling: false,
        urgency: 'medium',
        metadata: {}
      };
      const conversationHistory = ['Previous message'];
      const userProfile = { demographics: { age: 25 } };
      const sessionMetadata = { sessionId: 'session123' };

      const alignmentContext = contextDetector.createAlignmentContext(
        userQuery,
        detectionResult,
        conversationHistory,
        userProfile,
        sessionMetadata
      );

      expect(alignmentContext.userQuery).toBe(userQuery);
      expect(alignmentContext.detectedContext).toBe(ContextType.SUPPORT);
      expect(alignmentContext.conversationHistory).toBe(conversationHistory);
      expect(alignmentContext.userProfile).toBe(userProfile);
      expect(alignmentContext.sessionMetadata?.contextDetection).toBe(detectionResult);
      expect(alignmentContext.sessionMetadata?.urgency).toBe('medium');
      expect(alignmentContext.sessionMetadata?.needsSpecialHandling).toBe(false);
      expect(alignmentContext.sessionMetadata?.sessionId).toBe('session123');
    });
  });
});

describe('createContextDetector', () => {
  it('should create a context detector instance', () => {
    const config: ContextDetectorConfig = {
      aiService: mockAIService,
      model: 'gpt-4'
    };

    const detector = createContextDetector(config);
    expect(detector).toBeInstanceOf(ContextDetector);
  });
});

describe('getDefaultContextDetectorConfig', () => {
  it('should return default configuration', () => {
    const config = getDefaultContextDetectorConfig(mockAIService);
    
    expect(config.aiService).toBe(mockAIService);
    expect(config.model).toBe('gpt-4');
    expect(config.enableCrisisIntegration).toBe(true);
  });
}); 