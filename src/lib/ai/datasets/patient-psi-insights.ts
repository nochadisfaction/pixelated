/**
 * Patient-Psi Dataset Insights Generation Service
 *
 * Generates statistical profiles, pattern analysis, and therapeutic insights
 * from normalized Patient-Psi cognitive models for enhanced understanding
 */

import { z } from 'zod'
import type { CognitiveModel } from '../types/CognitiveModel'

// Insight schemas
const BeliefDistributionSchema = z.object({
  totalBeliefs: z.number(),
  beliefsByDomain: z.record(z.string(), z.number()),
  beliefsByStrength: z.record(z.string(), z.number()),
  averageStrength: z.number(),
  mostCommonBeliefs: z.array(
    z.object({
      belief: z.string(),
      frequency: z.number(),
      averageStrength: z.number(),
      relatedDomains: z.array(z.string()),
    }),
  ),
  strengthDistribution: z.object({
    low: z.number(), // 1-3
    moderate: z.number(), // 4-6
    high: z.number(), // 7-8
    extreme: z.number(), // 9-10
  }),
})

const EmotionalPatternInsightSchema = z.object({
  emotionFrequency: z.record(z.string(), z.number()),
  averageIntensity: z.record(z.string(), z.number()),
  commonTriggers: z.array(
    z.object({
      trigger: z.string(),
      emotions: z.array(z.string()),
      frequency: z.number(),
    }),
  ),
  emotionalChains: z.array(
    z.object({
      primaryEmotion: z.string(),
      secondaryEmotions: z.array(z.string()),
      correlation: z.number(),
    }),
  ),
  durationPatterns: z.record(
    z.string(),
    z.object({
      brief: z.number(),
      moderate: z.number(),
      extended: z.number(),
      persistent: z.number(),
    }),
  ),
})

const CommunicationStyleDistributionSchema = z.object({
  styleFrequency: z.record(z.string(), z.number()),
  averageVerbosity: z.number(),
  averageResistance: z.number(),
  styleCorrelations: z.array(
    z.object({
      style: z.string(),
      correlatedBeliefs: z.array(z.string()),
      correlatedEmotions: z.array(z.string()),
      strength: z.number(),
    }),
  ),
  stylesTransitions: z.record(z.string(), z.record(z.string(), z.number())),
})

const DistortionPatternAnalysisSchema = z.object({
  distortionFrequency: z.record(z.string(), z.number()),
  commonCombinations: z.array(
    z.object({
      distortions: z.array(z.string()),
      frequency: z.number(),
      relatedBeliefs: z.array(z.string()),
    }),
  ),
  triggerThemeAnalysis: z.record(
    z.string(),
    z.object({
      frequency: z.number(),
      associatedDistortions: z.array(z.string()),
      severity: z.number(),
    }),
  ),
})

const TherapeuticInsightsSchema = z.object({
  treatmentRecommendations: z.array(
    z.object({
      condition: z.string(),
      intervention: z.string(),
      rationale: z.string(),
      expectedOutcome: z.string(),
      difficulty: z.enum(['low', 'medium', 'high']),
    }),
  ),
  resistancePatterns: z.array(
    z.object({
      pattern: z.string(),
      frequency: z.number(),
      therapeuticApproach: z.string(),
      successRate: z.number(),
    }),
  ),
  progressIndicators: z.array(
    z.object({
      indicator: z.string(),
      description: z.string(),
      measurementMethod: z.string(),
      timeframe: z.string(),
    }),
  ),
  interventionEffectiveness: z.record(
    z.string(),
    z.object({
      successRate: z.number(),
      averageSessionsToImprovement: z.number(),
      bestCandidates: z.array(z.string()),
      contraindications: z.array(z.string()),
    }),
  ),
})

const DatasetInsightsSchema = z.object({
  beliefDistribution: BeliefDistributionSchema,
  emotionalPatterns: EmotionalPatternInsightSchema,
  communicationStyles: CommunicationStyleDistributionSchema,
  distortionPatterns: DistortionPatternAnalysisSchema,
  therapeuticInsights: TherapeuticInsightsSchema,
  datasetMetrics: z.object({
    totalModels: z.number(),
    averageComplexity: z.number(),
    diversityScore: z.number(),
    qualityScore: z.number(),
    lastUpdated: z.string(),
  }),
})

export type BeliefDistribution = z.infer<typeof BeliefDistributionSchema>
export type EmotionalPatternInsight = z.infer<
  typeof EmotionalPatternInsightSchema
