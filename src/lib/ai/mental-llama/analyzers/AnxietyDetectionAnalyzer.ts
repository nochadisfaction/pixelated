import {
  MentalLLaMAModelProvider,
  MentalLLaMAClassificationResponse,
} from '../MentalLLaMAModelProvider'
import { createLogger } from '@/utils/logger'
import { redactPotentialPhi } from '@/lib/utils/phi-sanitizer'

const logger = createLogger({ context: 'AnxietyDetectionAnalyzer' })

export interface AnxietyAnalysisResult {
  isAnxietyDetected: boolean
  confidence: number | null
  explanation: string | null
  details: MentalLLaMAClassificationResponse | null // Raw response for further details
  error?: string
}

/**
 * Analyzer focused on detecting signs of anxiety using MentalLLaMAModelProvider.
 */
export class AnxietyDetectionAnalyzer {
  private modelProvider: MentalLLaMAModelProvider

  constructor(modelProvider: MentalLLaMAModelProvider) {
    this.modelProvider = modelProvider
    logger.info('AnxietyDetectionAnalyzer initialized.')
  }

  /**
   * Analyzes a given text for signs of anxiety.
   * @param text The input text to analyze.
   * @returns A Promise resolving to an AnxietyAnalysisResult.
   */
  public async analyze(text: string): Promise<AnxietyAnalysisResult> {
    logger.info(
      `Analyzing text for anxiety (sanitized): ${redactPotentialPhi(text)}`,
    )

    if (!text || text.trim() === '') {
      logger.warn('Input text is empty. Returning no detection.')
      return {
        isAnxietyDetected: false,
        confidence: null,
        explanation: null,
        details: null,
        error: 'Input text cannot be empty.',
      }
    }

    try {
      const classificationResponse =
        await this.modelProvider.classifyMentalHealth(text)

      const choice = classificationResponse.choices?.[0]

      if (!choice || !choice.message || !choice.message.classification) {
        logger.error(
          'Invalid or incomplete classification response from model provider.',
          { choice },
        )
        return {
          isAnxietyDetected: false,
          confidence: null,
          explanation: null,
          details: classificationResponse,
          error: 'Incomplete classification data received from the model.',
        }
      }

      const { category, confidence, explanation } =
        choice.message.classification

      // Check if the detected category is anxiety.
      // This might need refinement based on the actual categories returned by the model.
      const isAnxiety = category.toLowerCase() === 'anxiety'

      if (isAnxiety) {
        logger.info(
          `Anxiety detected with confidence: ${confidence}. Category: ${category}`,
        )
        return {
          isAnxietyDetected: true,
          confidence: confidence,
          explanation: explanation,
          details: classificationResponse,
        }
      } else {
        logger.info(
          `Anxiety not the primary detected category. Detected: ${category} with confidence: ${confidence}.`,
        )
        return {
          isAnxietyDetected: false,
          confidence: null,
          explanation: null,
          details: classificationResponse,
        }
      }
    } catch (error: any) {
      logger.error(`Error during anxiety analysis: ${error.message}`, {
        stack: error.stack,
      })
      return {
        isAnxietyDetected: false,
        confidence: null,
        explanation: null,
        details: null,
        error: error.message || 'An unexpected error occurred during analysis.',
      }
    }
  }
}
