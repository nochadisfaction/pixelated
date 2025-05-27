import type { ContextFactors } from './ContextualAwarenessService'
import { TechniqueDatabaseService } from './TechniqueDatabaseService'
import type { TherapeuticTechnique } from './RecommendationService'

/**
 * Interface for outcome-based recommendation request
 */
export interface OutcomeRecommendationRequest {
  context: ContextFactors
  desiredOutcomes: string[] // e.g., ['reduce anxiety', 'improve sleep']
  maxResults?: number
}

/**
 * Interface for a ranked recommendation
 */
export interface RankedRecommendation {
  technique: TherapeuticTechnique
  score: number // 0-1, higher is better
  rationale: string
}

/**
 * Outcome-based Recommendation Engine
 * Generates and ranks recommendations based on user context and desired outcomes.
 */
export class OutcomeRecommendationEngine {
  /**
   * Generate ranked recommendations
   * @param req OutcomeRecommendationRequest
   */
  static recommend(req: OutcomeRecommendationRequest): RankedRecommendation[] {
    const { context, desiredOutcomes, maxResults = 5 } = req
    if (!context || !Array.isArray(desiredOutcomes) || desiredOutcomes.length === 0) {
      throw new Error('Context and at least one desired outcome are required')
    }

    // Aggregate all relevant techniques
    const allTechniques = TechniqueDatabaseService.getAll()
    // Filter techniques by matching at least one desired outcome (by indication)
    const relevantTechniques = allTechniques.filter(t =>
      t.indicatedFor.some(indication =>
        desiredOutcomes.some(outcome =>
          indication.toLowerCase().includes(outcome.toLowerCase()) ||
          outcome.toLowerCase().includes(indication.toLowerCase())
        )
      )
    )

    // Score and rank techniques
    const ranked: RankedRecommendation[] = relevantTechniques.map(technique => {
      // Score based on evidence, context, and outcome match
      let score = technique.efficacyRating
      let rationale = `Efficacy rating: ${technique.efficacyRating}`

      // Boost score if user context matches technique indications
      if (context.recentEmotionState && technique.indicatedFor.includes('anxiety') && context.recentEmotionState.valence < 0) {
        score += 0.05
        rationale += '; matches recent negative valence (anxiety)'
      }
      if (context.mentalHealthAnalysis) {
        for (const key of Object.keys(context.mentalHealthAnalysis.scores)) {
          if (technique.indicatedFor.includes(key)) {
            score += 0.03
            rationale += `; matches mental health score: ${key}`
          }
        }
      }
      // Penalize if contraindications match user context (example: severe cognitive impairment)
      if (technique.contraindications.some(contra =>
        (context.mentalHealthAnalysis?.riskFactors || []).includes(contra)
      )) {
        score -= 0.2
        rationale += '; contraindication present'
      }
      // Clamp score between 0 and 1
      score = Math.max(0, Math.min(1, score))
      return { technique, score, rationale }
    })

    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score)
    return ranked.slice(0, maxResults)
  }
} 