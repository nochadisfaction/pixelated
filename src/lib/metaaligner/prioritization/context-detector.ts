/**
 * Context Detection System for MetaAligner
 * Identifies conversation context to enable dynamic objective prioritization
 */

import type { AlignmentContext, ContextType } from '../core/objectives';
import type { CrisisDetectionResult } from '../../ai/types';
import { CrisisDetectionService } from '../../ai/services/crisis-detection';
import { CrisisRiskDetector } from '../../ai/crisis/CrisisRiskDetector';
import type { AIService } from '../../ai/models/types';
import { getLogger } from '../../logging';

const logger = getLogger({ prefix: 'context-detector' });

export interface ContextDetectionConfig {
  aiService?: AIService;
  crisisDetectionService?: CrisisDetectionService;
  crisisRiskDetector?: CrisisRiskDetector;
  sensitivityLevel?: 'low' | 'medium' | 'high';
  enableAdvancedAnalysis?: boolean;
}

export interface ContextDetectionResult {
  detectedContext: ContextType;
  confidence: number;
  alternativeContexts: Array<{ context: ContextType; confidence: number }>;
  indicators: string[];
  metadata: {
    crisisAssessment?: CrisisDetectionResult;
    processingTime: number;
    analysisMethod: 'pattern-based' | 'ai-assisted' | 'hybrid';
  };
}

/**
 * Advanced Context Detection Engine
 */
export class ContextDetector {
  private crisisDetectionService?: CrisisDetectionService;
  private crisisRiskDetector: CrisisRiskDetector;
  private sensitivityLevel: 'low' | 'medium' | 'high';
  private enableAdvancedAnalysis: boolean;

