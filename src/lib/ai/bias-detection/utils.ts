/**
 * Utility functions for the Pixelated Empathy Bias Detection Engine
 * 
 * This module provides helper functions for data validation, demographic processing,
 * bias calculations, configuration validation, and HIPAA compliance.
 */

import { z } from 'zod';
import { getLogger } from '../../utils/logger';
import type {
  BiasDetectionConfig,
  ParticipantDemographics,
  DemographicGroup,
  TherapeuticSession,
  BiasAnalysisResult,
  FairnessMetrics,
  BiasDetectionError,
  AuditLogEntry,
  BiasDetectionEvent
} from './types';

const logger = getLogger('BiasDetectionUtils');

// =============================================================================
// DATA VALIDATION SCHEMAS
// =============================================================================

export const ParticipantDemographicsSchema = z.object({
  age: z.string().min(1, 'Age group is required'),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']),
  ethnicity: z.string().min(1, 'Ethnicity is required'),
  primaryLanguage: z.string().min(2, 'Primary language must be at least 2 characters'),
  socioeconomicStatus: z.enum(['low', 'middle', 'high', 'not-specified']).optional(),
  education: z.string().optional(),
  region: z.string().optional(),
  culturalBackground: z.array(z.string()).optional(),
  disabilityStatus: z.string().optional()
});

export const TherapeuticSessionSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  timestamp: z.date(),
  participantDemographics: ParticipantDemographicsSchema,
  scenario: z.object({
    scenarioId: z.string().min(1),
    type: z.enum(['depression', 'anxiety', 'trauma', 'substance-abuse', 'grief', 'other']),
    complexity: z.enum(['beginner', 'intermediate', 'advanced']),
    tags: z.array(z.string()),
    description: z.string().min(1),
    learningObjectives: z.array(z.string())
  }),
  content: z.object({
    patientPresentation: z.string().min(1),
    therapeuticInterventions: z.array(z.string()),
    patientResponses: z.array(z.string()),
    sessionNotes: z.string(),
    assessmentResults: z.any().optional()
  }),
  aiResponses: z.array(z.object({
    responseId: z.string(),
    timestamp: z.date(),
    type: z.enum(['diagnostic', 'intervention', 'risk-assessment', 'recommendation']),
    content: z.string().min(1),
    confidence: z.number().min(0).max(1),
    modelUsed: z.string(),
    reasoning: z.string().optional()
  })),
  expectedOutcomes: z.array(z.any()),
  transcripts: z.array(z.any()),
  metadata: z.object({
    trainingInstitution: z.string(),
    supervisorId: z.string().optional(),
    traineeId: z.string(),
    sessionDuration: z.number().positive(),
    completionStatus: z.enum(['completed', 'partial', 'abandoned']),
    technicalIssues: z.array(z.string()).optional()
  })
});

export const BiasDetectionConfigSchema = z.object({
  pythonServiceUrl: z.string().url('Python service URL must be valid'),
  pythonServiceTimeout: z.number().positive('Timeout must be positive'),
  thresholds: z.object({
    warningLevel: z.number().min(0).max(1),
    highLevel: z.number().min(0).max(1),
    criticalLevel: z.number().min(0).max(1)
  }).refine(data => data.warningLevel < data.highLevel && data.highLevel < data.criticalLevel, {
    message: "Thresholds must be in ascending order: warning < high < critical"
  }),
  layerWeights: z.object({
    preprocessing: z.number().min(0).max(1),
    modelLevel: z.number().min(0).max(1),
    interactive: z.number().min(0).max(1),
    evaluation: z.number().min(0).max(1)
  }).refine(data => {
    const sum = data.preprocessing + data.modelLevel + data.interactive + data.evaluation;
    return Math.abs(sum - 1.0) < 0.001;
  }, {
    message: "Layer weights must sum to 1.0"
  }),
  evaluationMetrics: z.array(z.string()).min(1, 'At least one evaluation metric is required'),
  metricsConfig: z.any(),
  alertConfig: z.any(),
  reportConfig: z.any(),
  explanationConfig: z.any(),
  hipaaCompliant: z.boolean(),
  dataMaskingEnabled: z.boolean(),
  auditLogging: z.boolean()
});

// =============================================================================
// DATA VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate participant demographics data
 */
