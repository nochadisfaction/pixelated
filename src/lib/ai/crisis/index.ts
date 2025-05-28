/**
 * Crisis Protocol System - Production-grade implementation for handling mental health crises
 * 
 * This system provides comprehensive crisis detection, notification, and management
 * for mental health applications, ensuring appropriate response to potential crises.
 */

// Export main components
export { CrisisProtocol } from './CrisisProtocol'
export { CrisisRiskDetector } from './CrisisRiskDetector'
export { NotificationService } from './NotificationService'

// Export types
export * from './types'

// Export default configuration
export { defaultCrisisConfig } from './config'

// Import dependencies
import { CrisisProtocol } from './CrisisProtocol'
import { NotificationService } from './NotificationService'
import { defaultCrisisConfig } from './config'
import { appLogger as logger } from '../../logging'

/**
 * Initialize the crisis protocol system with default configuration
 * @returns Initialized CrisisProtocol instance
 */
export function initializeCrisisProtocol(): CrisisProtocol {
  // Get the singleton instance of CrisisProtocol
  const crisisProtocol = CrisisProtocol.getInstance()
  
  // Initialize the protocol with default configuration
  crisisProtocol.initialize(defaultCrisisConfig)
  
  // Get the singleton instance of NotificationService
  const notificationService = NotificationService.getInstance()
  
  // Initialize notification channels from config
  notificationService.initialize(defaultCrisisConfig.notificationChannels)
  
  logger.info('Crisis protocol system initialized successfully')
  
  return crisisProtocol
}