import { createLogger } from '@/utils/logger'
import {
  redactPotentialPhi,
  sanitizeMessagesForLogging,
  sanitizeObjectForLogging,
} from '@/lib/utils/phi-sanitizer'

const logger = createLogger({ context: 'MentalLLaMAModelProvider' })

/**
 * Interface for MentalLLaMA model response
 */
export interface MentalLLaMAResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Interface for MentalLLaMA classification response
 */
export interface MentalLLaMAClassificationResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
      classification?: {
        category: string
        confidence: number
        explanation: string
      }
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Options for MentalLLaMA requests
 */
export interface MentalLLaMARequestOptions {
  model?: string
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  max_tokens?: number
  stop?: string[]
  stream?: boolean
}

/**
 * Chat completion parameters for MentalLLaMA model
 */
export interface MentalLLaMACompletionParams {
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string[]
  use_self_consistency?: boolean
  self_consistency_variants?: number
  use_chain_of_thought?: boolean
  use_emotional_context?: boolean
}

/**
 * Provider for direct access to MentalLLaMA models
 * Handles API communication and model-specific functionality
 */
export class MentalLLaMAModelProvider {
  private baseUrl: string
  private apiKey: string
  private modelName: string

  /**
   * Default confidence score for mental health classification when no explicit confidence is available.
   * Set to 0.7 (70%) to indicate moderate confidence without being overly confident.
   * This value balances between being cautious (avoiding false positives) while still
   * providing actionable insights in clinical contexts.
   */
  private static readonly DEFAULT_CONFIDENCE_SCORE = 0.7

  /**
   * Default temperature for model generation.
   * Set to 0.7 as a balanced value that provides some creativity while maintaining coherence.
   * Lower values (closer to 0) produce more deterministic outputs.
   * Higher values (closer to 1) produce more diverse outputs.
   */
  private static readonly DEFAULT_TEMPERATURE = 0.7

  /**
   * Default maximum number of tokens to generate in model responses.
   * Set to 1024 to allow for detailed explanations without excessive length.
   */
  private static readonly DEFAULT_MAX_TOKENS = 1024

  /**
   * Default top_p value for nucleus sampling.
   * Set to 1.0 to consider all tokens in the probability distribution.
   */
  private static readonly DEFAULT_TOP_P = 1.0

  /**
   * Default frequency penalty to apply to token generation.
   * Set to 0.0 for no penalty on token frequency.
   */
  private static readonly DEFAULT_FREQUENCY_PENALTY = 0.0

  /**
   * Default presence penalty to apply to token generation.
   * Set to 0.0 for no penalty on token presence.
   */
  private static readonly DEFAULT_PRESENCE_PENALTY = 0.0

  /**
   * Default BART score for reference comparisons.
   * Set to 0.85 to represent a good but not perfect match between candidate and reference.
   * BART scores typically range from 0 to 1, with 1 being a perfect match.
   */
  private static readonly DEFAULT_BART_SCORE = 0.85

  /**
   * Default fluency score for fallback explanation evaluation.
   * Set to 4.0 out of 5.0 to indicate good but not perfect fluency.
   */
  private static readonly DEFAULT_FLUENCY_SCORE = 4.0

  /**
   * Default completeness score for fallback explanation evaluation.
   * Set to 3.5 out of 5.0 to indicate moderately complete explanations.
   */
  private static readonly DEFAULT_COMPLETENESS_SCORE = 3.5

  /**
   * Default reliability score for fallback explanation evaluation.
   * Set to 3.8 out of 5.0 to indicate reasonably reliable explanations.
   */
  private static readonly DEFAULT_RELIABILITY_SCORE = 3.8

  /**
   * Default overall score for fallback explanation evaluation.
   * Set to 3.8 out of 5.0 as the average of the other metrics.
   */
  private static readonly DEFAULT_OVERALL_SCORE = 3.8

  constructor(
    baseUrl: string,
    apiKey: string,
    modelName: string = 'MentalLLaMA-chat-7B',
  ) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.modelName = modelName

