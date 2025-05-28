/**
 * Patient-Psi Dataset Indexer
 *
 * Creates efficient indices for fast lookup of cognitive models based on:
 * - Core beliefs (by category and domain)
 * - Emotional patterns (by emotion type and intensity)
 * - Situational triggers (by context and theme)
 * - Conversational styles (by style type and difficulty)
 *
 * Security: All indices are read-only and data is validated before indexing
 */

import type { CognitiveModel } from '../types/CognitiveModel'

export interface ModelIndex {
  // Belief-based indices
  beliefsByDomain: Map<string, string[]> // domain -> model IDs
  beliefsByCategory: Map<string, string[]> // belief category -> model IDs
  beliefsByStrength: Map<number, string[]> // strength level -> model IDs

  // Emotion-based indices
  emotionsByType: Map<string, string[]> // emotion type -> model IDs
  emotionsByIntensity: Map<number, string[]> // intensity level -> model IDs
  emotionsByTrigger: Map<string, string[]> // trigger theme -> model IDs

  // Situation-based indices
  situationsByContext: Map<string, string[]> // context type -> model IDs
  situationsByTheme: Map<string, string[]> // theme -> model IDs

  // Style-based indices
  stylesByType: Map<string, string[]> // style type -> model IDs
  stylesByDifficulty: Map<string, string[]> // difficulty -> model IDs

  // Combined indices for complex queries
  diagnosisByType: Map<string, string[]> // diagnosis -> model IDs
  demographicsByAge: Map<string, string[]> // age range -> model IDs
  demographicsByGender: Map<string, string[]> // gender -> model IDs

  // Metadata
  totalModels: number
  lastUpdated: Date
  indexVersion: string
}

export interface SearchCriteria {
  beliefDomains?: string[]
  beliefCategories?: string[]
  beliefStrengthRange?: [number, number]
  emotionTypes?: string[]
  emotionIntensityRange?: [number, number]
  situationThemes?: string[]
  conversationalStyles?: string[]
  diagnoses?: string[]
  ageRange?: [number, number]
  gender?: string
  maxResults?: number
}

export interface SearchResult {
  modelId: string
  score: number // Relevance score based on criteria match
  matchedCriteria: string[] // Which criteria this model matched
}

export class PatientPsiIndexer {
  private index: ModelIndex
  private models: Map<string, CognitiveModel> = new Map()

  constructor() {
    this.index = this.createEmptyIndex()
  }

  /**
   * Build comprehensive indices from cognitive models
   */
  async buildIndices(models: CognitiveModel[]): Promise<void> {
    console.log(`Building indices for ${models.length} cognitive models...`)

    // Reset index
    this.index = this.createEmptyIndex()
    this.models.clear()

    // Validate and process each model
    for (const model of models) {
      if (this.validateModel(model)) {
        this.models.set(model.id, model)
        this.indexModel(model)
      } else {
        console.warn(`Skipping invalid model: ${model.id}`)
      }
    }

    this.index.totalModels = this.models.size
    this.index.lastUpdated = new Date()

    console.log(`Successfully indexed ${this.index.totalModels} models`)
    this.logIndexStatistics()
  }

  /**
   * Search for models based on criteria
   */
  searchModels(criteria: SearchCriteria): SearchResult[] {
    const results: Map<string, SearchResult> = new Map()
    const maxResults = criteria.maxResults || 50

    // Score models based on criteria matches
    for (const [modelId, model] of this.models) {
      const score = this.calculateRelevanceScore(model, criteria)
      const matchedCriteria = this.getMatchedCriteria(model, criteria)

      if (score > 0) {
        results.set(modelId, {
          modelId,
          score,
          matchedCriteria,
        })
      }
    }

    // Sort by relevance score and return top results
    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
  }

  /**
   * Get models by specific belief domain
   */
  getModelsByBeliefDomain(domain: string): string[] {
    return this.index.beliefsByDomain.get(domain) || []
  }

  /**
   * Get models by emotional pattern
   */
  getModelsByEmotion(emotion: string, minIntensity?: number): string[] {
    const emotionModels = this.index.emotionsByType.get(emotion) || []

    if (minIntensity === undefined) {
      return emotionModels
    }

    // Filter by minimum intensity
    return emotionModels.filter((modelId) => {
      const model = this.models.get(modelId)
      if (!model) {
        return false
      }

      return model.emotionalPatterns.some(
        (pattern) =>
          pattern.emotion === emotion && pattern.intensity >= minIntensity,
      )
    })
  }

