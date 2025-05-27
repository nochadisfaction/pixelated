import type { FHIRClient, Logger, PluginAPI } from '../types'
import { EventEmitter } from 'node:events'
import { RedisStorageAPI } from '../services/redis.storage'

export function createPluginAPI(
  fhirClient: FHIRClient,
  logger: Logger,
  redisUrl: string,
): PluginAPI {
  const events = new EventEmitter()
  const storage = new RedisStorageAPI(redisUrl)

  return {
    events: {
      on(event: string, handler: (data: any) => void): void {
        events.on(event, handler)
      },
      off(event: string, handler: (data: any) => void): void {
        events.off(event, handler)
      },
      emit(event: string, data: any): void {
        events.emit(event, data)
      },
    },
    storage,
    fhir: fhirClient,
    logger,
  }
}
