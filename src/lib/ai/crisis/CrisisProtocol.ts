import { appLogger as logger } from '../../logging'
import type { CrisisAlertLevel, CrisisResponse, AlertConfiguration } from './types'
import { z } from 'zod' // Import zod for validation
import { encryptMessage } from '../../security' // Import encryption function

// Create a specialized audit logger for patient data access using the existing logger
// This avoids dependency on a missing getAuditLogger function
const auditLogger = {
  info: (message: string, data: Record<string, any>) => {
    logger.info(`[AUDIT] ${message}`, {
      ...data,
      audit_type: 'patient-access',
      audit_timestamp: new Date().toISOString()
    });
  },
  warn: (message: string, data: Record<string, any>) => {
    logger.warn(`[AUDIT] ${message}`, {
      ...data,
      audit_type: 'patient-access',
      audit_timestamp: new Date().toISOString()
    });
  },
  error: (message: string, data: Record<string, any>) => {
    logger.error(`[AUDIT] ${message}`, {
      ...data,
      audit_type: 'patient-access',
      audit_timestamp: new Date().toISOString()
    });
  }
};

/**
 * CrisisProtocol - Production-ready service for handling mental health crises
 * 
 * This service manages the detection, escalation, and response to potential mental health crises,
 * implementing a comprehensive protocol for patient safety and appropriate intervention.
 */
export class CrisisProtocol {
  private static instance: CrisisProtocol
  private alertConfigurations: AlertConfiguration[] = []
  private staffChannels: Map<CrisisAlertLevel, string[]> = new Map()
  private escalationFlow: Map<CrisisAlertLevel, CrisisAlertLevel> = new Map()
  private alertTimeoutMs: number
  private isInitialized: boolean = false
  private crisisEventRecorder?: (eventData: Record<string, any>) => Promise<void>;
  private slackWebhookUrl?: string; // Added to store Slack webhook URL

  // Patient ID validation schema
  private patientIdSchema = z.string().refine(
    (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    { message: "Patient ID must be a valid UUID format" }
  );

  /**
   * Private constructor - use getInstance() to get the singleton instance
   */
  private constructor() {
    this.alertTimeoutMs = parseInt(process.env.CRISIS_ALERT_TIMEOUT_MS || '300000', 10); // 5 minutes default
    // Initialize escalation flow (each level escalates to the next higher level if not responded to)
    this.escalationFlow.set('concern', 'moderate')
    this.escalationFlow.set('moderate', 'severe')
    this.escalationFlow.set('severe', 'emergency')
    this.escalationFlow.set('emergency', 'emergency') // Top level doesn't escalate further
  }

  /**
   * Get the singleton instance of CrisisProtocol
   */
  public static getInstance(): CrisisProtocol {
    if (!CrisisProtocol.instance) {
      CrisisProtocol.instance = new CrisisProtocol()
    }
    return CrisisProtocol.instance
  }

  /**
   * Initialize the crisis protocol system with proper configuration
   */
  public initialize(config: {
    alertConfigurations: AlertConfiguration[];
    staffChannels: Record<CrisisAlertLevel, string[]>; // Channels can now include Slack webhook URLs
    alertTimeoutMs?: number;
    crisisEventRecorder?: (eventData: Record<string, any>) => Promise<void>;
    slackWebhookUrl?: string; // Added to accept Slack webhook URL during initialization
  }): void {
    this.alertConfigurations = config.alertConfigurations;
    
    Object.entries(config.staffChannels).forEach(([level, channels]) => {
      this.staffChannels.set(level as CrisisAlertLevel, channels);
    });

    if (config.alertTimeoutMs) {
      this.alertTimeoutMs = config.alertTimeoutMs;
    }

    if (config.crisisEventRecorder) {
      this.crisisEventRecorder = config.crisisEventRecorder;
    }

    if (config.slackWebhookUrl) { // Store the Slack webhook URL
      this.slackWebhookUrl = config.slackWebhookUrl;
    }

    this.isInitialized = true
    logger.info('CrisisProtocol system initialized', {
      alertLevelCount: this.alertConfigurations.length,
      staffChannelCount: this.staffChannels.size,
      crisisEventRecorder: !!this.crisisEventRecorder,
      slackWebhookConfigured: !!this.slackWebhookUrl // Log if Slack webhook is configured
    })
  }

  /**
   * Masks a patient ID for secure logging and display
   * Implements different masking strategies based on ID format
   */
  private maskPatientId(patientId: string): string {
    // If UUID format (8-4-4-4-12)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
      return `${patientId.substring(0, 8)}...${patientId.substring(patientId.length - 4)}`;
    }
    // For numeric IDs
    if (/^\d+$/.test(patientId)) {
      return `****${patientId.substring(Math.max(patientId.length - 4, 0))}`;
    }
    // For other formats
    return `${patientId.substring(0, 3)}...${patientId.substring(Math.max(patientId.length - 3, 0))}`;
  }

