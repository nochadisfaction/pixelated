export interface IRedisService {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, ttl?: number) => Promise<string>
  del: (key: string) => Promise<number>
  exists: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<number>
  ttl: (key: string) => Promise<number>
  keys: (pattern: string) => Promise<string[]>
  scan: (
    cursor: string,
    pattern?: string,
    count?: number,
  ) => Promise<[string, string[]]>
  hget: (key: string, field: string) => Promise<string | null>
  hset: (key: string, field: string, value: string) => Promise<number>
  hdel: (key: string, field: string) => Promise<number>
  hkeys: (key: string) => Promise<string[]>
  hvals: (key: string) => Promise<string[]>
  hgetall: (key: string) => Promise<Record<string, string>>
}
