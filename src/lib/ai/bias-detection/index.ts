/**
 * Bias Detection Engine - Main Exports
 * 
 * Lightweight stub implementation for deployment compatibility.
 * TODO: Implement full bias detection engine when ready for full feature.
 */

// Main engine
export { BiasDetectionEngine } from './BiasDetectionEngine';

// Types
export type * from './types';

// Utilities
export * from './utils';

// Services
export { getAuditLogger } from './audit';
export { getCacheManager } from './cache';
export { performanceMonitor } from './performance-monitor';

// Serverless helpers
export * from './serverless-handlers';

// Default export
export { default as engine } from './BiasDetectionEngine'; 