  /**
   * Get models by conversational style
   */
  getModelsByConversationalStyle(style: string): string[] {
    return this.index.stylesByType.get(style) || []
  }

  /**
   * Get models suitable for specific training scenarios
   */
  getModelsForTrainingScenario(scenario: {
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    focus: 'depression' | 'anxiety' | 'trauma' | 'general'
    stylePreference?: string
  }): SearchResult[] {
    const criteria: SearchCriteria = {
      maxResults: 10,
    }

    // Map difficulty to conversational styles
    switch (scenario.difficulty) {
      case 'beginner':
        criteria.conversationalStyles = ['plain', 'pleasing']
        break
      case 'intermediate':
        criteria.conversationalStyles = ['verbose', 'tangent']
        break
      case 'advanced':
        criteria.conversationalStyles = ['upset', 'reserved']
        break
      default:
        // Fallback to intermediate level styles for unhandled difficulty values
        criteria.conversationalStyles = ['plain', 'verbose']
        break
    }

    // Map focus to diagnoses
    switch (scenario.focus) {
      case 'depression':
        criteria.diagnoses = [
          'depression',
          'major depressive disorder',
          'dysthymia',
        ]
        break
      case 'anxiety':
        criteria.diagnoses = [
          'anxiety',
          'generalized anxiety disorder',
          'panic disorder',
        ]
        break
      case 'trauma':
        criteria.diagnoses = ['ptsd', 'trauma', 'acute stress disorder']
        break
      case 'general':
        criteria.diagnoses = [
          'depression',
          'anxiety',
          'adjustment disorder',
          'stress',
          'mood disorder',
        ]
        break
      default:
        // Fallback to general mental health conditions for unhandled focus values
        criteria.diagnoses = [
          'depression',
          'anxiety',
          'adjustment disorder',
          'stress',
        ]
        break
    }

    if (scenario.stylePreference) {
      criteria.conversationalStyles = [scenario.stylePreference]
    }

    return this.searchModels(criteria)
  }

  /**
   * Get index statistics for monitoring
   */
  getIndexStatistics() {
    return {
      totalModels: this.index.totalModels,
      beliefDomains: this.index.beliefsByDomain.size,
      emotionTypes: this.index.emotionsByType.size,
      conversationalStyles: this.index.stylesByType.size,
      diagnoses: this.index.diagnosisByType.size,
      lastUpdated: this.index.lastUpdated,
      indexVersion: this.index.indexVersion,
    }
  }

  // Private methods
  private createEmptyIndex(): ModelIndex {
    return {
      beliefsByDomain: new Map(),
      beliefsByCategory: new Map(),
      beliefsByStrength: new Map(),
      emotionsByType: new Map(),
      emotionsByIntensity: new Map(),
      emotionsByTrigger: new Map(),
      situationsByContext: new Map(),
      situationsByTheme: new Map(),
      stylesByType: new Map(),
      stylesByDifficulty: new Map(),
      diagnosisByType: new Map(),
      demographicsByAge: new Map(),
      demographicsByGender: new Map(),
      totalModels: 0,
      lastUpdated: new Date(),
      indexVersion: '1.0.0',
    }
  }

  private validateModel(model: CognitiveModel): boolean {
    try {
      // Basic validation
      if (!model.id || !model.name || !model.coreBeliefs) {
        return false
      }

      // Validate core beliefs structure
      if (!Array.isArray(model.coreBeliefs) || model.coreBeliefs.length === 0) {
        return false
      }

      // Validate emotional patterns
      if (!Array.isArray(model.emotionalPatterns)) {
        return false
      }

      return true
    } catch (error) {
      console.warn(`Model validation failed for ${model.id}:`, error)
      return false
    }
  }

