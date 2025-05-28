import { createLogger } from '@/utils/logger'
import type { MentalLLaMAProvider } from '../providers/MentalLLaMAProvider' // Adjusted path
import type { MentalLLaMATypes } from '../types' // Adjusted path
import { getMentalLLaMAProvider } from '../factories/mentalLLaMAFactory' // Adjusted path
import { getInterpersonalRiskPrompt } from '../prompts/presets' // Adjusted path, assumes prompt exists

const logger = createLogger({ context: 'InterpersonalRiskAnalyzer' })

export interface InterpersonalRiskAnalysisInput {
  text: string
  sessionId?: string
  userId?: string
}

// Define common interpersonal risk factors
// This list can be expanded based on clinical guidelines or specific requirements
export interface InterpersonalRiskFactors {
  socialIsolation?: boolean
  relationshipConflict?: boolean // e.g., arguments, dissatisfaction
  lackOfSupport?: boolean // e.g., feeling alone, no one to turn to
  communicationDifficulties?: boolean
  recentLossOrBereavement?: boolean
  abuseOrNeglectHistory?: boolean // Can be current or past
  bullying?: boolean
  significantLifeChanges?: boolean // e.g., divorce, job loss impacting relationships
  other?: string[] // For any other specific factors identified by the LLM
}

export interface InterpersonalRiskEvidence {
  factor: keyof InterpersonalRiskFactors | string
  quote: string
  confidence: number
}

export interface InterpersonalRiskAnalysisResult {
  hasIdentifiedRisks: boolean
  confidence: number // Overall confidence in the presence of any risk
  identifiedRiskFactors: InterpersonalRiskFactors // Map of identified factors
  evidence: InterpersonalRiskEvidence[] // Supporting quotes/evidence for each factor
  summary?: string // LLM-generated summary of interpersonal risks
  llmResponse?: MentalLLaMATypes.ModelResponse // Optional: raw LLM response for debugging
  error?: string
}

const DEFAULT_ANALYSIS_RESULT: Omit<
  InterpersonalRiskAnalysisResult,
  'hasIdentifiedRisks' | 'confidence'
> = {
  identifiedRiskFactors: {},
  evidence: [],
}

/**
 * Analyzes input text for interpersonal risk factors using MentalLLaMA.
 * @param params - The input parameters for analysis.
 * @returns A promise that resolves to an InterpersonalRiskAnalysisResult.
 */
