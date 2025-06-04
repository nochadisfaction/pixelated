import type { EmotionData, EmotionAnalysis, LLMResponse } from './types'

interface LLMService {
  analyzeEmotionsWithLLM(
    prompt: string,
    options?: { context?: Record<string, unknown> },
  ): Promise<LLMResponse<EmotionData[]>>
}

interface DatabaseService {
  storeEmotionAnalysis(analysis: Omit<EmotionAnalysis, 'id'>): Promise<string>
}

export class EmotionDetector {
  llm: LLMService
  database: DatabaseService

  constructor() {
    // Default implementations
    this.llm = {
      analyzeEmotionsWithLLM: async () => ({
        data: [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        meta: {
          prompt: 'Default prompt',
          model: 'default',
          processingTime: 0,
        },
      }),
    }

    this.database = {
      storeEmotionAnalysis: async () => 'default-id',
    }
  }

  async detectEmotionsFromText(
    text: string,
    userId: string,
  ): Promise<EmotionAnalysis> {
    try {
      const prompt = `Analyze emotions in: ${text}`
      const result = await this.llm.analyzeEmotionsWithLLM(prompt)

      return {
        id: '',
        userId,
        timestamp: new Date().toISOString(),
        source: 'text',
        input: text,
        emotions: result.data,
      }
    } catch (error) {
      console.error('Error detecting emotions from text:', error)
      return {
        id: '',
        userId,
        timestamp: new Date().toISOString(),
        source: 'text',
        input: text,
        emotions: [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async detectEmotionsFromFacialData(
    facialData: Record<string, unknown>,
    userId: string,
  ): Promise<EmotionAnalysis> {
    try {
      const prompt = 'Analyze emotions in facial data'
      const result = await this.llm.analyzeEmotionsWithLLM(prompt, {
        context: { facialData },
      })

      return {
        id: '',
        userId,
        timestamp: new Date().toISOString(),
        source: 'facial',
        input: facialData,
        emotions: result.data,
      }
    } catch (error) {
      console.error('Error detecting emotions from facial data:', error)
      return {
        id: '',
        userId,
        timestamp: new Date().toISOString(),
        source: 'facial',
        input: facialData,
        emotions: [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async detectEmotionsFromVoice(
    voiceData: Record<string, unknown>,
    transcript: string,
    userId: string,
  ): Promise<EmotionAnalysis> {
    try {
      const prompt = `Analyze emotions in: ${transcript}`
      const result = await this.llm.analyzeEmotionsWithLLM(prompt, {
        context: { voiceData },
      })

      return {
        id: '',
        userId,
        timestamp: new Date().toISOString(),
        source: 'voice',
        input: voiceData,
        content: transcript,
        emotions: result.data,
      }
    } catch (error) {
      console.error('Error detecting emotions from voice:', error)
      return {
        id: '',
        userId,
        timestamp: new Date().toISOString(),
        source: 'voice',
        input: voiceData,
        content: transcript,
        emotions: [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  calculateOverallSentiment(emotions: EmotionData[]): number {
    if (!emotions || emotions.length === 0) {
      return 0.5
    }

    // Emotion sentiment mappings (-1 to 1 scale)
    const sentimentMappings: Record<string, number> = {
      joy: 0.8,
      happiness: 0.8,
      excitement: 0.7,
      calm: 0.5,
      neutral: 0,
      anxiety: -0.4,
      sadness: -0.7,
      anger: -0.8,
      despair: -0.9,
    }

    // Calculate weighted average sentiment
    let totalSentiment = 0
    let totalWeight = 0

    emotions.forEach((emotion) => {
      const sentiment = sentimentMappings[emotion.type] || 0
      const weight = emotion.confidence * emotion.intensity

      totalSentiment += sentiment * weight
      totalWeight += weight
    })

    // Convert from -1:1 scale to 0:1 scale
    return totalWeight > 0 ? (totalSentiment / totalWeight + 1) / 2 : 0.5
  }

  identifyRiskFactors(emotions: EmotionData[]): Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
  }> {
    if (!emotions || emotions.length === 0) {
      return []
    }

    const riskFactors: Array<{
      type: string
      severity: 'low' | 'medium' | 'high'
    }> = []

    // Risk factor mappings
    const riskMappings: Record<
      string,
      { severity: 'low' | 'medium' | 'high'; threshold: number }
    > = {
      anger: { severity: 'high', threshold: 0.7 },
      despair: { severity: 'high', threshold: 0.6 },
      anxiety: { severity: 'medium', threshold: 0.5 },
      sadness: { severity: 'medium', threshold: 0.6 },
      mild_anxiety: { severity: 'low', threshold: 0.3 },
    }

    emotions.forEach((emotion) => {
      const mapping = riskMappings[emotion.type]
      if (mapping && emotion.intensity >= mapping.threshold) {
        riskFactors.push({
          type: emotion.type,
          severity: mapping.severity,
        })
      }
    })

    return riskFactors
  }
}