  private indexModel(model: CognitiveModel): void {
    const modelId = model.id

    // Index core beliefs
    for (const belief of model.coreBeliefs) {
      // By domain
      for (const domain of belief.relatedDomains) {
        this.addToIndex(this.index.beliefsByDomain, domain, modelId)
      }

      // By category
      this.addToIndex(this.index.beliefsByCategory, belief.belief, modelId)

      // By strength
      this.addToIndex(this.index.beliefsByStrength, belief.strength, modelId)
    }

    // Index emotional patterns
    for (const emotion of model.emotionalPatterns) {
      // By type
      this.addToIndex(this.index.emotionsByType, emotion.emotion, modelId)

      // By intensity
      this.addToIndex(
        this.index.emotionsByIntensity,
        emotion.intensity,
        modelId,
      )

      // By triggers
      for (const trigger of emotion.triggers) {
        this.addToIndex(this.index.emotionsByTrigger, trigger, modelId)
      }
    }

    // Index conversational style
    const styleType = this.getStyleFromModel(model)
    if (styleType) {
      this.addToIndex(this.index.stylesByType, styleType, modelId)

      const difficulty = this.getStyleDifficulty(styleType)
      this.addToIndex(this.index.stylesByDifficulty, difficulty, modelId)
    }

    // Index diagnosis
    this.addToIndex(
      this.index.diagnosisByType,
      model.diagnosisInfo.primaryDiagnosis,
      modelId,
    )

    // Index demographics
    const ageRange = this.getAgeRange(model.demographicInfo.age)
    this.addToIndex(this.index.demographicsByAge, ageRange, modelId)
    this.addToIndex(
      this.index.demographicsByGender,
      model.demographicInfo.gender,
      modelId,
    )

    // Index situational contexts (from presenting issues)
    for (const issue of model.presentingIssues) {
      const theme = this.categorizeIssue(issue)
      this.addToIndex(this.index.situationsByTheme, theme, modelId)
    }
  }

  private addToIndex<T>(
    indexMap: Map<string | number, string[]>,
    key: T,
    modelId: string,
  ): void {
    if (key === undefined || key === null) {
      return // Do not index null or undefined keys
    }

    // Ensure the key is a string or number for consistent Map behavior
    const mapKey: string | number =
      typeof key === 'string'
        ? key.toLowerCase()
        : typeof key === 'number'
          ? key
          : JSON.stringify(key)

    // Initialize array if key doesn't exist
    if (!indexMap.has(mapKey)) {
      indexMap.set(mapKey, [])
    }

    // Safely retrieve the list - we know it exists after the check above
    const list = indexMap.get(mapKey)
    if (list) {
      // Add modelId only if it's not already present to prevent duplicates
      if (!list.includes(modelId)) {
        list.push(modelId)
      }
    } else {
      // This should never happen due to our initialization above, but provides type safety
      console.warn(`Failed to retrieve list for key: ${mapKey}`)
    }
  }

  private calculateRelevanceScore(
    model: CognitiveModel,
    criteria: SearchCriteria,
  ): number {
    let score = 0
    let maxPossibleScore = 0

    // Belief domain matching
    if (criteria.beliefDomains && criteria.beliefDomains.length > 0) {
      maxPossibleScore += 10
      const modelDomains = model.coreBeliefs.flatMap((b) => b.relatedDomains)
      const matches = criteria.beliefDomains.filter((d) =>
        modelDomains.includes(d),
      ).length
      score += (matches / criteria.beliefDomains.length) * 10
    }

    // Emotion type matching
    if (criteria.emotionTypes && criteria.emotionTypes.length > 0) {
      maxPossibleScore += 10
      const modelEmotions = model.emotionalPatterns.map((e) => e.emotion)
      const matches = criteria.emotionTypes.filter((e) =>
        modelEmotions.includes(e),
      ).length
      score += (matches / criteria.emotionTypes.length) * 10
    }

    // Conversational style matching
    if (criteria.conversationalStyles) {
      maxPossibleScore += 10
      const modelStyle = this.getStyleFromModel(model)
      if (modelStyle && criteria.conversationalStyles.includes(modelStyle)) {
        score += 10
      }
    }

    // Diagnosis matching
    if (criteria.diagnoses) {
      maxPossibleScore += 15
      const modelDiagnosis = model.diagnosisInfo.primaryDiagnosis.toLowerCase()
      const hasMatch = criteria.diagnoses.some((d) =>
        modelDiagnosis.includes(d.toLowerCase()),
      )
      if (hasMatch) {
        score += 15
      }
    }

    // Age range matching
    if (criteria.ageRange) {
      maxPossibleScore += 5
      const [minAge, maxAge] = criteria.ageRange
      const modelAge = model.demographicInfo.age
      if (modelAge >= minAge && modelAge <= maxAge) {
        score += 5
      }
    }

    // Normalize score
    return maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0
  }

