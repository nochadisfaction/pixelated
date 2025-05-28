/**
 * FHE Key Rotation Service
 *
 * Manages the secure rotation of encryption keys for the FHE system using Microsoft SEAL.
 * This ensures compliance with security best practices and HIPAA requirements.
 */

import type { KeyManagementOptions, TFHEKeyPair } from './types'
import { getLogger } from '../logging'
import { SealService } from './seal-service'
import { EncryptionMode } from './types'
import type { KMS } from 'aws-sdk'
import AWS from 'aws-sdk';

// Get logger
const logger = getLogger({ prefix: 'fhe-key-rotation' })

/**
 * Default key management options
 */
const DEFAULT_OPTIONS: KeyManagementOptions = {
  rotationPeriodDays: 30,
  persistKeys: true,
  storagePrefix: 'fhe_key_',
}

/**
 * FHE Key Rotation Service
 */
export class KeyRotationService {
  private static instance: KeyRotationService
  private options: KeyManagementOptions
  private activeKeyId: string | null = null
  private keyRotationTimers = new Map<string, NodeJS.Timeout>()
  private isClient = false
  private isServer = false
  private sealService: SealService | null = null
  private sealInitialized = false
  private kmsClient: KMS | null = null
  private secretsManager: AWS.SecretsManager | null = null
  private keyCache = new Map<string, TFHEKeyPair>()

  /**
   * Private constructor for singleton pattern
   */
  private constructor(options?: Partial<KeyManagementOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // Detect environment
    this.isClient = typeof window !== 'undefined'
    this.isServer = typeof window === 'undefined'

    // Initialize AWS clients if in server environment
    if (this.isServer) {
      try {
        
        this.kmsClient = new AWS.KMS({ apiVersion: '2014-11-01' })
        this.secretsManager = new AWS.SecretsManager({
          apiVersion: '2017-10-17',
        })
        logger.info('AWS KMS and Secrets Manager clients initialized')
      } catch (error) {
        logger.warn(
          'Failed to initialize AWS clients, will operate in limited mode',
          { error },
        )
      }
    }

    logger.info(
      `Key Rotation Service initialized in ${this.isServer ? 'server' : 'client'} environment`,
    )
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    options?: Partial<KeyManagementOptions>,
  ): KeyRotationService {
    if (!KeyRotationService.instance) {
      KeyRotationService.instance = new KeyRotationService(options)
    }
    return KeyRotationService.instance
  }

