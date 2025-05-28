import { CrisisProtocol } from '../CrisisProtocol'
import { CrisisRiskDetector } from '../CrisisRiskDetector'
import { NotificationService } from '../NotificationService'
import { defaultCrisisConfig } from '../config'
import { initializeCrisisProtocol } from '../'
import { vi, describe, test, expect, beforeEach } from 'vitest'

// Mock the logging module
jest.mock('../../../logging', () => ({
  appLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock dependencies
vi.mock('../../../logging', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}))

vi.mock('../../../security', () => ({
  encryptMessage: vi.fn().mockImplementation(async (message: string) => {
    return `encrypted:${message}`
  })
}))

describe('Crisis Protocol System', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CrisisRiskDetector', () => {
    let riskDetector: CrisisRiskDetector

    beforeEach(() => {
      riskDetector = new CrisisRiskDetector()
    })

    test('should detect high risk in text with explicit suicidal content', () => {
      const text = "I don't want to live anymore. I'm planning to end it all tonight."
      const assessment = riskDetector.analyzeText(text)

      expect(assessment.overallRiskScore).toBeGreaterThan(0.8)
      expect(assessment.primaryRisk).toBe('suicidal_ideation')
      expect(assessment.secondaryRisks).toContain('severe_depression')
    })

    test('should detect moderate risk in text with depression indicators', () => {
      const text = "I've been feeling hopeless and empty for weeks. Nothing brings me joy anymore."
      const assessment = riskDetector.analyzeText(text)

      expect(assessment.overallRiskScore).toBeGreaterThan(0.4)
      expect(assessment.overallRiskScore).toBeLessThan(0.8)
      expect(assessment.primaryRisk).toBe('severe_depression')
    })

    test('should extract risk terms correctly', () => {
      const text = "I don't want to live anymore. I've been planning how to kill myself."
      const assessment = riskDetector.analyzeText(text)
      const terms = riskDetector.extractRiskTerms(text, assessment)

      expect(terms).toContain('suicidal_ideation')
      expect(terms).toContain('suicide_plan')
    })
  })

  describe('NotificationService', () => {
    let notificationService: NotificationService

    beforeEach(() => {
      notificationService = NotificationService.getInstance()
      notificationService.initialize(defaultCrisisConfig.notificationChannels)
    })

    test('should properly initialize channels', () => {
      expect(notificationService.getAvailableChannels().length).toBeGreaterThan(0)
    })

    test('should send notifications through all channels for emergency alert', async () => {
      // Mock the internal send method
      const sendSpy = jest.spyOn(notificationService as any, 'sendToChannel').mockResolvedValue(true)

      await notificationService.sendCrisisAlert({
        alertLevel: 'emergency',
        patientId: 'test-patient',
        caseId: 'test-case',
        message: 'Emergency alert test',
        timestamp: new Date().toISOString()
      })

      // Should send through multiple channels for emergency
      expect(sendSpy).toHaveBeenCalledTimes(defaultCrisisConfig.staffChannels.emergency.length)
    })
  })

  describe('CrisisProtocol', () => {
    let crisisProtocol: CrisisProtocol
    let mockNotificationService: NotificationService

    beforeEach(() => {
      // Mock the notification service
      mockNotificationService = {
        sendCrisisAlert: jest.fn().mockResolvedValue({ 
          successful: true, 
          channelsSent: 2 
        }),
        initialize: jest.fn(),
        getAvailableChannels: jest.fn().mockReturnValue(['email', 'sms']),
        getInstance: jest.fn()
      } as unknown as NotificationService

      // Mock the singleton getInstance method
      jest.spyOn(NotificationService, 'getInstance').mockReturnValue(mockNotificationService)

      crisisProtocol = CrisisProtocol.getInstance()
      crisisProtocol.initialize(defaultCrisisConfig)
    })

    test('should initialize with default configuration', () => {
      expect(crisisProtocol).toBeDefined()
    })

    test('should handle a severe crisis correctly', async () => {
      const crisisResponse = await crisisProtocol.handleCrisis(
        'test-patient',
        'test-session',
        'I want to kill myself tonight',
        0.85,
        ['suicidal_ideation', 'suicide_plan']
      )

      expect(crisisResponse.alertLevel).toBe('severe')
      expect(crisisResponse.sessionContinuation).toBe(false)
      expect(mockNotificationService.sendCrisisAlert).toHaveBeenCalled()
    })

    test('should handle a low concern correctly', async () => {
      const crisisResponse = await crisisProtocol.handleCrisis(
        'test-patient',
        'test-session',
        'I feel down and sad lately',
        0.35,
        ['depression']
      )

      expect(crisisResponse.alertLevel).toBe('concern')
      expect(crisisResponse.sessionContinuation).toBe(true)
      expect(mockNotificationService.sendCrisisAlert).toHaveBeenCalled()
    })

    test('should correctly determine alert level based on risk score', () => {
      const determineAlertLevelSpy = jest.spyOn(crisisProtocol as any, 'determineAlertLevel')

      // Test with different risk scores
      expect((crisisProtocol as any).determineAlertLevel(0.95, ['suicide_plan'])).toBe('emergency')
      expect((crisisProtocol as any).determineAlertLevel(0.75, ['suicidal_ideation'])).toBe('severe')
      expect((crisisProtocol as any).determineAlertLevel(0.55, ['severe_depression'])).toBe('moderate')
      expect((crisisProtocol as any).determineAlertLevel(0.25, ['depression'])).toBe('concern')

      expect(determineAlertLevelSpy).toHaveBeenCalledTimes(4)
    })
  })

  describe('Integration', () => {
    test('should properly initialize the crisis protocol through the factory function', () => {
      const protocol = initializeCrisisProtocol()
      expect(protocol).toBeInstanceOf(CrisisProtocol)
    })
  })
})

