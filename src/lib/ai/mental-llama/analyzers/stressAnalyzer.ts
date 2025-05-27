import { getMentalLLaMAProvider } from '@/lib/ai/mental-llama/providers/mentalLLaMAModelProvider' // Assuming path
import { getStressPrompt } from '@/lib/ai/mental-llama/prompts/stressPrompts' // Assuming path
import { logger } from '@/lib/logging' // Assuming shared logger
import type {
  MentalLLaMARequest,
  MentalLLaMAResponse,
  MentalLLaMAError,
} from '@/lib/ai/mental-llama/types' // Assuming types

export interface StressAnalysisInput {
  sessionId: string // For logging and context
  text: string
  userId?: string // Optional, for context if available
}

// Common stress indicators and potential categories of stressors
export interface StressIndicators {
  // General Symptoms
  feelingOverwhelmed: boolean
  irritabilityOrAnger: boolean
  fatigue: boolean
  headachesOrDizziness: boolean
  muscleTensionOrPain: boolean
  sleepProblems: boolean
  changesInAppetite: boolean
  difficultyConcentrating: boolean
  // Potential Stressor Categories - model should identify specific causes if possible
  workRelatedStress?: boolean
  financialStress?: boolean
  relationshipStress?: boolean
  healthStress?: boolean // Personal or family health
  majorLifeChangeStress?: boolean
  dailyHasslesStress?: boolean
  // Add other relevant clinical indicators or stressor categories
}

export interface StressAnalysisResult {
  sessionId: string
  hasStressIndicators: boolean
  confidenceScore?: number // 0.0 - 1.0
  overallSeverity?: 'low' | 'moderate' | 'high' | 'unknown'
  identifiedIndicators: Partial<StressIndicators>
  identifiedStressors: string[] // Array of specific stressors identified by the LLM
  explanation: string // LLM-generated explanation of stress and its causes
  timestamp: string
  error?: string
}

const PROVIDER_ID = 'mental-llama-13b' // Or make configurable

/**
 * Analyzes text for signs and causes of stress using MentalLLaMA.
 * @param input - The input text and associated session/user identifiers.
 * @returns A promise that resolves to a StressAnalysisResult.
 */
export async function analyzeStress(
  input: StressAnalysisInput,
): Promise<StressAnalysisResult> {
  const { sessionId, text, userId } = input
  const timestamp = new Date().toISOString()

  try {
    if (!text || text.trim().length === 0) {
      logger.warn({
        sessionId,
        userId,
        message: 'Stress analysis: Input text is empty.',
      })
      return {
        sessionId,
        hasStressIndicators: false,
        identifiedIndicators: {},
        identifiedStressors: [],
        explanation: 'Input text was empty.',
        timestamp,
        overallSeverity: 'unknown',
      }
    }

    const provider = getMentalLLaMAProvider(PROVIDER_ID)
    if (!provider) {
      logger.error({
        sessionId,
        userId,
        providerId: PROVIDER_ID,
        message: 'MentalLLaMA provider not found for stress analysis.',
      })
      throw new Error(`MentalLLaMA provider '${PROVIDER_ID}' not found.`)
    }

    const prompt = getStressPrompt(text, {
      outputSchema: {
        hasStressIndicators: 'boolean',
        confidenceScore: 'number (0.0-1.0)',
        overallSeverity: '"low" | "moderate" | "high" | "unknown"',
        identifiedIndicators:
          '{ feelingOverwhelmed: boolean, irritabilityOrAnger: boolean, ... }',
        identifiedStressors: 'array of strings (specific causes of stress)',
        explanation: 'string (detailed explanation of stress and its causes)',
      },
    })

    const request: MentalLLaMARequest = {
      prompt,
      maxTokens: 600, // Potentially longer explanation for causes
      temperature: 0.4, // Slightly higher for more nuanced cause identification
      sessionId,
      userId,
    }

    logger.info({
      sessionId,
      userId,
      message: 'Requesting stress analysis from MentalLLaMA.',
    })
    const response: MentalLLaMAResponse | MentalLLaMAError =
      await provider.generate(request)

    if ('error' in response) {
      logger.error({
        sessionId,
        userId,
        error: response.error,
        message: 'MentalLLaMA returned an error for stress analysis.',
      })
      return {
        sessionId,
        hasStressIndicators: false,
        identifiedIndicators: {},
        identifiedStressors: [],
        explanation: 'Error during analysis from MentalLLaMA.',
        timestamp,
        error: response.error.message || 'Unknown LLM error',
        overallSeverity: 'unknown',
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
        message: 'Failed to parse MentalLLaMA response for stress analysis.',
      })
      return {
        sessionId,
        hasStressIndicators: false,
        identifiedIndicators: {},
        identifiedStressors: [],
        explanation:
          'Failed to parse LLM response. The raw response might contain partial insights.',
        timestamp,
        error: 'LLM response parsing failed.',
        overallSeverity: 'unknown',
      }
    }

    const {
      hasStressIndicators = false,
      confidenceScore,
      overallSeverity = 'unknown',
      identifiedIndicators = {},
      identifiedStressors = [],
      explanation = 'No explanation provided.',
    } = parsedData

    // Basic validation for identifiedStressors being an array
    const finalStressors = Array.isArray(identifiedStressors)
      ? identifiedStressors
      : []

    logger.info({
      sessionId,
      userId,
      result: {
        hasStressIndicators,
        confidenceScore,
        overallSeverity,
        stressorCount: finalStressors.length,
      },
      message: 'Stress analysis completed.',
    })

    return {
      sessionId,
      hasStressIndicators,
      confidenceScore,
      overallSeverity,
      identifiedIndicators,
      identifiedStressors: finalStressors,
      explanation,
      timestamp,
    }
  } catch (error) {
    logger.error({
      sessionId,
      userId,
      error,
      message: 'Unhandled error in analyzeStress.',
    })
    return {
      sessionId,
      hasStressIndicators: false,
      identifiedIndicators: {},
      identifiedStressors: [],
      explanation: 'An unexpected error occurred during stress analysis.',
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
      overallSeverity: 'unknown',
    }
  }
}

// Example Usage (for illustration):
/*
async function exampleStress() {
  const input: StressAnalysisInput = {
    sessionId: 'session-789',
    text: 'I am so overwhelmed with my job deadlines and my kid is sick. I can\'t sleep and have constant headaches.',
    userId: 'user-mno'
  };
  const result = await analyzeStress(input);
  console.log(JSON.stringify(result, null, 2));
}
*/
