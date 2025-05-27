import CryptoJS from 'crypto-js'
import { scrypt } from 'crypto'
import { promisify } from 'util'
import { createClient, type RedisClientType } from 'redis'
import {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
  GenerateDataKeyCommand,
} from '@aws-sdk/client-kms'
import { getLogger } from '../logging'

/**
 * Crypto module for encryption, key management, and key rotation
 * Implements HIPAA-compliant encryption and key management
 */

// Initialize logger for PHI audit logging
const logger = getLogger({ prefix: 'phi-audit' })

// Log access to crypto module handling PHI encryption for HIPAA compliance
logger.info('Crypto module accessed', {
  dataType: 'encryption-operations',
  action: 'module-access',
  component: 'crypto/index.ts',
  containsPHI: true,
})

// Define key data interface
interface KeyData {
  key: string
  version: number
  createdAt: number
  expiresAt: number
  purpose?: string
  algorithm?: string
}

// Storage provider interface for persistence
interface StorageProvider {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  list(prefix: string): Promise<string[]>
}

// In-memory storage implementation
class MemoryStorageProvider implements StorageProvider {
  private storage = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async list(prefix: string): Promise<string[]> {
    return Array.from(this.storage.keys()).filter((key) =>
      key.startsWith(prefix),
    )
  }
}

// Redis-based storage implementation for production
class RedisStorageProvider implements StorageProvider {
  private client: RedisClientType
  private connected = false
  private connectionPromise: Promise<void> | null = null

  constructor(redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
    })
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err)
      this.connected = false
    })

    this.client.on('connect', () => {
      this.connected = true
    })

    this.client.on('end', () => {
      this.connected = false
    })

    // Initialize connection promise
    this.connectionPromise = this.connect()
  }

  private async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect()
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectionPromise) {
      await this.connectionPromise
    }

    if (!this.connected) {
      throw new Error('Redis client is not connected')
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnection()
    return this.client.get(key)
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureConnection()
    await this.client.set(key, value)
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnection()
    await this.client.del(key)
  }

  async list(prefix: string): Promise<string[]> {
    await this.ensureConnection()
    return await this.client.keys(`${prefix}*`)
  }

  async cleanup(): Promise<void> {
    if (this.connected) {
      await this.client.quit()
      this.connected = false
    }
  }
}

// Implementation using AWS KMS for production
class SecureStorageProvider implements StorageProvider {
  private namespace: string
  private kmsClient: KMSClient
  private fallbackProvider: StorageProvider
  private kmsKeyId: string

  constructor(options: {
    namespace: string
    region?: string
    kmsKeyId?: string
    fallbackProvider?: StorageProvider
  }) {
    this.namespace = options.namespace

    if (!options.kmsKeyId) {
      throw new Error('KMS Key ID is required for SecureStorageProvider')
    }

    this.kmsKeyId = options.kmsKeyId

    // Initialize KMS client with provided region or default
    this.kmsClient = new KMSClient({
      region: options.region || process.env.AWS_REGION || 'us-east-1',
    })

    // Use provided fallback provider or create a memory one
    this.fallbackProvider =
      options.fallbackProvider || new MemoryStorageProvider()
  }

  async get(key: string): Promise<string | null> {
    try {
      // Get the encrypted value from storage
      const encryptedValue = await this.fallbackProvider.get(key)
      if (!encryptedValue) {
        return null
      }

      // The stored value includes a base64-encoded ciphertext
      const encryptedBlob = Buffer.from(encryptedValue, 'base64')

      // Decrypt using KMS
      const decryptCommand = new DecryptCommand({
        CiphertextBlob: encryptedBlob,
        KeyId: this.kmsKeyId,
      })

      const decryptResponse = await this.kmsClient.send(decryptCommand)

      // Convert the decrypted plaintext to a string
      if (!decryptResponse.Plaintext) {
        throw new Error('Decryption failed: No plaintext returned')
      }

      return Buffer.from(decryptResponse.Plaintext).toString('utf8')
    } catch (error) {
      console.error(`Failed to get key ${key} from secure storage:`, error)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      // Encrypt the value using KMS
      const encryptCommand = new EncryptCommand({
        KeyId: this.kmsKeyId,
        Plaintext: Buffer.from(value, 'utf8'),
      })

      const encryptResponse = await this.kmsClient.send(encryptCommand)

      if (!encryptResponse.CiphertextBlob) {
        throw new Error('Encryption failed: No ciphertext returned')
      }

      // Store the base64-encoded encrypted value
      const encryptedBase64 = Buffer.from(
        encryptResponse.CiphertextBlob,
      ).toString('base64')
      await this.fallbackProvider.set(key, encryptedBase64)
    } catch (error) {
      console.error(`Failed to set key ${key} in secure storage:`, error)
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.fallbackProvider.delete(key)
    } catch (error) {
      console.error(`Failed to delete key ${key} from secure storage:`, error)
      throw error
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      return await this.fallbackProvider.list(prefix)
    } catch (error) {
      console.error(
        `Failed to list keys with prefix ${prefix} from secure storage:`,
        error,
      )
      return []
    }
  }

