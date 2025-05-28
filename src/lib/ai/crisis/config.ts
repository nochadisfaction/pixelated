import type { 
  AlertConfiguration, 
  CrisisAlertLevel,
  InterventionProcedure,
  NotificationChannel
} from './types'

/**
 * Default configuration for the crisis protocol system
 */
export const defaultCrisisConfig = {
  /**
   * Alert configurations for different crisis levels
   */
  alertConfigurations: [
    {
      level: 'concern' as CrisisAlertLevel,
      name: 'Concern Level Alert',
      description: 'Low level concern that requires monitoring but not immediate intervention',
      thresholdScore: 0.3,
      triggerTerms: ['hopelessness', 'sadness', 'depression', 'anxiety'],
      autoEscalateAfterMs: 3600000, // 1 hour
      requiredActions: ['review', 'document', 'follow_up']
    },
    {
      level: 'moderate' as CrisisAlertLevel,
      name: 'Moderate Level Alert',
      description: 'Moderate concern that requires attention within a few hours',
      thresholdScore: 0.5,
      triggerTerms: ['severe_depression', 'severe_anxiety', 'substance_abuse'],
      autoEscalateAfterMs: 1800000, // 30 minutes
      requiredActions: ['review', 'contact_patient', 'document', 'follow_up']
    },
    {
      level: 'severe' as CrisisAlertLevel,
      name: 'Severe Level Alert',
      description: 'Serious concern that requires prompt intervention',
      thresholdScore: 0.7,
      triggerTerms: ['suicidal_ideation', 'self_harm', 'harm_others'],
      autoEscalateAfterMs: 900000, // 15 minutes
      requiredActions: ['immediate_review', 'contact_patient', 'clinical_consult', 'document', 'follow_up']
    },
    {
      level: 'emergency' as CrisisAlertLevel,
      name: 'Emergency Level Alert',
      description: 'Critical situation requiring immediate intervention',
      thresholdScore: 0.9,
      triggerTerms: ['suicide_plan', 'active_suicide_attempt', 'immediate_danger'],
      autoEscalateAfterMs: 300000, // 5 minutes
      requiredActions: ['immediate_intervention', 'emergency_services', 'clinical_consult', 'document', 'follow_up']
    }
  ] as AlertConfiguration[],

  /**
   * Staff notification channels for different alert levels
   */
  staffChannels: {
    'concern': ['email-therapist', 'app-therapist'],
    'moderate': ['email-therapist', 'app-therapist', 'email-supervisor'],
    'severe': ['email-therapist', 'app-therapist', 'sms-therapist', 'email-supervisor', 'app-supervisor'],
    'emergency': ['sms-therapist', 'phone-therapist', 'sms-supervisor', 'phone-supervisor', 'email-crisis-team', 'sms-crisis-team']
  } as Record<CrisisAlertLevel, string[]>,

  /**
   * Fallback channels to use if primary channels fail
   */
  fallbackChannels: ['email-crisis-team', 'sms-supervisor', 'phone-supervisor'],

  /**
   * Default timeout before auto-escalation (in milliseconds)
   */
  alertTimeoutMs: 300000, // 5 minutes

  /**
   * Notification channels configuration
   */
  notificationChannels: [
    {
      id: 'email-therapist',
      type: 'email',
      recipients: ['${therapistEmail}'],
      priority: 3,
      active: true
    },
    {
      id: 'app-therapist',
      type: 'app',
      recipients: ['${therapistId}'],
      priority: 2,
      active: true
    },
    {
      id: 'sms-therapist',
      type: 'sms',
      recipients: ['${therapistPhone}'],
      priority: 1,
      active: true
    },
    {
      id: 'phone-therapist',
      type: 'phone',
      recipients: ['${therapistPhone}'],
      priority: 0,
      active: true
    },
    {
      id: 'email-supervisor',
      type: 'email',
      recipients: ['${supervisorEmail}'],
      priority: 3,
      active: true
    },
    {
      id: 'app-supervisor',
      type: 'app',
      recipients: ['${supervisorId}'],
      priority: 2,
      active: true
    },
    {
      id: 'sms-supervisor',
      type: 'sms',
      recipients: ['${supervisorPhone}'],
      priority: 1,
      active: true
    },
    {
      id: 'phone-supervisor',
      type: 'phone',
      recipients: ['${supervisorPhone}'],
      priority: 0,
      active: true
    },
    {
      id: 'email-crisis-team',
      type: 'email',
      recipients: ['crisis-team@example.com'],
      priority: 2,
      active: true
    },
    {
      id: 'sms-crisis-team',
      type: 'sms',
      recipients: ['+1234567890'],
      priority: 1,
      active: true
    },
    {
      id: 'slack-crisis-team',
      type: 'slack',
      recipients: ['#crisis-alerts'],
      priority: 2,
      active: true
    }
  ] as NotificationChannel[],

  /**
   * Intervention procedures for different crisis levels
   */
  interventionProcedures: [
    {
      name: 'Emergency Intervention',
      forLevels: ['emergency'],
      description: 'Immediate intervention for life-threatening situations',
      steps: [
        '1. Attempt immediate contact with patient',
        '2. Contact emergency services if unable to reach patient or situation warrants',
        '3. Notify clinical supervisor',
        '4. Document all actions taken',
        '5. Schedule immediate follow-up'
      ],
      requiredResponseTimeMs: 300000, // 5 minutes
      escalationPath: 'Contact emergency services and clinical director'
    },
    {
      name: 'Severe Risk Intervention',
      forLevels: ['severe'],
      description: 'Urgent intervention for high-risk situations',
      steps: [
        '1. Review case details immediately',
        '2. Attempt contact with patient within 30 minutes',
        '3. Consult with clinical team',
        '4. Create safety plan with patient if reached',
        '5. Schedule follow-up within 24 hours',
        '6. Document all actions taken'
      ],
      requiredResponseTimeMs: 1800000, // 30 minutes
      escalationPath: 'Escalate to emergency protocol if unable to reach patient'
    },
    {
      name: 'Moderate Risk Intervention',
      forLevels: ['moderate'],
      description: 'Timely intervention for moderate risk situations',
      steps: [
        '1. Review case details within 2 hours',
        '2. Contact patient within 4 hours',
        '3. Assess current risk level',
        '4. Provide appropriate resources',
        '5. Schedule follow-up within 48 hours',
        '6. Document all actions taken'
      ],
      requiredResponseTimeMs: 14400000, // 4 hours
      escalationPath: 'Escalate to severe protocol if risk increases or unable to reach patient'
    },
    {
      name: 'Concern Level Intervention',
      forLevels: ['concern'],
      description: 'Monitoring and support for low-level concerns',
      steps: [
        '1. Review case details within 24 hours',
        '2. Document observations and risk assessment',
        '3. Include in next session agenda',
        '4. Monitor for escalation of symptoms',
        '5. Provide self-help resources if appropriate'
      ],
      requiredResponseTimeMs: 86400000, // 24 hours
      escalationPath: 'Escalate to moderate protocol if risk increases'
    }
  ] as InterventionProcedure[],

  /**
   * Risk assessment thresholds for different risk types
   */
  riskAssessmentThresholds: {
    'suicidal_ideation': 0.7,
    'self_harm': 0.7,
    'harm_others': 0.7,
    'severe_depression': 0.6,
    'severe_anxiety': 0.6,
    'substance_issue': 0.6
  },

  /**
   * Escalation rules for different alert levels
   */
  escalationRules: {
    'concern': 'moderate',
    'moderate': 'severe',
    'severe': 'emergency',
    'emergency': 'emergency'
  } as Record<CrisisAlertLevel, CrisisAlertLevel>,

  /**
   * Response templates for different alert levels
   */
  responseTemplates: {
    'concern': [
      "I notice you may be going through a difficult time. I've made note of this, and a professional will review our conversation. Would you like to discuss some coping strategies in the meantime?",
      "It sounds like you're experiencing some challenges right now. I've flagged this conversation for review by a mental health professional. Is there anything specific you'd like to talk about while we wait?"
    ],
    'moderate': [
      "I'm concerned about what you've shared. I've flagged this conversation for a mental health professional to review soon. Would it be helpful to connect you with crisis resources right now?",
      "What you're describing sounds difficult, and I want to make sure you get the right support. I've alerted a professional to review our conversation. Would you like me to provide some immediate resources that might help?"
    ],
    'severe': [
      "I'm very concerned about what you've shared. I've alerted a mental health professional to review this conversation and reach out to you right away. Please know that support is available.",
      "I'm taking what you've shared very seriously. A mental health professional has been notified and will be reaching out to you soon. Please stay connected and know that help is on the way."
    ],
    'emergency': [
      "I'm seriously concerned about your safety right now. I've notified a crisis team who will contact you immediately. Please don't harm yourself - help is available and you're not alone.",
      "Your safety is the top priority right now. I've activated our emergency protocol and a crisis team has been notified. Please stay where you are - help is on the way."
    ]
  } as Record<CrisisAlertLevel, string[]>
} 