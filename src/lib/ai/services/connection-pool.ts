/**
 * Connection Pool Configuration
 */
export interface ConnectionPoolConfig {
  /**
   * Maximum number of concurrent connections
   * @default 5
   */
  maxConnections?: number

  /**
   * Connection timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  connectionTimeout?: number

  /**
   * Connection idle timeout in milliseconds
   * @default 60000 (1 minute)
   */
  idleTimeout?: number

  /**
   * Whether to enable the connection pool
   * @default true
   */
  enabled?: boolean
}

/**
 * Connection object with metadata
 */
interface PooledConnection {
  id: string
  controller: AbortController
  inUse: boolean
  lastUsed: number
  createdAt: number
}

/**
 * Connection Pool Manager
 *
 * Manages a pool of connections to reduce API latency
 */
export class ConnectionPoolManager {
  private connections = new Map<string, PooledConnection>()
  private maxConnections: number
  private connectionTimeout: number
  private idleTimeout: number
  private enabled: boolean
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: ConnectionPoolConfig = {}) {
    this.maxConnections = config.maxConnections || 5
    this.connectionTimeout = config.connectionTimeout || 30000
    this.idleTimeout = config.idleTimeout || 60000
    this.enabled = config.enabled !== false

    // Start cleanup interval
    if (this.enabled) {
      this.cleanupInterval = setInterval(
        () => this.cleanupIdleConnections(),
        30000,
      )
    }
  }

  /**
   * Get a connection from the pool or create a new one
   */
  getConnection(): {
    controller: AbortController
    headers: Record<string, string>
  } {
    if (!this.enabled) {
      // If pool is disabled, just create a new controller
      return {
        controller: new AbortController(),
        headers: {
          Connection: 'close',
        },
      }
    }

    // Try to find an idle connection
    let foundConnection: PooledConnection | undefined
    let foundId: string | undefined

    this.connections.forEach((conn, id) => {
      if (!foundConnection && !conn.inUse) {
        foundConnection = conn
        foundId = id
      }
    })

    if (foundConnection && foundId) {
      // Mark as in use
      foundConnection.inUse = true
      foundConnection.lastUsed = Date.now()

      return {
        controller: foundConnection.controller,
        headers: {
          'Connection': 'keep-alive',
          'X-Connection-Id': foundId,
        },
      }
    }

    // If we have capacity, create a new connection
    if (this.connections.size < this.maxConnections) {
      const id = this.generateConnectionId()
      const controller = new AbortController()

      this.connections.set(id, {
        id,
        controller,
        inUse: true,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      })

      return {
        controller,
        headers: {
          'Connection': 'keep-alive',
          'X-Connection-Id': id,
        },
      }
    }

    // If we're at capacity, find the oldest connection and reuse i
    const oldestId = this.findOldestConnectionId()
    if (oldestId) {
      const conn = this.connections.get(oldestId)!

      // Abort any pending requests
      conn.controller.abort()

      // Create a new controller
      const newController = new AbortController()
      conn.controller = newController
      conn.inUse = true
      conn.lastUsed = Date.now()

      return {
        controller: newController,
        headers: {
          'Connection': 'keep-alive',
          'X-Connection-Id': oldestId,
        },
      }
    }

    // Fallback: create a one-time connection
    return {
      controller: new AbortController(),
      headers: {
        Connection: 'close',
      },
    }
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(id?: string): void {
    if (!this.enabled || !id) {
      return
    }

    const conn = this.connections.get(id)
    if (conn) {
      conn.inUse = false
      conn.lastUsed = Date.now()
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now()

    const idsToDelete: string[] = []
    this.connections.forEach((conn, id) => {
      // Remove connections that have been idle for too long
      if (!conn.inUse && now - conn.lastUsed > this.idleTimeout) {
        conn.controller.abort()
        idsToDelete.push(id)
      }
    })

    // Delete outside the forEach to avoid modifying the Map during iteration
    idsToDelete.forEach((id) => {
      this.connections.delete(id)
    })
  }

  /**
   * Find the oldest connection ID
   */
  private findOldestConnectionId(): string | null {
    let oldestId: string | null = null
    let oldestTime = Infinity

    this.connections.forEach((conn, id) => {
      if (conn.lastUsed < oldestTime) {
        oldestId = id
        oldestTime = conn.lastUsed
      }
    })

    return oldestId
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const activeConnections: PooledConnection[] = []
    const idleConnections: PooledConnection[] = []

    this.connections.forEach((conn) => {
      if (conn.inUse) {
        activeConnections.push(conn)
      } else {
        idleConnections.push(conn)
      }
    })

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      idleConnections: idleConnections.length,
      maxConnections: this.maxConnections,
      enabled: this.enabled,
    }
  }

  /**
   * Dispose of all connections and cleanup
   */
  dispose(): void {
    // Abort all connections
    this.connections.forEach((conn) => {
      conn.controller.abort()
    })

    // Clear the map
    this.connections.clear()

    // Clear the cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}
