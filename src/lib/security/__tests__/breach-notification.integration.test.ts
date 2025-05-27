import { auth } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { FHE } from '@/lib/fhe'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'
import { BreachNotificationSystem } from '../breach-notification'

// Mock dependencies
vi.mock('@/lib/redis')
vi.mock('@/lib/email')
vi.mock('@/lib/auth')
vi.mock('@/lib/fhe')
vi.mock('@/lib/logger')

describe('breachNotificationSystem Integration Tests', () => {
  const mockBreach = {
    type: 'unauthorized_access' as const,
    severity: 'high' as const,
    description: 'Test breach',
    affectedUsers: ['user1', 'user2'],
    affectedData: ['personal_info'],
    detectionMethod: 'system_monitoring',
    remediation: 'Access revoked and passwords reset',
  }

  const mockUser = {
    id: 'user1',
    email: 'user@test.com',
    name: 'Test User',
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Setup redis mock
    vi.mocked(redis.set).mockResolvedValue('OK')
    vi.mocked(redis.get).mockResolvedValue(
      JSON.stringify({
        ...mockBreach,
        id: 'test_breach_id',
        timestamp: Date.now(),
        notificationStatus: 'pending',
      }),
    )
    vi.mocked(redis.keys).mockResolvedValue(['breach:test_breach_id'])

    // Setup auth mock
    vi.mocked(auth.getUserById).mockResolvedValue(mockUser)

    // Setup FHE mock
    vi.mocked(FHE.encrypt).mockResolvedValue('encrypted_data')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('breach Reporting and Notification', () => {
    it('should successfully report a breach and initiate notifications', async () => {
      const breachId = await BreachNotificationSystem.reportBreach(mockBreach)

      expect(breachId).toBeDefined()
      expect(redis.set).toHaveBeenCalled()
      expect(sendEmail).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('should notify affected users with encrypted details', async () => {
      await BreachNotificationSystem.reportBreach(mockBreach)

      expect(FHE.encrypt).toHaveBeenCalled()
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          priority: 'urgent',
          metadata: expect.objectContaining({
            type: 'security_breach',
            encryptedDetails: 'encrypted_data',
          }),
        }),
      )
    })

    it('should notify authorities for large breaches', async () => {
      const largeBreach = {
        ...mockBreach,
        affectedUsers: Array.from({ length: 500 }).fill('user'),
      }

      await BreachNotificationSystem.reportBreach(largeBreach)

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: process.env.HHS_NOTIFICATION_EMAIL,
          priority: 'urgent',
          metadata: expect.objectContaining({
            type: 'hipaa_breach_notification',
          }),
        }),
      )
    })
  })

  describe('breach Status and Retrieval', () => {
    it('should retrieve breach status', async () => {
      const status =
        await BreachNotificationSystem.getBreachStatus('test_breach_id')

      expect(status).toBeDefined()
      expect(status?.type).toBe(mockBreach.type)
      expect(status?.severity).toBe(mockBreach.severity)
    })

    it('should list recent breaches', async () => {
      const breaches = await BreachNotificationSystem.listRecentBreaches()

      expect(breaches).toHaveLength(1)
      expect(breaches[0].type).toBe(mockBreach.type)
    })
  })

  describe('test Scenarios and Documentation', () => {
    it('should run test scenarios successfully', async () => {
      const scenario = {
        type: 'data_leak' as const,
        severity: 'medium' as const,
        affectedUsers: 10,
      }

      const breachId = await BreachNotificationSystem.runTestScenario(scenario)

      expect(breachId).toBeDefined()
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('breach:test:'),
        expect.any(String),
        'EX',
        expect.any(Number),
      )
    })

    it('should retrieve training materials', async () => {
      const materials = await BreachNotificationSystem.getTrainingMaterials()

      expect(materials).toBeDefined()
      expect(materials.procedures).toBeDefined()
      expect(materials.guidelines).toBeDefined()
      expect(materials.templates).toBeDefined()
    })
  })

  describe('metrics and Analysis', () => {
    it('should update breach metrics', async () => {
      const breach = {
        ...mockBreach,
        id: 'test_breach_id',
        timestamp: Date.now(),
        notificationStatus: 'completed',
      }

      await BreachNotificationSystem.updateMetrics(breach)

      expect(redis.hset).toHaveBeenCalled()
      expect(redis.expire).toHaveBeenCalled()
    })
  })

  describe('error Handling', () => {
    it('should handle redis errors gracefully', async () => {
      vi.mocked(redis.set).mockRejectedValue(new Error('Redis error'))

      await expect(
        BreachNotificationSystem.reportBreach(mockBreach),
      ).rejects.toThrow('Redis error')
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to report breach:',
        expect.any(Error),
      )
    })

    it('should handle email sending failures', async () => {
      vi.mocked(sendEmail).mockRejectedValue(new Error('Email error'))

      await BreachNotificationSystem.reportBreach(mockBreach)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to notify user:',
        expect.objectContaining({
          error: expect.any(Error),
        }),
      )
    })
  })
})