describe('CrisisProtocol Patient ID Security', () => {
  let crisisProtocol: CrisisProtocol
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Get singleton instance
    crisisProtocol = CrisisProtocol.getInstance()
    
    // Initialize with test configuration
    crisisProtocol.initialize({
      alertConfigurations: [],
      staffChannels: {
        concern: ['test-channel'],
        moderate: ['test-channel'],
        severe: ['test-channel'],
        emergency: ['test-channel'],
      },
    })
  })
  
  test('should validate UUID format for patient ID', async () => {
    // Get the private validatePatientId method using reflection
    const validatePatientId = Reflect.get(
      crisisProtocol,
      'validatePatientId'
    ).bind(crisisProtocol)
    
    // Valid UUID should pass
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    expect(() => validatePatientId(validUuid)).not.toThrow()
    
    // Invalid formats should throw
    const invalidFormats = [
      '12345', // numeric
      'not-a-uuid', // plain text
      'abc-123-def', // malformed
      '123e4567-e89b-12d3-a456-42661417400', // too short
      '123e4567-e89b-12d3-a456-4266141740000', // too long
    ]
    
    for (const invalid of invalidFormats) {
      expect(() => validatePatientId(invalid)).toThrow('Invalid patient ID format')
    }
  })
  
  test('should mask patient IDs correctly', async () => {
    // Get the private maskPatientId method using reflection
    const maskPatientId = Reflect.get(
      crisisProtocol,
      'maskPatientId'
    ).bind(crisisProtocol)
    
    // Test UUID masking
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const maskedUuid = maskPatientId(uuid)
    expect(maskedUuid).toBe('123e4567...4000')
    expect(maskedUuid.length).toBeLessThan(uuid.length)
    
    // Test numeric ID masking
    const numericId = '123456789'
    const maskedNumeric = maskPatientId(numericId)
    expect(maskedNumeric).toBe('****6789')
    expect(maskedNumeric.length).toBeLessThan(numericId.length + 1) // +1 for asterisks
    
    // Test other format masking
    const otherId = 'patient-x23y'
    const maskedOther = maskPatientId(otherId)
    expect(maskedOther).toBe('pat...23y')
    expect(maskedOther.length).toBeLessThan(otherId.length)
  })
  
  test('should encrypt sensitive data', async () => {
    // Get the private encryptSensitiveData method using reflection
    const encryptSensitiveData = Reflect.get(
      crisisProtocol,
      'encryptSensitiveData'
    ).bind(crisisProtocol)
    
    const patientId = '123e4567-e89b-12d3-a456-426614174000'
    const encrypted = await encryptSensitiveData(patientId)
    
    expect(encrypted).toBe(`encrypted:${patientId}`)
  })
  
  test('should log patient access to audit log', async () => {
    // Get the private logPatientAccess method using reflection
    const logPatientAccess = Reflect.get(
      crisisProtocol,
      'logPatientAccess'
    ).bind(crisisProtocol)
    
    // Mock the audit logger
    const mockAuditLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    
    // Replace the audit logger with our mock
    Reflect.set(crisisProtocol, 'auditLogger', mockAuditLogger)
    
    const patientId = '123e4567-e89b-12d3-a456-426614174000'
    const action = 'test_access'
    const details = { reason: 'testing' }
    
    await logPatientAccess(patientId, action, details)
    
    // Verify the audit log entry
    expect(mockAuditLogger.info).toHaveBeenCalledTimes(1)
    expect(mockAuditLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(action),
      expect.objectContaining({
        patientId: expect.stringContaining('123e4567'), // Should contain masked ID
        action,
        timestamp: expect.any(String),
        reason: 'testing',
      })
    )
  })
  
  test('should use masked IDs in notifications', async () => {
    // Get the private notifyStaff method using reflection
    const notifyStaff = Reflect.get(
      crisisProtocol,
      'notifyStaff'
    ).bind(crisisProtocol)
    
    // Mock sendSlackNotification to capture the payload
    const mockSendSlack = vi.fn().mockResolvedValue(true)
    Reflect.set(
      crisisProtocol,
      'sendSlackNotification',
      mockSendSlack
    )
    
    // Set webhook URL to trigger the Slack notification
    Reflect.set(crisisProtocol, 'slackWebhookUrl', 'https://example.com/webhook')
    
    // Update staffChannels to include SLACK_WEBHOOK_CHANNEL
    const staffChannels = new Map()
    staffChannels.set('moderate', ['SLACK_WEBHOOK_CHANNEL'])
    Reflect.set(crisisProtocol, 'staffChannels', staffChannels)
    
    // Test with masked patient ID
    const maskedPatientId = '123e4567...4000'
    await notifyStaff(
      'moderate',
      maskedPatientId,
      'session-123',
      'case-456',
      'Sample text',
      ['test_risk']
    )
    
    // Verify that the Slack payload contains the masked ID
    expect(mockSendSlack).toHaveBeenCalledTimes(1)
    const payload = mockSendSlack.mock.calls[0][0]
    
    // Check text field
    expect(payload.text).toContain(maskedPatientId)
    
    // Check blocks field
    const patientIdField = payload.blocks[1].fields.find((f: any) => 
      f.text.includes('Patient ID')
    )
    expect(patientIdField).toBeDefined()
    expect(patientIdField.text).toContain(maskedPatientId)
    
    // Should not contain the full unmasked ID
    const fullId = '123e4567-e89b-12d3-a456-426614174000'
    expect(payload.text).not.toContain(fullId)
    expect(JSON.stringify(payload.blocks)).not.toContain(fullId)
  })
}) 