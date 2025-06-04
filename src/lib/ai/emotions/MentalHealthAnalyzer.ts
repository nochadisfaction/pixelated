import { getLogger } from '../../utils/logger'
import { EmotionDetectionEngine } from './EmotionDetectionEngine'

export interface MentalHealthAnalysis {
  category: 'low' | 'medium' | 'high'
  explanation?: string
  expertGuided?: boolean
  scores?: {
    depression: number
    anxiety: number
    stress: number
    anger: number
    socialIsolation: number
    [key: string]: number | undefined
  }
  timestamp: number
}

export class MentalHealthAnalyzer {
  private logger = getLogger('MentalHealthAnalyzer')
  private emotionEngine: EmotionDetectionEngine

  constructor() {
    this.emotionEngine = new EmotionDetectionEngine()
  }

  async analyzeMessage(message: string): Promise<MentalHealthAnalysis> {
    try {
      // Use EmotionDetectionEngine for analysis
      const emotionAnalysis =
        await this.emotionEngine.detectEmotionsFromText(message)

      // Map emotions to mental health scores
      const scores = {
        depression: this.getEmotionIntensity(
          emotionAnalysis.emotions,
          'sadness',
        ),
        anxiety: this.getEmotionIntensity(emotionAnalysis.emotions, 'anxiety'),
        stress: this.getEmotionIntensity(emotionAnalysis.emotions, 'stress'),
        anger: this.getEmotionIntensity(emotionAnalysis.emotions, 'anger'),
        socialIsolation: this.getEmotionIntensity(
          emotionAnalysis.emotions,
          'loneliness',
        ),
      }

      // Determine risk category
      const category = this.determineRiskCategory(scores)

      // Generate explanation if needed
      const explanation = this.generateExplanation(scores, category)

      // Check if expert guidance is needed
      const expertGuided = emotionAnalysis.requiresAttention || false

      return {
        category,
        explanation,
        expertGuided,
        scores,
        timestamp: Date.now(),
      }
    } catch (error) {
      this.logger.error('Error analyzing message', { error })
      return {
        category: 'low',
        explanation: 'Unable to perform detailed analysis',
        timestamp: Date.now(),
      }
    }
  }

  private getEmotionIntensity(
    emotions: Array<{ type: string; intensity: number }>,
    type: string,
  ): number {
    return emotions.find((e) => e.type === type)?.intensity || 0
  }

  private determineRiskCategory(
    scores: MentalHealthAnalysis['scores'],
  ): MentalHealthAnalysis['category'] {
    if (!scores) {
      return 'low'
    }

    const validScores = Object.values(scores).filter(
      (score): score is number => score !== undefined,
    )
    if (validScores.length === 0) {
      return 'low'
    }

    const avgScore =
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length

    if (avgScore > 0.7) {
      return 'high'
    }
    if (avgScore > 0.4) {
      return 'medium'
    }
    return 'low'
  }

  private generateExplanation(
    scores: MentalHealthAnalysis['scores'],
    category: MentalHealthAnalysis['category'],
  ): string {
    if (!scores) {
      return 'No detailed analysis available'
    }

    const highScores = Object.entries(scores)
      .filter(([_, score]) => score && score > 0.6)
      .map(([emotion]) => emotion)

    if (category === 'high') {
      return `High levels of ${highScores.join(', ')} detected. Consider professional support.`
    }

    if (category === 'medium') {
      return `Moderate levels of ${highScores.join(', ')} observed. Monitor and practice self-care.`
    }

    return 'No concerning patterns detected.'
  }
}
