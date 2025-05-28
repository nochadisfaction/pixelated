/**
 * Crisis alert levels - ordered from least to most severe
 */
export type CrisisAlertLevel = 'concern' | 'moderate' | 'severe' | 'emergency';

/**
 * Configuration for crisis alerts and notification rules
 */
export interface AlertConfiguration {
  level: CrisisAlertLevel;
  name: string;
  description: string;
  thresholdScore: number; // Score threshold that triggers this alert level
  triggerTerms: string[]; // Terms that can trigger this alert
  autoEscalateAfterMs: number;
  requiredActions: string[];
  responseTemplate: string;
  escalationTimeMs: number;
}

/**
 * Response from the crisis protocol system
 */
export interface CrisisResponse {
  caseId: string;
  alertLevel: CrisisAlertLevel;
  actionsPerformed: string[];
  staffNotified: number;
  responseMessage: string;
  immediateAction: string;
  sessionContinuation: boolean;
  escalationTime: string;
}

/**
 * Crisis event data structure for recording incidents
 */
export interface CrisisEvent {
  caseId: string;
  patientId: string;
  sessionId: string;
  alertLevel: CrisisAlertLevel;
  detectionScore: number;
  detectedRisks: string[];
  textSample: string;
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  escalations?: CrisisEscalation[];
}

/**
 * Record of crisis escalation actions
 */
export interface CrisisEscalation {
  timestamp: string;
  fromLevel: CrisisAlertLevel;
  toLevel: CrisisAlertLevel;
  reason: string;
  actionsTaken: string[];
}

/**
 * Risk assessment result from AI analysis
 */
export interface RiskAssessment {
  overallRiskScore: number;
  primaryRisk: string;
  secondaryRisks: string[];
  confidenceScore: number;
  immediateActionRequired: boolean;
  analysisTimestamp: string;
}

/**
 * Configuration for an intervention procedure
 */
export interface InterventionProcedure {
  name: string;
  forLevels: CrisisAlertLevel[];
  description: string;
  steps: string[];
  requiredResponseTimeMs: number;
  escalationPath: string;
}

/**
 * Staff notification channel definition
 */
export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'app' | 'phone' | 'pager' | 'slack' | 'teams';
  recipients: string[];
  priority: number;
  active: boolean;
  escalateAfterMs?: number;
}

/**
 * Crisis notification message structure
 */
export interface CrisisNotification {
  title: string;
  body: string;
  alertLevel: CrisisAlertLevel;
  caseId: string;
  patientId: string;
  sessionId: string;
  timestamp: string;
  actionLink: string;
  responseOptions: string[];
}

/**
 * Status of a crisis case
 */
export type CrisisStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated';

/**
 * Action taken on a crisis case
 */
export interface CrisisAction {
  caseId: string;
  actionType: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
  result?: string;
}

/**
 * Configuration for crisis protocol system
 */
export interface CrisisProtocolConfig {
  alertConfigurations: AlertConfiguration[];
  staffChannels: Record<CrisisAlertLevel, string[]>;
  alertTimeoutMs?: number;
  interventionProcedures?: InterventionProcedure[];
  notificationChannels?: NotificationChannel[];
  riskAssessmentThresholds?: Record<string, number>;
  escalationRules?: Record<CrisisAlertLevel, CrisisAlertLevel>;
  responseTemplates?: Record<CrisisAlertLevel, string[]>;
} 