export async function analyzeInterpersonalRisk(
  params: InterpersonalRiskAnalysisInput,
): Promise<InterpersonalRiskAnalysisResult> {
  const { text, sessionId, userId } = params
  logger.info('Starting interpersonal risk analysis', {
    sessionId,
    userId,
    textLength: text.length,
  })

  if (!text || text.trim().length === 0) {
    logger.warn('Input text is empty. Skipping analysis.', {
      sessionId,
      userId,
    })
    return {
      ...DEFAULT_ANALYSIS_RESULT,
      hasIdentifiedRisks: false,
      confidence: 0,
      error: 'Input text is empty',
    }
  }

  let provider: MentalLLaMAProvider
  try {
    provider = await getMentalLLaMAProvider('mental-llama-13b') // Or preferred model
  } catch (error) {
    logger.error(
      'Failed to get MentalLLaMA provider for interpersonal risk analysis',
      { error, sessionId, userId },
    )
    return {
      ...DEFAULT_ANALYSIS_RESULT,
      hasIdentifiedRisks: false,
      confidence: 0,
      error: 'Failed to initialize MentalLLaMA provider',
    }
  }

  const promptDetails = getInterpersonalRiskPrompt(text)
  // Ensure prompt schema requests structured JSON output for InterpersonalRiskFactors, evidence, and summary
  const promptSchema = {
    type: 'object',
    properties: {
      hasIdentifiedRisks: {
        type: 'boolean',
        description:
          'Overall assessment if any interpersonal risks are present.',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Overall confidence in the risk assessment.',
      },
      identifiedRiskFactors: {
        type: 'object',
        properties: {
          socialIsolation: { type: 'boolean' },
          relationshipConflict: { type: 'boolean' },
          lackOfSupport: { type: 'boolean' },
          communicationDifficulties: { type: 'boolean' },
          recentLossOrBereavement: { type: 'boolean' },
          abuseOrNeglectHistory: { type: 'boolean' },
          bullying: { type: 'boolean' },
          significantLifeChanges: { type: 'boolean' },
          other: { type: 'array', items: { type: 'string' } },
        },
        description: 'Flags for various identified interpersonal risk factors.',
      },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            factor: {
              type: 'string',
              description: 'The specific risk factor the evidence pertains to.',
            },
            quote: {
              type: 'string',
              description: 'Direct quote from the text supporting the factor.',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence in this specific piece of evidence.',
            },
          },
          required: ['factor', 'quote', 'confidence'],
        },
        description:
          'List of text segments supporting identified risk factors.',
      },
      summary: {
        type: 'string',
        description:
          'A brief summary of the identified interpersonal risks and their context.',
      },
    },
    required: [
      'hasIdentifiedRisks',
      'confidence',
      'identifiedRiskFactors',
      'evidence',
      'summary',
    ],
  }

  try {
    logger.debug(
      'Sending request to MentalLLaMA for interpersonal risk analysis',
      {
        sessionId,
        userId,
        promptLength: promptDetails.messages.reduce(
          (sum, m) => sum + m.content.length,
          0,
        ),
      },
    )

    const response = await provider.chat({
      messages: promptDetails.messages,
      temperature: 0.4, // Moderate temperature for nuanced analysis but consistent structure
      max_tokens: 700, // Allow for detailed evidence and summary
      response_format: { type: 'json_object', schema: promptSchema }, // Request structured JSON output
    })

    if (response.error || !response.content) {
      logger.error(
        'MentalLLaMA provider returned an error or empty content for interpersonal risk analysis',
        {
          error: response.error,
          hasContent: !!response.content,
          sessionId,
          userId,
        },
      )
      return {
        ...DEFAULT_ANALYSIS_RESULT,
        hasIdentifiedRisks: false,
        confidence: 0,
        error: response.error?.message || 'LLM returned empty or error state',
        llmResponse: response,
      }
    }

    // Attempt to parse the structured JSON content
    // Robust parsing with validation (e.g., Zod) should be used here in a real scenario
    const parsedContent = JSON.parse(
      response.content,
    ) as Partial<InterpersonalRiskAnalysisResult>

    // Basic validation of the parsed content
    if (
      typeof parsedContent.hasIdentifiedRisks !== 'boolean' ||
      typeof parsedContent.confidence !== 'number' ||
      !parsedContent.identifiedRiskFactors ||
      !Array.isArray(parsedContent.evidence)
    ) {
      logger.warn(
        'Parsed LLM content for interpersonal risk analysis is missing required fields or has incorrect types',
        {
          parsedContent,
          sessionId,
          userId,
        },
      )
      return {
        ...DEFAULT_ANALYSIS_RESULT,
        hasIdentifiedRisks: false,
        confidence: 0,
        error: 'LLM response parsing failed due to missing/invalid fields',
        llmResponse: response,
      }
    }

    logger.info(
      'Successfully received and parsed interpersonal risk analysis from MentalLLaMA',
      { sessionId, userId },
    )
    return {
      hasIdentifiedRisks: parsedContent.hasIdentifiedRisks,
      confidence: parsedContent.confidence,
      identifiedRiskFactors:
        parsedContent.identifiedRiskFactors as InterpersonalRiskFactors,
      evidence: parsedContent.evidence as InterpersonalRiskEvidence[],
      summary: parsedContent.summary,
      llmResponse: response,
    }
  } catch (error) {
    logger.error(
      'An unexpected error occurred during interpersonal risk analysis',
      {
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
        sessionId,
        userId,
      },
    )
    return {
      ...DEFAULT_ANALYSIS_RESULT,
      hasIdentifiedRisks: false,
      confidence: 0,
      error: 'Unexpected error during analysis process',
    }
  }
}