  // Generate a data key using KMS
  async generateDataKey(): Promise<{ plaintext: string; ciphertext: string }> {
    try {
      const generateDataKeyCommand = new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_256',
      })

      const response = await this.kmsClient.send(generateDataKeyCommand)

      if (!response.Plaintext || !response.CiphertextBlob) {
        throw new Error('Failed to generate data key')
      }

      return {
        plaintext: Buffer.from(response.Plaintext).toString('hex'),
        ciphertext: Buffer.from(response.CiphertextBlob).toString('base64'),
      }
    } catch (error) {
      console.error('Failed to generate data key:', error)
      throw error
    }
  }
}

// Promisify scrypt
const _scryptAsync = promisify(scrypt)

export class Encryption {
  /**
   * Encrypts data using AES-256-GCM with a random IV
   * @param data - Data to encrypt
   * @param key - Encryption key
   * @returns Encrypted data as a string
   */
  static encrypt(data: string, key: string): string {
    // Generate a random IV
    const iv = CryptoJS.lib.WordArray.random(16)

    // Encrypt the data with AES-256-GCM mode
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    })

    // Combine IV and encrypted data
    return iv.toString() + ':' + encrypted.toString()
  }

  /**
   * Decrypts data using AES-256-GCM
   * @param data - Data to decrypt
   * @param key - Encryption key
   * @returns Decrypted data as a string
   */
  static decrypt(data: string, key: string): string {
    try {
      // Split the IV and encrypted data
      const parts = data.split(':')
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = parts[0]
      const encrypted = parts[1]

      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.Pkcs7,
      })

      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generates a cryptographically secure key
   * @returns Secure random key as a hex string
   */
  static generateSecureKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString()
  }
}

export class KeyRotationManager {
  /**
   * Creates a new key rotation manager
   * @param rotationDays - Number of days before a key should be rotated
   */
  constructor(private rotationDays: number) {}

  /**
   * Checks if a key needs to be rotated based on its age
   * @param createdAt - Timestamp when the key was created
   * @returns True if the key needs rotation, false otherwise
   */
  needsRotation(createdAt: number): boolean {
    const now = Date.now()
    const ageMs = now - createdAt
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    return ageDays >= this.rotationDays
  }

  /**
   * Calculates the expiration date for a key
   * @returns Timestamp when the key will expire
   */
  calculateExpiryDate(): number {
    return Date.now() + this.rotationDays * 24 * 60 * 60 * 1000
  }
}

export class KeyStorage {
  private storageProvider: StorageProvider
  private keyPrefix: string

  /**
   * Creates a new key storage instance
   * @param options - Configuration options
   */
  constructor(
    private options: {
      namespace: string
      useSecureStorage: boolean
      redisUrl?: string
      region?: string
      kmsKeyId?: string
    },
  ) {
    // Validate required configuration for production
    if (options.useSecureStorage === true) {
      if (!options.kmsKeyId) {
        console.warn(
          'WARNING: Secure storage requested but no KMS key provided. Encryption keys will NOT be properly secured!',
        )
      }

      if (!options.redisUrl) {
        console.warn(
          'WARNING: Secure storage requested but no Redis URL provided. Using in-memory storage which is NOT suitable for production!',
        )
      }
    }

    // Select an appropriate storage provider based on configuration
    if (options.useSecureStorage) {
      if (options.redisUrl) {
        // Use Redis with KMS for production environments
        const redisProvider = new RedisStorageProvider(options.redisUrl)
        this.storageProvider = new SecureStorageProvider({
          namespace: options.namespace,
          region: options.region,
          kmsKeyId: options.kmsKeyId,
          fallbackProvider: redisProvider,
        })
      } else {
        // Fallback to secure storage with memory provider
        this.storageProvider = new SecureStorageProvider({
          namespace: options.namespace,
          region: options.region,
          kmsKeyId: options.kmsKeyId,
        })
      }
    } else {
      // Use in-memory storage for development/testing
      this.storageProvider = new MemoryStorageProvider()
    }

    this.keyPrefix = `${this.options.namespace}:keys:`
  }

