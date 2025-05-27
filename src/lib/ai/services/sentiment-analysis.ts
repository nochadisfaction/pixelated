import type {
  AIMessage,
  AIService,
  SentimentAnalysisResult,
} from '../models/types'
import { getDefaultModelForCapability } from '../models/registry'

/**
 * Sentiment Analysis Service Configuration
 */
export interface SentimentAnalysisConfig {
  aiService: AIService
  model?: string
  defaultPrompt?: string
}

/**
 * Sentiment Analysis Service Implementation
 */
export class SentimentAnalysisService {
  private aiService: AIService
  private model: string
  private defaultPrompt: string

  constructor(config: SentimentAnalysisConfig) {
    this.aiService = config.aiService
    this.model =
      config.model ??
      getDefaultModelForCapability('sentiment')?.id ??
      'mistralai/Mixtral-8x7B-Instruct-v0.2'
    this.defaultPrompt =
      config.defaultPrompt ||
      `Analyze the sentiment of the following text. Provide a score from -1 (very negative) to 1 (very positive),
      a label (negative, neutral, or positive), and a confidence score from 0 to 1.
      Also identify the emotions present in the text with their intensity scores from 0 to 1.

      Return the result as a JSON object with the following structure:
      {
        "score": number,
        "label": "negative" | "neutral" | "positive",
        "confidence": number,
        "emotions": {
          "joy": number,
          "sadness": number,
          "anger": number,
          "fear": number,
          "surprise": number,
          "disgust": number
        }
      }`
  }

  /**
   * Analyze the sentiment of a text
   */
  async analyzeSentiment(
    text: string,
    customPrompt?: string,
  ): Promise<SentimentAnalysisResult> {
    const startTime = Date.now()
    const prompt = customPrompt || this.defaultPrompt

    const messages: AIMessage[] = [
      { role: 'system', content: prompt, name: '' },
      { role: 'user', content: text, name: '' },
    ]

    const response = await this.aiService.createChatCompletion(messages, {
      model: this.model,
    })

    try {
      // Extract JSON from response
      const content = response?.choices?.[0]?.message?.content || ''
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*?\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const parsedResult = JSON.parse(jsonStr)

      // Check if result is an object before proceeding
      if (typeof parsedResult !== 'object' || parsedResult === null) {
        throw new Error('Sentiment analysis result is not an object')
      }

      // Extract the sentiment data fields
      const { score, label, confidence, emotions } =
        parsedResult as Partial<SentimentAnalysisResult>

      if (
        typeof score !== 'number' ||
        typeof confidence !== 'number' ||
        !label
      ) {
        throw new Error('Missing required fields in sentiment analysis result')
      }

      // Return with required fields and metadata
      return {
        score,
        label: label as 'positive' | 'negative' | 'neutral',
        confidence,
        emotions,
        // Additional metadata (not in interface)
        model: this.model,
        processingTime: Date.now() - startTime,
      } as SentimentAnalysisResult & { model: string; processingTime: number }
    } catch {
      throw new Error('Failed to parse sentiment analysis result')
    }
  }

  /**
   * Analyze the sentiment of multiple texts
   */
  async analyzeBatch(texts: string[]): Promise<SentimentAnalysisResult[]> {
    return Promise.all(texts.map((text) => this.analyzeSentiment(text)))
  }
}
