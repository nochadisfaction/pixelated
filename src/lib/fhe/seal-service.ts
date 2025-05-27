/**
 * Microsoft SEAL Service
 *
 * Main service for FHE operations using Microsoft SEAL
 */

import { getLogger } from '../logging'
import { EncryptionMode } from './types'
import { FHEOperation } from './types'
import {
  getSchemeForMode,
  SealSchemeType,
  SealContextOptions,
} from './seal-types'
import type { SealSerializationOptions, SerializedSealKeys } from './seal-types'
import { SealContext } from './seal-context'
import { SealMemoryManager } from './seal-memory'
import { fheParameterOptimizer } from './parameter-optimizer'

// Initialize logger
const logger = getLogger({ prefix: 'seal-service' })

/**
 * Generic type for SEAL native objects
 */
type SealObject = any

/**
 * Extended serialized SEAL keys with additional metadata
 */
export interface ExtendedSerializedSealKeys extends SerializedSealKeys {
  parameters: any
  schemeType: SealSchemeType
}

/**
 * Main service for SEAL operations
 */
export class SealService {
  private static instance: SealService
  private sealContext: SealContext | null = null
  private memoryManager = new SealMemoryManager()

  // SEAL components
  private keyGenerator: SealObject = null
  private secretKey: SealObject = null
  private publicKey: SealObject = null
  private relinKeys: SealObject = null
  private galoisKeys: SealObject = null
  private encryptor: SealObject = null
  private decryptor: SealObject = null
  private evaluator: SealObject = null
  private batchEncoder: SealObject = null
  private ckksEncoder: SealObject = null

  private schemeType: SealSchemeType = SealSchemeType.BFV
  private initialized = false
  private keyGenerated = false

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of SealService
   */
  public static getInstance(): SealService {
    if (!SealService.instance) {
      SealService.instance = new SealService()
    }
    return SealService.instance
  }