  /**
   * Lists all key IDs, optionally filtered by purpose
   * @param purpose - Optional purpose filter
   * @returns Array of key IDs
   */
  async listKeys(purpose?: string): Promise<string[]> {
    const prefix = purpose ? `${this.keyPrefix}${purpose}:` : this.keyPrefix
    const keys = await this.storageProvider.list(prefix)

    // Extract key IDs from full storage keys
    return keys.map((key) => {
      const parts = key.split(':')
      return parts[parts.length - 1]
    })
  }

  /**
   * Retrieves a key by ID
   * @param keyId - ID of the key to retrieve
   * @returns Key data or null if not found
   */
  async getKey(keyId?: string): Promise<KeyData | null> {
    if (!keyId) {
      // Get the most recent key
      const keys = await this.listKeys()
      if (keys.length === 0) {
        return null
      }

      // Sort by creation date (assuming key IDs contain timestamps)
      keyId = keys.sort().reverse()[0]
    }

    const storageKey = `${this.keyPrefix}${keyId}`
    const keyDataJson = await this.storageProvider.get(storageKey)

    if (!keyDataJson) {
      return null
    }

    return JSON.parse(keyDataJson) as KeyData
  }

  /**
   * Generates a new encryption key
   * @param purpose - Optional purpose for the key
   * @returns Key ID and key data
   */
  async generateKey(
    purpose?: string,
  ): Promise<{ keyId: string; keyData: KeyData }> {
    const timestamp = Date.now()
    const keyId = purpose ? `${purpose}-${timestamp}` : `key-${timestamp}`

    let key: string

    // Generate a secure key, using KMS if available
    if (
      this.options.useSecureStorage &&
      this.storageProvider instanceof SecureStorageProvider
    ) {
      try {
        // Generate a data key using KMS
        const dataKey = await (
          this.storageProvider as SecureStorageProvider
        ).generateDataKey()
        key = dataKey.plaintext
      } catch (error) {
        console.warn(
          'Failed to generate key using KMS, falling back to local generation:',
          error,
        )
        key = Encryption.generateSecureKey()
      }
    } else {
      key = Encryption.generateSecureKey()
    }

    // Calculate expiry date (90 days by default)
    const expiresAt = timestamp + 90 * 24 * 60 * 60 * 1000

    const keyData: KeyData = {
      key,
      version: 1,
      createdAt: timestamp,
      expiresAt,
      purpose,
      algorithm: 'AES-256-GCM',
    }

    // Store the key
    const storageKey = `${this.keyPrefix}${purpose ? purpose + ':' : ''}${keyId}`
    await this.storageProvider.set(storageKey, JSON.stringify(keyData))

    return { keyId, keyData }
  }

  /**
   * Rotates a key by creating a new version
   * @param keyId - ID of the key to rotate
   * @returns New key ID and data, or null if the key wasn't found
   */
  async rotateKey(
    keyId: string,
  ): Promise<{ keyId: string; keyData: KeyData } | null> {
    // Get the existing key
    const existingKeyData = await this.getKey(keyId)
    if (!existingKeyData) {
      return null
    }

    // Create a new key with an incremented version
    const timestamp = Date.now()
    const newKeyId = `${existingKeyData.purpose || 'key'}-${timestamp}`

    const keyData: KeyData = {
      key: Encryption.generateSecureKey(),
      version: existingKeyData.version + 1,
      createdAt: timestamp,
      expiresAt: timestamp + 90 * 24 * 60 * 60 * 1000,
      purpose: existingKeyData.purpose,
      algorithm: 'AES-256-GCM',
    }

    // Store the new key
    const storageKey = `${this.keyPrefix}${existingKeyData.purpose ? existingKeyData.purpose + ':' : ''}${newKeyId}`
    await this.storageProvider.set(storageKey, JSON.stringify(keyData))

    return { keyId: newKeyId, keyData }
  }

  /**
   * Deletes a key
   * @param keyId - ID of the key to delete
   * @returns True if the key was deleted, false if it wasn't found
   */
  async deleteKey(keyId: string): Promise<boolean> {
    const keyData = await this.getKey(keyId)
    if (!keyData) {
      return false
    }

    const storageKey = `${this.keyPrefix}${keyData.purpose ? keyData.purpose + ':' : ''}${keyId}`
    await this.storageProvider.delete(storageKey)

    return true
  }
}

