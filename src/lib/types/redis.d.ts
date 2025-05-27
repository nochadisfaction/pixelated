/**
 * Type declaration file for Redis
 * Extends @upstash/redis Redis class with missing methods used in the project
 */

import '@upstash/redis'

declare module '@upstash/redis' {
  interface Redis {
    /**
     * Atomically returns and removes the last element of the source list, and pushes it to the destination list
     */
    rpoplpush(source: string, destination: string): Promise<string | null>

    /**
     * Push values to the head of a list
     */
    lpush(key: string, ...values: string[]): Promise<number>

    /**
     * Removes elements from a list matching the given value
     */
    lrem(key: string, count: number, value: string): Promise<number>

    /**
     * Returns the length of a list
     */
    llen(key: string): Promise<number>

    /**
     * Sets the hash field to the specified value
     */
    hset(
      key: string,
      field: string | Record<string, unknown>,
      ...value: unknown[]
    ): Promise<number>

    /**
     * Returns the value of the specified hash field
     */
    hget(key: string, field: string): Promise<string | null>

    /**
     * Returns all fields and values of the hash stored at key
     */
    hgetall(key: string): Promise<Record<string, unknown> | null>
  }
}
