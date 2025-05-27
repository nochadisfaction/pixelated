/**
 * Logging utility for the application
 * Provides consistent logging across the application with
 * support for different environments and log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  level: LogLevel
  prefix?: string
  enabled: boolean
  environment?: 'development' | 'test' | 'production'
}

class Logger {
  private options: LoggerOptions

  constructor(options?: Partial<LoggerOptions>) {
    this.options = {
      level: 'info',
      enabled: true,
      environment:
        (process.env.NODE_ENV as 'development' | 'test' | 'production') ||
        'development',
      ...options,
    }
  }

  /**
   * Set logger options
   */
  configure(options: Partial<LoggerOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args)
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args)
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args)
  }

  /**
   * Log an error message
   */
  error(message: string | Error, ...args: unknown[]): void {
    if (message instanceof Error) {
      this.log(
        'error',
        message.message,
        { error: message, stack: message.stack },
        ...args,
      )
    } else {
      this.log('error', message, ...args)
    }
  }

  /**
   * Create a child logger with the specified prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.options,
      prefix: this.options.prefix ? `${this.options.prefix}:${prefix}` : prefix,
    })
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.isLevelEnabled(level) || !this.options.enabled) {
      return
    }

    // Skip debug logs in production
    if (level === 'debug' && this.options.environment === 'production') {
      return
    }

    const timestamp = new Date().toISOString()
    const prefix = this.options.prefix ? `[${this.options.prefix}]` : ''
    const formattedMessage = `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`

    // Browser or server logging
    if (typeof window !== 'undefined') {
      this.browserLog(level, formattedMessage, ...args)
    } else {
      this.serverLog(level, formattedMessage, ...args)
    }
  }

  /**
   * Browser-specific logging
   */
  private browserLog(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): void {
    switch (level) {
      case 'debug':
        console.debug(message, ...args)
        break
      case 'info':
        console.info(message, ...args)
        break
      case 'warn':
        console.warn(message, ...args)
        break
      case 'error':
        console.error(message, ...args)
        break
      default:
        console.log(message, ...args)
    }
  }

  /**
   * Server-specific logging
   */
  private serverLog(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): void {
    // On the server side, we could integrate with more advanced
    // logging systems like Winston or Pino, but for now we use console
    this.browserLog(level, message, ...args)
  }

  /**
   * Check if a log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const logLevels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    return logLevels[level] >= logLevels[this.options.level]
  }
}

// Create and export the default application logger
export const logger = new Logger()

// Create specialized loggers for different parts of the application
export const browserLogger = logger.child('browser')
export const apiLogger = logger.child('api')
export const perfLogger = logger.child('performance')

/**
 * Get a logger with the specified prefix
 * This function is the primary way to obtain a logger in the application
 */
export function getLogger(prefix: string): Logger {
  return logger.child(prefix)
}

// Export the Logger class
export { Logger }

// Create a default export for backward compatibility
const loggerModule = {
  logger,
  browserLogger,
  apiLogger,
  perfLogger,
  getLogger,
  Logger,
}

export default loggerModule
