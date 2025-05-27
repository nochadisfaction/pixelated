import { getMentalLLaMAProvider } from '@/lib/ai/mental-llama/providers/mentalLLaMAModelProvider' // Assuming path
import { getAnxietyPrompt } from '@/lib/ai/mental-llama/prompts/anxietyPrompts' // Assuming path
import { logger } from '@/lib/logging' // Assuming shared logger
import type {
  MentalLLaMARequest,
  MentalLLaMAResponse,
  MentalLLaMAError,
} from '@/lib/ai/mental-llama/types' // Assuming types

export interface AnxietyAnalysisInput {
  sessionId: string // For logging and context
  text: string
  userId?: string // Optional, for context if available
}

// Based on GAD-7 and other common anxiety indicators
export interface AnxietyIndicators {
  excessiveWorry: boolean
  restlessness: boolean
  fatigue: boolean // Can overlap with depression
  difficultyConcentrating: boolean // Can overlap
  irritability: boolean
  muscleTension: boolean
  sleepDisturbance: boolean // Can overlap
  panicAttackSymptoms?: boolean // e.g., palpitations, sweating, trembling
  avoidanceBehaviors?: boolean
  // Add other relevant clinical indicators for various anxiety disorders
}

export interface AnxietyAnalysisResult {
  sessionId: string
  hasAnxietyIndicators: boolean
  confidenceScore?: number // 0.0 - 1.0
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown' // Severity for general anxiety
  primaryType?: string // e.g., 'GAD', 'Social Anxiety', 'Panic Disorder', 'Unknown' - if model can differentiate
  identifiedIndicators: Partial<AnxietyIndicators>
  explanation: string // LLM-generated explanation
  timestamp: string
  error?: string
}

const PROVIDER_ID = 'mental-llama-13b' // Or make configurable

/**
 * Analyzes text for signs of anxiety using MentalLLaMA.
 * @param input - The input text and associated session/user identifiers.
 * @returns A promise that resolves to an AnxietyAnalysisResult.
 */
export async function analyzeAnxiety(
  input: AnxietyAnalysisInput,
): Promise<AnxietyAnalysisResult> {
  const { sessionId, text, userId } = input
  const timestamp = new Date().toISOString()

  try {
    if (!text || text.trim().length === 0) {
      logger.warn({
        sessionId,
        userId,
        message: 'Anxiety analysis: Input text is empty.',
      })
      return {
        sessionId,
        hasAnxietyIndicators: false,
        identifiedIndicators: {},
        explanation: 'Input text was empty.',
        timestamp,
        severity: 'unknown',
      }
    }

    const provider = getMentalLLaMAProvider(PROVIDER_ID)
    if (!provider) {
      logger.error({
        sessionId,
        userId,
        providerId: PROVIDER_ID,
        message: 'MentalLLaMA provider not found for anxiety analysis.',
      })
      throw new Error(`MentalLLaMA provider '${PROVIDER_ID}' not found.`)
    }

    const prompt = getAnxietyPrompt(text, {
      outputSchema: {
        hasAnxietyIndicators: 'boolean',
        confidenceScore: 'number (0.0-1.0)',
        severity: '"mild" | "moderate" | "severe" | "unknown"',
        primaryType:
          'string (e.g., GAD, Social Anxiety, Panic Disorder, Unknown)',
        identifiedIndicators:
          '{ excessiveWorry: boolean, restlessness: boolean, ... }',
        explanation: 'string (detailed explanation)',
      },
    })

    const request: MentalLLaMARequest = {
      prompt,
      maxTokens: 500,
      temperature: 0.3,
      sessionId,
      userId,
    }

    logger.info({
      sessionId,
      userId,
      message: 'Requesting anxiety analysis from MentalLLaMA.',
    })
    const response: MentalLLaMAResponse | MentalLLaMAError =
      await provider.generate(request)

    if ('error' in response) {
      logger.error({
        sessionId,
        userId,
        error: response.error,
        message: 'MentalLLaMA returned an error for anxiety analysis.',
      })
      return {
        sessionId,
        hasAnxietyIndicators: false,
        identifiedIndicators: {},
        explanation: 'Error during analysis from MentalLLaMA.',
        timestamp,
        error: response.error.message || 'Unknown LLM error',
        severity: 'unknown',
      }
    }

    let parsedData
    try {
      parsedData = JSON.parse(response.text)
    } catch (parseError) {
      logger.error({
        sessionId,
        userId,
        rawResponse: response.text,
        error: parseError,
        message: 'Failed to parse MentalLLaMA response for anxiety analysis.',
      })
      return {
        sessionId,
        hasAnxietyIndicators: false,
        identifiedIndicators: {},
        explanation:
          'Failed to parse LLM response. The raw response might contain partial insights.',
        timestamp,
        error: 'LLM response parsing failed.',
        severity: 'unknown',
      }
    }

    const {
      hasAnxietyIndicators = false,
      confidenceScore,
      severity = 'unknown',
      primaryType = 'Unknown',
      identifiedIndicators = {},
      explanation = 'No explanation provided.',
    } = parsedData

    logger.info({
      sessionId,
      userId,
      result: { hasAnxietyIndicators, confidenceScore, severity, primaryType },
      message: 'Anxiety analysis completed.',
    })

    return {
      sessionId,
      hasAnxietyIndicators,
      confidenceScore,
      severity,
      primaryType,
      identifiedIndicators,
      explanation,
      timestamp,
    }
  } catch (error) {
    logger.error({
      sessionId,
      userId,
      error,
      message: 'Unhandled error in analyzeAnxiety.',
    })
    return {
      sessionId,
      hasAnxietyIndicators: false,
      identifiedIndicators: {},
      explanation: 'An unexpected error occurred during anxiety analysis.',
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
      severity: 'unknown',
    }
  }
}

// Example Usage (for illustration):
/*
async function exampleAnxiety() {
  const input: AnxietyAnalysisInput = {
    sessionId: 'session-456',
    text: 'I can\'t stop worrying about everything, I feel restless all the time and my heart races.',
    userId: 'user-xyz'
  };
  const result = await analyzeAnxiety(input);
  console.log(result);
}
*/