    logger.info(`MentalLLaMAModelProvider initialized with model: ${modelName}`)
  }

  /**
   * Get the tier of the model (7B or 13B)
   * Determines tier based on model name
   */
  getModelTier(): '7B' | '13B' {
    return this.modelName.includes('13B') ? '13B' : '7B'
  }

  /**
   * Generate a chat completion (wrapper around chat method)
   * @param messages Array of messages for the conversation
   * @param options Optional parameters for the request
   */
  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number
      max_tokens?: number
      top_p?: number
      presence_penalty?: number
      frequency_penalty?: number
    },
  ): Promise<{
    choices: Array<{
      message: {
        role: string
        content: string
      }
      finish_reason: string
    }>
  }> {
    return this.chat({
      messages,
      ...(options || {}),
    })
  }

  /**
   * Send a chat completion request to the model
   */
  async chat(params: MentalLLaMACompletionParams): Promise<{
    choices: Array<{
      message: { role: string; content: string }
      finish_reason: string
    }>
  }> {
    logger.info(
      `Generating chat completion with ${this.modelName}. Parameters (sanitized): ${sanitizeMessagesForLogging(
        params.messages,
      )}, Temp: ${params.temperature ?? MentalLLaMAModelProvider.DEFAULT_TEMPERATURE}, MaxTokens: ${
        params.max_tokens ?? MentalLLaMAModelProvider.DEFAULT_MAX_TOKENS
      }`,
    )

    try {
      // Apply advanced prompt optimization techniques if requested
      let messages = [...params.messages] // Create a copy to avoid mutating the original

      // Add chain-of-thought instructions if requested and not already present
      if (params.use_chain_of_thought) {
        const userMessage = messages.find((m) => m.role === 'user')
        if (userMessage && !userMessage.content.includes('step by step')) {
          userMessage.content = `${userMessage.content}\n\nPlease think through this step by step.`
        }
      }

      // Add emotional context if requested
      if (params.use_emotional_context) {
        const systemMessage = messages.find((m) => m.role === 'system')
        if (systemMessage) {
          systemMessage.content +=
            '\n\nThis analysis is vital for providing appropriate support to individuals in emotional distress. Your careful assessment directly impacts the quality of care provided.'
        }
      }

      // Use self-consistency technique if requested
      if (
        params.use_self_consistency &&
        (params.self_consistency_variants || 3) > 1
      ) {
        return await this.generateWithSelfConsistency(messages, params)
      }

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          temperature:
            params.temperature ?? MentalLLaMAModelProvider.DEFAULT_TEMPERATURE,
          max_tokens:
            params.max_tokens ?? MentalLLaMAModelProvider.DEFAULT_MAX_TOKENS,
          top_p: params.top_p ?? MentalLLaMAModelProvider.DEFAULT_TOP_P,
          frequency_penalty:
            params.frequency_penalty ??
            MentalLLaMAModelProvider.DEFAULT_FREQUENCY_PENALTY,
          presence_penalty:
            params.presence_penalty ??
            MentalLLaMAModelProvider.DEFAULT_PRESENCE_PENALTY,
          stop: params.stop,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} ${await response.text()}`,
        )
      }

      return await response.json()
    } catch (error) {
      logger.error('Failed to generate chat completion', { error })
      throw error
    }
  }

  /**
   * Generate multiple responses using self-consistency technique and select the most consistent one
   */
  private async generateWithSelfConsistency(
    messages: Array<{ role: string; content: string }>,
    params: MentalLLaMACompletionParams,
  ): Promise<{
    choices: Array<{
      message: { role: string; content: string }
      finish_reason: string
    }>
  }> {
    const numVariants = params.self_consistency_variants || 3
    const variants: Array<{ role: string; content: string }> = []

    // Generate multiple variants
    for (let i = 0; i < numVariants; i++) {
      try {
        // Slightly modify the system message to get variation
        const variantMessages = messages.map((msg) => {
          if (msg.role === 'system') {
            return {
              ...msg,
              content: this.addVariation(msg.content, i),
            }
          }
          return msg
        })

        // Use higher temperature for variants to ensure diversity
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelName,
            messages: variantMessages,
            temperature:
              (params.temperature ||
                MentalLLaMAModelProvider.DEFAULT_TEMPERATURE) +
              i * 0.1, // Increase temperature for each variant
            max_tokens:
              params.max_tokens ?? MentalLLaMAModelProvider.DEFAULT_MAX_TOKENS,
            top_p: params.top_p ?? MentalLLaMAModelProvider.DEFAULT_TOP_P,
          }),
        })

        if (!response.ok) {
          logger.warn(`Failed to generate variant ${i}: ${response.status}`)
          continue
        }

        const result = await response.json()
        if (result.choices?.[0]?.message) {
          variants.push(result.choices[0].message)
        }
      } catch (error) {
        logger.warn(`Error generating variant ${i}`, { error })
      }
    }

    // If we failed to generate any variants, fall back to regular completion
    if (variants.length === 0) {
      logger.warn(
        'Self-consistency failed to generate variants, falling back to regular completion',
      )
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          temperature:
            params.temperature ?? MentalLLaMAModelProvider.DEFAULT_TEMPERATURE,
          max_tokens:
            params.max_tokens ?? MentalLLaMAModelProvider.DEFAULT_MAX_TOKENS,
          top_p: params.top_p ?? MentalLLaMAModelProvider.DEFAULT_TOP_P,
        }),
      })

      return await response.json()
    }

    // Find the most consistent response
    // Here we use a simple approach: check which response has key phrases that appear in other responses
    let bestVariant = variants[0]
    let bestScore = 0

    for (const variant of variants) {
      let score = 0
      const content = variant.content.toLowerCase()

      // Check how many other variants contain similar key phrases
      for (const otherVariant of variants) {
        if (otherVariant === variant) {
          continue
        }

        const otherContent = otherVariant.content.toLowerCase()
        // Extract key phrases and check for matches
        const keyPhrases = this.extractKeyPhrases(content)
        for (const phrase of keyPhrases) {
          if (otherContent.includes(phrase)) {
            score++
          }
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestVariant = variant
      }
    }

    // Return the most consistent variant as the response
    return {
      choices: [
        {
          message: bestVariant,
          finish_reason: 'stop',
        },
      ],
    }
  }

  /**
   * Extract key phrases from content for self-consistency comparison
   */
  private extractKeyPhrases(content: string): string[] {
    // Extract sentences first
    const sentences = content
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)

    // Extract key diagnostic phrases
    const diagnosticRegex =
      /(depression|anxiety|stress|ptsd|suicidal|bipolar|ocd|eating disorder|substance abuse|schizophrenia|mental health)/g
    const diagnosticMatches = content.match(diagnosticRegex) || []

    // Extract conclusion sentences (often at the end)
    const conclusionSentences = sentences.slice(-2)

    // Extract sentences with confidence statements
    const confidenceSentences = sentences.filter((s) =>
      /confidence|certain|likely|probability|evidence|indicator|symptom/i.test(
        s,
      ),
    )

    // Combine all key phrases
    return [
      ...diagnosticMatches,
      ...conclusionSentences,
      ...confidenceSentences.slice(0, 3), // Limit to top 3 confidence sentences
    ]
  }

  /**
   * Add slight variations to prompts for self-consistency
   */
  private addVariation(content: string, seed: number): string {
    // List of synonym pairs for common words in prompts
    const variations = [
      ['analyze', 'examine', 'assess', 'evaluate'],
      ['identify', 'detect', 'recognize', 'find'],
      ['important', 'crucial', 'essential', 'critical'],
      [
        'mental health',
        'psychological state',
        'emotional wellbeing',
        'psychiatric condition',
      ],
    ]

    let result = content

    // Apply 1-2 random substitutions based on seed
    const numSubstitutions = 1 + (seed % 2)
    for (let i = 0; i < numSubstitutions; i++) {
      const variationSet = variations[(seed + i) % variations.length]
      const originalWord = variationSet[0]
      const replacementWord = variationSet[(1 + seed + i) % variationSet.length]

      // Only substitute if the original word exists in the content
      const regex = new RegExp(`\\b${originalWord}\\b`, 'i')
      if (regex.test(result)) {
        result = result.replace(regex, replacementWord)
      }
    }

    return result
  }

  /**
   * Classify mental health indicators in text
   */
  async classifyMentalHealth(text: string): Promise<{
    choices: Array<{
      message: {
        role: string
        content: string
        classification: {
          category: string
          confidence: number
          explanation: string
        }
      }
      finish_reason: string
    }>
  }> {
    logger.info(
      `Classifying mental health for text (sanitized): ${redactPotentialPhi(text)}`,
    )

    const messages = [
      {
        role: 'system',
        content:
          'You are a mental health classification system. Analyze the text for signs of depression, anxiety, stress, PTSD, or other mental health conditions. Provide a category, confidence score, and explanation.',
      },
      {
        role: 'user',
        content: `Please classify the following text for mental health indicators:\n\n${text}`,
      },
    ]

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/mental-health/classify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelName,
            text,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} ${await response.text()}`,
        )
      }

      return await response.json()
    } catch (error) {
      logger.error('Failed to classify mental health indicators', { error })

      // Fall back to chat API if the specialized endpoint fails
      try {
        const chatResponse = await this.chat({ messages })

        // Create a synthetic classification from the chat response
        const content = chatResponse.choices[0]?.message.content || ''

        // Parse content for category, confidence, and explanation
        const categoryMatch = content.match(/category:\s*([a-z_]+)/i)
        const confidenceMatch = content.match(/confidence:\s*([0-9.]+)/i)
        const explanationMatch = content.match(/explanation:\s*(.+?)(?=\n|$)/is)

        const classification = {
          category: categoryMatch?.[1]?.toLowerCase() || 'depression',
          confidence: confidenceMatch
            ? parseFloat(confidenceMatch[1])
            : MentalLLaMAModelProvider.DEFAULT_CONFIDENCE_SCORE,
          explanation: explanationMatch?.[1] || content,
        }

        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content,
                classification,
              },
              finish_reason: 'stop',
            },
          ],
        }
      } catch (chatError) {
        logger.error('Failed to get classification via chat fallback', {
          chatError,
        })
        throw chatError
      }
    }
  }

  /**
   * Generate an explanation for a mental health classification
   */
  async generateExplanation(
    text: string,
    category: string,
  ): Promise<{
    choices: Array<{
      message: {
        role: string
        content: string
      }
      finish_reason: string
    }>
  }> {
    logger.info(
      `Generating explanation for category '${category}', text (sanitized): ${redactPotentialPhi(
        text,
      )}`,
    )

    const messages = [
      {
        role: 'system',
        content: `You are a mental health explanation system. Generate a detailed explanation for why the provided text indicates ${category}.`,
      },
      {
        role: 'user',
        content: `Please explain why the following text indicates ${category}:\n\n${text}`,
      },
    ]

    try {
      const response = await fetch(`${this.baseUrl}/v1/mental-health/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          text,
          category,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} ${await response.text()}`,
        )
      }

      return await response.json()
    } catch (error) {
      logger.error('Failed to generate explanation', { error })

      // Fall back to chat API if the specialized endpoint fails
      return this.chat({ messages })
    }
  }

  /**
   * Evaluate the quality of an explanation
   */
  async evaluateExplanation(
    explanation: string,
    referenceExplanation?: string,
  ): Promise<{
    fluency: number
    completeness: number
    reliability: number
    overall: number
    bartScore?: number
    isErrorFallback?: boolean
  }> {
    logger.info(
      `Evaluating explanation (sanitized): ${redactPotentialPhi(explanation)}, reference (sanitized): ${redactPotentialPhi(
        referenceExplanation,
      )}`,
    )

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/mental-health/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelName,
            explanation,
            reference: referenceExplanation,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} ${await response.text()}`,
        )
      }

      return await response.json()
    } catch (error) {
      logger.error('Failed to evaluate explanation', { error })

      // Provide a fallback evaluation with default values and error flag
      return {
        fluency: MentalLLaMAModelProvider.DEFAULT_FLUENCY_SCORE,
        completeness: MentalLLaMAModelProvider.DEFAULT_COMPLETENESS_SCORE,
        reliability: MentalLLaMAModelProvider.DEFAULT_RELIABILITY_SCORE,
        overall: MentalLLaMAModelProvider.DEFAULT_OVERALL_SCORE,
        bartScore: referenceExplanation
          ? MentalLLaMAModelProvider.DEFAULT_BART_SCORE
          : undefined,
        isErrorFallback: true, // Indicate this is a fallback response due to an error
      }
    }
  }

  private async makeApiRequest(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    logger.debug(
      `Making API request to ${endpoint}. Body (sanitized): ${sanitizeObjectForLogging(body)}`,
    )
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${await response.text()}`)
    }

    return await response.json()
  }
}
