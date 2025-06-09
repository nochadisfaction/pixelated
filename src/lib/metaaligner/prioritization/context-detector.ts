/**
 * Context Detection System for MetaAligner
 * Integrates with existing crisis detection and identifies different conversation contexts
 * to enable dynamic objective prioritization
 */

import { ContextType, type AlignmentContext } from '../core/objectives';
import { CrisisDetectionService } from '../../ai/services/crisis-detection';
import { EducationalContextRecognizer } from './educational-context-recognizer';
import type { AIService, AIRole } from '../../ai/models/types';
import { getLogger } from '../../logging';

const logger = getLogger({ prefix: 'context-detector' });

export interface ContextDetectionResult {
  detectedContext: ContextType;
  confidence: number;
  contextualIndicators: ContextualIndicator[];
  needsSpecialHandling: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
}

export interface ContextualIndicator {
  type: string;
  description: string;
  confidence: number;
  severity?: number;
}

export interface ContextDetectorConfig {
  aiService: AIService;
  crisisDetectionService?: CrisisDetectionService;
  educationalContextRecognizer?: EducationalContextRecognizer;
  model?: string;
  enableCrisisIntegration?: boolean;
  enableEducationalRecognition?: boolean;
}

/**
 * System prompt for context detection
 */
const CONTEXT_DETECTION_PROMPT = `You are a mental health context analysis system. Analyze the user's message to determine the primary context type and provide detailed indicators.

Context Types:
- CRISIS: Immediate safety concerns, self-harm, suicidal ideation, abuse, severe psychological distress
- EDUCATIONAL: Learning about mental health concepts, conditions, treatments, or general information
- SUPPORT: Seeking emotional support, validation, or coping strategies for ongoing challenges
- CLINICAL_ASSESSMENT: Seeking professional evaluation, diagnosis, or clinical guidance
- INFORMATIONAL: Requesting factual information about resources, services, or procedures
- GENERAL: Casual conversation, check-ins, or unclear intent

Respond in JSON format with:
- detectedContext: one of the context types above
- confidence: number from 0-1 indicating confidence in classification
- contextualIndicators: array of objects with type, description, and confidence
- needsSpecialHandling: boolean indicating if special protocols are needed
- urgency: "low", "medium", "high", or "critical"
- metadata: object with additional context-specific information

Be thorough in identifying indicators but prioritize safety - if there's any indication of crisis, classify as CRISIS.`;

/**
 * Context Detection System
 * 
 * Analyzes conversation context to determine appropriate objective prioritization
 */
export class ContextDetector {
  private aiService: AIService;
  private crisisDetectionService: CrisisDetectionService | undefined;
  private educationalContextRecognizer: EducationalContextRecognizer | undefined;
  private model: string;
  private enableCrisisIntegration: boolean;
  private enableEducationalRecognition: boolean;

  constructor(config: ContextDetectorConfig) {
    this.aiService = config.aiService;
    this.crisisDetectionService = config.crisisDetectionService ?? undefined;
    this.educationalContextRecognizer = config.educationalContextRecognizer ?? undefined;
    this.model = config.model || 'gpt-4';
    this.enableCrisisIntegration = config.enableCrisisIntegration ?? true;
    this.enableEducationalRecognition = config.enableEducationalRecognition ?? true;
  }