export function validateParticipantDemographics(
  demographics: unknown
): ParticipantDemographics {
  try {
    const validatedDemographics = ParticipantDemographicsSchema.parse(demographics);
    return validatedDemographics as ParticipantDemographics;
  } catch (error) {
    logger.error('Invalid participant demographics', { error, demographics });
    throw createBiasDetectionError(
      'VALIDATION_ERROR',
      'Invalid participant demographics data',
      { demographics: demographics as ParticipantDemographics, validationError: error }
    );
  }

}
/**
 * Validate therapeutic session data
 */
export function validateTherapeuticSession(
  session: unknown
): TherapeuticSession {
  try {
    return TherapeuticSessionSchema.parse(session);
  } catch (error) {
    logger.error('Invalid therapeutic session', { error, sessionId: (session as any)?.sessionId });
    throw createBiasDetectionError(
      'VALIDATION_ERROR',
      'Invalid therapeutic session data',
      { sessionId: (session as any)?.sessionId, validationError: error }
    );
  }
}

/**
 * Validate bias detection configuration
 */
export function validateBiasDetectionConfig(
  config: unknown
): BiasDetectionConfig {
  try {
    const parsedConfig = BiasDetectionConfigSchema.parse(config);
    return {
      ...parsedConfig,
      metricsConfig: parsedConfig.metricsConfig || {
        enabled: false,
        storageType: 'memory',
        retentionPeriod: 30
      },
      alertConfig: parsedConfig.alertConfig || {
        enabled: true,
        channels: ['email'],
        thresholds: {
          warning: 0.3,
          high: 0.6,
          critical: 0.8
        }
      },
      reportConfig: parsedConfig.reportConfig || {
        enabled: true,
        format: 'json',
        includeDetails: true
      },
      explanationConfig: parsedConfig.explanationConfig || {
        enabled: true,
        includeRecommendations: true,
        detailLevel: 'medium'
      }
    };
  } catch (error) {
    logger.error('Invalid bias detection configuration', { error });
    throw createBiasDetectionError(
      'CONFIG_ERROR',
      'Invalid bias detection configuration',
      { validationError: error }
    );
  }

}
/**
 * Sanitize text content for HIPAA compliance
 */
export function sanitizeTextContent(
  content: string,
  maskingEnabled: boolean = true
): string {
  if (!maskingEnabled) {
    return content;
  }

  // Remove or mask potential PII patterns
  let sanitized = content;

  // Mask email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

  // Mask phone numbers
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

  // Mask SSN patterns
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  // Mask potential names (basic pattern - may need refinement)
  // Look for two consecutive capitalized words that are likely names
  sanitized = sanitized.replace(/\b(?!Patient\b|Doctor\b|Therapist\b|Mr\b|Mrs\b|Ms\b|Dr\b)[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME]');

  // Mask addresses (basic pattern)
  sanitized = sanitized.replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi, '[ADDRESS]');

  return sanitized;
}

// =============================================================================
// DEMOGRAPHIC GROUP PROCESSING
// =============================================================================

/**
 * Extract demographic groups from participant demographics
 */
export function extractDemographicGroups(
  demographics: ParticipantDemographics
): DemographicGroup[] {
  const groups: DemographicGroup[] = [];

  // Age group
  groups.push({
    type: 'age',
    value: demographics.age
  });

  // Gender group
  groups.push({
    type: 'gender',
    value: demographics.gender
  });

  // Ethnicity group
  groups.push({
    type: 'ethnicity',
    value: demographics.ethnicity
  });

  // Language group
  groups.push({
    type: 'language',
    value: demographics.primaryLanguage
  });

  // Optional groups
  if (demographics.socioeconomicStatus) {
    groups.push({
      type: 'socioeconomic',
      value: demographics.socioeconomicStatus
    });
  }

  if (demographics.education) {
    groups.push({
      type: 'education',
      value: demographics.education
    });
  }

  if (demographics.region) {
    groups.push({
      type: 'region',
      value: demographics.region
    });
  }

  return groups;
}

/**
 * Group sessions by demographic characteristics
 */