  private getMatchedCriteria(
    model: CognitiveModel,
    criteria: SearchCriteria,
  ): string[] {
    const matched: string[] = []

    if (criteria.beliefDomains) {
      const modelDomains = model.coreBeliefs.flatMap((b) => b.relatedDomains)
      const matchedDomains = criteria.beliefDomains.filter((d) =>
        modelDomains.includes(d),
      )
      if (matchedDomains.length > 0) {
        matched.push(`beliefs: ${matchedDomains.join(', ')}`)
      }
    }

    if (criteria.emotionTypes) {
      const modelEmotions = model.emotionalPatterns.map((e) => e.emotion)
      const matchedEmotions = criteria.emotionTypes.filter((e) =>
        modelEmotions.includes(e),
      )
      if (matchedEmotions.length > 0) {
        matched.push(`emotions: ${matchedEmotions.join(', ')}`)
      }
    }

    if (criteria.conversationalStyles) {
      const modelStyle = this.getStyleFromModel(model)
      if (modelStyle && criteria.conversationalStyles.includes(modelStyle)) {
        matched.push(`style: ${modelStyle}`)
      }
    }

    if (criteria.diagnoses) {
      const modelDiagnosis = model.diagnosisInfo.primaryDiagnosis
      matched.push(`diagnosis: ${modelDiagnosis}`)
    }

    return matched
  }

  private getStyleFromModel(model: CognitiveModel): string | null {
    // Infer style from conversational characteristics
    const style = model.conversationalStyle

    if (style.resistance >= 8) {
      return 'upset'
    }
    if (style.verbosity >= 8) {
      return 'verbose'
    }
    if (style.verbosity <= 3) {
      return 'reserved'
    }
    if (style.resistance <= 3) {
      return 'pleasing'
    }
    if (style.insightLevel <= 4) {
      return 'tangent'
    }

    return 'plain'
  }

  private getStyleDifficulty(style: string): string {
    const difficultyMap = {
      plain: 'easy',
      pleasing: 'easy',
      verbose: 'medium',
      tangent: 'medium',
      upset: 'hard',
      reserved: 'hard',
    }

    return difficultyMap[style as keyof typeof difficultyMap] || 'medium'
  }

  private getAgeRange(age: number): string {
    if (age < 25) {
      return '18-24'
    }
    if (age < 35) {
      return '25-34'
    }
    if (age < 45) {
      return '35-44'
    }
    if (age < 55) {
      return '45-54'
    }
    if (age < 65) {
      return '55-64'
    }
    return '65+'
  }

  private categorizeIssue(issue: string): string {
    const lowerIssue = issue.toLowerCase()

    if (
      lowerIssue.includes('relationship') ||
      lowerIssue.includes('family') ||
      lowerIssue.includes('social')
    ) {
      return 'relationships'
    }
    if (
      lowerIssue.includes('work') ||
      lowerIssue.includes('career') ||
      lowerIssue.includes('job')
    ) {
      return 'work'
    }
    if (
      lowerIssue.includes('mood') ||
      lowerIssue.includes('depression') ||
      lowerIssue.includes('sad')
    ) {
      return 'mood'
    }
    if (
      lowerIssue.includes('anxiety') ||
      lowerIssue.includes('worry') ||
      lowerIssue.includes('fear')
    ) {
      return 'anxiety'
    }

    return 'general'
  }

  private logIndexStatistics(): void {
    console.log('=== Patient-Psi Index Statistics ===')
    console.log(`Total Models: ${this.index.totalModels}`)
    console.log(`Belief Domains: ${this.index.beliefsByDomain.size}`)
    console.log(`Emotion Types: ${this.index.emotionsByType.size}`)
    console.log(`Conversational Styles: ${this.index.stylesByType.size}`)
    console.log(`Diagnoses: ${this.index.diagnosisByType.size}`)
    console.log(`Index Version: ${this.index.indexVersion}`)
    console.log('=====================================')
  }
}

/**
 * Create and export an indexer instance
 */
export const patientPsiIndexer = new PatientPsiIndexer()

/**
 * Utility function for quick model searches
 */
export function searchPatientModels(criteria: SearchCriteria): SearchResult[] {
  return patientPsiIndexer.searchModels(criteria)
}

/**
 * Utility function to get training-appropriate models
 */
export function getTrainingModels(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  focus: 'depression' | 'anxiety' | 'trauma' | 'general',
): SearchResult[] {
  return patientPsiIndexer.getModelsForTrainingScenario({ difficulty, focus })
}
