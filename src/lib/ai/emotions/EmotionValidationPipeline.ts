import {
  ContinuousValidationPipeline,
  createEmotionDetectionValidationTest,
  ValidationTestResult,
} from '../validation/ContinuousValidationPipeline'
import { getLogger } from '../../logging'
import { EmotionDetectionEngine } from './EmotionDetectionEngine'
import { createAuditLog, AuditEventType, AuditEventStatus } from '../../audit'

// Constants
export const EMOTION_VALIDATION_TYPE = 'emotion-detection'
const VALIDATION_FREQUENCY = 3 * 60 * 60 * 1000 // 3 hours in milliseconds
const ALERT_THRESHOLD = 0.85 // Alert if accuracy drops below 85%
const CRITICAL_THRESHOLD = 0.75 // Critical alert if accuracy drops below 75%

/**
 * Factory dataset for validation tests
 */
export interface EmotionValidationDataset {
  name: string
  description: string
  tests: Array<{
    input: string
    expectedOutput: {
      emotions: Record<string, number>
      dominantEmotion: string
      confidence: number
      dimensionalModel: {
        pleasure: number
        arousal: number
        dominance: number
      }
    }
  }>
}

/**
 * Alert data for validation results
 */
export interface ValidationAlertData {
  testType: string
  overallAccuracy: number
  modelsBelow: Array<{
    model: string
    accuracy: number
    provider: string
    belowThreshold: boolean
    criticalThreshold: boolean
  }>
  timestamp: Date
  runId: string
}

/**
 * Manages continuous validation for emotion detection models
 * to ensure they maintain accuracy over time and across different inputs.
 */
export class EmotionValidationPipeline {
  private static instance: EmotionValidationPipeline
  private pipeline: ContinuousValidationPipeline
  private logger = getLogger({ prefix: 'emotion-validation-pipeline' })
  private emotionEngine: EmotionDetectionEngine
  private testDatasets: Map<string, EmotionValidationDataset> = new Map()
  private alertCallbacks: Array<(results: ValidationAlertData) => void> = []
  private _isInitialized = false
  private runCount = 0
  private lastRunTimestamp: Date | null = null

  private constructor() {
    this.pipeline = ContinuousValidationPipeline.getInstance({
      validationFrequency: VALIDATION_FREQUENCY,
      createAuditLogs: true,
      alertThreshold: ALERT_THRESHOLD,
    })
    this.emotionEngine = new EmotionDetectionEngine()
  }

  /**
   * Get the singleton instance of the emotion validation pipeline
   */
  public static getInstance(): EmotionValidationPipeline {
    if (!EmotionValidationPipeline.instance) {
      EmotionValidationPipeline.instance = new EmotionValidationPipeline()
    }
    return EmotionValidationPipeline.instance
  }

  /**
   * Get whether the pipeline has been initialized
   */
  public get isInitialized(): boolean {
    return this._isInitialized
  }

  /**
   * Initialize the validation pipeline with default test datasets
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      return
    }

    try {
      // Load default test datasets
      await this.loadDefaultTestDatasets()

      // Register all tests
      this.registerAllTests()

      // Create audit log for initialization
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'emotion-validation-pipeline-init',
        'system',
        'emotion-validation',
        {
          datasetCount: this.testDatasets.size,
          testsRegistered: this.countRegisteredTests(),
        },
        AuditEventStatus.SUCCESS,
      )

      this._isInitialized = true
      this.logger.info('Emotion validation pipeline initialized successfully')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(
        `Failed to initialize emotion validation pipeline: ${errorMessage}`,
      )

      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'emotion-validation-pipeline-init',
        'system',
        'emotion-validation',
        {
          error: errorMessage,
        },
        AuditEventStatus.FAILURE,
      )

      throw new Error(
        `Emotion validation pipeline initialization failed: ${errorMessage}`,
      )
    }
  }

  /**
   * Start continuous validation for emotion detection
   */
  public startContinuousValidation(): void {
    if (!this._isInitialized) {
      throw new Error('Emotion validation pipeline not initialized')
    }

    this.pipeline.startContinuousValidation(EMOTION_VALIDATION_TYPE)
    this.logger.info('Started continuous validation for emotion detection')
  }