export function groupSessionsByDemographics(
  sessions: TherapeuticSession[]
): Map<string, TherapeuticSession[]> {
  const groups = new Map<string, TherapeuticSession[]>();

  for (const session of sessions) {
    const demographicGroups = extractDemographicGroups(session.participantDemographics);
    
    for (const group of demographicGroups) {
      const key = `${group.type}:${group.value}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key)!.push(session);
    }
  }

  return groups;
}

/**
 * Calculate demographic representation statistics
 */
export function calculateDemographicRepresentation(
  sessions: TherapeuticSession[]
): Record<string, Record<string, number>> {
  const representation: Record<string, Record<string, number>> = {};
  const total = sessions.length;

  if (total === 0) {
    return representation;
  }

  // Initialize counters
  const counters: Record<string, Record<string, number>> = {};

  for (const session of sessions) {
    const groups = extractDemographicGroups(session.participantDemographics);
    
    for (const group of groups) {
      if (!counters[group.type]) {
        counters[group.type] = {};
      }
      
      if (!counters[group.type][group.value]) {
        counters[group.type][group.value] = 0;
      }
      
      counters[group.type][group.value]++;
    }
  }

  // Calculate percentages
  for (const [type, values] of Object.entries(counters)) {
    representation[type] = {};
    for (const [value, count] of Object.entries(values)) {
      representation[type][value] = count / total;
    }
  }

  return representation;
}

// =============================================================================
// BIAS SCORE CALCULATIONS
// =============================================================================

/**
 * Calculate weighted overall bias score from layer results
 */
export function calculateOverallBiasScore(
  layerResults: {
    preprocessing: { biasScore: number };
    modelLevel: { biasScore: number };
    interactive: { biasScore: number };
    evaluation: { biasScore: number };
  },
  weights: BiasDetectionConfig['layerWeights']
): number {
  const weightedSum = 
    layerResults.preprocessing.biasScore * weights.preprocessing +
    layerResults.modelLevel.biasScore * weights.modelLevel +
    layerResults.interactive.biasScore * weights.interactive +
    layerResults.evaluation.biasScore * weights.evaluation;

  return Math.min(Math.max(weightedSum, 0), 1); // Clamp to [0, 1]
}

/**
 * Calculate confidence score based on layer consistency
 */
export function calculateConfidenceScore(
  layerResults: {
    preprocessing: { biasScore: number };
    modelLevel: { biasScore: number };
    interactive: { biasScore: number };
    evaluation: { biasScore: number };
  }
): number {
  const scores = [
    layerResults.preprocessing.biasScore,
    layerResults.modelLevel.biasScore,
    layerResults.interactive.biasScore,
    layerResults.evaluation.biasScore
  ];

  // Calculate standard deviation as a measure of consistency
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Convert to confidence (lower std dev = higher confidence)
  // Normalize by maximum possible std dev (0.5 for scores in [0,1])
  const normalizedStdDev = stdDev / 0.5;
  const confidence = 1 - normalizedStdDev;

  return Math.min(Math.max(confidence, 0), 1); // Clamp to [0, 1]
}

/**
 * Determine alert level based on bias scores and thresholds
 */
export function determineAlertLevel(
  overallBiasScore: number,
  thresholds: BiasDetectionConfig['thresholds']
): 'low' | 'medium' | 'high' | 'critical' {
  if (overallBiasScore >= thresholds.criticalLevel) {
    return 'critical';
  } else if (overallBiasScore >= thresholds.highLevel) {
    return 'high';
  } else if (overallBiasScore >= thresholds.warningLevel) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Calculate fairness metrics from performance data
 */
export function calculateFairnessMetrics(
  groupPerformances: Record<string, { tp: number; fp: number; tn: number; fn: number }>
): FairnessMetrics {
  const groups = Object.keys(groupPerformances);
  
  if (groups.length < 2) {
    throw new Error('At least two demographic groups required for fairness metrics');
  }

  // Calculate rates for each group
  const groupRates = Object.entries(groupPerformances).map(([group, perf]) => {
    const total = perf.tp + perf.fp + perf.tn + perf.fn;
    const positiveRate = total > 0 ? (perf.tp + perf.fp) / total : 0;
    const tpr = (perf.tp + perf.fn) > 0 ? perf.tp / (perf.tp + perf.fn) : 0;
    const fpr = (perf.fp + perf.tn) > 0 ? perf.fp / (perf.fp + perf.tn) : 0;
    const precision = (perf.tp + perf.fp) > 0 ? perf.tp / (perf.tp + perf.fp) : 0;
    
    return { group, positiveRate, tpr, fpr, precision };
  });

  // Calculate demographic parity (difference in positive prediction rates)
  const positiveRates = groupRates.map(g => g.positiveRate);
  const demographicParity = Math.max(...positiveRates) - Math.min(...positiveRates);

  // Calculate equalized odds (max difference in TPR and FPR)
  const tprs = groupRates.map(g => g.tpr);
  const fprs = groupRates.map(g => g.fpr);
  const tprDiff = Math.max(...tprs) - Math.min(...tprs);
  const fprDiff = Math.max(...fprs) - Math.min(...fprs);
  const equalizedOdds = Math.max(tprDiff, fprDiff);

  // Calculate equal opportunity (difference in TPR)
  const equalOpportunity = tprDiff;

  // Calculate calibration (difference in precision)
  const precisions = groupRates.map(g => g.precision);
  const calibration = Math.max(...precisions) - Math.min(...precisions);

  // Placeholder values for more complex metrics
  const individualFairness = 0.5; // Would require similarity function
  const counterfactualFairness = 0.5; // Would require counterfactual analysis

  return {
    demographicParity,
    equalizedOdds,
    equalOpportunity,
    calibration,
    individualFairness,
    counterfactualFairness
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Create a standardized bias detection error
 */
export function createBiasDetectionError(
  code: string,
  message: string,
  context?: {
    layer?: string;
    sessionId?: string;
    demographics?: ParticipantDemographics;
    [key: string]: any;
  },
  recoverable: boolean = true
): BiasDetectionError {
  const error = new Error(message) as BiasDetectionError;
  error.name = 'BiasDetectionError';
  error.code = code;
  error.layer = context?.layer;
  error.sessionId = context?.sessionId;
  error.demographics = context?.demographics;
  error.recoverable = recoverable;

  // Log the error
  logger.error('Bias detection error created', {
    code,
    message,
    context,
    recoverable
  });

  return error;
}

/**
 * Check if an error is a bias detection error
 */
export function isBiasDetectionError(error: unknown): error is BiasDetectionError {
  return error instanceof Error && 
         'code' in error && 
         'recoverable' in error &&
         error.name === 'BiasDetectionError';
}

/**
 * Handle and categorize errors for appropriate response
 */
export function handleBiasDetectionError(
  error: unknown,
  context: { operation: string; sessionId?: string }
): { shouldRetry: boolean; alertLevel: 'low' | 'medium' | 'high' | 'critical' } {
  if (isBiasDetectionError(error)) {
    logger.warn('Handling bias detection error', {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      context
    });

    return {
      shouldRetry: error.recoverable,
      alertLevel: error.recoverable ? 'medium' : 'high'
    };
  }

  // Handle unknown errors
  logger.error('Handling unknown error in bias detection', {
    error: error instanceof Error ? error.message : String(error),
    context
  });

  return {
    shouldRetry: false,
    alertLevel: 'critical'
  };
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Transform session data for Python service consumption
 */
export function transformSessionForPython(
  session: TherapeuticSession
): Record<string, any> {
  return {
    session_id: session.sessionId,
    timestamp: session.timestamp.toISOString(),
    participant_demographics: {
      age: session.participantDemographics.age,
      gender: session.participantDemographics.gender,
      ethnicity: session.participantDemographics.ethnicity,
      primary_language: session.participantDemographics.primaryLanguage,
      socioeconomic_status: session.participantDemographics.socioeconomicStatus,
      education: session.participantDemographics.education,
      region: session.participantDemographics.region,
      cultural_background: session.participantDemographics.culturalBackground,
      disability_status: session.participantDemographics.disabilityStatus
    },
    scenario: {
      scenario_id: session.scenario.scenarioId,
      type: session.scenario.type,
      complexity: session.scenario.complexity,
      tags: session.scenario.tags,
      description: session.scenario.description,
      learning_objectives: session.scenario.learningObjectives
    },
    content: {
      patient_presentation: session.content.patientPresentation,
      therapeutic_interventions: session.content.therapeuticInterventions,
      patient_responses: session.content.patientResponses,
      session_notes: session.content.sessionNotes,
      assessment_results: session.content.assessmentResults
    },
    ai_responses: session.aiResponses.map(response => ({
      response_id: response.responseId,
      timestamp: response.timestamp.toISOString(),
      type: response.type,
      content: response.content,
      confidence: response.confidence,
      model_used: response.modelUsed,
      reasoning: response.reasoning
    })),
    expected_outcomes: session.expectedOutcomes,
    transcripts: session.transcripts.map(transcript => ({
      speaker_id: transcript.speakerId,
      timestamp: transcript.timestamp.toISOString(),
      content: transcript.content,
      emotional_tone: transcript.emotionalTone,
      confidence_level: transcript.confidenceLevel
    })),
    metadata: {
      training_institution: session.metadata.trainingInstitution,
      supervisor_id: session.metadata.supervisorId,
      trainee_id: session.metadata.traineeId,
      session_duration: session.metadata.sessionDuration,
      completion_status: session.metadata.completionStatus,
      technical_issues: session.metadata.technicalIssues
    }
  };
}

/**
 * Transform Python service response back to TypeScript types
 */
export function transformPythonResponse(
  response: Record<string, any>
): Partial<BiasAnalysisResult> {
  return {
    overallBiasScore: response.overall_bias_score,
    confidence: response.confidence,
    alertLevel: response.alert_level,
    recommendations: response.recommendations || []
  };
}

// =============================================================================
// HIPAA COMPLIANCE HELPERS
// =============================================================================

/**
 * Create audit log entry for HIPAA compliance
 */
export function createAuditLogEntry(
  userId: string,
  userEmail: string,
  action: {
    type: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout';
    category: 'bias-analysis' | 'user-data' | 'configuration' | 'authentication' | 'system';
    description: string;
    sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  },
  resource: string,
  details: Record<string, any>,
  request: {
    ipAddress: string;
    userAgent: string;
  },
  sessionId?: string,
  success: boolean = true,
  errorMessage?: string
): AuditLogEntry {
  return {
    id: globalThis.crypto?.randomUUID?.() || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    userEmail,
    action,
    resource,
    resourceId: details.resourceId,
    details,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    sessionId,
    success,
    errorMessage
  };
}

/**
 * Check if data access requires additional authorization
 */
export function requiresAdditionalAuth(
  dataType: 'session-data' | 'demographics' | 'analysis-results' | 'reports',
  userRole: string,
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical'
): boolean {
  // High and critical sensitivity always requires additional auth
  if (sensitivityLevel === 'high' || sensitivityLevel === 'critical') {
    return true;
  }

  // Demographics data requires additional auth for non-admin users
  if (dataType === 'demographics' && userRole !== 'admin') {
    return true;
  }

  // Session data requires additional auth for viewer role
  if (dataType === 'session-data' && userRole === 'viewer') {
    return true;
  }

  return false;
}

/**
 * Generate anonymized identifier for HIPAA compliance
 */
export function generateAnonymizedId(
  originalId: string,
  salt: string = 'bias-detection-salt'
): string {
  // Simple hash-based anonymization (in production, use proper crypto)
  const combined = originalId + salt;
  let hash = 0;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash; // Convert to 32-bit integer
  }
  
  return `anon_${Math.abs(hash).toString(36)}`;
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================

/**
 * Deep clone an object (for immutable operations)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Format bias score for display
 */
export function formatBiasScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Check if a value is within acceptable range
 */
export function isWithinRange(
  value: number,
  min: number,
  max: number,
  inclusive: boolean = true
): boolean {
  if (inclusive) {
    return value >= min && value <= max;
  } else {
    return value > min && value < max;
  }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100;
  }
  
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Generate a summary of bias analysis results
 */
export function generateAnalysisSummary(
  results: BiasAnalysisResult[]
): {
  totalSessions: number;
  averageBiasScore: number;
  alertDistribution: Record<string, number>;
  topRecommendations: string[];
} {
  if (results.length === 0) {
    return {
      totalSessions: 0,
      averageBiasScore: 0,
      alertDistribution: {},
      topRecommendations: []
    };
  }

  const totalSessions = results.length;
  const averageBiasScore = results.reduce((sum, result) => sum + result.overallBiasScore, 0) / totalSessions;
  
  // Count alert levels
  const alertDistribution: Record<string, number> = {};
  for (const result of results) {
    alertDistribution[result.alertLevel] = (alertDistribution[result.alertLevel] || 0) + 1;
  }

  // Collect and count recommendations
  const recommendationCounts: Record<string, number> = {};
  for (const result of results) {
    for (const recommendation of result.recommendations) {
      recommendationCounts[recommendation] = (recommendationCounts[recommendation] || 0) + 1;
    }
  }

  // Get top 5 recommendations
  const topRecommendations = Object.entries(recommendationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([recommendation]) => recommendation);

  return {
    totalSessions,
    averageBiasScore,
    alertDistribution,
    topRecommendations
  };
} 