  // Pattern-based detection rules for different contexts
  private readonly contextPatterns = {
    crisis: [
      // Suicidal ideation indicators
      /\b(?:suicide|suicidal|kill myself|end my life|not worth living|better off dead)\b/i,
      /\b(?:want to die|wish I was dead|no point in living|tired of living)\b/i,
      // Self-harm indicators
      /\b(?:cut myself|hurt myself|self harm|self-harm|cutting|burning myself)\b/i,
      // Crisis states
      /\b(?:crisis|emergency|urgent help|can't cope|losing control|breaking down)\b/i,
      // Hopelessness indicators
      /\b(?:completely hopeless|nothing left|can't go on|giving up)\b/i,
      // Immediate danger
      /\b(?:about to|planning to|going to|ready to) (?:hurt|kill|harm)\b/i,
    ],
    
    educational: [
      /\b(?:what is|explain|define|tell me about|how does|why does)\b/i,
      /\b(?:learn about|understand|definition|meaning|concept of)\b/i,
      /\b(?:difference between|types of|symptoms of|causes of)\b/i,
      /\b(?:research|study|information|facts|details about)\b/i,
      /\b(?:how to recognize|signs of|warning signs|red flags)\b/i,
      /\b(?:therapy|treatment|medication|diagnosis|condition)\b.*\b(?:works|helps|used for)\b/i,
    ],
    
    support: [
      /\b(?:feeling|I feel|I'm feeling|I've been feeling)\b.*\b(?:sad|depressed|anxious|worried|stressed|overwhelmed|lonely|scared|angry|frustrated)\b/i,
      /\b(?:going through|dealing with|struggling with|coping with)\b/i,
      /\b(?:need someone|need help|need support|feeling alone|need to talk)\b/i,
      /\b(?:hard time|difficult time|tough time|rough patch|bad day)\b/i,
      /\b(?:emotional support|someone to listen|understanding|empathy)\b/i,
      /\b(?:comfort|reassurance|encouragement|hope|strength)\b/i,
    ],
    
    clinical_assessment: [
      /\b(?:diagnosed with|diagnosis|assessment|evaluation|screening)\b/i,
      /\b(?:symptoms|symptom checker|do I have|might I have|could I have)\b/i,
      /\b(?:mental health evaluation|psychological assessment|psychiatric evaluation)\b/i,
      /\b(?:DSM|criteria|diagnostic criteria|clinical interview)\b/i,
      /\b(?:depression|anxiety|PTSD|bipolar|ADHD|OCD|schizophrenia|eating disorder)\b.*\b(?:symptoms|signs|test|assessment|diagnosis)\b/i,
      /\b(?:screening tool|questionnaire|mental health test|psychological test)\b/i,
    ],
    
    informational: [
      /\b(?:statistics|prevalence|how common|research shows|studies indicate)\b/i,
      /\b(?:available treatments|treatment options|therapy options|medication options)\b/i,
      /\b(?:mental health resources|where to find|how to access|referral)\b/i,
      /\b(?:insurance|coverage|cost|affordable|free|low-cost)\b.*\b(?:therapy|treatment|counseling)\b/i,
      /\b(?:therapist|counselor|psychiatrist|psychologist)\b.*\b(?:find|locate|search|directory)\b/i,
      /\b(?:crisis hotline|emergency|helpline|support group|resources)\b/i,
    ]
  };

  // Context keywords for additional scoring
  private readonly contextKeywords = {
    crisis: ['urgent', 'emergency', 'immediate', 'crisis', 'danger', 'life-threatening', 'critical'],
    educational: ['learn', 'understand', 'explain', 'definition', 'information', 'knowledge', 'education'],
    support: ['support', 'help', 'comfort', 'understanding', 'empathy', 'emotional', 'feelings'],
    clinical_assessment: ['diagnosis', 'symptoms', 'assessment', 'evaluation', 'screening', 'clinical', 'medical'],
    informational: ['resources', 'options', 'available', 'access', 'find', 'locate', 'directory', 'information']
  };

  constructor(config: ContextDetectionConfig = {}) {
    if (config.crisisDetectionService) {
      this.crisisDetectionService = config.crisisDetectionService;
    }
    
    this.crisisRiskDetector = config.crisisRiskDetector || new CrisisRiskDetector();
    this.sensitivityLevel = config.sensitivityLevel || 'medium';
    this.enableAdvancedAnalysis = config.enableAdvancedAnalysis ?? true;

    logger.info('ContextDetector initialized', {
      hasCrisisDetectionService: !!this.crisisDetectionService,
      sensitivityLevel: this.sensitivityLevel,
      enableAdvancedAnalysis: this.enableAdvancedAnalysis
    });
  }

  /**
   * Detect context for a given user query and conversation history
   */
  async detectContext(
    userQuery: string,
    conversationHistory?: string[],
    userId?: string
  ): Promise<ContextDetectionResult> {
    const startTime = Date.now();
    
    logger.info('Starting context detection', {
      queryLength: userQuery.length,
      historyLength: conversationHistory?.length || 0,
      userId: userId ? 'provided' : 'not-provided'
    });

    try {
      // First, check for crisis indicators using existing services
      const crisisAssessment = await this.performCrisisAssessment(userQuery, userId);
      
      // If crisis is detected with high confidence, prioritize it
      if (crisisAssessment && this.isCriticalCrisis(crisisAssessment)) {
        const processingTime = Date.now() - startTime;
        
        return {
          detectedContext: 'crisis' as ContextType,
          confidence: crisisAssessment.confidence,
          alternativeContexts: [],
          indicators: this.extractCrisisIndicators(crisisAssessment, userQuery),
          metadata: {
            crisisAssessment,
            processingTime,
            analysisMethod: 'ai-assisted'
          }
        };
      }

      // Perform pattern-based context detection
      const patternResults = this.performPatternBasedDetection(userQuery, conversationHistory);
      
      // Include crisis assessment in the overall analysis
      if (crisisAssessment?.isCrisis) {
        patternResults.crisis = Math.max(patternResults.crisis || 0, crisisAssessment.confidence);
      }

      // Advanced AI-assisted analysis if enabled and available
      let advancedResults = patternResults;
      let analysisMethod: 'pattern-based' | 'ai-assisted' | 'hybrid' = 'pattern-based';
      
      if (this.enableAdvancedAnalysis && this.crisisDetectionService) {
        // For now, we rely on pattern-based detection with crisis integration
        // Future: implement AI-assisted context classification
        analysisMethod = 'hybrid';
      }

      // Determine primary context and alternatives
      const contextScores = Object.entries(advancedResults) as [ContextType, number][];
      contextScores.sort((a, b) => b[1] - a[1]);

      const primaryContext = contextScores[0];
      const alternatives = contextScores
        .slice(1)
        .filter(([, score]) => score > 0.3)
        .map(([context, confidence]) => ({ context, confidence }));

      const indicators = this.generateIndicators(primaryContext[0], userQuery, crisisAssessment);
      const processingTime = Date.now() - startTime;

      logger.info('Context detection completed', {
        detectedContext: primaryContext[0],
        confidence: primaryContext[1],
        processingTime,
        alternativeCount: alternatives.length
      });

      return {
        detectedContext: primaryContext[0],
        confidence: primaryContext[1],
        alternativeContexts: alternatives,
        indicators,
        metadata: {
          crisisAssessment: crisisAssessment || undefined,
          processingTime,
          analysisMethod
        }
      };

    } catch (error) {
      logger.error('Context detection failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Fallback to general context
      const processingTime = Date.now() - startTime;
      return {
        detectedContext: 'general' as ContextType,
        confidence: 0.5,
        alternativeContexts: [],
        indicators: ['fallback-general-context'],
        metadata: {
          processingTime,
          analysisMethod: 'pattern-based'
        }
      };
    }
  }

  /**
   * Perform crisis assessment using existing services
   */
  private async performCrisisAssessment(
    userQuery: string,
    userId?: string
  ): Promise<CrisisDetectionResult | null> {
    try {
      // Use AI-based crisis detection if available
      if (this.crisisDetectionService) {
        return await this.crisisDetectionService.detectCrisis(userQuery, {
          sensitivityLevel: this.sensitivityLevel,
          userId
        });
      }

      // Fallback to pattern-based crisis detection
      const riskAssessment = this.crisisRiskDetector.analyzeText(userQuery);
      
      // Convert risk assessment to crisis detection result format
      if (riskAssessment.overallRiskScore > 0.3) {
        return {
          isCrisis: riskAssessment.immediateActionRequired || riskAssessment.overallRiskScore > 0.6,
          confidence: riskAssessment.confidenceScore,
          category: riskAssessment.primaryRisk,
          severity: this.mapRiskScoreToSeverity(riskAssessment.overallRiskScore),
          recommendedAction: riskAssessment.immediateActionRequired ? 'immediate-intervention' : 'monitor-closely',
          content: userQuery,
          hasCrisis: riskAssessment.immediateActionRequired,
          crisisType: riskAssessment.primaryRisk,
          riskLevel: this.mapRiskScoreToLevel(riskAssessment.overallRiskScore),
          riskScore: riskAssessment.overallRiskScore,
          requiresIntervention: riskAssessment.immediateActionRequired
        };
      }

      return null;
    } catch (error) {
      logger.warn('Crisis assessment failed, continuing with pattern detection', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Perform pattern-based context detection
   */
  private performPatternBasedDetection(
    userQuery: string,
    conversationHistory?: string[]
  ): Record<ContextType, number> {
    const text = this.prepareTextForAnalysis(userQuery, conversationHistory);
    const scores: Record<ContextType, number> = {
      crisis: 0,
      educational: 0,
      support: 0,
      clinical_assessment: 0,
      informational: 0,
      general: 0.1 // Default baseline for general context
    };

    // Pattern matching for each context type
    for (const [contextType, patterns] of Object.entries(this.contextPatterns)) {
      const context = contextType as keyof typeof this.contextPatterns;
      let patternScore = 0;
      let matchCount = 0;

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          matchCount++;
          patternScore += 0.2; // Base score per pattern match
        }
      }

      // Keyword scoring
      const keywords = this.contextKeywords[context] || [];
      let keywordScore = 0;
      
      for (const keyword of keywords) {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(keywordRegex);
        if (matches) {
          keywordScore += matches.length * 0.1;
        }
      }

      // Combine scores with pattern matches having higher weight
      scores[context as ContextType] = Math.min(patternScore * 1.5 + keywordScore, 1.0);
    }

    return scores;
  }

  /**
   * Check if crisis assessment indicates critical crisis requiring immediate intervention
   */
  private isCriticalCrisis(assessment: CrisisDetectionResult): boolean {
    return assessment.isCrisis && (
      assessment.confidence > 0.8 ||
      assessment.severity === 'severe' ||
      assessment.requiresIntervention === true ||
      assessment.riskLevel === 'critical'
    );
  }

  /**
   * Extract crisis indicators from assessment and query
   */
  private extractCrisisIndicators(
    assessment: CrisisDetectionResult,
    userQuery: string
  ): string[] {
    const indicators: string[] = [];

    if (assessment.category) {
      indicators.push(`crisis-type-${assessment.category}`);
    }

    if (assessment.severity) {
      indicators.push(`severity-${assessment.severity}`);
    }

    if (assessment.requiresIntervention) {
      indicators.push('requires-immediate-intervention');
    }

    // Extract risk terms if available
    if (this.crisisRiskDetector) {
      try {
        const riskAssessment = this.crisisRiskDetector.analyzeText(userQuery);
        const riskTerms = this.crisisRiskDetector.extractRiskTerms(userQuery, riskAssessment);
        indicators.push(...riskTerms.map(term => `risk-term-${term}`));
      } catch (error) {
        logger.warn('Failed to extract risk terms', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return indicators.length > 0 ? indicators : ['crisis-detected'];
  }

  /**
   * Generate context indicators based on detected context
   */
  private generateIndicators(
    context: ContextType,
    userQuery: string,
    crisisAssessment?: CrisisDetectionResult | null
  ): string[] {
    const indicators: string[] = [];

    // Add crisis indicators if present
    if (crisisAssessment?.isCrisis) {
      indicators.push(...this.extractCrisisIndicators(crisisAssessment, userQuery));
    }

    // Add context-specific indicators
    const contextPatterns = this.contextPatterns[context as keyof typeof this.contextPatterns] || [];
    for (const pattern of contextPatterns) {
      if (pattern.test(userQuery)) {
        indicators.push(`pattern-match-${context}`);
        break; // Only add once per context
      }
    }

    // Add keyword indicators
    const keywords = this.contextKeywords[context as keyof typeof this.contextKeywords] || [];
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(userQuery)) {
        indicators.push(`keyword-${keyword}`);
      }
    }

    return indicators.length > 0 ? indicators : [`detected-${context}`];
  }

  /**
   * Prepare text for analysis by combining query and history
   */
  private prepareTextForAnalysis(userQuery: string, conversationHistory?: string[]): string {
    let text = userQuery;
    
    // Include recent conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      // Take last 3 messages for context
      const recentHistory = conversationHistory.slice(-3).join(' ');
      text = `${recentHistory} ${userQuery}`;
    }

    return text.toLowerCase();
  }

  /**
   * Map risk score to severity level
   */
  private mapRiskScoreToSeverity(score: number): 'none' | 'low' | 'medium' | 'high' | 'severe' {
    if (score >= 0.8) return 'severe';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'none';
  }

  /**
   * Map risk score to risk level
   */
  private mapRiskScoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextDetectionConfig>): void {
    if (config.sensitivityLevel) {
      this.sensitivityLevel = config.sensitivityLevel;
    }
    
    if (config.enableAdvancedAnalysis !== undefined) {
      this.enableAdvancedAnalysis = config.enableAdvancedAnalysis;
    }

    if (config.crisisDetectionService) {
      this.crisisDetectionService = config.crisisDetectionService;
    }

    logger.info('ContextDetector configuration updated', {
      sensitivityLevel: this.sensitivityLevel,
      enableAdvancedAnalysis: this.enableAdvancedAnalysis
    });
  }
}

// Export default instance creator
export function createContextDetector(config?: ContextDetectionConfig): ContextDetector {
  return new ContextDetector(config);
}

export default ContextDetector; 