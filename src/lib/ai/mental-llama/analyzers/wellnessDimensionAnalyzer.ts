import { getMentalLLaMAProvider } from '@/lib/ai/mental-llama/providers/mentalLLaMAModelProvider' // Assuming path
import { getWellnessPrompt } from '@/lib/ai/mental-llama/prompts/wellnessPrompts' // Assuming path
import { logger } from '@/lib/logging' // Assuming shared logger
import type {
  MentalLLaMARequest,
  MentalLLaMAResponse,
  MentalLLaMAError,
} from '@/lib/ai/mental-llama/types' // Assuming types

export interface WellnessAnalysisInput {
  sessionId: string // For logging and context
  text: string
  userId?: string // Optional, for context if available
}

// Standard 8 dimensions of wellness
export interface WellnessDimensions {
  emotional: boolean
  physical: boolean
  social: boolean
  intellectual: boolean
  spiritual: boolean
  occupational: boolean
  environmental: boolean
  financial: boolean // Often included as the 8th dimension
}

// It might be useful for the LLM to also provide specific examples or quotes from the text
// that support the identification of each dimension.
export interface WellnessDimensionEvidence {
  dimension: keyof WellnessDimensions
  quote?: string // Example text snippet supporting the dimension
  confidence?: number // Confidence for this specific dimension
}

export interface WellnessAnalysisResult {
  sessionId: string
  identifiedWellnessDimensions: Partial<WellnessDimensions> // Which dimensions are present
  evidenceForEachDimension?: WellnessDimensionEvidence[] // Supporting quotes/confidence per dimension
  overallWellnessSummary?: string // LLM-generated qualitative summary
  timestamp: string
  error?: string
}

const PROVIDER_ID = 'mental-llama-13b' // Or make configurable

/**
 * Analyzes text for various dimensions of wellness using MentalLLaMA.
 * @param input - The input text and associated session/user identifiers.
 * @returns A promise that resolves to a WellnessAnalysisResult.
 */
export async function analyzeWellnessDimensions(
  input: WellnessAnalysisInput,
): Promise<WellnessAnalysisResult> {
  const { sessionId, text, userId } = input
  const timestamp = new Date().toISOString()

  try {
    if (!text || text.trim().length === 0) {
      logger.warn({
        sessionId,
        userId,
        message: 'Wellness analysis: Input text is empty.',
      })
      return {
        sessionId,
        identifiedWellnessDimensions: {},
        timestamp,
      }
    }

    const provider = getMentalLLaMAProvider(PROVIDER_ID)
    if (!provider) {
      logger.error({
        sessionId,
        userId,
        providerId: PROVIDER_ID,
        message: 'MentalLLaMA provider not found for wellness analysis.',
      })
      throw new Error(`MentalLLaMA provider '${PROVIDER_ID}' not found.`)
    }

    const prompt = getWellnessPrompt(text, {
      outputSchema: {
        identifiedWellnessDimensions:
          '{ emotional: boolean, physical: boolean, ... }',
        evidenceForEachDimension:
          'array of { dimension: string (keyof WellnessDimensions), quote?: string, confidence?: number }',
        overallWellnessSummary:
          'string (qualitative summary of wellness dimensions)',
      },
    })

    const request: MentalLLaMARequest = {
      prompt,
      maxTokens: 700, // May need more tokens for evidence and summary
      temperature: 0.5, // Balance creativity and factual identification
      sessionId,
      userId,
    }

    logger.info({
      sessionId,
      userId,
      message: 'Requesting wellness dimension analysis from MentalLLaMA.',
    })
    const response: MentalLLaMAResponse | MentalLLaMAError =
      await provider.generate(request)

    if ('error' in response) {
      logger.error({
        sessionId,
        userId,
        error: response.error,
        message: 'MentalLLaMA returned an error for wellness analysis.',
      })
      return {
        sessionId,
        identifiedWellnessDimensions: {},
        timestamp,
        error: response.error.message || 'Unknown LLM error',
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
        message: 'Failed to parse MentalLLaMA response for wellness analysis.',
      })
      return {
        sessionId,
        identifiedWellnessDimensions: {},
        timestamp,
        error: 'LLM response parsing failed.',
      }
    }

    const {
      identifiedWellnessDimensions = {},
      evidenceForEachDimension = [],
      overallWellnessSummary = 'No summary provided.',
    } = parsedData

    // Basic validation for evidence array
    const finalEvidence = Array.isArray(evidenceForEachDimension)
      ? evidenceForEachDimension
      : []

    logger.info({
      sessionId,
      userId,
      result: {
        dimensionCount: Object.values(identifiedWellnessDimensions).filter(
          Boolean,
        ).length,
      },
      message: 'Wellness dimension analysis completed.',
    })

    return {
      sessionId,
      identifiedWellnessDimensions,
      evidenceForEachDimension: finalEvidence,
      overallWellnessSummary,
      timestamp,
    }
  } catch (error) {
    logger.error({
      sessionId,
      userId,
      error,
      message: 'Unhandled error in analyzeWellnessDimensions.',
    })
    return {
      sessionId,
      identifiedWellnessDimensions: {},
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Example Usage (for illustration):
/*
async function exampleWellness() {
  const input: WellnessAnalysisInput = {
    sessionId: 'session-101',
    text: 'I\'ve been trying to eat healthy and exercise more (physical). Socially, I feel connected to my friends. Work is fulfilling (occupational), and I\'m learning a lot (intellectual). Emotionally, I\'m mostly content.',
    userId: 'user-pqr'
  };
  const result = await analyzeWellnessDimensions(input);
  console.log(JSON.stringify(result, null, 2));
}
*/
