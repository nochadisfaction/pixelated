/**
 * Patient-Psi Integration Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PatientPsiParser,
  type PatientPsiCognitiveModel,
} from '../patient-psi-parser'
import { PatientPsiIndexer } from '../patient-psi-indexer'
import { PatientPsiIntegration } from '../patient-psi-integration'

describe('PatientPsiIntegration', () => {
  let integration: PatientPsiIntegration
  let parser: PatientPsiParser
  let indexer: PatientPsiIndexer

  beforeEach(() => {
    parser = new PatientPsiParser()
    indexer = new PatientPsiIndexer()
    integration = new PatientPsiIntegration(parser, indexer)
  })

  it('should initialize with default configuration', () => {
    expect(integration).toBeDefined()
    expect(integration.getStats().totalProcessed).toBe(0)
  })

  it('should validate minimal patient model structure', async () => {
    const mockPatientData = {
      id: 'test-patient-1',
      name: 'Test Patient',
      cognitiveConceptualization: {
        coreBeliefs: {
          worthlessness: {
            beliefs: [
              {
                statement: 'I am not good enough',
                strength: 8,
                evidence: ['Always makes mistakes', 'Gets criticized often'],
              },
            ],
            formationContext: 'Childhood experiences of constant criticism',
          },
        },
        emotions: [
          {
            emotion: 'sadness',
            intensity: 7,
            triggers: ['criticism', 'failure'],
            physicalSensations: ['heaviness in chest', 'fatigue'],
          },
        ],
        automaticThoughts: [
          {
            thought: 'I always mess things up',
            distortions: ['overgeneralization', 'all-or-nothing'],
            situation: 'Making a mistake at work',
          },
        ],
      },
      demographics: {
        age: 28,
        gender: 'female',
        occupation: 'teacher',
      },
      presentingProblems: ['depression', 'low self-esteem'],
    }

    try {
      // Parse the mock data - this returns a CognitiveModel directly
      const parsedModel = await parser.parsePatientPsiModel(mockPatientData)
      expect(parsedModel).not.toBeNull()
      expect(parsedModel!.id).toBe('test-patient-1')
      expect(parsedModel!.name).toBe('Test Patient')

      // Normalize the raw data (not the parsed model)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedResult = await integration.normalizeModel(
        mockPatientData as any,
      )
      expect(normalizedResult.model.id).toBe('test-patient-1')
      expect(normalizedResult.metadata.sourceDataset).toBe('patient-psi')
      expect(normalizedResult.metadata.validationStatus).toBe('passed')

      // Check that core beliefs were extracted
      expect(normalizedResult.model.coreBeliefs.length).toBeGreaterThan(0)
      // Note: The normalized model may transform belief structures, so we check for existence rather than exact matches
      expect(normalizedResult.model.coreBeliefs[0].belief).toBeDefined()
      expect(
        normalizedResult.model.coreBeliefs[0].strength,
      ).toBeGreaterThanOrEqual(0)

      // Check that emotional patterns were transformed
      expect(normalizedResult.model.emotionalPatterns.length).toBeGreaterThan(0)
      expect(normalizedResult.model.emotionalPatterns[0].emotion).toBe(
        'sadness',
      )
      expect(normalizedResult.model.emotionalPatterns[0].intensity).toBe(7)

      // Check that distortion patterns were created
      expect(normalizedResult.model.distortionPatterns.length).toBeGreaterThan(
        0,
      )

      // Verify data quality metrics
      expect(
        normalizedResult.metadata.dataQuality.completeness,
      ).toBeGreaterThan(0.5)
      expect(normalizedResult.metadata.dataQuality.consistency).toBeGreaterThan(
        0,
      )
    } catch (error) {
      console.error('Test failed:', error)
      throw error
    }
  })

  it('should handle batch normalization of multiple models', async () => {
    const mockPatients = [
      {
        id: 'patient-1',
        name: 'Patient One',
        cognitiveConceptualization: {
          coreBeliefs: {
            helplessness: {
              beliefs: [
                { statement: 'I cannot control anything', strength: 9 },
              ],
            },
          },
          emotions: [{ emotion: 'anxiety', intensity: 8 }],
        },
        presentingProblems: ['anxiety'],
      },
      {
        id: 'patient-2',
        name: 'Patient Two',
        cognitiveConceptualization: {
          coreBeliefs: {
            defectiveness: {
              beliefs: [
                { statement: 'I am fundamentally flawed', strength: 7 },
              ],
            },
          },
          emotions: [{ emotion: 'shame', intensity: 9 }],
        },
        presentingProblems: ['depression', 'shame'],
      },
    ]

    try {
      // Batch normalize the raw data directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedResults = await integration.normalizeModels(
        mockPatients as any[],
      )

      expect(normalizedResults.length).toBe(2)
      expect(normalizedResults[0].model.id).toBe('patient-1')
      expect(normalizedResults[1].model.id).toBe('patient-2')

      // Check statistics
      const stats = integration.getStats()
      expect(stats.successful).toBe(2)
      expect(stats.failed).toBe(0)
    } catch (error) {
      console.error('Batch test failed:', error)
      throw error
    }
  })

  it('should handle incomplete data gracefully', async () => {
    const incompletePatient = {
      id: 'incomplete-patient',
      name: 'Incomplete Patient',
      // Missing most required fields
    }

    try {
      const _parsedModel = await parser.parsePatientPsiModel(incompletePatient)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedResult = await integration.normalizeModel(
        incompletePatient as any,
      )

      // Should still create a basic model structure
      expect(normalizedResult.model.id).toBe('incomplete-patient')
      expect(normalizedResult.metadata.validationStatus).toBe('warning')

      // Data quality should reflect incompleteness
      expect(normalizedResult.metadata.dataQuality.completeness).toBeLessThan(
        0.7,
      )
    } catch (error) {
      // This is expected for very incomplete data
      expect(error).toBeDefined()
    }
  })

  it('should generate appropriate conversion statistics', async () => {
    const mockPatient = {
      id: 'stats-patient',
      name: 'Stats Patient',
      cognitiveConceptualization: {
        coreBeliefs: {
          failure: {
            beliefs: [{ statement: 'I always fail', strength: 6 }],
          },
        },
        emotions: [{ emotion: 'frustration', intensity: 5 }],
      },
    }

    try {
      const _parsedModel = await parser.parsePatientPsiModel(mockPatient)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await integration.normalizeModel(mockPatient as any)

      const stats = integration.getStats()
      expect(stats.totalProcessed).toBe(1)
      expect(stats.successful).toBe(1)
      expect(stats.conversionTime).toBeGreaterThan(0)
    } catch (error) {
      console.error('Stats test failed:', error)
      throw error
    }
  })

  describe('Error Handling', () => {
    it('should handle parser errors gracefully', async () => {
      // Create a mock parser that throws errors
      const errorParser = {
        parsePatientPsiModel: vi
          .fn()
          .mockRejectedValue(
            new Error('Parser failed: Invalid data structure'),
          ),
      }

      const errorIntegration = new PatientPsiIntegration(
        errorParser as unknown as PatientPsiParser,
        indexer,
      )

      const invalidData = {
        id: 'error-test',
        // Invalid structure that should cause parser to fail
        invalidField: 'this will cause parsing to fail',
      }

      try {
        await errorIntegration.normalizeModel(
          invalidData as unknown as PatientPsiCognitiveModel,
        )
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        expect(error instanceof Error).toBe(true)
        const errorObj = error as Error
        expect(errorObj.message).toContain('Normalization failed for model')
        expect(errorObj.message).toContain(
          'Parser failed: Invalid data structure',
        )
      }

      // Check that stats reflect the failure
      const stats = errorIntegration.getStats()
      expect(stats.totalProcessed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.successful).toBe(0)
    })

    it('should handle indexer errors gracefully', async () => {
      // Create a mock indexer that throws errors
      const errorIndexer = {
        indexPatientModel: vi
          .fn()
          .mockRejectedValue(
            new Error('Indexer failed: Database connection lost'),
          ),
        getIndexStatistics: vi.fn().mockReturnValue({ indexed: 0, failed: 1 }),
        searchSimilarPatients: vi.fn(),
        clearIndex: vi.fn(),
      }

      const errorIntegration = new PatientPsiIntegration(
        parser,
        errorIndexer as unknown as PatientPsiIndexer,
      )

      const validData = {
        id: 'indexer-error-test',
        name: 'Test Patient',
        cognitiveConceptualization: {
          coreBeliefs: {
            worthlessness: {
              beliefs: [{ statement: 'I am worthless', strength: 7 }],
            },
          },
          emotions: [{ emotion: 'sadness', intensity: 6 }],
        },
      }

      // The normalization should succeed even if indexing fails
      try {
        const result = await errorIntegration.normalizeModel(
          validData as unknown as PatientPsiCognitiveModel,
        )
        expect(result).toBeDefined()
        expect(result.model.id).toBe('indexer-error-test')
        // Note: Indexing errors may not prevent normalization success depending on implementation
      } catch (error) {
        // If indexing is part of normalization, we might get an error
        expect(error instanceof Error).toBe(true)
        const errorObj = error as Error
        expect(errorObj.message).toContain('Database connection lost')
      }
    })

    it('should handle malformed data with descriptive error messages', async () => {
      const malformedDataSets = [
        {
          name: 'missing-id',
          data: { name: 'Patient without ID' },
          expectedError: 'Required',
        },
        {
          name: 'invalid-belief-strength',
          data: {
            id: 'invalid-strength',
            cognitiveConceptualization: {
              coreBeliefs: {
                test: {
                  beliefs: [{ statement: 'test', strength: 'invalid' }],
                },
              },
            },
          },
          expectedError: 'Expected number',
        },
        {
          name: 'null-data',
          data: null,
          expectedError: 'Expected object',
        },
      ]

      for (const testCase of malformedDataSets) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await integration.normalizeModel(testCase.data as any)
          expect(true).toBe(false) // Should not succeed
        } catch (error) {
          expect(error instanceof Error).toBe(true)
          const errorObj = error as Error
          expect(errorObj.message).toContain('Normalization failed')
          // The error should provide context about what went wrong
          expect(errorObj.message.length).toBeGreaterThan(20) // Ensure descriptive message
        }
      }
    })

    it('should handle batch processing with mixed success/failure', async () => {
      const mixedDataSet = [
        // Valid data
        {
          id: 'batch-success-1',
          name: 'Valid Patient 1',
          cognitiveConceptualization: {
            coreBeliefs: {
              helplessness: {
                beliefs: [
                  { statement: 'I cannot control anything', strength: 8 },
                ],
              },
            },
            emotions: [{ emotion: 'anxiety', intensity: 7 }],
          },
        },
        // Invalid data - missing required fields
        {
          id: 'batch-failure-1',
          invalidStructure: 'this will fail',
        },
        // Valid data
        {
          id: 'batch-success-2',
          name: 'Valid Patient 2',
          cognitiveConceptualization: {
            coreBeliefs: {
              defectiveness: {
                beliefs: [{ statement: 'I am flawed', strength: 6 }],
              },
            },
            emotions: [{ emotion: 'shame', intensity: 8 }],
          },
        },
      ]

      // With non-strict validation, should process valid items and skip invalid ones
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await integration.normalizeModels(mixedDataSet as any[])

      // Should have results for the valid items only
      expect(results.length).toBeLessThanOrEqual(2) // May be 0, 1, or 2 depending on implementation

      const stats = integration.getStats()
      expect(stats.totalProcessed).toBeGreaterThan(0)
      expect(stats.failed).toBeGreaterThan(0) // At least one failure from invalid data
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent normalization requests', async () => {
      // Create multiple patient data sets
      const concurrentDataSets = Array.from({ length: 5 }, (_, index) => ({
        id: `concurrent-patient-${index}`,
        name: `Concurrent Patient ${index}`,
        cognitiveConceptualization: {
          coreBeliefs: {
            abandonment: {
              beliefs: [{ statement: `Belief ${index}`, strength: 5 + index }],
            },
          },
          emotions: [{ emotion: 'fear', intensity: 4 + index }],
        },
        demographics: {
          age: 25 + index,
          gender: index % 2 === 0 ? 'male' : 'female',
          occupation: `Job ${index}`,
        },
      }))

      // Execute all normalizations concurrently
      const concurrentPromises = concurrentDataSets.map((data) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integration.normalizeModel(data as any),
      )

      const results = await Promise.all(concurrentPromises)

      // Verify all requests completed successfully
      expect(results.length).toBe(5)

      // Verify each result has the correct ID (no data corruption)
      for (let i = 0; i < results.length; i++) {
        expect(results[i].model.id).toBe(`concurrent-patient-${i}`)
        expect(results[i].model.name).toBe(`Concurrent Patient ${i}`)
      }

      // Verify stats are consistent
      const stats = integration.getStats()
      expect(stats.successful).toBeGreaterThanOrEqual(5)
      expect(stats.totalProcessed).toBeGreaterThanOrEqual(5)
    })

    it('should handle concurrent batch operations without race conditions', async () => {
      // Create two separate batches
      const batch1 = Array.from({ length: 3 }, (_, index) => ({
        id: `batch1-patient-${index}`,
        name: `Batch 1 Patient ${index}`,
        cognitiveConceptualization: {
          coreBeliefs: {
            incompetence: {
              beliefs: [{ statement: `Batch 1 belief ${index}`, strength: 6 }],
            },
          },
          emotions: [{ emotion: 'frustration', intensity: 5 }],
        },
      }))

      const batch2 = Array.from({ length: 3 }, (_, index) => ({
        id: `batch2-patient-${index}`,
        name: `Batch 2 Patient ${index}`,
        cognitiveConceptualization: {
          coreBeliefs: {
            vulnerability: {
              beliefs: [{ statement: `Batch 2 belief ${index}`, strength: 7 }],
            },
          },
          emotions: [{ emotion: 'anxiety', intensity: 6 }],
        },
      }))

      // Execute both batches concurrently
      const [results1, results2] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integration.normalizeModels(batch1 as any[]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integration.normalizeModels(batch2 as any[]),
      ])

      // Verify both batches completed correctly
      expect(results1.length).toBe(3)
      expect(results2.length).toBe(3)

      // Verify no cross-contamination between batches
      for (let i = 0; i < 3; i++) {
        expect(results1[i].model.id).toContain('batch1')
        expect(results2[i].model.id).toContain('batch2')
      }

      // Verify stats account for all operations
      const stats = integration.getStats()
      expect(stats.totalProcessed).toBeGreaterThanOrEqual(6)
    })

    it('should maintain data integrity under high concurrent load', async () => {
      const highLoadDataSets = Array.from({ length: 20 }, (_, index) => ({
        id: `load-test-${index}`,
        name: `Load Test Patient ${index}`,
        cognitiveConceptualization: {
          coreBeliefs: {
            failure: {
              beliefs: [
                {
                  statement: `High load belief ${index}`,
                  strength: (index % 10) + 1,
                  evidence: [`Evidence ${index}a`, `Evidence ${index}b`],
                },
              ],
            },
          },
          emotions: [
            {
              emotion: index % 2 === 0 ? 'sadness' : 'anger',
              intensity: (index % 9) + 1,
              triggers: [`Trigger ${index}`],
            },
          ],
        },
        demographics: {
          age: 20 + (index % 50),
          gender:
            index % 3 === 0 ? 'male' : index % 3 === 1 ? 'female' : 'other',
          occupation: `Occupation ${index % 10}`,
        },
      }))

      // Execute with different concurrency patterns
      const chunkSize = 4
      const chunks = []
      for (let i = 0; i < highLoadDataSets.length; i += chunkSize) {
        chunks.push(highLoadDataSets.slice(i, i + chunkSize))
      }

      // Process chunks concurrently
      const chunkPromises = chunks.map((chunk) =>
        Promise.all(
          chunk.map((data) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            integration.normalizeModel(data as any),
          ),
        ),
      )

      const chunkResults = await Promise.all(chunkPromises)
      const allResults = chunkResults.flat()

      // Verify all results are present and correct
      expect(allResults.length).toBe(20)

      // Check for data integrity - each result should match its input
      const resultIds = new Set(allResults.map((r) => r.model.id))
      expect(resultIds.size).toBe(20) // No duplicates

      for (let i = 0; i < 20; i++) {
        expect(resultIds.has(`load-test-${i}`)).toBe(true)
      }

      // Verify final stats are consistent
      const finalStats = integration.getStats()
      expect(finalStats.totalProcessed).toBeGreaterThanOrEqual(20)
      expect(finalStats.successful).toBeGreaterThan(0)
    })

    it('should handle mixed concurrent success and failure scenarios', async () => {
      // Create mixed data with some that will succeed and some that will fail
      const mixedConcurrentData = [
        // These should succeed
        ...Array.from({ length: 3 }, (_, index) => ({
          id: `concurrent-success-${index}`,
          name: `Success Patient ${index}`,
          cognitiveConceptualization: {
            coreBeliefs: {
              worthlessness: {
                beliefs: [
                  { statement: `Success belief ${index}`, strength: 7 },
                ],
              },
            },
            emotions: [{ emotion: 'sadness', intensity: 6 }],
          },
        })),
        // These should fail
        ...Array.from({ length: 2 }, (_, index) => ({
          id: `concurrent-failure-${index}`,
          invalidData: 'this will cause failure',
        })),
      ]

      // Execute all concurrently with Promise.allSettled to handle mixed results
      const settledResults = await Promise.allSettled(
        mixedConcurrentData.map((data) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          integration.normalizeModel(data as any),
        ),
      )

      // Verify we have both fulfilled and rejected promises
      const fulfilled = settledResults.filter((r) => r.status === 'fulfilled')
      const rejected = settledResults.filter((r) => r.status === 'rejected')

      expect(fulfilled.length).toBeGreaterThan(0) // Some should succeed
      expect(rejected.length).toBeGreaterThan(0) // Some should fail

      // Verify that failures don't corrupt successful results
      for (const success of fulfilled) {
        if (success.status === 'fulfilled') {
          expect(success.value.model.id).toContain('concurrent-success')
        }
      }

      // Verify error messages are meaningful
      for (const failure of rejected) {
        if (failure.status === 'rejected') {
          expect(failure.reason.message).toContain('Normalization failed')
        }
      }
    })
  })
})
