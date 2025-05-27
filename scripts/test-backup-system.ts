import { BackupService } from '../src/lib/services/backup'
import { getLogger } from '../src/lib/logging'

const logger = getLogger()

async function testBackupSystem() {
  try {
    logger.info('Starting backup system test')

    // Initialize backup service
    const backupService = BackupService.getInstance()
    await backupService.initialize()

    // Create a full backup
    logger.info('Creating full backup')
    const fullBackupId = await backupService.createBackup('full')
    logger.info(`Full backup created: ${fullBackupId}`)

    // Create an incremental backup
    logger.info('Creating incremental backup')
    const incrementalBackupId = await backupService.createBackup('incremental')
    logger.info(`Incremental backup created: ${incrementalBackupId}`)

    // List all backups
    logger.info('Listing backups')
    const backups = await backupService.listBackups()
    logger.info(`Found ${backups.length} backups`)

    // Verify backups
    logger.info('Verifying backups')
    const fullBackupVerified = await backupService.verifyBackup(fullBackupId)
    const incrementalBackupVerified =
      await backupService.verifyBackup(incrementalBackupId)
    logger.info(`Full backup verified: ${fullBackupVerified}`)
    logger.info(`Incremental backup verified: ${incrementalBackupVerified}`)

    // Get backup metrics
    logger.info('Getting backup metrics')
    const metrics = await backupService.getBackupMetrics()
    logger.info('Backup metrics:', metrics)

    // Test restoration
    logger.info('Testing backup restoration')
    await backupService.restoreBackup(fullBackupId)
    logger.info('Backup restoration completed')

    // Clean up old backups
    logger.info('Testing backup cleanup')
    await backupService.cleanupOldBackups()
    logger.info('Backup cleanup completed')

    logger.info('Backup system test completed successfully')
  } catch (error) {
    logger.error('Backup system test failed:', error)
    process.exit(1)
  }
}

testBackupSystem()
