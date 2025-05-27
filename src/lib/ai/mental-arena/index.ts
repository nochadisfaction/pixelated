/**
 * MentalArena Integration
 * Based on https://github.com/Scarelette/MentalArena
 *
 * A self-play framework to train language models for diagnosis
 * and treatment of mental health disorders by generating
 * domain-specific personalized data.
 */

export { MentalArenaAdapter } from './MentalArenaAdapter'
export { MentalArenaFactory } from './MentalArenaFactory'

// Define MentalArenaConfig interface directly in index.ts
export interface MentalArenaConfig {
  numSessions: number
  maxTurns: number
  disorders?: string[]
  outputPath?: string
}

export { MentalArenaPythonBridge } from './PythonBridge'

/**
 * MentalArena Core Components
 *
 * - Symptom Encoder: Simulates a realistic patient from cognitive and behavioral perspectives
 * - Symptom Decoder: Compares diagnosed symptoms with encoded symptoms and manages dialogue
 * - Self-Play Training: Generates domain-specific personalized data through interactions
 * - Iterative Training: Fine-tunes models on generated data for continuous improvement
 */

// Example PHI audit logging - uncomment and customize as needed
// logger.info('Accessing PHI data', {
//   userId: 'user-id-here',
//   action: 'read',
//   dataType: 'patient-record',
//   recordId: 'record-id-here'
// });