  /**
   * Detect context from user input
   */
  async detectContext(
    userInput: string,
    conversationHistory?: string[],
    userId?: string
  ): Promise<ContextDetectionResult> {
    try {
      // First, check for crisis if integration is enabled
      let crisisResult = null;
      if (this.enableCrisisIntegration && this.crisisDetectionService) {
        const crisisOptions = userId ? { userId, source: 'context-detection' } : { source: 'context-detection' };
        crisisResult = await this.crisisDetectionService.detectCrisis(
          userInput,
          crisisOptions
        );

        // If crisis is detected, immediately return crisis context
        if (crisisResult.isCrisis) {
          return {
            detectedContext: ContextType.CRISIS,
            confidence: crisisResult.confidence,
            contextualIndicators: [
              {
                type: 'crisis_detection',
                description: crisisResult.category || 'Crisis detected',
                confidence: crisisResult.confidence,
                severity: this.mapSeverityToNumber(crisisResult.severity)
              }
            ],
            needsSpecialHandling: true,
            urgency: this.mapSeverityToUrgency(crisisResult.severity),
            metadata: {
              crisisResult,
              recommendedAction: crisisResult.recommendedAction
            }
          };
        }
      }

      // Check for educational context if recognizer is available
      let educationalResult = null;
      if (this.enableEducationalRecognition && this.educationalContextRecognizer) {
        educationalResult = await this.educationalContextRecognizer.recognizeEducationalContext(
          userInput,
          undefined, // userProfile - would need to be passed through
          conversationHistory
        );

        // If high confidence educational context, return it
        if (educationalResult.isEducational && educationalResult.confidence > 0.8) {
          return {
            detectedContext: ContextType.EDUCATIONAL,
            confidence: educationalResult.confidence,
            contextualIndicators: [
              {
                type: 'educational_recognition',
                description: `Educational ${educationalResult.educationalType} about ${educationalResult.topicArea}`,
                confidence: educationalResult.confidence
              }
            ],
            needsSpecialHandling: educationalResult.complexity === 'advanced',
            urgency: 'low',
            metadata: {
              educationalResult,
              learningObjectives: educationalResult.learningObjectives,
              recommendedResources: educationalResult.recommendedResources
            }
          };
        }
      }

      // If no specific context detected, proceed with general context detection
      const messages = [
        { role: 'system' as AIRole, content: CONTEXT_DETECTION_PROMPT, name: '' },
        { role: 'user' as AIRole, content: this.formatInputForAnalysis(userInput, conversationHistory), name: '' }
      ];

      const response = await this.aiService.createChatCompletion(messages, {
        model: this.model
      });

      const content = response?.choices?.[0]?.message?.content || '';
      const result = this.parseContextDetectionResponse(content);

      // Merge crisis detection data if available
      if (crisisResult && !crisisResult.isCrisis) {
        result.metadata['crisisAnalysis'] = {
          confidence: crisisResult.confidence,
          severity: crisisResult.severity
        };
      }

      // Merge educational analysis if available
      if (educationalResult && educationalResult.isEducational) {
        result.metadata['educationalAnalysis'] = {
          confidence: educationalResult.confidence,
          type: educationalResult.educationalType,
          complexity: educationalResult.complexity,
          topicArea: educationalResult.topicArea
        };
      }

      logger.info('Context detected', {
        context: result.detectedContext,
        confidence: result.confidence,
        urgency: result.urgency
      });

      return result;

    } catch (error) {
      logger.error('Error detecting context:', error as Record<string, unknown>);
      
      // Fallback to general context with low confidence
      return {
        detectedContext: ContextType.GENERAL,
        confidence: 0.1,
        contextualIndicators: [
          {
            type: 'error_fallback',
            description: 'Context detection failed, using general fallback',
            confidence: 0.1
          }
        ],
        needsSpecialHandling: false,
        urgency: 'low',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Batch context detection for multiple inputs
   */
  async detectContextBatch(
    inputs: Array<{ text: string; conversationHistory?: string[]; userId?: string }>
  ): Promise<ContextDetectionResult[]> {
    return Promise.all(
      inputs.map(input => 
        this.detectContext(input.text, input.conversationHistory, input.userId)
      )
    );
  }

  /**
   * Create alignment context from detection result
   */
  createAlignmentContext(
    userQuery: string,
    detectionResult: ContextDetectionResult,
    conversationHistory?: string[],
    userProfile?: any,
    sessionMetadata?: Record<string, any>
  ): AlignmentContext {
    return {
      userQuery,
      conversationHistory: conversationHistory || [],
      detectedContext: detectionResult.detectedContext,
      userProfile,
      sessionMetadata: {
        ...sessionMetadata,
        contextDetection: detectionResult,
        urgency: detectionResult.urgency,
        needsSpecialHandling: detectionResult.needsSpecialHandling
      }
    };
  }

  /**
   * Format input for analysis
   */
  private formatInputForAnalysis(userInput: string, conversationHistory?: string[]): string {
    let formatted = `Current message: ${userInput}`;
    
    if (conversationHistory && conversationHistory.length > 0) {
      formatted += `\n\nRecent conversation context:\n${conversationHistory.slice(-3).join('\n')}`;
    }

    return formatted;
  }

  /**
   * Parse context detection response
   */
  private parseContextDetectionResponse(content: string): ContextDetectionResult {
    try {
      // Extract JSON from response using capturing groups to get content inside fences
      const jsonFencedMatch = 
        content.match(/```json\s*\n([\s\S]*?)\n\s*```/) ||
        content.match(/```\s*\n([\s\S]*?)\n\s*```/);
      
      const jsonObjectMatch = content.match(/(\{[\s\S]*?\})/);

      // Use captured group directly - it contains only the JSON content without fences
      const jsonStr = jsonFencedMatch?.[1] || jsonObjectMatch?.[1] || content.trim();
        
      if (!jsonStr) {
        throw new Error('No JSON content found in response');
      }
      
      const parsed = JSON.parse(jsonStr);

      return {
        detectedContext: this.validateContextType(parsed.detectedContext),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        contextualIndicators: parsed.contextualIndicators || [],
        needsSpecialHandling: Boolean(parsed.needsSpecialHandling),
        urgency: this.validateUrgency(parsed.urgency),
        metadata: parsed.metadata || {}
      };

    } catch (error) {
      logger.error('Error parsing context detection response:', error as Record<string, unknown>);
      
      // Fallback parsing
      return {
        detectedContext: ContextType.GENERAL,
        confidence: 0.3,
        contextualIndicators: [],
        needsSpecialHandling: false,
        urgency: 'low',
        metadata: { parseError: true }
      };
    }
  }

  /**
   * Validate and normalize context type
   */
  private validateContextType(contextType: string): ContextType {
    // Guard against invalid input
    if (!contextType || typeof contextType !== 'string' || contextType.trim() === '') {
      return ContextType.GENERAL;
    }

    if (Object.values(ContextType).includes(contextType as ContextType)) {
      return contextType as ContextType;
    }
    
    // Attempt to map common variations
    const normalized = contextType.toLowerCase().replace(/[_\s]/g, '');
    switch (normalized) {
      case 'crisis':
      case 'emergency':
      case 'urgent':
        return ContextType.CRISIS;
      case 'educational':
      case 'education':
      case 'learning':
        return ContextType.EDUCATIONAL;
      case 'support':
      case 'emotional':
      case 'help':
        return ContextType.SUPPORT;
      case 'clinical':
      case 'assessment':
      case 'diagnosis':
        return ContextType.CLINICAL_ASSESSMENT;
      case 'informational':
      case 'information':
      case 'info':
        return ContextType.INFORMATIONAL;
      default:
        return ContextType.GENERAL;
    }
  }

  /**
   * Validate and normalize urgency level
   */
  private validateUrgency(urgency: string): 'low' | 'medium' | 'high' | 'critical' {
    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    return validUrgencies.includes(urgency) ? urgency as 'low' | 'medium' | 'high' | 'critical' : 'low';
  }

  /**
   * Map severity to numeric value
   */
  private mapSeverityToNumber(severity: string): number {
    switch (severity) {
      case 'severe': return 1.0;
      case 'high': return 0.8;
      case 'medium': return 0.6;
      case 'low': return 0.4;
      case 'none': return 0.2;
      default: return 0.5;
    }
  }

  /**
   * Map severity to urgency level
   */
  private mapSeverityToUrgency(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'severe': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      case 'none': return 'low';
      default: return 'medium';
    }
  }
}

/**
 * Factory function to create a context detector
 */
export function createContextDetector(config: ContextDetectorConfig): ContextDetector {
  return new ContextDetector(config);
}

/**
 * Default context detector configuration
 */
export function getDefaultContextDetectorConfig(aiService: AIService): ContextDetectorConfig {
  return {
    aiService,
    model: 'gpt-4',
    enableCrisisIntegration: true,
    enableEducationalRecognition: true
  };
} 