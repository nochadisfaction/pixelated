import { createLogger } from '../../../utils/logger'
import type { EmotionAnalysis } from './types'
import type { DimensionalEmotionMap } from './dimensionalTypes'
import { EmotionDetectionEngine } from './EmotionDetectionEngine'
import { MultidimensionalEmotionMapper } from './MultidimensionalEmotionMapper'
import { PersonalizedBaselineEstablishment } from './PersonalizedBaselineEstablishment'
import type {
  EmotionalBaseline,
  BaselinePersonalizationParams,
} from './PersonalizedBaselineEstablishment'

const logger = createLogger({ context: 'EmotionAnalysisAPI' })

/**
 * API service providing interfaces for emotion analysis functionalities
 * Acts as a facade for the various emotion analysis components
 */
export class EmotionAnalysisAPI {
  private readonly emotionDetectionEngine: EmotionDetectionEngine
  private readonly emotionMapper: MultidimensionalEmotionMapper
  private readonly baselineEstablishment: PersonalizedBaselineEstablishment

  constructor() {
    this.emotionDetectionEngine = new EmotionDetectionEngine()
    this.emotionMapper = new MultidimensionalEmotionMapper()
    this.baselineEstablishment = new PersonalizedBaselineEstablishment()
    logger.debug('EmotionAnalysisAPI initialized')
  }

  /**
   * Analyzes emotions from text input
   *
   * @param text Text to analyze
   * @param context Optional context to improve analysis accuracy
   * @returns Comprehensive emotion analysis with dimensional mapping
   */
  public async analyzeEmotionsFromText(
    text: string,
    context?: Record<string, unknown>,
  ): Promise<{
    analysis: EmotionAnalysis
    dimensionalMapping: DimensionalEmotionMap
  }> {
    try {
      logger.debug('Analyzing emotions from text', { textLength: text.length })

      // Detect emotions from text
      const emotionAnalysis =
        await this.emotionDetectionEngine.detectEmotionsFromText(text, context)

      // Map emotions to dimensions
      const dimensionalMapping =
        this.emotionMapper.mapEmotionsToDimensions(emotionAnalysis)

      return {
        analysis: emotionAnalysis,
        dimensionalMapping,
      }
    } catch (error) {
      logger.error('Error analyzing emotions from text', { error })
      throw error
    }
  }

  /**
   * Analyzes emotions from audio/speech input
   *
   * @param audioData Audio data as ArrayBuffer
   * @param context Optional context to improve analysis accuracy
   * @returns Comprehensive emotion analysis with dimensional mapping
   */
  public async analyzeEmotionsFromSpeech(
    audioData: ArrayBuffer,
    context?: Record<string, unknown>,
  ): Promise<{
    analysis: EmotionAnalysis
    dimensionalMapping: DimensionalEmotionMap
  }> {
    try {
      logger.debug('Analyzing emotions from speech', {
        audioSize: audioData.byteLength,
      })

      // Detect emotions from speech
      const emotionAnalysis =
        await this.emotionDetectionEngine.detectEmotionsFromSpeech(
          audioData,
          context,
        )

      // Map emotions to dimensions
      const dimensionalMapping =
        this.emotionMapper.mapEmotionsToDimensions(emotionAnalysis)

      return {
        analysis: emotionAnalysis,
        dimensionalMapping,
      }
    } catch (error) {
      logger.error('Error analyzing emotions from speech', { error })
      throw error
    }
  }