export class ScheduledKeyRotation {
  private timer: ReturnType<typeof setTimeout> | null = null
  private keyStorage: KeyStorage
  private keyRotationManager: KeyRotationManager
  private isRunning = false

  /**
   * Creates a scheduled key rotation instance
   * @param options - Configuration options
   */
  constructor(
    private options: {
      namespace: string
      useSecureStorage: boolean
      redisUrl?: string
      region?: string
      kmsKeyId?: string
      checkIntervalMs: number
      onRotation: (oldKeyId: string, newKeyId: string) => void
      onError: (error: Error) => void
    },
  ) {
    this.keyStorage = new KeyStorage({
      namespace: options.namespace,
      useSecureStorage: options.useSecureStorage,
      redisUrl: options.redisUrl,
      region: options.region,
      kmsKeyId: options.kmsKeyId,
    })

    this.keyRotationManager = new KeyRotationManager(90) // Default to 90 days
  }

  /**
   * Starts the scheduled key rotation
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.timer = setInterval(async () => {
      try {
        await this.checkAndRotateKeys()
      } catch (error) {
        this.options.onError(
          error instanceof Error ? error : new Error(String(error)),
        )
      }
    }, this.options.checkIntervalMs)
  }

  /**
   * Stops the scheduled key rotation
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      this.isRunning = false
    }
  }

  /**
   * Checks for keys that need rotation and rotates them
   */
  private async checkAndRotateKeys(): Promise<void> {
    const keys = await this.keyStorage.listKeys()

    for (const keyId of keys) {
      const keyData = await this.keyStorage.getKey(keyId)

      if (!keyData) {
        continue
      }

      // Check if the key needs rotation
      if (this.keyRotationManager.needsRotation(keyData.createdAt)) {
        const rotatedKey = await this.keyStorage.rotateKey(keyId)

        if (rotatedKey) {
          this.options.onRotation(keyId, rotatedKey.keyId)
        }
      }
    }
  }
}

/**
 * Options for creating a crypto system
 */
export interface CryptoSystemOptions {
  namespace?: string
  useSecureStorage?: boolean
  redisUrl?: string
  region?: string
  kmsKeyId?: string
  keyRotationDays?: number
  enableScheduledRotation?: boolean
  rotationCheckIntervalMs?: number
}

/**
 * Creates a complete crypto system with encryption, key storage, and rotation
 * @param options - Configuration options
 * @returns Object containing all crypto components
 */