  /**
   * Initialize the SEAL service with the given mode or options
   *
   * @param modeOrOptions Encryption mode or SEAL context options
   */
  public async initialize(
    modeOrOptions: EncryptionMode | SealContextOptions = EncryptionMode.FHE,
  ): Promise<void> {
    if (this.initialized) {
      logger.warn('SEAL service already initialized')
      return
    }

    try {
      let options: SealContextOptions

      // Determine if we're using a mode or options
      if (typeof modeOrOptions === 'string') {
        const mode = modeOrOptions as EncryptionMode
        const schemeType = getSchemeForMode(mode)

        if (!schemeType) {
          logger.info(
            `Mode ${mode} does not use FHE, skipping SEAL initialization`,
          )
          return
        }

        this.schemeType = schemeType

        // Use the parameter optimizer to select optimal parameters based on scheme
        // For general initialization, we use a balanced approach
        const operations: FHEOperation[] = [
          FHEOperation.Addition,
          FHEOperation.Multiplication,
          FHEOperation.Polynomial,
        ]

        const optimizationResult =
          fheParameterOptimizer.getOptimizedParametersForOperations(
            operations,
            schemeType,
          )

        logger.info('Using optimized FHE parameters', {
          scheme: schemeType,
          estimatedSecurity: optimizationResult.estimatedSecurity,
          estimatedPerformance: optimizationResult.estimatedPerformance,
        })

        options = {
          scheme: schemeType,
          params: optimizationResult.params,
        }
      } else {
        options = modeOrOptions as SealContextOptions
        this.schemeType = options.scheme
      }

      logger.info(`Initializing SEAL service with ${this.schemeType} scheme`)

      // Initialize SEAL context
      this.sealContext = new SealContext(options)
      await this.sealContext.initialize()

      // Set up evaluator
      const seal = this.sealContext.getSeal()
      const context = this.sealContext.getContext()

      this.evaluator = this.memoryManager.track(
        seal.Evaluator(context),
        'evaluator',
      )

      // Set up encoder based on scheme type
      if (this.schemeType === SealSchemeType.CKKS) {
        this.ckksEncoder = this.memoryManager.track(
          seal.CKKSEncoder(context),
          'ckksEncoder',
        )
      } else {
        // For BFV/BGV
        this.batchEncoder = this.memoryManager.track(
          seal.BatchEncoder(context),
          'batchEncoder',
        )
      }

      this.initialized = true
      logger.info('SEAL service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize SEAL service', { error })
      throw new Error(
        `SEAL service initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generate encryption keys
   */
  public async generateKeys(): Promise<void> {
    this.checkInitialized()

    try {
      const seal = this.getSeal()
      const context = this.getContext()

      logger.info('Generating SEAL keys')

      // Release old keys if they exist
      this.releaseKeys()

      // Create key generator
      this.keyGenerator = this.memoryManager.track(
        seal.KeyGenerator(context),
        'keyGenerator',
      )

      // Generate keys
      this.secretKey = this.memoryManager.track(
        this.keyGenerator.secretKey(),
        'secretKey',
      )

      this.publicKey = this.memoryManager.track(
        this.keyGenerator.createPublicKey(),
        'publicKey',
      )

      // Create encryptor and decryptor
      this.encryptor = this.memoryManager.track(
        seal.Encryptor(context, this.publicKey),
        'encryptor',
      )

      this.decryptor = this.memoryManager.track(
        seal.Decryptor(context, this.secretKey),
        'decryptor',
      )

      // Generate relinearization keys (needed for multiplication)
      this.relinKeys = this.memoryManager.track(
        this.keyGenerator.createRelinKeys(),
        'relinKeys',
      )

      // Generate Galois keys (needed for rotation)
      this.galoisKeys = this.memoryManager.track(
        this.keyGenerator.createGaloisKeys(),
        'galoisKeys',
      )

      this.keyGenerated = true
      logger.info('SEAL keys generated successfully')
    } catch (error) {
      logger.error('Failed to generate SEAL keys', { error })
      throw new Error(
        `Key generation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Check if keys have been generated
   */
  public hasKeys(): boolean {
    return this.keyGenerated && !!this.secretKey && !!this.publicKey
  }

  /**
   * Release current keys
   */
  private releaseKeys(): void {
    // Release old keys if they exist
    if (this.keyGenerator) {
      this.memoryManager.release(this.keyGenerator, 'keyGenerator')
      this.keyGenerator = null
    }

    if (this.secretKey) {
      this.memoryManager.release(this.secretKey, 'secretKey')
      this.secretKey = null
    }

    if (this.publicKey) {
      this.memoryManager.release(this.publicKey, 'publicKey')
      this.publicKey = null
    }

    if (this.relinKeys) {
      this.memoryManager.release(this.relinKeys, 'relinKeys')
      this.relinKeys = null
    }

    if (this.galoisKeys) {
      this.memoryManager.release(this.galoisKeys, 'galoisKeys')
      this.galoisKeys = null
    }

    if (this.encryptor) {
      this.memoryManager.release(this.encryptor, 'encryptor')
      this.encryptor = null
    }

    if (this.decryptor) {
      this.memoryManager.release(this.decryptor, 'decryptor')
      this.decryptor = null
    }

    this.keyGenerated = false
  }

  /**
   * Get the SEAL instance
   */
  public getSeal(): SealObject {
    this.checkInitialized()
    return this.sealContext!.getSeal()
  }

  /**
   * Get the SEAL context
   */
  public getContext(): SealObject {
    this.checkInitialized()
    return this.sealContext!.getContext()
  }

  /**
   * Get the scheme type
   */
  public getSchemeType(): SealSchemeType {
    return this.schemeType
  }

  /**
   * Get the SEAL evaluator
   */
  public getEvaluator(): SealObject {
    this.checkInitialized()
    return this.evaluator
  }

  /**
   * Get the relinearization keys
   */
  public getRelinKeys(): SealObject {
    this.checkKeysGenerated()
    return this.relinKeys
  }

  /**
   * Get the Galois keys
   */
  public getGaloisKeys(): SealObject {
    this.checkKeysGenerated()
    return this.galoisKeys
  }

  /**
   * Get the batch encoder (for BFV/BGV)
   */
  public getBatchEncoder(): SealObject {
    this.checkInitialized()
    if (this.schemeType === SealSchemeType.CKKS) {
      throw new Error('Batch encoder is only available for BFV/BGV schemes')
    }
    return this.batchEncoder
  }

  /**
   * Get the CKKS encoder
   */
  public getCKKSEncoder(): SealObject {
    this.checkInitialized()
    if (this.schemeType !== SealSchemeType.CKKS) {
      throw new Error('CKKS encoder is only available for CKKS scheme')
    }
    return this.ckksEncoder
  }

  /**
   * Get the encryptor
   */
  public getEncryptor(): SealObject {
    this.checkKeysGenerated()
    return this.encryptor
  }

  /**
   * Get the decryptor
   */
  public getDecryptor(): SealObject {
    this.checkKeysGenerated()
    return this.decryptor
  }

  /**
   * Encrypt data
   *
   * @param data Data to encrypt (array of numbers)
   * @param scale Scale for CKKS encryption (default: 2^40)
   * @returns Encrypted ciphertext
   */
  public async encrypt(
    data: number[],
    scale?: number | bigint,
  ): Promise<SealObject> {
    this.checkKeysGenerated()

    try {
      const seal = this.getSeal()

      if (this.schemeType === SealSchemeType.CKKS) {
        // CKKS encryption (for real numbers)
        const effectiveScale = scale || BigInt(1) << BigInt(40) // Default: 2^40

        const plaintext = seal.PlainText()
        this.ckksEncoder.encode(data, effectiveScale, plaintext)

        const ciphertext = seal.CipherText()
        this.encryptor.encrypt(plaintext, ciphertext)

        // Create a new ciphertext to return
        const result = seal.CipherText()
        result.copy(ciphertext)

        return result
      } else {
        // BFV/BGV encryption (for integers)
        const plaintext = seal.PlainText()
        this.batchEncoder.encode(data, plaintext)

        const ciphertext = seal.CipherText()
        this.encryptor.encrypt(plaintext, ciphertext)

        // Create a new ciphertext to return
        const result = seal.CipherText()
        result.copy(ciphertext)

        return result
      }
    } catch (error) {
      logger.error('Encryption failed', { error })
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Decrypt data
   *
   * @param ciphertext Encrypted ciphertext
   * @returns Decrypted data
   */
  public async decrypt(ciphertext: SealObject): Promise<number[]> {
    this.checkKeysGenerated()

    try {
      const seal = this.getSeal()

      const plaintext = seal.PlainText()
      this.decryptor.decrypt(ciphertext, plaintext)

      if (this.schemeType === SealSchemeType.CKKS) {
        // CKKS decryption (for real numbers)
        return this.ckksEncoder.decode(plaintext)
      } else {
        // BFV/BGV decryption (for integers)
        return this.batchEncoder.decode(plaintext)
      }
    } catch (error) {
      logger.error('Decryption failed', { error })
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Serialize the current keys
   *
   * @param options Serialization options
   * @returns Serialized keys
   */
  public async serializeKeys(
    options?: SealSerializationOptions,
  ): Promise<ExtendedSerializedSealKeys> {
    this.checkKeysGenerated()

    const compressionMode =
      this.getSeal().ComprModeType[options?.compression ? 'zstd' : 'none']

    return {
      publicKey: this.publicKey.save(compressionMode),
      secretKey: this.secretKey.save(compressionMode),
      relinKeys: this.relinKeys.save(compressionMode),
      galoisKeys: this.galoisKeys.save(compressionMode),
      schemeType: this.schemeType,
      parameters: this.sealContext!.getEncryptionParameters(),
    }
  }

  /**
   * Deserialize and load keys
   *
   * @param serializedKeys Serialized keys
   */
  public async loadKeys(serializedKeys: SerializedSealKeys): Promise<void> {
    this.checkInitialized()

    const seal = this.getSeal()
    const context = this.getContext()

    try {
      // Release old keys if they exist
      this.releaseKeys()

      // Create new keys from serialized data
      this.secretKey = this.memoryManager.track(seal.SecretKey(), 'secretKey')

      this.secretKey.load(context, serializedKeys.secretKey)

      this.publicKey = this.memoryManager.track(seal.PublicKey(), 'publicKey')

      this.publicKey.load(context, serializedKeys.publicKey)

      // Create encryptor and decryptor
      this.encryptor = this.memoryManager.track(
        seal.Encryptor(context, this.publicKey),
        'encryptor',
      )

      this.decryptor = this.memoryManager.track(
        seal.Decryptor(context, this.secretKey),
        'decryptor',
      )

      // Load relin keys
      if (serializedKeys.relinKeys) {
        this.relinKeys = this.memoryManager.track(seal.RelinKeys(), 'relinKeys')

        this.relinKeys.load(context, serializedKeys.relinKeys)
      }

      // Load galois keys
      if (serializedKeys.galoisKeys) {
        this.galoisKeys = this.memoryManager.track(
          seal.GaloisKeys(),
          'galoisKeys',
        )

        this.galoisKeys.load(context, serializedKeys.galoisKeys)
      }

      this.keyGenerated = true
      logger.info('SEAL keys loaded successfully')
    } catch (error) {
      logger.error('Failed to load SEAL keys', { error })
      throw new Error(
        `Key loading failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Check if the service is initialized
   */
  private checkInitialized(): void {
    if (!this.initialized || !this.sealContext) {
      throw new Error('SEAL service not initialized. Call initialize() first.')
    }
  }

  /**
   * Check if keys have been generated
   */
  private checkKeysGenerated(): void {
    this.checkInitialized()

    if (!this.keyGenerated || !this.secretKey || !this.publicKey) {
      throw new Error('SEAL keys not generated. Call generateKeys() first.')
    }
  }

  /**
   * Dispose of all SEAL resources
   */
  public dispose(): void {
    logger.info('Disposing SEAL service')

    // Release keys
    this.releaseKeys()

    // Release encoder/decoder
    if (this.batchEncoder) {
      this.memoryManager.release(this.batchEncoder, 'batchEncoder')
      this.batchEncoder = null
    }

    if (this.ckksEncoder) {
      this.memoryManager.release(this.ckksEncoder, 'ckksEncoder')
      this.ckksEncoder = null
    }

    if (this.evaluator) {
      this.memoryManager.release(this.evaluator, 'evaluator')
      this.evaluator = null
    }

    // Release all other tracked objects
    this.memoryManager.releaseAll()

    // Dispose of context
    if (this.sealContext) {
      this.sealContext.dispose()
      this.sealContext = null
    }

    this.initialized = false
    this.keyGenerated = false
  }
}