  /**
   * Initialize the key rotation service
   */
  public async initialize(options?: {
    rotationPeriodMs?: number
    storagePrefix?: string
    onRotation?: (keyId: string) => void
  }): Promise<void> {
    try {
      // Update options if provided
      if (options) {
        if (options.rotationPeriodMs) {
          this.options.rotationPeriodDays =
            options.rotationPeriodMs / (24 * 60 * 60 * 1000)
        }
        if (options.storagePrefix) {
          this.options.storagePrefix = options.storagePrefix
        }
      }

      // Initialize SEAL service if needed
      try {
        this.sealService = SealService.getInstance()

        // Initialize SEAL if not already initialized
        if (!this.sealInitialized) {
          await this.sealService.initialize(EncryptionMode.FHE)
          this.sealInitialized = true
        }
      } catch (err) {
        logger.warn(
          'SEAL service initialization failed, will rely on standard key management',
          { error: err },
        )
      }

      // Load existing keys
      await this.loadKeys()

      // Check if we need to generate a new key
      if (!this.activeKeyId) {
        await this.rotateKeys()
      }

      logger.info('Key rotation service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize key rotation service', { error })
      throw new Error(
        `Key rotation initialization error: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Register a key for rotation
   */
  public registerKey(keyId: string, expiryTime: number): void {
    if (this.keyRotationTimers.has(keyId)) {
      return // Already registered
    }

    const now = Date.now()
    const timeToExpiry = Math.max(0, expiryTime - now)

    // Schedule key rotation
    if (this.isServer) {
      // For server environments, use normal timeouts
      const timer = setTimeout(() => {
        this.rotateKeys().catch((err) => {
          logger.error(`Failed to rotate key ${keyId}`, { error: err })
        })
      }, timeToExpiry)

      this.keyRotationTimers.set(keyId, timer)
      logger.info(
        `Scheduled key ${keyId} for rotation in ${Math.round(timeToExpiry / (1000 * 60 * 60 * 24))} days`,
      )
    } else if (this.isClient) {
      // For client environments, check periodically
      this.scheduleClientRotationCheck(keyId, expiryTime)
    }
  }

  /**
   * Schedule a periodic check for key rotation in the client
   */
  private scheduleClientRotationCheck(keyId: string, expiryTime: number): void {
    // In the client, we check daily if the key needs rotation
    const checkInterval = 24 * 60 * 60 * 1000 // 24 hours

    const timer = setInterval(() => {
      const now = Date.now()
      if (now >= expiryTime) {
        this.rotateKeys().catch((err) => {
          logger.error(`Failed to rotate key ${keyId}`, { error: err })
        })

        // Clear the interval after rotation
        clearInterval(timer)
        this.keyRotationTimers.delete(keyId)
      }
    }, checkInterval)

    this.keyRotationTimers.set(keyId, timer)
  }

  /**
   * Generate a new key pair and set it as active
   */
  public async rotateKeys(): Promise<string> {
    try {
      logger.info('Rotating encryption keys')

      // Generate a new key ID
      const keyId = this.generateKeyId()

      // Calculate expiry time
      const now = Date.now()
      const rotationMs = this.options.rotationPeriodDays! * 24 * 60 * 60 * 1000
      const expiryTime = now + rotationMs

      // If SEAL service is available, use it to generate keys
      if (this.sealService && this.sealInitialized) {
        // Generate new SEAL keys
        logger.info('Generating new SEAL encryption keys')
        await this.sealService.generateKeys()

        // Serialize and store the keys
        const serializedKeys = await this.sealService.serializeKeys()

        // Create a key pair record
        const keyPair: TFHEKeyPair = {
          id: keyId,
          publicKey: serializedKeys.publicKey || '',
          privateKeyEncrypted: serializedKeys.secretKey || '',
          created: now,
          expires: expiryTime,
          version: '1.0',
        }

        // Store the key
        await this.storeKey(keyPair)
      } else {
        logger.warn('SEAL service not available, generating fallback keys')

        // Create fallback key pair if SEAL is not available
        const keyPair: TFHEKeyPair = {
          id: keyId,
          publicKey: `pk_${keyId}`,
          privateKeyEncrypted: `encrypted_sk_${keyId}`,
          created: now,
          expires: expiryTime,
          version: '1.0',
        }

        // Store the key
        await this.storeKey(keyPair)
      }

      // Set as active key
      this.activeKeyId = keyId

      // Schedule rotation
      this.registerKey(keyId, expiryTime)

      logger.info(`Key rotation completed successfully. New key ID: ${keyId}`)
      return keyId
    } catch (error) {
      logger.error('Failed to rotate keys', { error })
      throw new Error(`Key rotation error: ${(error as Error).message}`)
    }
  }

  /**
   * Store a key pair securely
   */
  private async storeKey(keyPair: TFHEKeyPair): Promise<void> {
    if (!this.options.persistKeys) {
      return
    }

    try {
      const storageKey = `${this.options.storagePrefix}${keyPair.id}`

      if (this.isClient) {
        // For client environments, use localStorage
        localStorage.setItem(storageKey, JSON.stringify(keyPair))
      } else if (this.isServer) {
        // Server-side storage using AWS Secrets Manager for production
        if (process.env.NODE_ENV === 'production' && this.secretsManager) {
          logger.info(`Storing key ${keyPair.id} in AWS Secrets Manager`)

          // Create a secret in AWS Secrets Manager
          const secretParams = {
            Name: storageKey,
            SecretString: JSON.stringify(keyPair),
            Description: `FHE encryption key pair created at ${new Date(keyPair.created).toISOString()}`,
            Tags: [
              { Key: 'Application', Value: 'FHE' },
              { Key: 'KeyId', Value: keyPair.id },
              { Key: 'KeyType', Value: 'SEAL' },
              { Key: 'Expiry', Value: new Date(keyPair.expires).toISOString() },
            ],
          }

          await this.secretsManager.createSecret(secretParams).promise()

          // If KMS is available, configure automatic key rotation for the secret
          if (this.kmsClient) {
            logger.info(`Configuring automatic rotation for key ${keyPair.id}`)

            // Configure automatic rotation for the secret
            const rotationParams = {
              SecretId: storageKey,
              RotationLambdaARN: process.env.KEY_ROTATION_LAMBDA_ARN,
              RotationRules: {
                AutomaticallyAfterDays: this.options.rotationPeriodDays,
              },
            }

            await this.secretsManager.rotateSecret(rotationParams).promise()
          }
        } else {
          // For development or test environments, store in memory cache
          logger.info(
            `Storing key ${keyPair.id} in memory cache (development/test environment)`,
          )
          this.keyCache.set(keyPair.id, keyPair)
        }
      }
    } catch (error) {
      logger.error(`Failed to store key ${keyPair.id}`, { error })
      throw new Error(`Key storage error: ${(error as Error).message}`)
    }
  }

  /**
   * Load stored keys and set the active key
   */
  private async loadKeys(): Promise<void> {
    if (!this.options.persistKeys) {
      logger.info('Key persistence disabled, skipping key loading')
      return
    }

    try {
      if (this.isClient) {
        // For client environments, load from localStorage
        this.loadKeysFromLocalStorage()
      } else if (this.isServer) {
        // For server environments, load from secure storage
        await this.loadKeysFromSecureStorage()
      }

      logger.info(
        `Loaded keys successfully. Active key: ${this.activeKeyId || 'none'}`,
      )
    } catch (error) {
      logger.error('Failed to load keys', { error })
      // Non-blocking error, we'll generate new keys if needed
    }
  }

  /**
   * Load keys from localStorage (client-side)
   */
  private loadKeysFromLocalStorage(): void {
    try {
      // Find all key-related items in localStorage
      const keyPrefix = this.options.storagePrefix || ''
      const allKeys: TFHEKeyPair[] = []

      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        logger.warn('localStorage not available in this environment')
        return
      }

      // Iterate through localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(keyPrefix)) {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              const keyPair = JSON.parse(value) as TFHEKeyPair
              allKeys.push(keyPair)
            }
          } catch (e) {
            logger.warn(`Failed to parse key from localStorage: ${key}`, {
              error: e,
            })
          }
        }
      }

      // Sort by creation time and find the newest valid key
      const now = Date.now()
      const validKeys = allKeys
        .filter((key) => key.expires > now)
        .sort((a, b) => b.created - a.created)

      if (validKeys.length > 0) {
        const newestKey = validKeys[0]
        this.activeKeyId = newestKey.id

        // If SEAL service is available, load the keys
        if (this.sealService && this.sealInitialized) {
          this.sealService
            .loadKeys({
              publicKey: newestKey.publicKey,
              secretKey: newestKey.privateKeyEncrypted,
            })
            .catch((err) => {
              logger.error('Failed to load SEAL keys', { error: err })
            })
        }

        // Schedule rotation for the active key
        this.registerKey(newestKey.id, newestKey.expires)
      }

      // Clean up expired keys
      for (const key of allKeys) {
        if (key.expires <= now) {
          const storageKey = `${keyPrefix}${key.id}`
          localStorage.removeItem(storageKey)
          logger.info(`Removed expired key: ${key.id}`)
        }
      }
    } catch (error) {
      logger.error('Error loading keys from localStorage', { error })
    }
  }

  /**
   * Load keys from secure storage (server-side)
   */
  private async loadKeysFromSecureStorage(): Promise<void> {
    try {
      const keyPrefix = this.options.storagePrefix || ''

      // In a production environment, load from AWS Secrets Manager
      if (process.env.NODE_ENV === 'production' && this.secretsManager) {
        logger.info('Loading keys from AWS Secrets Manager')

        // List all secrets with our prefix
        let nextToken: string | undefined
        let allSecrets: AWS.SecretsManager.SecretListEntry[] = []

        do {
          const response = await this.secretsManager
            .listSecrets({
              Filters: [
                {
                  Key: 'name',
                  Values: [keyPrefix],
                },
              ],
              NextToken: nextToken,
            })
            .promise()

          if (response.SecretList) {
            allSecrets = allSecrets.concat(response.SecretList)
          }

          nextToken = response.NextToken
        } while (nextToken)

        // Process each secret to extract key pairs
        const allKeys: TFHEKeyPair[] = []
        for (const secret of allSecrets) {
          try {
            if (secret.Name && secret.Name.startsWith(keyPrefix)) {
              // Get the secret value
              const secretValue = await this.secretsManager
                .getSecretValue({
                  SecretId: secret.Name,
                })
                .promise()

              if (secretValue.SecretString) {
                const keyPair = JSON.parse(
                  secretValue.SecretString,
                ) as TFHEKeyPair
                allKeys.push(keyPair)
              }
            }
          } catch (e) {
            logger.warn(`Failed to get secret value: ${secret.Name}`, {
              error: e,
            })
          }
        }

        // Find the newest valid key
        const now = Date.now()
        const validKeys = allKeys
          .filter((key) => key.expires > now)
          .sort((a, b) => b.created - a.created)

        if (validKeys.length > 0) {
          const newestKey = validKeys[0]
          this.activeKeyId = newestKey.id

          // If SEAL service is available, load the keys
          if (this.sealService && this.sealInitialized) {
            await this.sealService.loadKeys({
              publicKey: newestKey.publicKey,
              secretKey: newestKey.privateKeyEncrypted,
            })
          }

          // Schedule rotation for the active key
          this.registerKey(newestKey.id, newestKey.expires)

          logger.info(
            `Loaded active key ${newestKey.id} from AWS Secrets Manager`,
          )
        } else {
          logger.info(
            'No valid keys found in AWS Secrets Manager, will create a new one',
          )
        }
      } else {
        // For development/test environments, use memory cache
        logger.info(
          'Loading keys from memory cache (development/test environment)',
        )

        const allKeys = Array.from(this.keyCache.values())

        // Find the newest valid key
        const now = Date.now()
        const validKeys = allKeys
          .filter((key) => key.expires > now)
          .sort((a, b) => b.created - a.created)

        if (validKeys.length > 0) {
          const newestKey = validKeys[0]
          this.activeKeyId = newestKey.id

          // If SEAL service is available, load the keys
          if (this.sealService && this.sealInitialized) {
            await this.sealService.loadKeys({
              publicKey: newestKey.publicKey,
              secretKey: newestKey.privateKeyEncrypted,
            })
          }

          // Schedule rotation for the active key
          this.registerKey(newestKey.id, newestKey.expires)
        }
      }
    } catch (error) {
      logger.error('Failed to load keys from secure storage', { error })
      throw new Error(`Key loading error: ${(error as Error).message}`)
    }
  }

  /**
   * Get the active key ID
   */
  public getActiveKeyId(): string | null {
    return this.activeKeyId
  }

  /**
   * Generate a random key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `key_${timestamp}_${random}`
  }

  /**
   * Clean up timers when disposing
   */
  public dispose(): void {
    // Clear all timers
    for (const [keyId, timer] of this.keyRotationTimers.entries()) {
      clearTimeout(timer)
      clearInterval(timer)
      this.keyRotationTimers.delete(keyId)
    }

    logger.info('Key rotation service disposed')
  }
}

// Export singleton instance
const keyRotationService = KeyRotationService.getInstance()

export default keyRotationService