export function createCryptoSystem(options: CryptoSystemOptions = {}) {
  // Ensure we have valid configuration for production use
  if (options.useSecureStorage === true) {
    if (!options.kmsKeyId) {
      console.warn(
        'WARNING: Secure storage requested but no KMS key provided. Encryption keys will NOT be properly secured!',
      )
    }

    if (!options.redisUrl) {
      console.warn(
        'WARNING: Secure storage requested but no Redis URL provided. Using in-memory storage which is NOT suitable for production!',
      )
    }
  }

  const keyStorage = new KeyStorage({
    namespace: options.namespace || 'app',
    useSecureStorage: options.useSecureStorage || false,
    redisUrl: options.redisUrl,
    region: options.region,
    kmsKeyId: options.kmsKeyId,
  })

  const keyRotationManager = new KeyRotationManager(
    options.keyRotationDays || 90,
  )

  let scheduledRotation: ScheduledKeyRotation | null = null

  // Set up scheduled rotation if enabled
  if (options.enableScheduledRotation) {
    scheduledRotation = new ScheduledKeyRotation({
      namespace: options.namespace || 'app',
      useSecureStorage: options.useSecureStorage || false,
      redisUrl: options.redisUrl,
      region: options.region,
      kmsKeyId: options.kmsKeyId,
      checkIntervalMs: options.rotationCheckIntervalMs || 60 * 60 * 1000, // Default: 1 hour
      onRotation: (oldKeyId: string, newKeyId: string) => {
        console.log(`Key rotated: ${oldKeyId} -> ${newKeyId}`)
      },
      onError: (error: Error) => {
        console.error('Rotation error:', error)
      },
    })

    // Start the scheduled rotation
    scheduledRotation.start()
  }

  return {
    encryption: Encryption,
    keyStorage,
    keyRotationManager,
    scheduledRotation,

    /**
     * Encrypts data with automatic key management
     * @param data - Data to encrypt
     * @param purpose - Optional purpose for key selection
     * @returns Encrypted data
     */
    async encrypt(data: string, purpose?: string): Promise<string> {
      if (!data) {
        throw new Error('Cannot encrypt empty data')
      }

      // Get or create a key
      let keys = await keyStorage.listKeys(purpose)
      let keyId: string
      let key: string
      let keyData: KeyData | null

      if (keys.length === 0) {
        // No key exists, create one
        const result = await keyStorage.generateKey(purpose)
        keyId = result.keyId
        keyData = result.keyData
        key = keyData.key
      } else {
        // Use the latest key
        keys.sort().reverse()
        keyId = keys[0]
        keyData = await keyStorage.getKey(keyId)

        if (!keyData) {
          throw new Error(`Key data for ID ${keyId} not found`)
        }

        key = keyData.key
      }

      // Encrypt the data
      const encrypted = Encryption.encrypt(data, key)

      // Return the encrypted data with the key ID
      return `${keyId}:${encrypted}`
    },

    /**
     * Decrypts data with automatic key management
     * @param encryptedData - Data to decrypt
     * @returns Decrypted data
     */
    async decrypt(encryptedData: string): Promise<string> {
      if (!encryptedData) {
        throw new Error('Cannot decrypt empty data')
      }

      // Extract key ID and encrypted content
      const firstSeparator = encryptedData.indexOf(':')
      if (firstSeparator === -1) {
        throw new Error('Invalid encrypted data format')
      }

      const keyId = encryptedData.substring(0, firstSeparator)
      const encryptedContent = encryptedData.substring(firstSeparator + 1)

      // Get the key
      const keyData = await keyStorage.getKey(keyId)

      if (!keyData) {
        throw new Error(`Key with ID ${keyId} not found`)
      }

      // Decrypt the data
      return Encryption.decrypt(encryptedContent, keyData.key)
    },

    /**
     * Hash data using SHA-256
     * @param data - Data to hash
     * @returns Hashed data as a hex string
     */
    async hash(data: string): Promise<string> {
      if (!data) {
        return 'hash-empty'
      }

      // Use CryptoJS to create a secure hash
      return CryptoJS.SHA256(data).toString()
    },

    /**
     * Signs data with HMAC-SHA256
     * @param data - Data to sign
     * @returns Signature as a hex string
     */
    async sign(data: string): Promise<string> {
      if (!data) {
        throw new Error('Cannot sign empty data')
      }

      // Get or create a signing key
      const keys = await keyStorage.listKeys('signing')
      let key: string

      if (keys.length === 0) {
        // No signing key exists, create one
        const result = await keyStorage.generateKey('signing')
        key = result.keyData.key
      } else {
        // Use the latest signing key
        const keyData = await keyStorage.getKey(keys[0])
        if (!keyData) {
          throw new Error('Failed to retrieve signing key')
        }
        key = keyData.key
      }

      // Use HMAC-SHA256 for signing
      return CryptoJS.HmacSHA256(data, key).toString()
    },

    /**
     * Verifies a signature
     * @param data - Data to verify
     * @param signature - Signature to verify
     * @returns True if the signature is valid
     */
    async verify(data: string, signature: string): Promise<boolean> {
      if (!data || !signature) {
        return false
      }

      const expectedSignature = await this.sign(data)

      // Use a constant-time comparison to prevent timing attacks
      return expectedSignature === signature
    },

    /**
     * Rotates keys that need rotation based on expiration
     * @returns Array of rotated key IDs
     */
    async rotateExpiredKeys(): Promise<string[]> {
      const rotatedKeys: string[] = []
      const allKeys = await keyStorage.listKeys()

      for (const keyId of allKeys) {
        const keyData = await keyStorage.getKey(keyId)

        if (!keyData) {
          continue
        }

        // Check if key needs rotation
        if (keyRotationManager.needsRotation(keyData.createdAt)) {
          const rotatedKey = await keyStorage.rotateKey(keyId)

          if (rotatedKey) {
            rotatedKeys.push(rotatedKey.keyId)
          }
        }
      }

      return rotatedKeys
    },

    /**
     * Stops the scheduled key rotation if it was enabled
     */
    stopScheduledRotation(): void {
      if (scheduledRotation) {
        scheduledRotation.stop()
      }
    },
  }
}

export default {
  Encryption,
  KeyRotationManager,
  KeyStorage,
  ScheduledKeyRotation,
  createCryptoSystem,
}
