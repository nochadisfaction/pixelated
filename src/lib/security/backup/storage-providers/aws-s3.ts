/**
 * AWS S3 Storage Provider
 *
 * This is a server-only module that provides AWS S3 integration
 * It uses dynamic imports to prevent bundling Node.js modules with client code
 */

import type { StorageProvider, StorageProviderConfig } from '../backup-types'

export class S3StorageProvider implements StorageProvider {
  private s3: any
  private bucketName: string
  private initialized = false

  constructor(private config: StorageProviderConfig) {
    this.bucketName = (config.bucket as string) || ''
    if (!this.bucketName) {
      throw new Error('Bucket name is required for S3 storage provider')
    }
  }

  async initialize(): Promise<void> {
    try {
      // Dynamically import AWS SDK to prevent bundling with client code
      const { S3 } = await import('@aws-sdk/client-s3')

      // Create S3 instance with provided credentials
      this.s3 = new S3({
        credentials: this.config.credentials as any,
        region: this.config.region as string,
        ...this.config.options,
      })

      this.initialized = true

      console.info(
        `AWS S3 storage provider initialized for bucket: ${this.bucketName}`,
      )
    } catch (error) {
      console.error('Failed to initialize AWS S3 storage provider:', error)
      throw new Error(
        `AWS S3 initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async listFiles(pattern?: string): Promise<string[]> {
    this.checkInitialized()

    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: pattern ? pattern.split('*')[0] : undefined,
      }

      const { Contents = [] } = await this.s3.listObjects(params)
      const fileNames = Contents.map((item: any) => item.Key)

      // Additional filtering for more complex patterns
      if (pattern && pattern.includes('*')) {
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')

        const regex = new RegExp(`^${regexPattern}$`)
        return fileNames.filter((name) => regex.test(name))
      }

      return fileNames
    } catch (error) {
      console.error('Failed to list files from AWS S3:', error)
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async storeFile(key: string, data: Uint8Array): Promise<void> {
    this.checkInitialized()

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: Buffer.from(data),
        ContentType: 'application/octet-stream',
      }

      await this.s3.putObject(params)
    } catch (error) {
      console.error(`Failed to store file ${key} to AWS S3:`, error)
      throw new Error(
        `Failed to store file: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async getFile(key: string): Promise<Uint8Array> {
    this.checkInitialized()

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      }

      const { Body } = await this.s3.getObject(params)

      // Convert Buffer to Uint8Array
      return new Uint8Array(await Body.transformToByteArray())
    } catch (error) {
      console.error(`Failed to get file ${key} from AWS S3:`, error)
      throw new Error(
        `Failed to get file: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.checkInitialized()

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      }

      await this.s3.deleteObject(params)
    } catch (error) {
      console.error(`Failed to delete file ${key} from AWS S3:`, error)
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('AWS S3 storage provider not initialized')
    }
  }
}