  /**
   * Analyzes emotions from both text and speech for a more comprehensive result
   *
   * @param text Text to analyze
   * @param audioData Audio data as ArrayBuffer
   * @param context Optional context to improve analysis accuracy
   * @returns Combined comprehensive emotion analysis with dimensional mapping
   */
  public async analyzeEmotionsMultimodal(
    text: string,
    audioData: ArrayBuffer,
    context?: Record<string, unknown>,
  ): Promise<{
    analysis: EmotionAnalysis
    dimensionalMapping: DimensionalEmotionMap
  }> {
    try {
      logger.debug('Analyzing emotions using multimodal approach', {
        textLength: text.length,
        audioSize: audioData.byteLength,
      })

      // Analyze both text and speech separately
      const textAnalysis =
        await this.emotionDetectionEngine.detectEmotionsFromText(text, context)
      const speechAnalysis =
        await this.emotionDetectionEngine.detectEmotionsFromSpeech(
          audioData,
          context,
        )

      // Combine the analyses
      const combinedAnalysis =
        this.emotionDetectionEngine.combineTextAndSpeechAnalyses(
          textAnalysis,
          speechAnalysis,
        )

      // Map combined emotions to dimensions
      const dimensionalMapping =
        this.emotionMapper.mapEmotionsToDimensions(combinedAnalysis)

      return {
        analysis: combinedAnalysis,
        dimensionalMapping,
      }
    } catch (error) {
      logger.error('Error analyzing emotions using multimodal approach', {
        error,
      })
      throw error
    }
  }

  /**
   * Creates an emotional baseline for a user
   *
   * @param userId User ID
   * @param emotionAnalyses Previous emotion analyses to establish baseline
   * @param personalizationParams Optional personalization parameters
   * @returns Emotional baseline
   */
  public createEmotionalBaseline(
    userId: string,
    emotionAnalyses: EmotionAnalysis[],
    personalizationParams?: BaselinePersonalizationParams,
  ): EmotionalBaseline {
    try {
      logger.debug('Creating emotional baseline', {
        userId,
        analysesCount: emotionAnalyses.length,
      })

      return this.baselineEstablishment.createEmotionalBaseline(
        userId,
        emotionAnalyses,
        personalizationParams,
      )
    } catch (error) {
      logger.error('Error creating emotional baseline', { error, userId })
      throw error
    }
  }

  /**
   * Updates an existing emotional baseline with new data
   *
   * @param baseline Existing baseline to update
   * @param newAnalyses New emotion analyses to incorporate
   * @param personalizationParams Optional updated personalization parameters
   * @returns Updated emotional baseline
   */
  public updateEmotionalBaseline(
    baseline: EmotionalBaseline,
    newAnalyses: EmotionAnalysis[],
    personalizationParams?: BaselinePersonalizationParams,
  ): EmotionalBaseline {
    try {
      logger.debug('Updating emotional baseline', {
        userId: baseline.userId,
        newAnalysesCount: newAnalyses.length,
      })

      return this.baselineEstablishment.updateEmotionalBaseline(
        baseline,
        newAnalyses,
        personalizationParams,
      )
    } catch (error) {
      logger.error('Error updating emotional baseline', {
        error,
        userId: baseline.userId,
      })
      throw error
    }
  }

  /**
   * Normalizes an emotion analysis against a user's emotional baseline
   *
   * @param analysis Raw emotion analysis
   * @param baseline User's emotional baseline
   * @param currentContext Optional current context
   * @returns Normalized emotion analysis
   */
  public normalizeEmotionAnalysis(
    analysis: EmotionAnalysis,
    baseline: EmotionalBaseline,
    currentContext?: BaselinePersonalizationParams['environmentalContext'],
  ): EmotionAnalysis {
    try {
      logger.debug('Normalizing emotion analysis', {
        userId: baseline.userId,
        analysisTimestamp: analysis.timestamp,
      })

      return this.baselineEstablishment.normalizeEmotionAnalysis(
        analysis,
        baseline,
        currentContext,
      )
    } catch (error) {
      logger.error('Error normalizing emotion analysis', {
        error,
        userId: baseline.userId,
      })
      throw error
    }
  }

  /**
   * Creates an index entry to allow this service to be dynamically loaded
   * This helps with dependency injection and testing
   */
  static register(): { name: string; service: typeof EmotionAnalysisAPI } {
    return {
      name: 'emotionAnalysisAPI',
      service: EmotionAnalysisAPI,
    }
  }
}
