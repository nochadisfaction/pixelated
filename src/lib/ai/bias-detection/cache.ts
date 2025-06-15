/**
 * Caching Layer for Pixelated Empathy Bias Detection Engine
 * 
 * This module provides a comprehensive caching system to optimize performance
 * for bias detection operations, analysis results, and frequently accessed data.
 */

import { getLogger } from '../../utils/logger';
import type {
  CacheEntry,
  CacheStats,
  BiasAnalysisResult,
  TherapeuticSession,
  BiasDashboardData,
  BiasReport,
  ParticipantDemographics
} from './types';

const logger = getLogger('BiasDetectionCache');

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

export interface CacheConfig {
  maxSize: number;                    // Maximum number of entries
  defaultTtl: number;                 // Default TTL in milliseconds
  cleanupInterval: number;            // Cleanup interval in milliseconds
  enableCompression: boolean;         // Enable data compression
  enablePersistence: boolean;         // Enable disk persistence
  persistencePath?: string;           // Path for persistence file
  memoryThreshold: number;            // Memory usage threshold (0-1)
}

export interface CacheOptions {
  ttl?: number;                       // Time to live in milliseconds
  tags?: string[];                    // Tags for cache invalidation
  compress?: boolean;                 // Compress this entry
  priority?: 'low' | 'medium' | 'high'; // Cache priority
}

// =============================================================================
// CACHE IMPLEMENTATION
// =============================================================================