  /**
   * Stop continuous validation for emotion detection
   */
  public stopContinuousValidation(): void {
    this.pipeline.stopValidation(EMOTION_VALIDATION_TYPE)
    this.logger.info('Stopped continuous validation for emotion detection')
  }

  /**
   * Run validation manually
   */
  public async runValidation(): Promise<ValidationTestResult[]> {
    if (!this._isInitialized) {
      throw new Error('Emotion validation pipeline not initialized')
    }

    this.runCount++
    this.lastRunTimestamp = new Date()

    try {
      const results = await this.pipeline.runValidation(EMOTION_VALIDATION_TYPE)

      // Process results for alerts
      this.processValidationResults(results)

      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Error running emotion validation: ${errorMessage}`)

      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'emotion-validation-run',
        'system',
        'emotion-validation',
        {
          error: errorMessage,
          runId: `run-${this.runCount}`,
        },
        AuditEventStatus.FAILURE,
      )

      return []
    }
  }

  /**
   * Get the latest validation results
   */
  public getValidationResults(): ValidationTestResult[] {
    return this.pipeline.getValidationResults(EMOTION_VALIDATION_TYPE)
  }

  /**
   * Register an alert callback that will be called when validation thresholds are not met
   */
  public registerAlertCallback(
    callback: (results: ValidationAlertData) => void,
  ): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * Get validation statistics
   */
  public getValidationStats() {
    const stats = this.pipeline.getValidationStats()
    return {
      ...stats,
      emotionDetectionStats: stats.byTestType[EMOTION_VALIDATION_TYPE] || {
        total: 0,
        passed: 0,
      },
      lastRun: this.lastRunTimestamp,
      runCount: this.runCount,
    }
  }

  /**
   * Add a new test dataset
   */
  public addTestDataset(dataset: EmotionValidationDataset): void {
    this.testDatasets.set(dataset.name, dataset)
    this.registerTestsForDataset(dataset)
  }

  /**
   * Private methods
   */

  private async loadDefaultTestDatasets(): Promise<void> {
    // Load basic emotion dataset
    const basicEmotionDataset: EmotionValidationDataset = {
      name: 'basic-emotions',
      description:
        'Dataset covering basic emotions across different text types',
      tests: [
        {
          input: "I'm feeling really happy today! Everything is going well.",
          expectedOutput: {
            emotions: {
              joy: 0.8,
              contentment: 0.7,
              excitement: 0.6,
            },
            dominantEmotion: 'joy',
            confidence: 0.85,
            dimensionalModel: {
              pleasure: 0.8,
              arousal: 0.6,
              dominance: 0.7,
            },
          },
        },
        {
          input:
            "I'm devastated by this news. I don't know how to cope with it.",
          expectedOutput: {
            emotions: {
              sadness: 0.85,
              grief: 0.75,
              despair: 0.65,
            },
            dominantEmotion: 'sadness',
            confidence: 0.9,
            dimensionalModel: {
              pleasure: -0.8,
              arousal: -0.3,
              dominance: -0.6,
            },
          },
        },
        {
          input: "I'm so angry at how I was treated! This is unacceptable!",
          expectedOutput: {
            emotions: {
              anger: 0.9,
              frustration: 0.8,
              indignation: 0.7,
            },
            dominantEmotion: 'anger',
            confidence: 0.85,
            dimensionalModel: {
              pleasure: -0.7,
              arousal: 0.8,
              dominance: 0.4,
            },
          },
        },
      ],
    }

    // Load clinical expression dataset
    const clinicalExpressionDataset: EmotionValidationDataset = {
      name: 'clinical-expressions',
      description:
        'Dataset covering emotional expressions in clinical contexts',
      tests: [
        {
          input:
            "I've been feeling numb lately, like I'm disconnected from everything around me.",
          expectedOutput: {
            emotions: {
              detachment: 0.8,
              emptiness: 0.7,
              apathy: 0.6,
            },
            dominantEmotion: 'detachment',
            confidence: 0.75,
            dimensionalModel: {
              pleasure: -0.4,
              arousal: -0.7,
              dominance: -0.3,
            },
          },
        },
        {
          input:
            'I find myself worrying constantly about things that might go wrong.',
          expectedOutput: {
            emotions: {
              anxiety: 0.85,
              worry: 0.8,
              apprehension: 0.7,
            },
            dominantEmotion: 'anxiety',
            confidence: 0.8,
            dimensionalModel: {
              pleasure: -0.6,
              arousal: 0.7,
              dominance: -0.5,
            },
          },
        },
      ],
    }

    // Add datasets to the map
    this.testDatasets.set(basicEmotionDataset.name, basicEmotionDataset)
    this.testDatasets.set(
      clinicalExpressionDataset.name,
      clinicalExpressionDataset,
    )

    this.logger.info(`Loaded ${this.testDatasets.size} default test datasets`)
  }

  private registerAllTests(): void {
    let registeredCount = 0
    for (const dataset of this.testDatasets.values()) {
      registeredCount += this.registerTestsForDataset(dataset)
    }
    this.logger.info(`Registered ${registeredCount} validation tests`)
  }

  private registerTestsForDataset(dataset: EmotionValidationDataset): number {
    let registeredCount = 0

    // Get all models and providers from the emotion engine
    const supportedModels = [
      { name: 'llama-7b', provider: 'llama' },
      { name: 'bert-emotions', provider: 'huggingface' },
    ]

    for (const testData of dataset.tests) {
      for (const model of supportedModels) {
        const test = createEmotionDetectionValidationTest(
          model.name,
          model.provider,
          testData,
        )

        this.pipeline.registerValidationTest(EMOTION_VALIDATION_TYPE, test)
        registeredCount++
      }
    }

    return registeredCount
  }

  private countRegisteredTests(): number {
    const supportedModelsCount = 2 // Assuming 2 models as in the mock above

    return (
      this.testDatasets.size *
      [...this.testDatasets.values()].reduce(
        (count, dataset) => count + dataset.tests.length,
        0,
      ) *
      supportedModelsCount
    )
  }

  private processValidationResults(results: ValidationTestResult[]): void {
    if (results.length === 0) {
      return
    }

    const modelResults = new Map<
      string,
      {
        passed: number
        total: number
        model: string
        provider: string
      }
    >()

    // Group results by model
    for (const result of results) {
      const key = `${result.model}|${result.provider}`
      if (!modelResults.has(key)) {
        modelResults.set(key, {
          passed: 0,
          total: 0,
          model: result.model,
          provider: result.provider,
        })
      }

      const stats = modelResults.get(key)!
      stats.total++
      if (result.passed) {
        stats.passed++
      }
    }

    // Calculate overall accuracy
    const totalTests = results.length
    const passedTests = results.filter((r) => r.passed).length
    const overallAccuracy = passedTests / totalTests

    // Check for models below threshold
    const modelsBelow = []
    for (const [, stats] of modelResults) {
      const accuracy = stats.passed / stats.total
      const belowThreshold = accuracy < ALERT_THRESHOLD
      const criticalThreshold = accuracy < CRITICAL_THRESHOLD

      if (belowThreshold) {
        modelsBelow.push({
          model: stats.model,
          provider: stats.provider,
          accuracy,
          belowThreshold,
          criticalThreshold,
        })
      }
    }

    // Create alert data
    const alertData: ValidationAlertData = {
      testType: EMOTION_VALIDATION_TYPE,
      overallAccuracy,
      modelsBelow,
      timestamp: new Date(),
      runId: `run-${this.runCount}`,
    }

    // Log validation results
    this.logger.info(
      `Validation run completed. Overall accuracy: ${(overallAccuracy * 100).toFixed(2)}%, Models below threshold: ${modelsBelow.length}`,
    )

    // Check if we need to fire alerts
    if (modelsBelow.length > 0 || overallAccuracy < ALERT_THRESHOLD) {
      // Create audit log for alert
      createAuditLog(
        AuditEventType.AI_OPERATION,
        'emotion-validation-alert',
        'system',
        'emotion-validation',
        {
          testType: alertData.testType,
          overallAccuracy: alertData.overallAccuracy,
          modelsBelowCount: alertData.modelsBelow.length,
          runId: alertData.runId,
        },
        overallAccuracy < CRITICAL_THRESHOLD
          ? AuditEventStatus.FAILURE
          : AuditEventStatus.FAILURE,
      )

      // Notify all alert callbacks
      for (const callback of this.alertCallbacks) {
        try {
          callback(alertData)
        } catch (error) {
          this.logger.error(`Error in alert callback: ${error}`)
        }
      }
    }
  }
}

// Export singleton instance
export const emotionValidationPipeline = EmotionValidationPipeline.getInstance()