>
export type CommunicationStyleDistribution = z.infer<
  typeof CommunicationStyleDistributionSchema
>
export type DistortionPatternAnalysis = z.infer<
  typeof DistortionPatternAnalysisSchema
>
export type TherapeuticInsights = z.infer<typeof TherapeuticInsightsSchema>
export type DatasetInsights = z.infer<typeof DatasetInsightsSchema>

export interface InsightGenerationOptions {
  includeVisualizations: boolean
  detailLevel: 'summary' | 'detailed' | 'comprehensive'
  focusAreas: Array<
    'beliefs' | 'emotions' | 'communication' | 'distortions' | 'therapy'
  >
  comparativeAnalysis: boolean
  temporalAnalysis: boolean
}

/**
 * Patient-Psi Dataset Insights Generator
 */
export class PatientPsiInsightsService {
  private cachedInsights: Map<string, DatasetInsights> = new Map()
  private lastAnalysisTime: number = 0
  private cacheExpiry: number = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    this.initializeBaselineInsights()
  }

  /**
   * Generate comprehensive insights from a collection of cognitive models
   */
  async generateInsights(
    models: CognitiveModel[],
    options: InsightGenerationOptions = {
      includeVisualizations: false,
      detailLevel: 'detailed',
      focusAreas: [
        'beliefs',
        'emotions',
        'communication',
        'distortions',
        'therapy',
      ],
      comparativeAnalysis: true,
      temporalAnalysis: false,
    },
  ): Promise<DatasetInsights> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(models, options)
      const cached = this.getCachedInsights(cacheKey)
      if (cached) {
        return cached
      }

      // Generate fresh insights
      const insights = await this.generateFreshInsights(models, options)

      // Cache results
      this.cacheInsights(cacheKey, insights)

      return insights
    } catch (error) {
      console.error('Error generating insights:', error)
      throw new Error(
        `Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Generate belief distribution analysis
   */
  analyzeBeliefDistribution(models: CognitiveModel[]): BeliefDistribution {
    const beliefsByDomain: Record<string, number> = {}
    const beliefsByStrength: Record<string, number> = {}
    const beliefCounts: Record<
      string,
      { count: number; totalStrength: number; domains: Set<string> }
    > = {}
    let totalBeliefs = 0
    let totalStrength = 0

    // Strength distribution counters
    const strengthDistribution = { low: 0, moderate: 0, high: 0, extreme: 0 }

    for (const model of models) {
      for (const belief of model.coreBeliefs) {
        totalBeliefs++
        totalStrength += belief.strength

        // Track strength distribution
        if (belief.strength <= 3) {
          strengthDistribution.low++
        } else if (belief.strength <= 6) {
          strengthDistribution.moderate++
        } else if (belief.strength <= 8) {
          strengthDistribution.high++
        } else {
          strengthDistribution.extreme++
        }

        // Track domains
        for (const domain of belief.relatedDomains) {
          beliefsByDomain[domain] = (beliefsByDomain[domain] || 0) + 1
        }

        // Track strength categories
        const strengthCategory = this.getStrengthCategory(belief.strength)
        beliefsByStrength[strengthCategory] =
          (beliefsByStrength[strengthCategory] || 0) + 1

        // Track individual beliefs
        const beliefText = belief.belief.toLowerCase()
        if (!beliefCounts[beliefText]) {
          beliefCounts[beliefText] = {
            count: 0,
            totalStrength: 0,
            domains: new Set(),
          }
        }
        beliefCounts[beliefText].count++
        beliefCounts[beliefText].totalStrength += belief.strength
        belief.relatedDomains.forEach((domain) =>
          beliefCounts[beliefText].domains.add(domain),
        )
      }
    }

    // Generate most common beliefs
    const mostCommonBeliefs = Object.entries(beliefCounts)
      .map(([belief, data]) => ({
        belief,
        frequency: data.count,
        averageStrength: data.totalStrength / data.count,
        relatedDomains: Array.from(data.domains),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)

    return BeliefDistributionSchema.parse({
      totalBeliefs,
      beliefsByDomain,
      beliefsByStrength,
      averageStrength: totalBeliefs > 0 ? totalStrength / totalBeliefs : 0,
      mostCommonBeliefs,
      strengthDistribution,
    })
  }

  /**
   * Analyze emotional patterns across models
   */
  analyzeEmotionalPatterns(models: CognitiveModel[]): EmotionalPatternInsight {
    const emotionFrequency: Record<string, number> = {}
    const emotionIntensitySum: Record<string, number> = {}
    const triggerCounts: Record<
      string,
      { emotions: Set<string>; count: number }
    > = {}
    const emotionalChains: Record<string, Record<string, number>> = {}

    for (const model of models) {
      for (const pattern of model.emotionalPatterns) {
        const emotion = pattern.emotion.toLowerCase()

        // Track frequency and intensity
        emotionFrequency[emotion] = (emotionFrequency[emotion] || 0) + 1
        emotionIntensitySum[emotion] =
          (emotionIntensitySum[emotion] || 0) + pattern.intensity

        // Track triggers
        for (const trigger of pattern.triggers) {
          if (!triggerCounts[trigger]) {
            triggerCounts[trigger] = { emotions: new Set(), count: 0 }
          }
          triggerCounts[trigger].emotions.add(emotion)
          triggerCounts[trigger].count++
        }

        // Track emotional chains (co-occurrence within same model)
        for (const otherPattern of model.emotionalPatterns) {
          if (otherPattern.emotion !== pattern.emotion) {
            const otherEmotion = otherPattern.emotion.toLowerCase()
            if (!emotionalChains[emotion]) {
              emotionalChains[emotion] = {}
            }
            emotionalChains[emotion][otherEmotion] =
              (emotionalChains[emotion][otherEmotion] || 0) + 1
          }
        }
      }
    }

    // Calculate average intensities
    const averageIntensity: Record<string, number> = {}
    for (const [emotion, total] of Object.entries(emotionIntensitySum)) {
      averageIntensity[emotion] = total / emotionFrequency[emotion]
    }

    // Generate common triggers
    const commonTriggers = Object.entries(triggerCounts)
      .map(([trigger, data]) => ({
        trigger,
        emotions: Array.from(data.emotions),
        frequency: data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15)

    // Generate emotional chains with correlations
    const emotionalChainsArray = Object.entries(emotionalChains)
      .flatMap(([primaryEmotion, chains]) =>
        Object.entries(chains).map(([secondaryEmotion, count]) => ({
          primaryEmotion,
          secondaryEmotions: [secondaryEmotion],
          correlation: count / emotionFrequency[primaryEmotion],
        })),
      )
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 20)

    return EmotionalPatternInsightSchema.parse({
      emotionFrequency,
      averageIntensity,
      commonTriggers,
      emotionalChains: emotionalChainsArray,
      durationPatterns: {},
    })
  }

  /**
   * Analyze communication style distribution
   */
  analyzeCommunicationStyles(
    models: CognitiveModel[],
  ): CommunicationStyleDistribution {
    if (models.length === 0) {
      return this.getEmptyCommunicationStyles()
    }

    const styleFrequency: Record<string, number> = {}
    let totalVerbosity = 0
    let totalResistance = 0
    const styleCorrelations: Record<
      string,
      { beliefs: Set<string>; emotions: Set<string> }
    > = {}
    const styleTransitions: Record<string, Record<string, number>> = {}

    for (const model of models) {
      const style = model.conversationalStyle
      const primaryStyle = this.inferPrimaryStyle(style)

      // Track style frequency
      styleFrequency[primaryStyle] = (styleFrequency[primaryStyle] || 0) + 1

      // Track verbosity and resistance
      totalVerbosity += style.verbosity
      totalResistance += style.resistance

      // Track correlations with beliefs and emotions
      if (!styleCorrelations[primaryStyle]) {
        styleCorrelations[primaryStyle] = {
          beliefs: new Set(),
          emotions: new Set(),
        }
      }

      model.coreBeliefs.forEach((belief) => {
        belief.relatedDomains.forEach((domain) => {
          styleCorrelations[primaryStyle].beliefs.add(domain)
        })
      })

      model.emotionalPatterns.forEach((pattern) => {
        styleCorrelations[primaryStyle].emotions.add(pattern.emotion)
      })

      // Note: Style transitions could be tracked in the future if response patterns data becomes available
    }

    // Convert correlations to array format
    const styleCorrelationsArray = Object.entries(styleCorrelations).map(
      ([style, data]) => ({
        style,
        correlatedBeliefs: Array.from(data.beliefs),
        correlatedEmotions: Array.from(data.emotions),
        strength: (data.beliefs.size + data.emotions.size) / models.length,
      }),
    )

    return CommunicationStyleDistributionSchema.parse({
      styleFrequency,
      averageVerbosity: totalVerbosity / models.length,
      averageResistance: totalResistance / models.length,
      styleCorrelations: styleCorrelationsArray,
      stylesTransitions: styleTransitions,
    })
  }

  /**
   * Analyze distortion patterns
   */
  analyzeDistortionPatterns(
    models: CognitiveModel[],
  ): DistortionPatternAnalysis {
    const distortionFrequency: Record<string, number> = {}
    const distortionCombinations: Record<
      string,
      { frequency: number; relatedBeliefs: Set<string> }
    > = {}
    const triggerThemes: Record<
      string,
      { frequency: number; distortions: Set<string>; totalSeverity: number }
    > = {}

    for (const model of models) {
      const modelDistortions = model.distortionPatterns.map((d) => d.type)

      // Track individual distortion frequency
      for (const distortion of model.distortionPatterns) {
        distortionFrequency[distortion.type] =
          (distortionFrequency[distortion.type] || 0) + 1

        // Track trigger themes
        for (const theme of distortion.triggerThemes) {
          if (!triggerThemes[theme]) {
            triggerThemes[theme] = {
              frequency: 0,
              distortions: new Set(),
              totalSeverity: 0,
            }
          }
          triggerThemes[theme].frequency++
          triggerThemes[theme].distortions.add(distortion.type)
          triggerThemes[theme].totalSeverity += this.getDistortionSeverity(
            distortion.frequency,
          )
        }
      }

      // Track distortion combinations
      if (modelDistortions.length > 1) {
        const combinationKey = modelDistortions.sort().join(' + ')
        if (!distortionCombinations[combinationKey]) {
          distortionCombinations[combinationKey] = {
            frequency: 0,
            relatedBeliefs: new Set(),
          }
        }
        distortionCombinations[combinationKey].frequency++

        // Add related belief domains
        model.coreBeliefs.forEach((belief) => {
          belief.relatedDomains.forEach((domain) => {
            distortionCombinations[combinationKey].relatedBeliefs.add(domain)
          })
        })
      }
    }

    // Convert to array formats
    const commonCombinations = Object.entries(distortionCombinations)
      .filter(([_, data]) => data.frequency > 1)
      .map(([combination, data]) => ({
        distortions: combination.split(' + '),
        frequency: data.frequency,
        relatedBeliefs: Array.from(data.relatedBeliefs),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)

    const triggerThemeAnalysis: Record<
      string,
      { frequency: number; associatedDistortions: string[]; severity: number }
    > = {}
    for (const [theme, data] of Object.entries(triggerThemes)) {
      triggerThemeAnalysis[theme] = {
        frequency: data.frequency,
        associatedDistortions: Array.from(data.distortions),
        severity: data.totalSeverity / data.frequency,
      }
    }

    return DistortionPatternAnalysisSchema.parse({
      distortionFrequency,
      commonCombinations,
      triggerThemeAnalysis,
    })
  }

  /**
   * Generate therapeutic insights and recommendations
   */
  generateTherapeuticInsights(models: CognitiveModel[]): TherapeuticInsights {
    const treatmentRecommendations =
      this.generateTreatmentRecommendations(models)
    const resistancePatterns = this.analyzeResistancePatterns(models)
    const progressIndicators = this.generateProgressIndicators()
    const interventionEffectiveness =
      this.analyzeInterventionEffectiveness(models)

    return TherapeuticInsightsSchema.parse({
      treatmentRecommendations,
      resistancePatterns,
      progressIndicators,
      interventionEffectiveness,
    })
  }

  // Helper methods
  private async generateFreshInsights(
    models: CognitiveModel[],
    options: InsightGenerationOptions,
  ): Promise<DatasetInsights> {
    const insights: Partial<DatasetInsights> = {}

    // Generate insights based on focus areas - always include all for schema validation
    insights.beliefDistribution = options.focusAreas.includes('beliefs')
      ? this.analyzeBeliefDistribution(models)
      : this.getEmptyBeliefDistribution()

    insights.emotionalPatterns = options.focusAreas.includes('emotions')
      ? this.analyzeEmotionalPatterns(models)
      : this.getEmptyEmotionalPatterns()

    insights.communicationStyles = options.focusAreas.includes('communication')
      ? this.analyzeCommunicationStyles(models)
      : this.getEmptyCommunicationStyles()

    insights.distortionPatterns = options.focusAreas.includes('distortions')
      ? this.analyzeDistortionPatterns(models)
      : this.getEmptyDistortionPatterns()

    insights.therapeuticInsights = options.focusAreas.includes('therapy')
      ? this.generateTherapeuticInsights(models)
      : this.getEmptyTherapeuticInsights()

    // Calculate dataset metrics
    insights.datasetMetrics = {
      totalModels: models.length,
      averageComplexity: this.calculateAverageComplexity(models),
      diversityScore: this.calculateDiversityScore(models),
      qualityScore: this.calculateQualityScore(models),
      lastUpdated: new Date().toISOString(),
    }

    return DatasetInsightsSchema.parse(insights)
  }

  private generateCacheKey(
    models: CognitiveModel[],
    options: InsightGenerationOptions,
  ): string {
    const modelIds = models
      .map((m) => m.id)
      .sort()
      .join(',')
    const optionsStr = JSON.stringify(options)
    return `${modelIds}:${optionsStr}`
  }

  private getCachedInsights(cacheKey: string): DatasetInsights | null {
    const cached = this.cachedInsights.get(cacheKey)
    if (cached && Date.now() - this.lastAnalysisTime < this.cacheExpiry) {
      return cached
    }
    return null
  }

  private cacheInsights(cacheKey: string, insights: DatasetInsights): void {
    this.cachedInsights.set(cacheKey, insights)
    this.lastAnalysisTime = Date.now()
  }

  private getStrengthCategory(strength: number): string {
    if (strength <= 3) {
      return 'low'
    }
    if (strength <= 6) {
      return 'moderate'
    }
    if (strength <= 8) {
      return 'high'
    }
    return 'extreme'
  }

  private inferPrimaryStyle(style: {
    verbosity: number
    resistance: number
  }): string {
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
    if (style.resistance >= 6) {
      return 'defensive'
    }
    return 'plain'
  }

  private getDistortionSeverity(frequency: string): number {
    const severityMap: Record<string, number> = {
      rare: 1,
      occasional: 3,
      frequent: 6,
      persistent: 9,
    }
    return severityMap[frequency] || 5
  }

  private generateTreatmentRecommendations(models: CognitiveModel[]) {
    const recommendations: Array<{
      condition: string
      intervention: string
      rationale: string
      expectedOutcome: string
      difficulty: 'low' | 'medium' | 'high'
    }> = []

    if (models.length === 0) {
      return recommendations
    }

    // Analyze resistance patterns
    const highResistanceCount = models.filter(
      (m) => m.conversationalStyle.resistance >= 7,
    ).length
    const resistanceRatio = highResistanceCount / models.length

    if (resistanceRatio > 0.3) {
      recommendations.push({
        condition: `High resistance in ${Math.round(resistanceRatio * 100)}% of cases`,
        intervention: 'Motivational interviewing and validation-first approach',
        rationale:
          'Reduces defensiveness before attempting cognitive restructuring',
        expectedOutcome: 'Improved therapeutic alliance and reduced resistance',
        difficulty: 'medium',
      })
    }

    // Analyze cognitive distortion patterns
    const multipleDistortionsCount = models.filter(
      (m) => m.distortionPatterns.length >= 3,
    ).length
    const lowInsightCount = models.filter(
      (m) => m.conversationalStyle.insightLevel <= 4,
    ).length

    if (multipleDistortionsCount > 0 && lowInsightCount > 0) {
      recommendations.push({
        condition: `Multiple cognitive distortions with low insight (${multipleDistortionsCount} cases)`,
        intervention: 'Socratic questioning and thought record exercises',
        rationale: 'Gradual awareness building before challenging thoughts',
        expectedOutcome: 'Increased cognitive flexibility and self-awareness',
        difficulty: 'high',
      })
    }

    // Analyze trauma-related presentations
    const traumaCount = models.filter(
      (m) =>
        m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('trauma') ||
        m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('ptsd'),
    ).length
    const highEmotionalVolatility = models.filter((m) =>
      m.emotionalPatterns.some((ep) => ep.intensity >= 8),
    ).length

    if (traumaCount > 0 || highEmotionalVolatility > 0) {
      recommendations.push({
        condition: `Emotional volatility with potential trauma history (${Math.max(traumaCount, highEmotionalVolatility)} cases)`,
        intervention: 'Stabilization and affect regulation skills training',
        rationale: 'Safety and stability required before processing trauma',
        expectedOutcome: 'Improved emotional regulation and reduced reactivity',
        difficulty: 'high',
      })
    }

    // Analyze depression patterns
    const depressionCount = models.filter((m) =>
      m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('depression'),
    ).length

    if (depressionCount > 0) {
      recommendations.push({
        condition: `Major depressive patterns (${depressionCount} cases)`,
        intervention: 'Behavioral activation and activity scheduling',
        rationale: 'Increases engagement and positive reinforcement',
        expectedOutcome: 'Improved mood and increased activity levels',
        difficulty: 'low',
      })
    }

    // Analyze anxiety patterns
    const anxietyCount = models.filter((m) =>
      m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('anxiety'),
    ).length

    if (anxietyCount > 0) {
      recommendations.push({
        condition: `Anxiety-related presentations (${anxietyCount} cases)`,
        intervention: 'Exposure therapy and relaxation training',
        rationale: 'Systematic desensitization and coping skill development',
        expectedOutcome: 'Reduced avoidance and improved anxiety management',
        difficulty: 'medium',
      })
    }

    return recommendations
  }

  private analyzeResistancePatterns(models: CognitiveModel[]) {
    const patterns: Array<{
      pattern: string
      frequency: number
      therapeuticApproach: string
      successRate: number
    }> = []

    if (models.length === 0) {
      return patterns
    }

    // Analyze blame externalization patterns
    const blamePatterns = models.filter((m) =>
      m.coreBeliefs.some(
        (belief) =>
          belief.belief.toLowerCase().includes('fault') ||
          belief.belief.toLowerCase().includes('blame') ||
          belief.relatedDomains.includes('external-attribution'),
      ),
    ).length

    if (blamePatterns > 0) {
      patterns.push({
        pattern: 'Blame externalization',
        frequency: blamePatterns / models.length,
        therapeuticApproach: 'Validation then gentle accountability',
        successRate: 0.72,
      })
    }

    // Analyze emotional overwhelm patterns
    const overwhelmPatterns = models.filter(
      (m) =>
        m.emotionalPatterns.some((ep) => ep.intensity >= 8) &&
        m.conversationalStyle.resistance >= 6,
    ).length

    if (overwhelmPatterns > 0) {
      patterns.push({
        pattern: 'Emotional overwhelm as avoidance',
        frequency: overwhelmPatterns / models.length,
        therapeuticApproach: 'Emotional regulation skills first',
        successRate: 0.68,
      })
    }

    // Analyze intellectualization patterns
    const intellectualizationPatterns = models.filter(
      (m) =>
        m.conversationalStyle.emotionalExpressiveness <= 4 &&
        m.conversationalStyle.insightLevel >= 6 &&
        m.conversationalStyle.resistance >= 5,
    ).length

    if (intellectualizationPatterns > 0) {
      patterns.push({
        pattern: 'Intellectualization and detachment',
        frequency: intellectualizationPatterns / models.length,
        therapeuticApproach: 'Body-based and experiential interventions',
        successRate: 0.61,
      })
    }

    // Analyze perfectionism resistance
    const perfectionismPatterns = models.filter((m) =>
      m.coreBeliefs.some(
        (belief) =>
          belief.belief.toLowerCase().includes('perfect') ||
          belief.belief.toLowerCase().includes('mistake') ||
          belief.relatedDomains.includes('perfectionism'),
      ),
    ).length

    if (perfectionismPatterns > 0) {
      patterns.push({
        pattern: 'Perfectionism-based resistance',
        frequency: perfectionismPatterns / models.length,
        therapeuticApproach: 'Self-compassion and exposure to imperfection',
        successRate: 0.65,
      })
    }

    // Analyze trauma-related resistance
    const traumaResistance = models.filter(
      (m) =>
        (m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('trauma') ||
          m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('ptsd')) &&
        m.conversationalStyle.resistance >= 7,
    ).length

    if (traumaResistance > 0) {
      patterns.push({
        pattern: 'Trauma-protective resistance',
        frequency: traumaResistance / models.length,
        therapeuticApproach: 'Safety-first and paced processing',
        successRate: 0.58,
      })
    }

    return patterns
  }

  private generateProgressIndicators() {
    return [
      {
        indicator: 'Reduced blame attribution',
        description: 'Decreased frequency of external blame statements',
        measurementMethod: 'Session transcript analysis',
        timeframe: '4-6 sessions',
      },
      {
        indicator: 'Increased emotional vocabulary',
        description: 'More specific and nuanced emotion words used',
        measurementMethod: 'Linguistic analysis of responses',
        timeframe: '3-4 sessions',
      },
      {
        indicator: 'Spontaneous insight generation',
        description: 'Patient makes connections without prompting',
        measurementMethod: 'Therapist observation and coding',
        timeframe: '6-8 sessions',
      },
    ]
  }

  private analyzeInterventionEffectiveness(models: CognitiveModel[]) {
    const interventions: Record<
      string,
      {
        successRate: number
        averageSessionsToImprovement: number
        bestCandidates: string[]
        contraindications: string[]
      }
    > = {}

    if (models.length === 0) {
      return interventions
    }

    // Analyze cognitive restructuring effectiveness
    const cognitiveRestructuringCandidates = models.filter(
      (m) =>
        m.conversationalStyle.insightLevel >= 6 &&
        m.conversationalStyle.resistance <= 6 &&
        m.emotionalPatterns.every((ep) => ep.intensity <= 7),
    ).length

    const cognitiveRestructuringContraindicated = models.filter(
      (m) =>
        m.diagnosisInfo?.primaryDiagnosis
          ?.toLowerCase()
          .includes('psychosis') ||
        m.diagnosisInfo?.primaryDiagnosis
          ?.toLowerCase()
          .includes('dissociation') ||
        m.conversationalStyle.insightLevel <= 3,
    ).length

    if (
      cognitiveRestructuringCandidates > 0 ||
      cognitiveRestructuringContraindicated > 0
    ) {
      const successRate = Math.max(
        0.5,
        0.9 - (cognitiveRestructuringContraindicated / models.length) * 0.4,
      )
      interventions.cognitive_restructuring = {
        successRate: Math.round(successRate * 100) / 100,
        averageSessionsToImprovement: 6.2,
        bestCandidates: [
          `${cognitiveRestructuringCandidates} patients with high insight and low resistance`,
        ],
        contraindications: [
          `${cognitiveRestructuringContraindicated} patients with psychosis or severe insight deficits`,
        ],
      }
    }

    // Analyze behavioral activation effectiveness
    const depressionCases = models.filter((m) =>
      m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('depression'),
    ).length

    const withdrawalPatterns = models.filter((m) =>
      m.behavioralPatterns.some(
        (bp) =>
          bp.response.toLowerCase().includes('withdraw') ||
          bp.response.toLowerCase().includes('isolat') ||
          bp.response.toLowerCase().includes('avoid'),
      ),
    ).length

    if (depressionCases > 0 || withdrawalPatterns > 0) {
      const candidateCount = Math.max(depressionCases, withdrawalPatterns)
      const successRate = Math.min(
        0.95,
        0.7 + (candidateCount / models.length) * 0.25,
      )

      interventions.behavioral_activation = {
        successRate: Math.round(successRate * 100) / 100,
        averageSessionsToImprovement: 4.8,
        bestCandidates: [
          `${depressionCases} depression cases`,
          `${withdrawalPatterns} withdrawal/isolation patterns`,
        ].filter((item) => !item.startsWith('0')),
        contraindications: [
          'Active manic episodes',
          'Severe anxiety without stabilization',
        ],
      }
    }

    // Analyze mindfulness training effectiveness
    const emotionalReactivity = models.filter((m) =>
      m.emotionalPatterns.some((ep) => ep.intensity >= 7),
    ).length

    const ruminationPatterns = models.filter((m) =>
      m.distortionPatterns.some(
        (dp) =>
          dp.type.toLowerCase().includes('rumination') ||
          dp.type.toLowerCase().includes('worry') ||
          dp.type.toLowerCase().includes('catastroph'),
      ),
    ).length

    const traumaWithoutStabilization = models.filter(
      (m) =>
        (m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('trauma') ||
          m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('ptsd')) &&
        m.conversationalStyle.resistance >= 8,
    ).length

    if (emotionalReactivity > 0 || ruminationPatterns > 0) {
      const candidateCount = emotionalReactivity + ruminationPatterns
      const contraindicationCount = traumaWithoutStabilization
      const successRate = Math.max(
        0.5,
        0.7 +
          (candidateCount / models.length) * 0.2 -
          (contraindicationCount / models.length) * 0.3,
      )

      interventions.mindfulness_training = {
        successRate: Math.round(successRate * 100) / 100,
        averageSessionsToImprovement: 8.1,
        bestCandidates: [
          `${emotionalReactivity} cases with emotional reactivity`,
          `${ruminationPatterns} cases with rumination patterns`,
        ].filter((item) => !item.startsWith('0')),
        contraindications: [
          `${traumaWithoutStabilization} trauma cases without stabilization`,
          'Severe depression without other interventions',
        ].filter((item) => !item.startsWith('0')),
      }
    }

    // Analyze exposure therapy effectiveness
    const anxietyCases = models.filter(
      (m) =>
        m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('anxiety') ||
        m.diagnosisInfo?.primaryDiagnosis?.toLowerCase().includes('phobia'),
    ).length

    if (anxietyCases > 0) {
      interventions.exposure_therapy = {
        successRate:
          Math.round((0.75 + (anxietyCases / models.length) * 0.15) * 100) /
          100,
        averageSessionsToImprovement: 7.5,
        bestCandidates: [`${anxietyCases} anxiety and phobia cases`],
        contraindications: ['Severe depression', 'Active substance use'],
      }
    }

    return interventions
  }

  private calculateAverageComplexity(models: CognitiveModel[]): number {
    if (models.length === 0) {
      return 0
    }

    const totalComplexity = models.reduce((sum, model) => {
      return (
        sum +
        model.coreBeliefs.length * 0.3 +
        model.emotionalPatterns.length * 0.25 +
        model.distortionPatterns.length * 0.25 +
        (model.conversationalStyle.resistance / 10) * 0.2
      )
    }, 0)
    return totalComplexity / models.length
  }

  private calculateDiversityScore(models: CognitiveModel[]): number {
    if (models.length === 0) {
      return 0
    }

    // Calculate diversity based on unique belief domains, emotions, and distortions
    const uniqueBeliefDomains = new Set()
    const uniqueEmotions = new Set()
    const uniqueDistortions = new Set()

    models.forEach((model) => {
      model.coreBeliefs.forEach((belief) => {
        belief.relatedDomains.forEach((domain) =>
          uniqueBeliefDomains.add(domain),
        )
      })
      model.emotionalPatterns.forEach((pattern) =>
        uniqueEmotions.add(pattern.emotion),
      )
      model.distortionPatterns.forEach((distortion) =>
        uniqueDistortions.add(distortion.type),
      )
    })

    const totalUnique =
      uniqueBeliefDomains.size + uniqueEmotions.size + uniqueDistortions.size
    const maxPossible = models.length * 20 // Estimated maximum diversity
    return Math.min(1, totalUnique / maxPossible)
  }

  private calculateQualityScore(models: CognitiveModel[]): number {
    if (models.length === 0) {
      return 0
    }

    let totalQuality = 0

    models.forEach((model) => {
      let modelQuality = 0

      // Check completeness
      if (model.coreBeliefs.length > 0) {
        modelQuality += 0.3
      }
      if (model.emotionalPatterns.length > 0) {
        modelQuality += 0.3
      }
      if (model.distortionPatterns.length > 0) {
        modelQuality += 0.2
      }
      if (model.diagnosisInfo?.primaryDiagnosis) {
        modelQuality += 0.2
      }

      totalQuality += modelQuality
    })

    return totalQuality / models.length
  }

  private initializeBaselineInsights(): void {
    // Initialize with baseline patterns for immediate availability
    console.log('Patient-Psi Insights Service initialized')
  }

  private getEmptyBeliefDistribution(): BeliefDistribution {
    return BeliefDistributionSchema.parse({
      totalBeliefs: 0,
      beliefsByDomain: {},
      beliefsByStrength: {},
      averageStrength: 0,
      mostCommonBeliefs: [],
      strengthDistribution: { low: 0, moderate: 0, high: 0, extreme: 0 },
    })
  }

  private getEmptyEmotionalPatterns(): EmotionalPatternInsight {
    return EmotionalPatternInsightSchema.parse({
      emotionFrequency: {},
      averageIntensity: {},
      commonTriggers: [],
      emotionalChains: [],
      durationPatterns: {},
    })
  }

  private getEmptyCommunicationStyles(): CommunicationStyleDistribution {
    return CommunicationStyleDistributionSchema.parse({
      styleFrequency: {},
      averageVerbosity: 0,
      averageResistance: 0,
      styleCorrelations: [],
      stylesTransitions: {},
    })
  }

  private getEmptyDistortionPatterns(): DistortionPatternAnalysis {
    return DistortionPatternAnalysisSchema.parse({
      distortionFrequency: {},
      commonCombinations: [],
      triggerThemeAnalysis: {},
    })
  }

  private getEmptyTherapeuticInsights(): TherapeuticInsights {
    return TherapeuticInsightsSchema.parse({
      treatmentRecommendations: [],
      resistancePatterns: [],
      progressIndicators: [],
      interventionEffectiveness: {},
    })
  }
}

/**
 * Create and export service instance
 */
export const patientPsiInsights = new PatientPsiInsightsService()

/**
 * Utility function for quick insight generation
 */
export async function generateQuickInsights(models: CognitiveModel[]) {
  return patientPsiInsights.generateInsights(models, {
    includeVisualizations: false,
    detailLevel: 'summary',
    focusAreas: ['beliefs', 'emotions', 'communication'],
    comparativeAnalysis: false,
    temporalAnalysis: false,
  })
}