export class BiasDetectionCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableCompression: true,
      enablePersistence: false,
      memoryThreshold: 0.8,
      ...config
    };

    this.stats = {
      totalEntries: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
      oldestEntry: new Date(),
      newestEntry: new Date()
    };

    this.startCleanupTimer();
    logger.info('BiasDetectionCache initialized', { config: this.config });
  }

  /**
   * Store a value in the cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const now = new Date();
      const ttl = options.ttl || this.config.defaultTtl;
      const expiresAt = new Date(now.getTime() + ttl);

      // Check if we need to evict entries
      if (this.cache.size >= this.config.maxSize) {
        await this.evictLeastRecentlyUsed();
      }

      // Compress data if enabled
      let processedValue = value;
      if (this.config.enableCompression && options.compress !== false) {
        processedValue = await this.compressData(value);
      }

      const entry: CacheEntry<T> = {
        key,
        value: processedValue,
        timestamp: now,
        expiresAt,
        accessCount: 0,
        lastAccessed: now,
        tags: options.tags || []
      };

      this.cache.set(key, entry);
      this.updateStats();

      logger.debug('Cache entry stored', { 
        key, 
        ttl, 
        tags: options.tags,
        size: this.cache.size 
      });

    } catch (error) {
      logger.error('Failed to store cache entry', { key, error });
      throw error;
    }
  }

  /**
   * Retrieve a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.stats.missRate++;
        logger.debug('Cache miss', { key });
        return null;
      }

      // Check if entry has expired
      if (entry.expiresAt < new Date()) {
        this.cache.delete(key);
        this.stats.missRate++;
        logger.debug('Cache entry expired', { key });
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = new Date();
      this.stats.hitRate++;

      // Decompress data if needed
      let {value} = entry;
      if (this.isCompressed(value)) {
        value = await this.decompressData(value);
      }

      logger.debug('Cache hit', { key, accessCount: entry.accessCount });
      return value;

    } catch (error) {
      logger.error('Failed to retrieve cache entry', { key, error });
      this.stats.missRate++;
      return null;
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
      logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.updateStats();
    logger.info('Cache cleared');
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      this.updateStats();
      logger.info('Cache entries invalidated by tags', { tags, count: invalidated });
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries by pattern
   */
  getKeysByPattern(pattern: RegExp): string[] {
    return this.getKeys().filter(key => pattern.test(key));
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateStats();
      logger.debug('Expired cache entries cleaned', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Evict least recently used entries
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => 
      a.lastAccessed.getTime() - b.lastAccessed.getTime()
    );

    // Remove only 1 entry to make room for the new one
    const toRemove = 1;
    
    if (entries.length > 0) {
      const [key] = entries[0]; // Remove the oldest entry
      this.cache.delete(key);
      this.stats.evictionCount++;
      logger.debug('LRU eviction completed', { evicted: toRemove, evictedKey: key });
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const entries = Array.from(this.cache.values());
    
    this.stats.totalEntries = entries.length;
    
    if (entries.length > 0) {
      const timestamps = entries.map(e => e.timestamp.getTime());
      this.stats.oldestEntry = new Date(Math.min(...timestamps));
      this.stats.newestEntry = new Date(Math.max(...timestamps));
    }

    // Calculate hit rate percentage
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    if (totalRequests > 0) {
      this.stats.hitRate = (this.stats.hitRate / totalRequests) * 100;
      this.stats.missRate = (this.stats.missRate / totalRequests) * 100;
    }

    // Estimate memory usage (rough calculation)
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation: JSON string length * 2 (for UTF-16)
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    return totalSize;
  }

  /**
   * Compress data (placeholder implementation)
   */
  private async compressData<T>(data: T): Promise<T> {
    // In a real implementation, you would use a compression library
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Decompress data (placeholder implementation)
   */
  private async decompressData<T>(data: T): Promise<T> {
    // In a real implementation, you would decompress the data
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Check if data is compressed
   */
  private isCompressed<T>(data: T): boolean {
    // In a real implementation, you would check for compression markers
    // For now, we'll assume data is not compressed
    return false;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroy the cache instance
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    logger.info('BiasDetectionCache destroyed');
  }
}

// =============================================================================
// SPECIALIZED CACHE MANAGERS
// =============================================================================

/**
 * Cache manager for bias analysis results
 */
export class BiasAnalysisCache {
  private cache: BiasDetectionCache;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new BiasDetectionCache({
      maxSize: 500,
      defaultTtl: 60 * 60 * 1000, // 1 hour
      ...config
    });
  }

  /**
   * Cache bias analysis result
   */
  async cacheAnalysisResult(
    sessionId: string,
    result: BiasAnalysisResult
  ): Promise<void> {
    const key = `analysis:${sessionId}`;
    const tags = [
      'bias-analysis',
      `session:${sessionId}`,
      `alert:${result.alertLevel}`
    ];

    await this.cache.set(key, result, { 
      tags,
      ttl: 2 * 60 * 60 * 1000 // 2 hours for analysis results
    });
  }

  /**
   * Get cached analysis result
   */
  async getAnalysisResult(sessionId: string): Promise<BiasAnalysisResult | null> {
    const key = `analysis:${sessionId}`;
    return await this.cache.get<BiasAnalysisResult>(key);
  }

  /**
   * Cache session data for quick access
   */
  async cacheSession(session: TherapeuticSession): Promise<void> {
    const key = `session:${session.sessionId}`;
    const tags = [
      'session-data',
      `participant:${session.participantDemographics.age}:${session.participantDemographics.gender}`,
      `scenario:${session.scenario.type}`
    ];

    await this.cache.set(key, session, { tags });
  }

  /**
   * Get cached session
   */
  async getSession(sessionId: string): Promise<TherapeuticSession | null> {
    const key = `session:${sessionId}`;
    return await this.cache.get<TherapeuticSession>(key);
  }

  /**
   * Invalidate analysis results for specific demographics
   */
  invalidateByDemographics(demographics: Partial<ParticipantDemographics>): number {
    const tags: string[] = [];
    
    // Match the tag format used in cacheSession: "participant:age:gender"
    if (demographics.age && demographics.gender) {
      tags.push(`participant:${demographics.age}:${demographics.gender}`);
    }
    if (demographics.age && demographics.ethnicity) {
      tags.push(`participant:${demographics.age}:${demographics.ethnicity}`);
    }
    if (demographics.gender && demographics.ethnicity) {
      tags.push(`participant:${demographics.gender}:${demographics.ethnicity}`);
    }
    
    // Also support partial matches by checking if any tag contains the demographic value
    const allKeys = this.cache.getKeys();
    let invalidated = 0;
    
    for (const key of allKeys) {
      const entry = (this.cache as any).cache.get(key);
      if (entry && entry.tags) {
        let shouldInvalidate = false;
        
        for (const tag of entry.tags) {
          if (tag.startsWith('participant:')) {
            const parts = tag.split(':');
            if (parts.length >= 2) {
              // Check if any part matches our demographics
              if (demographics.age && parts.includes(demographics.age)) {
                shouldInvalidate = true;
              }
              if (demographics.gender && parts.includes(demographics.gender)) {
                shouldInvalidate = true;
              }
              if (demographics.ethnicity && parts.includes(demographics.ethnicity)) {
                shouldInvalidate = true;
              }
            }
          }
        }
        
        if (shouldInvalidate) {
          this.cache.delete(key);
          invalidated++;
        }
      }
    }
    
    return invalidated;
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  destroy(): void {
    this.cache.destroy();
  }
}

/**
 * Cache manager for dashboard data
 */
export class DashboardCache {
  private cache: BiasDetectionCache;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new BiasDetectionCache({
      maxSize: 100,
      defaultTtl: 5 * 60 * 1000, // 5 minutes for dashboard data
      ...config
    });
  }

  /**
   * Cache dashboard data
   */
  async cacheDashboardData(
    userId: string,
    timeRange: string,
    data: BiasDashboardData
  ): Promise<void> {
    const key = `dashboard:${userId}:${timeRange}`;
    const tags = ['dashboard', `user:${userId}`, `timerange:${timeRange}`];

    await this.cache.set(key, data, { tags });
  }

  /**
   * Get cached dashboard data
   */
  async getDashboardData(
    userId: string,
    timeRange: string
  ): Promise<BiasDashboardData | null> {
    const key = `dashboard:${userId}:${timeRange}`;
    return await this.cache.get<BiasDashboardData>(key);
  }

  /**
   * Invalidate dashboard data for user
   */
  invalidateUserDashboard(userId: string): number {
    return this.cache.invalidateByTags([`user:${userId}`]);
  }

  /**
   * Invalidate all dashboard data
   */
  invalidateAllDashboards(): number {
    return this.cache.invalidateByTags(['dashboard']);
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  destroy(): void {
    this.cache.destroy();
  }
}

/**
 * Cache manager for reports
 */
export class ReportCache {
  private cache: BiasDetectionCache;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new BiasDetectionCache({
      maxSize: 50,
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours for reports
      ...config
    });
  }

  /**
   * Cache report
   */
  async cacheReport(reportId: string, report: BiasReport): Promise<void> {
    const key = `report:${reportId}`;
    const tags = ['report', `report:${reportId}`];

    await this.cache.set(key, report, { 
      tags,
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days for reports
    });
  }

  /**
   * Get cached report
   */
  async getReport(reportId: string): Promise<BiasReport | null> {
    const key = `report:${reportId}`;
    return await this.cache.get<BiasReport>(key);
  }

  /**
   * Invalidate specific report
   */
  invalidateReport(reportId: string): number {
    return this.cache.invalidateByTags([`report:${reportId}`]);
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  destroy(): void {
    this.cache.destroy();
  }
}

// =============================================================================
// CACHE MANAGER SINGLETON
// =============================================================================

export class CacheManager {
  private static instance: CacheManager;
  
  public readonly analysisCache: BiasAnalysisCache;
  public readonly dashboardCache: DashboardCache;
  public readonly reportCache: ReportCache;

  private constructor() {
    this.analysisCache = new BiasAnalysisCache();
    this.dashboardCache = new DashboardCache();
    this.reportCache = new ReportCache();
    
    logger.info('CacheManager initialized');
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get combined cache statistics
   */
  getCombinedStats(): {
    analysis: CacheStats;
    dashboard: CacheStats;
    report: CacheStats;
    total: {
      totalEntries: number;
      totalMemoryUsage: number;
      averageHitRate: number;
    };
  } {
    const analysisStats = this.analysisCache.getStats();
    const dashboardStats = this.dashboardCache.getStats();
    const reportStats = this.reportCache.getStats();

    return {
      analysis: analysisStats,
      dashboard: dashboardStats,
      report: reportStats,
      total: {
        totalEntries: analysisStats.totalEntries + dashboardStats.totalEntries + reportStats.totalEntries,
        totalMemoryUsage: analysisStats.memoryUsage + dashboardStats.memoryUsage + reportStats.memoryUsage,
        averageHitRate: (analysisStats.hitRate + dashboardStats.hitRate + reportStats.hitRate) / 3
      }
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.analysisCache.destroy();
    this.dashboardCache.destroy();
    this.reportCache.destroy();
    logger.info('All caches cleared');
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    this.analysisCache.destroy();
    this.dashboardCache.destroy();
    this.reportCache.destroy();
    CacheManager.instance = null as any;
    logger.info('CacheManager destroyed');
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get the global cache manager instance
 */
export function getCacheManager(): CacheManager {
  return CacheManager.getInstance();
}

/**
 * Reset cache manager (for testing)
 */
export function resetCacheManager(): void {
  const instance = CacheManager.getInstance();
  if (instance) {
    instance.destroy();
  }
}
/**
 * Cache a bias analysis result
 */
export async function cacheAnalysisResult(
  sessionId: string,
  result: BiasAnalysisResult
): Promise<void> {
  const cacheManager = getCacheManager();
  await cacheManager.analysisCache.cacheAnalysisResult(sessionId, result);
}

/**
 * Get cached bias analysis result
 */
export async function getCachedAnalysisResult(
  sessionId: string
): Promise<BiasAnalysisResult | null> {
  const cacheManager = getCacheManager();
  return await cacheManager.analysisCache.getAnalysisResult(sessionId);
}

/**
 * Cache dashboard data
 */
export async function cacheDashboardData(
  userId: string,
  timeRange: string,
  data: BiasDashboardData
): Promise<void> {
  const cacheManager = getCacheManager();
  await cacheManager.dashboardCache.cacheDashboardData(userId, timeRange, data);
}

/**
 * Get cached dashboard data
 */
export async function getCachedDashboardData(
  userId: string,
  timeRange: string
): Promise<BiasDashboardData | null> {
  const cacheManager = getCacheManager();
  return await cacheManager.dashboardCache.getDashboardData(userId, timeRange);
}

/**
 * Cache a report
 */
export async function cacheReport(
  reportId: string,
  report: BiasReport
): Promise<void> {
  const cacheManager = getCacheManager();
  await cacheManager.reportCache.cacheReport(reportId, report);
}

/**
 * Get cached report
 */
export async function getCachedReport(
  reportId: string
): Promise<BiasReport | null> {
  const cacheManager = getCacheManager();
  return await cacheManager.reportCache.getReport(reportId);
} 