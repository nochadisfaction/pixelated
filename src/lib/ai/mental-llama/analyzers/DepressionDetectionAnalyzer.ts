import {
  MentalLLaMAModelProvider,
  MentalLLaMAClassificationResponse,
} from '../MentalLLaMAModelProvider'
import { createLogger } from '@/utils/logger'
import { redactPotentialPhi } from '@/lib/utils/phi-sanitizer'

const logger = createLogger({ context: 'DepressionDetectionAnalyzer' })

export interface DepressionAnalysisResult {
  isDepressionDetected: boolean
  confidence: number | null
  explanation: string | null
  details: MentalLLaMAClassificationResponse | null // Raw response for further details
  error?: string
}

/**
 * Analyzer focused on detecting signs of depression using MentalLLaMAModelProvider.
 */
export class DepressionDetectionAnalyzer {
  private modelProvider: MentalLLaMAModelProvider

  constructor(modelProvider: MentalLLaMAModelProvider) {
    this.modelProvider = modelProvider
    logger.info('DepressionDetectionAnalyzer initialized.')
  }

  /**
   * Analyzes a given text for signs of depression.
   * @param text The input text to analyze.
   * @returns A Promise resolving to a DepressionAnalysisResult.
   */
  public async analyze(text: string): Promise<DepressionAnalysisResult> {
    logger.info(
      `Analyzing text for depression (sanitized): ${redactPotentialPhi(text)}`,
    )

    if (!text || text.trim() === '') {
      logger.warn('Input text is empty. Returning no detection.')
      return {
        isDepressionDetected: false,
        confidence: null,
        explanation: null,
        details: null,
        error: 'Input text cannot be empty.',
      }
    }

    try {
      const classificationResponse =
        await this.modelProvider.classifyMentalHealth(text)

      // Assuming the first choice is the most relevant
      const choice = classificationResponse.choices?.[0]

      if (!choice || !choice.message || !choice.message.classification) {
        logger.error(
          'Invalid or incomplete classification response from model provider.',
          { choice },
        )
        return {
          isDepressionDetected: false,
          confidence: null,
          explanation: null,
          details: classificationResponse,
          error: 'Incomplete classification data received from the model.',
        }
      }

      const { category, confidence, explanation } =
        choice.message.classification

      // Check if the detected category is depression (or a related term if the model uses variants)
      // For now, we'll do an exact match on 'depression'. This might need refinement
      // based on the actual categories returned by the model.
      const isDepression = category.toLowerCase() === 'depression'

      if (isDepression) {
        logger.info(
          `Depression detected with confidence: ${confidence}. Category: ${category}`,
        )
        return {
          isDepressionDetected: true,
          confidence: confidence,
          explanation: explanation,
          details: classificationResponse,
        }
      } else {
        logger.info(
          `Depression not the primary detected category. Detected: ${category} with confidence: ${confidence}.`,
        )
        return {
          isDepressionDetected: false,
          confidence: null, // Or return the confidence of the actual category if relevant
          explanation: null, // Or return the explanation of the actual category
          details: classificationResponse, // Still return full details for context
        }
      }
    } catch (error: any) {
      logger.error(`Error during depression analysis: ${error.message}`, {
        stack: error.stack,
      })
      return {
        isDepressionDetected: false,
        confidence: null,
        explanation: null,
        details: null,
        error: error.message || 'An unexpected error occurred during analysis.',
      }
    }
  }
}

// Example Usage (for illustration, not part of the file itself typically):
/*
async function example() {
  // Assume getModelProvider is a way to get an initialized MentalLLaMAModelProvider
  const provider = getModelProvider(); 
  const depressionAnalyzer = new DepressionDetectionAnalyzer(provider);

  const textToAnalyze = "I've been feeling so down and hopeless for weeks. Nothing brings me joy anymore.";
  const result = await depressionAnalyzer.analyze(textToAnalyze);

  if (result.error) {
    console.error("Analysis failed:", result.error);
  } else {
    if (result.isDepressionDetected) {
      console.log("Depression detected!");
      console.log("Confidence:", result.confidence);
      console.log("Explanation:", result.explanation);
    } else {
      console.log("Depression not detected as the primary category.");
      // You can inspect result.details for what was actually detected.
      console.log("Detected category:", result.details?.choices[0]?.message.classification?.category);
    }
  }
}
*/