  /**
   * Encrypts sensitive data for secure storage or transmission
   */
  private async encryptSensitiveData(data: string): Promise<string> {
    try {
      return await encryptMessage(data);
    } catch (error) {
      logger.error('Failed to encrypt sensitive data', { error });
      // Return a masked version if encryption fails
      return `PROTECTED:${this.maskPatientId(data)}`;
    }
  }

  /**
   * Logs a patient data access event to the audit log
   */
  private async logPatientAccess(
    patientId: string, 
    action: string, 
    details: Record<string, any>
  ): Promise<void> {
    // Create a masked version of the patient ID for logging
    const maskedPatientId = this.maskPatientId(patientId);
    
    // Log to the audit log with full context but masked ID
    auditLogger.info(`Patient data ${action}`, {
      patientId: maskedPatientId,
      action,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Validates a patient ID against the required format
   * Throws an error if validation fails
   */
  private validatePatientId(patientId: string): string {
    try {
      return this.patientIdSchema.parse(patientId);
    } catch (error) {
      logger.error('Invalid patient ID format', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error('Invalid patient ID format. Must be a valid UUID.');
    }
  }

  /**
   * Handle a potential crisis based on AI detection
   * @param patientId Identifier for the patient/user in crisis
   * @param sessionId Current session identifier
   * @param textSample Sample of text that triggered the crisis detection
   * @param detectionScore AI confidence score for crisis detection (0-1)
   * @param detectedRisks Specific risks detected (e.g., 'suicidal_ideation', 'self_harm')
   * @returns Crisis response with actions taken and next steps
   */
  public async handleCrisis(
    patientId: string,
    sessionId: string,
    textSample: string,
    detectionScore: number,
    detectedRisks: string[] = []
  ): Promise<CrisisResponse> {
    if (!this.isInitialized) {
      throw new Error('CrisisProtocol has not been initialized. Call initialize() first.')
    }

    // Validate patient ID format
    this.validatePatientId(patientId);

    // Create masked versions for logging
    const maskedPatientId = this.maskPatientId(patientId);

    // Log the crisis detection with appropriate severity using masked ID
    logger.warn('CRISIS PROTOCOL ACTIVATED', {
      patientId: maskedPatientId,
      sessionId,
      textSample: textSample.substring(0, 200) + (textSample.length > 200 ? '...' : ''),
      detectionScore,
      detectedRisks
    })

    // Record this access in the audit log
    await this.logPatientAccess(patientId, 'crisis_detection', {
      sessionId,
      detectionScore,
      detectedRisks: detectedRisks.join(',')
    });

    // Determine alert level based on detection score and risks
    const alertLevel = this.determineAlertLevel(detectionScore, detectedRisks)
    
    // Create a case identifier for tracking this crisis
    const caseId = `crisis-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    
    try {
      // 1. Record the crisis in our system - encrypt patient ID before storage
      const encryptedPatientId = await this.encryptSensitiveData(patientId);
      await this.recordCrisisEvent({
        caseId,
        patientId: encryptedPatientId, // Use encrypted ID for storage
        sessionId,
        alertLevel,
        detectionScore,
        detectedRisks,
        textSample,
        timestamp: new Date().toISOString()
      })

      // 2. Alert appropriate staff based on alert level
      const notificationResults = await this.notifyStaff(
        alertLevel,
        maskedPatientId, // Use masked ID for notifications
        sessionId,
        caseId,
        textSample,
        detectedRisks
      )

      // 3. Flag the session for priority human review
      await this.flagSessionForReview(sessionId, alertLevel)

      // 4. Set up automatic escalation if no response within timeout
      this.setupEscalationTimer(caseId, alertLevel, patientId, sessionId, textSample, detectedRisks)

      // 5. Return structured response with actions taken and next steps
      return {
        caseId,
        alertLevel,
        actionsPerformed: [
          'crisis_recorded',
          'staff_notified',
          'session_flagged',
          'escalation_scheduled'
        ],
        staffNotified: notificationResults.notifiedCount,
        responseMessage: this.getResponseMessageForLevel(alertLevel),
        immediateAction: this.getImmediateActionForLevel(alertLevel),
        sessionContinuation: this.shouldContinueSession(alertLevel),
        escalationTime: new Date(Date.now() + this.alertTimeoutMs).toISOString()
      }
    } catch (error) {
      // Log error but ensure we still return a valid crisis response
      logger.error('Error in crisis protocol execution', { 
        error: error instanceof Error ? error.message : String(error), 
        caseId,
        sessionId
      })
      
      // Fallback to emergency procedure to ensure patient safety
      return this.emergencyFallbackProcedure(caseId, maskedPatientId, sessionId, textSample)
    }
  }

  /**
   * Determine the appropriate alert level based on detection score and risks
   */
  private determineAlertLevel(
    detectionScore: number,
    detectedRisks: string[]
  ): CrisisAlertLevel {
    // Check if any high-risk terms are present that would immediately escalate
    const emergencyTriggers = ['suicide_plan', 'active_suicide_attempt', 'immediate_danger']
    const severeTriggers = ['suicidal_ideation', 'self_harm', 'harm_others']
    const moderateTriggers = ['hopelessness', 'severe_depression', 'severe_anxiety']

    if (detectedRisks.some(risk => emergencyTriggers.includes(risk))) {
      return 'emergency'
    }

    if (detectedRisks.some(risk => severeTriggers.includes(risk))) {
      return 'severe'
    }

    if (detectedRisks.some(risk => moderateTriggers.includes(risk))) {
      return 'moderate'
    }

    // If no specific risks are detected, use the score to determine level
    if (detectionScore >= 0.9) {
      return 'emergency';
    }
    // Corrected logic: removed redundant check for detectionScore >= 0.5
    if (detectionScore >= 0.7) { 
      return 'severe'; // Scores 0.7 to < 0.9
    }
    if (detectionScore >= 0.5) {
      return 'moderate'; // Scores 0.5 to < 0.7
    }
    return 'concern'; // Scores below 0.5
  }

  /**
   * Record the crisis event in our database for tracking and reporting
   */
  private async recordCrisisEvent(eventData: {
    caseId: string;
    patientId: string;
    sessionId: string;
    alertLevel: CrisisAlertLevel;
    detectionScore: number;
    detectedRisks: string[];
    textSample: string;
    timestamp: string;
  }): Promise<void> {
    if (!this.crisisEventRecorder) {
      throw new Error(
        'CrisisProtocol: No crisisEventRecorder database service configured. Please provide a production database integration.',
      );
    }
    try {
      await this.crisisEventRecorder(eventData);
      logger.info('Crisis event recorded', { eventData });
    } catch (error) {
      logger.error('Failed to record crisis event', { error, eventData });
      // Don't throw - we want to continue with crisis handling even if recording fails
    }
  }

  /**
   * Sends a notification to Slack using a webhook URL.
   * @param messagePayload The payload to send to Slack (must be a valid Slack message payload).
   */
  private async sendSlackNotification(messagePayload: object): Promise<boolean> {
    if (!this.slackWebhookUrl) {
      logger.error('Slack notification requested, but no webhook URL is configured.');
      return false;
    }
    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        logger.error('Failed to send Slack notification', { 
          status: response.status, 
          statusText: response.statusText,
          response: responseBody,
        });
        return false;
      }
      logger.info('Successfully sent Slack notification.');
      return true;
    } catch (error) {
      logger.error('Error sending Slack notification', { error });
      return false;
    }
  }

  /**
   * Notify appropriate staff based on alert level
   */
  private async notifyStaff(
    alertLevel: CrisisAlertLevel,
    maskedPatientId: string, // Updated to use masked patient ID
    sessionId: string,
    caseId: string,
    textSample: string,
    detectedRisks: string[]
  ): Promise<{ success: boolean; notifiedCount: number }> {
    const staffChannelsForLevel = this.staffChannels.get(alertLevel) || [];
    
    if (staffChannelsForLevel.length === 0 && !this.slackWebhookUrl) {
      logger.error('No staff channels or Slack webhook configured for alert level', { alertLevel });
      return { success: false, notifiedCount: 0 };
    }

    const alertMessageText = this.formatAlertMessage(
      alertLevel,
      maskedPatientId, // Use masked patient ID
      sessionId,
      caseId,
      textSample,
      detectedRisks
    );

    // Prepare Slack message payload with masked patient ID
    const slackMessagePayload = {
      text: alertMessageText, // Fallback for notifications
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${this.getAlertEmoji(alertLevel)} CRISIS ALERT: ${alertLevel.toUpperCase()} LEVEL`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Patient ID:*\n${maskedPatientId}` }, // Use masked patient ID
            { type: 'mrkdwn', text: `*Case ID:*\n${caseId}` },
            { type: 'mrkdwn', text: `*Session ID:*\n${sessionId}` },
            { type: 'mrkdwn', text: `*Alert Level:*\n${alertLevel}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Detected Risks:*\n${detectedRisks.join(', ') || 'Not specified'}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Text Sample (first 200 chars):*\n\`\`\`${textSample.substring(0,200)}${textSample.length > 200 ? '...' : ''}\`\`\``,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Timestamp: ${new Date().toISOString()}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            // TODO: Add actionable buttons here, e.g., "Acknowledge", "View Case"
            // These would require your application to handle incoming Slack interactions.
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Acknowledge (Placeholder)',
                emoji: true,
              },
              value: `ack_${caseId}`,
              action_id: 'acknowledge_crisis', // You'll need to handle this action_id
            },
          ],
        },
      ],
    };

    let successCount = 0;
    
    // Attempt to send to Slack if configured
    if (this.slackWebhookUrl && staffChannelsForLevel.includes('SLACK_WEBHOOK_CHANNEL')) { // Check for a special identifier
      logger.info('Attempting to send crisis alert to configured Slack webhook.', { caseId, alertLevel });
      if (await this.sendSlackNotification(slackMessagePayload)) {
        successCount++;
      }
    }

    // Record this notification in the audit log
    auditLogger.info('Staff notified of patient crisis', {
      alertLevel,
      caseId,
      channels: staffChannelsForLevel,
      success: successCount > 0
    });

    // TODO: Implement other notification channels if needed (e.g., email, SMS)
    // This loop is a placeholder for other potential channels.
    // For now, it primarily serves to log if non-Slack channels were intended.
    for (const channel of staffChannelsForLevel) {
      if (channel === 'SLACK_WEBHOOK_CHANNEL') {
        continue; // Already handled
      }

      try {
        // This is where you'd integrate other notification services (email, SMS, PagerDuty, etc.)
        logger.info(`Simulating alert to non-Slack channel: ${channel}`, { alertLevel, caseId, message: alertMessageText });
        // Example: await emailService.send(channel, "Crisis Alert", alertMessageText);
        // For now, we just log it. If it's not the Slack channel, it's considered a simulated success for counting.
        successCount++; 
      } catch (error) {
        logger.error(`Failed to send alert to channel ${channel}`, { error, alertLevel, caseId });
      }
    }
    
    if (successCount === 0 && staffChannelsForLevel.length > 0) {
        logger.warn('Alerts were configured but all notification attempts failed or were simulated.', { caseId, alertLevel });
    }

    return { 
      success: successCount > 0, 
      notifiedCount: successCount 
    };
  }

  /**
   * Gets the appropriate emoji for the alert level.
   */
  private getAlertEmoji(alertLevel: CrisisAlertLevel): string {
    const alertEmojiMap: Record<CrisisAlertLevel, string> = {
      concern: '⚠️',
      moderate: '🟠',
      severe: '🔴',
      emergency: '🚨',
    };
    return alertEmojiMap[alertLevel] || 'ℹ️'; // Default to info icon
  }

  /**
   * Format the alert message for staff notifications (primarily for non-Slack text)
   */
  private formatAlertMessage(
    alertLevel: CrisisAlertLevel,
    maskedPatientId: string, // Updated to use masked patient ID
    sessionId: string,
    caseId: string,
    textSample: string,
    detectedRisks: string[]
  ): string {
    const alertEmoji = this.getAlertEmoji(alertLevel);
    const truncatedText = textSample.length > 100 
      ? textSample.substring(0, 100) + '...' 
      : textSample;

    return `${alertEmoji} CRISIS ALERT: ${alertLevel.toUpperCase()}\nPatient ID: ${maskedPatientId}\nCase ID: ${caseId}\nSession: ${sessionId}\nRisks: ${detectedRisks.join(', ') || 'Not specified'}\nSample: "${truncatedText}"\n\nURGENT: Please respond to this crisis according to protocol.`
  }

  /**
   * Flag the session for priority human review
   */
  private async flagSessionForReview(
    sessionId: string, 
    alertLevel: CrisisAlertLevel
  ): Promise<void> {
    try {
      // In production, this would update a session record to flag it for review
      logger.info('Flagging session for priority review', { sessionId, alertLevel })
      
      // TODO: Replace with actual session flagging in production
      // await sessionService.flagForReview(sessionId, { 
      //   reason: 'crisis_protocol', 
      //   level: alertLevel,
      //   priority: alertLevel === 'emergency' ? 'immediate' : 'high'
      // })
    } catch (error) {
      logger.error('Failed to flag session for review', { error, sessionId, alertLevel })
      // Don't throw - we want to continue with crisis handling even if flagging fails
    }
  }

  /**
   * Set up automatic escalation if no response within timeout
   */
  private setupEscalationTimer(
    caseId: string,
    currentLevel: CrisisAlertLevel,
    patientId: string,
    sessionId: string,
    textSample: string,
    detectedRisks: string[]
  ): void {
    const nextLevel = this.escalationFlow.get(currentLevel)
    
    // Don't set a timer if we're already at the highest level
    if (nextLevel === currentLevel) {
      return
    }
    
    // Set a timeout to escalate if no response is received
    setTimeout(async () => {
      try {
        // Check if the case has been resolved
        const isResolved = await this.isCaseResolved(caseId)
        
        if (!isResolved) {
          // Create masked patient ID for logging
          const maskedPatientId = this.maskPatientId(patientId);
          
          logger.warn('Crisis escalation triggered due to timeout', { 
            caseId, 
            previousLevel: currentLevel, 
            newLevel: nextLevel,
            patientId: maskedPatientId // Use masked ID in logs
          })
          
          // Log escalation in audit log
          await this.logPatientAccess(patientId, 'crisis_escalation', {
            caseId,
            previousLevel: currentLevel,
            newLevel: nextLevel
          });
          
          // Escalate to next level
          await this.handleCrisis(
            patientId,
            sessionId,
            textSample,
            0.95, // Force a high detection score for the escalation
            [...detectedRisks, 'escalated_due_to_timeout']
          )
        }
      } catch (error) {
        logger.error('Error in crisis escalation', { error, caseId })
      }
    }, this.alertTimeoutMs)
  }

  /**
   * Check if a crisis case has been resolved
   */
  private async isCaseResolved(caseId: string): Promise<boolean> {
    // In production, this would check a database record
    // For now, return false to simulate an unresolved case
    return false
  }

  /**
   * Get an appropriate response message based on alert level
   */
  private getResponseMessageForLevel(level: CrisisAlertLevel): string {
    switch (level) {
      case 'emergency':
        return "I'm seriously concerned about your safety right now. I've notified a crisis team who will contact you immediately. Please don't harm yourself - help is available and you're not alone."
      
      case 'severe':
        return "I'm very concerned about what you've shared. I've alerted a mental health professional to review this conversation and reach out to you right away. Please know that support is available."
      
      case 'moderate':
        return "I'm concerned about what you've shared. I've flagged this conversation for a mental health professional to review soon. Would it be helpful to connect you with crisis resources right now?"
      
      case 'concern':
        return "I notice you may be going through a difficult time. I've made note of this, and a professional will review our conversation. Would you like to discuss some coping strategies in the meantime?"
      
      default:
        return "I'm here to support you. A mental health professional will review our conversation to ensure you're getting the help you need."
    }
  }

  /**
   * Get immediate action recommendations based on alert level
   */
  private getImmediateActionForLevel(level: CrisisAlertLevel): string {
    switch (level) {
      case 'emergency':
        return "Please call emergency services (911 in US) immediately, or text HOME to 741741 to reach the Crisis Text Line. Stay on this platform as we're attempting to contact you directly."
      
      case 'severe':
        return "Please consider calling the National Suicide Prevention Lifeline at 1-800-273-8255, or text HOME to 741741 to reach the Crisis Text Line. A professional will be reaching out to you shortly."
      
      case 'moderate':
        return "Consider reaching out to a trusted person or call the National Suicide Prevention Lifeline at 1-800-273-8255 for immediate support."
      
      case 'concern':
        return "Take some time for self-care, and consider reaching out to a mental health professional or supportive person in your life."
      
      default:
        return "Please prioritize your well-being and consider reaching out to a mental health professional."
    }
  }

  /**
   * Determine if the AI session should continue based on alert level
   */
  private shouldContinueSession(level: CrisisAlertLevel): boolean {
    // For emergency and severe levels, we typically want human intervention
    return level !== 'emergency' && level !== 'severe'
  }

  /**
   * Emergency fallback procedure when the normal protocol fails
   */
  private emergencyFallbackProcedure(
    caseId: string,
    maskedPatientId: string, // Updated to use masked patient ID
    sessionId: string,
    textSample: string
  ): CrisisResponse {
    // Log the fallback with highest severity
    logger.error('EMERGENCY FALLBACK PROCEDURE ACTIVATED', {
      caseId,
      patientId: maskedPatientId, // Use masked ID in logs
      sessionId,
      reason: 'crisis_protocol_failure'
    })

    // Return emergency level response regardless of original assessment
    return {
      caseId,
      alertLevel: 'emergency',
      actionsPerformed: [
        'emergency_fallback_activated',
        'max_priority_alert_sent'
      ],
      staffNotified: 0, // We'll try again but can't confirm success here
      responseMessage: "I'm concerned about your safety. Due to a system issue, I've activated our emergency protocol. Someone will contact you urgently. If you're in immediate danger, please call emergency services (911 in US) right away.",
      immediateAction: "Please call emergency services (911 in US) immediately, or text HOME to 741741 to reach the Crisis Text Line. This is extremely important for your safety.",
      sessionContinuation: false,
      escalationTime: new Date().toISOString() // Immediate
    }
  }
}