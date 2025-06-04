/**
 * Patient-Psi Dataset Analytics Service
 *
 * Generates statistical profiles, pattern analysis, and therapeutic insights
 * from Patient-Psi cognitive models for enhanced training and research
 */

import { z } from 'zod'
import type {
  CognitiveModel,
  CoreBelief,
  DistortionPattern,
} from '../types/CognitiveModel'
import type { NormalizationResult } from './patient-psi-integration'

// Analytics result schemas
const BeliefAnalysisSchema = z.object({
  totalBeliefs: z.number(),
  beliefsByDomain: z.record(z.string(), z.number()),
  beliefsByStrength: z.record(z.string(), z.number()),
  averageStrength: z.number(),
  mostCommonBeliefs: z.array(
    z.object({
      belief: z.string(),
      frequency: z.number(),
      averageStrength: z.number(),
    }),
  ),
  domainCorrelations: z.array(
    z.object({
      domain1: z.string(),
      domain2: z.string(),
      correlation: z.number(),
    }),
  ),
})

const EmotionAnalysisSchema = z.object({
  totalEmotions: z.number(),
  emotionsByType: z.record(z.string(), z.number()),
  emotionsByIntensity: z.record(z.string(), z.number()),
  averageIntensity: z.number(),
  emotionTriggerPatterns: z.array(
    z.object({
      emotion: z.string(),
      commonTriggers: z.array(z.string()),
      averageIntensity: z.number(),
    }),
  ),
  comorbidityPatterns: z.array(
    z.object({
      emotions: z.array(z.string()),
      frequency: z.number(),
      clinicalSignificance: z.string(),
    }),
  ),
})

const DistortionAnalysisSchema = z.object({
  totalDistortions: z.number(),
  distortionsByType: z.record(z.string(), z.number()),
  distortionsByFrequency: z.record(z.string(), z.number()),
  mostCommonDistortions: z.array(
    z.object({
      type: z.string(),
      frequency: z.number(),
      averageFrequency: z.string(),
      exampleThoughts: z.array(z.string()),
    }),
  ),
  triggerThemeAnalysis: z.array(
    z.object({
      theme: z.string(),
      associatedDistortions: z.array(z.string()),
      frequency: z.number(),
    }),
  ),
})

const DatasetStatisticsSchema = z.object({
  totalModels: z.number(),
  demographics: z.object({
    ageDistribution: z.record(z.string(), z.number()),
    genderDistribution: z.record(z.string(), z.number()),
    occupationDistribution: z.record(z.string(), z.number()),
  }),
  diagnoses: z.object({
    primaryDiagnoses: z.record(z.string(), z.number()),
    severityDistribution: z.record(z.string(), z.number()),
    comorbidityPatterns: z.array(
      z.object({
        diagnoses: z.array(z.string()),
        frequency: z.number(),
      }),
    ),
  }),
  conversationalStyles: z.object({
    styleDistribution: z.record(z.string(), z.number()),
    difficultyDistribution: z.record(z.string(), z.number()),
    styleCharacteristics: z.record(
      z.string(),
      z.object({
        averageVerbosity: z.number(),
        averageResistance: z.number(),
        averageInsightLevel: z.number(),
      }),
    ),
  }),
  dataQuality: z.object({
    averageCompleteness: z.number(),
    averageConsistency: z.number(),
    averageClinicalValidity: z.number(),
    qualityDistribution: z.record(z.string(), z.number()),
  }),
})

export type BeliefAnalysis = z.infer<typeof BeliefAnalysisSchema>
export type EmotionAnalysis = z.infer<typeof EmotionAnalysisSchema>
export type DistortionAnalysis = z.infer<typeof DistortionAnalysisSchema>
export type DatasetStatistics = z.infer<typeof DatasetStatisticsSchema>

export interface TherapeuticInsight {
  category:
    | 'belief-pattern'
    | 'emotion-regulation'
    | 'distortion-frequency'
    | 'communication-style'
    | 'treatment-planning'
  insight: string
  evidence: string[]
  clinicalRelevance: 'high' | 'medium' | 'low'
  actionableRecommendations: string[]
  targetPopulation?: string
}

export interface VisualizationData {
  beliefNetworkGraph: {
    nodes: Array<{ id: string; label: string; size: number; group: string }>
    edges: Array<{ from: string; to: string; weight: number; type: string }>
  }
  emotionIntensityHeatmap: {
    emotions: string[]
    intensityLevels: number[]
    data: number[][]
  }
  distortionFrequencyChart: {
    labels: string[]
    frequencies: number[]
    severity: string[]
  }
  demographicBreakdown: {
    age: { labels: string[]; values: number[] }
    gender: { labels: string[]; values: number[] }
    diagnosis: { labels: string[]; values: number[] }
  }
}

export interface AnalyticsConfig {
  includeVisualizationData: boolean
  generateInsights: boolean
  computeCorrelations: boolean
  minFrequencyThreshold: number
  maxResultsPerCategory: number
}

/**
 * Patient-Psi Dataset Analytics Service
 */
export class PatientPsiAnalytics {
  private config: AnalyticsConfig

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      includeVisualizationData: true,
      generateInsights: true,
      computeCorrelations: true,
      minFrequencyThreshold: 2,
      maxResultsPerCategory: 10,
      ...config,
    }
  }

  /**
   * Generate comprehensive dataset analysis
   */
  async analyzeDataset(
    models: CognitiveModel[],
    normalizedResults?: NormalizationResult[],
  ): Promise<{
    statistics: DatasetStatistics
    beliefAnalysis: BeliefAnalysis
    emotionAnalysis: EmotionAnalysis
    distortionAnalysis: DistortionAnalysis
    therapeuticInsights: TherapeuticInsight[]
    visualizationData?: VisualizationData
  }> {
    console.log(`Analyzing Patient-Psi dataset with ${models.length} models...`)

    // Generate core analyses
    const statistics = this.generateDatasetStatistics(models, normalizedResults)
    const beliefAnalysis = this.analyzeCoreBeliefs(models)
    const emotionAnalysis = this.analyzeEmotionalPatterns(models)
    const distortionAnalysis = this.analyzeDistortionPatterns(models)

    // Generate therapeutic insights
    const therapeuticInsights = this.config.generateInsights
      ? this.generateTherapeuticInsights(
          statistics,
          beliefAnalysis,
          emotionAnalysis,
          distortionAnalysis,
        )
      : []

    // Generate visualization data
    const visualizationData = this.config.includeVisualizationData
      ? this.generateVisualizationData(
          models,
          beliefAnalysis,
          emotionAnalysis,
          distortionAnalysis,
        )
      : undefined

    return {
      statistics,
      beliefAnalysis,
      emotionAnalysis,
      distortionAnalysis,
      therapeuticInsights,
      visualizationData,
    }
  }

  /**
   * Generate dataset-level statistics
   */
  private generateDatasetStatistics(
    models: CognitiveModel[],
    normalizedResults?: NormalizationResult[],
  ): DatasetStatistics {
    const demographics = this.analyzeDemographics(models)
    const diagnoses = this.analyzeDiagnoses(models)
    const conversationalStyles = this.analyzeConversationalStyles(models)
    const dataQuality = normalizedResults
      ? this.analyzeDataQuality(normalizedResults)
      : this.getDefaultDataQuality()

    return DatasetStatisticsSchema.parse({
      totalModels: models.length,
      demographics,
      diagnoses,
      conversationalStyles,
      dataQuality,
    })
  }

  /**
   * Analyze core beliefs patterns
   */
  private analyzeCoreBeliefs(models: CognitiveModel[]): BeliefAnalysis {
    const allBeliefs = models.flatMap((m) => m.coreBeliefs)
    const beliefsByDomain = this.groupByProperty(
      allBeliefs,
      'relatedDomains',
      true,
    )
    const beliefsByStrength = this.groupByRange(
      allBeliefs.map((b) => b.strength),
      [0, 3, 6, 8, 10],
    )

    // Find most common beliefs
    const beliefCounts = new Map<
      string,
      { count: number; strengths: number[] }
    >()
    for (const belief of allBeliefs) {
      const key = belief.belief.toLowerCase()
      if (!beliefCounts.has(key)) {
        beliefCounts.set(key, { count: 0, strengths: [] })
      }
      const entry = beliefCounts.get(key)!
      entry.count++
      entry.strengths.push(belief.strength)
    }

    const mostCommonBeliefs = Array.from(beliefCounts.entries())
      .filter(([_, data]) => data.count >= this.config.minFrequencyThreshold)
      .map(([belief, data]) => ({
        belief,
        frequency: data.count,
        averageStrength:
          data.strengths.reduce((a, b) => a + b, 0) / data.strengths.length,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.config.maxResultsPerCategory)

    // Calculate domain correlations
    const domainCorrelations = this.config.computeCorrelations
      ? this.calculateDomainCorrelations(allBeliefs)
      : []

    return BeliefAnalysisSchema.parse({
      totalBeliefs: allBeliefs.length,
      beliefsByDomain,
      beliefsByStrength,
      averageStrength:
        allBeliefs.reduce((sum, b) => sum + b.strength, 0) / allBeliefs.length,
      mostCommonBeliefs,
      domainCorrelations,
    })
  }

  /**
   * Analyze emotional patterns
   */
  private analyzeEmotionalPatterns(models: CognitiveModel[]): EmotionAnalysis {
    const allEmotions = models.flatMap((m) => m.emotionalPatterns)
    const emotionsByType = this.groupByProperty(allEmotions, 'emotion')
    const emotionsByIntensity = this.groupByRange(
      allEmotions.map((e) => e.intensity),
      [0, 3, 6, 8, 10],
    )

    // Analyze emotion-trigger patterns
    const emotionTriggerMap = new Map<
      string,
      { triggers: string[]; intensities: number[] }
    >()
    for (const emotion of allEmotions) {
      if (!emotionTriggerMap.has(emotion.emotion)) {
        emotionTriggerMap.set(emotion.emotion, {
          triggers: [],
          intensities: [],
        })
      }
      const entry = emotionTriggerMap.get(emotion.emotion)!
      entry.triggers.push(...emotion.triggers)
      entry.intensities.push(emotion.intensity)
    }

    const emotionTriggerPatterns = Array.from(emotionTriggerMap.entries()).map(
      ([emotion, data]) => ({
        emotion,
        commonTriggers: this.findCommonElements(data.triggers, 3),
        averageIntensity:
          data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length,
      }),
    )

    // Find emotion comorbidity patterns
    const comorbidityPatterns = this.findEmotionComorbidityPatterns(models)

    return EmotionAnalysisSchema.parse({
      totalEmotions: allEmotions.length,
      emotionsByType,
      emotionsByIntensity,
      averageIntensity:
        allEmotions.reduce((sum, e) => sum + e.intensity, 0) /
        allEmotions.length,
      emotionTriggerPatterns,
      comorbidityPatterns,
    })
  }

  /**
   * Analyze distortion patterns
   */
  private analyzeDistortionPatterns(
    models: CognitiveModel[],
  ): DistortionAnalysis {
    const allDistortions = models.flatMap((m) => m.distortionPatterns)
    const distortionsByType = this.groupByProperty(allDistortions, 'type')
    const distortionsByFrequency = this.groupByProperty(
      allDistortions,
      'frequency',
    )

    // Find most common distortions
    const distortionCounts = new Map<
      string,
      { count: number; frequencies: string[]; examples: string[] }
    >()
    for (const distortion of allDistortions) {
      const key = distortion.type.toLowerCase()
      if (!distortionCounts.has(key)) {
        distortionCounts.set(key, { count: 0, frequencies: [], examples: [] })
      }
      const entry = distortionCounts.get(key)!
      entry.count++
      entry.frequencies.push(distortion.frequency)
      entry.examples.push(...distortion.examples.slice(0, 2)) // Limit examples
    }

    const mostCommonDistortions = Array.from(distortionCounts.entries())
      .filter(([_, data]) => data.count >= this.config.minFrequencyThreshold)
      .map(([type, data]) => ({
        type,
        frequency: data.count,
        averageFrequency: this.calculateModeFrequency(data.frequencies),
        exampleThoughts: [...new Set(data.examples)].slice(0, 3), // Unique examples
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.config.maxResultsPerCategory)

    // Analyze trigger themes
    const triggerThemeAnalysis = this.analyzeTriggerThemes(allDistortions)

    return DistortionAnalysisSchema.parse({
      totalDistortions: allDistortions.length,
      distortionsByType,
      distortionsByFrequency,
      mostCommonDistortions,
      triggerThemeAnalysis,
    })
  }

  /**
   * Generate therapeutic insights from analysis
   */
  private generateTherapeuticInsights(
    statistics: DatasetStatistics,
    beliefAnalysis: BeliefAnalysis,
    emotionAnalysis: EmotionAnalysis,
    distortionAnalysis: DistortionAnalysis,
  ): TherapeuticInsight[] {
    const insights: TherapeuticInsight[] = []

    // Belief pattern insights
    if (beliefAnalysis.mostCommonBeliefs.length > 0) {
      const topBelief = beliefAnalysis.mostCommonBeliefs[0]
      insights.push({
        category: 'belief-pattern',
        insight: `Core belief "${topBelief.belief}" appears in ${topBelief.frequency} models with average strength ${topBelief.averageStrength.toFixed(1)}`,
        evidence: [
          `Frequency: ${topBelief.frequency}/${statistics.totalModels} models`,
          `Average strength: ${topBelief.averageStrength.toFixed(1)}/10`,
        ],
        clinicalRelevance:
          topBelief.frequency > statistics.totalModels * 0.3
            ? 'high'
            : 'medium',
        actionableRecommendations: [
          'Develop specialized intervention protocols for this belief pattern',
          'Create training scenarios specifically targeting this core belief',
          'Prepare therapists for common resistance patterns around this belief',
        ],
      })
    }

    // Emotion regulation insights
    if (emotionAnalysis.emotionTriggerPatterns.length > 0) {
      const highIntensityEmotions =
        emotionAnalysis.emotionTriggerPatterns.filter(
          (e) => e.averageIntensity >= 7,
        )
      if (highIntensityEmotions.length > 0) {
        insights.push({
          category: 'emotion-regulation',
          insight: `High-intensity emotions (${highIntensityEmotions.map((e) => e.emotion).join(', ')}) require specialized regulation techniques`,
          evidence: highIntensityEmotions.map(
            (e) =>
              `${e.emotion}: ${e.averageIntensity.toFixed(1)}/10 intensity`,
          ),
          clinicalRelevance: 'high',
          actionableRecommendations: [
            'Integrate distress tolerance skills training',
            'Prioritize safety planning for high-intensity emotional states',
            'Develop crisis intervention protocols',
          ],
        })
      }
    }

    // Distortion frequency insights
    if (distortionAnalysis.mostCommonDistortions.length > 0) {
      const topDistortion = distortionAnalysis.mostCommonDistortions[0]
      insights.push({
        category: 'distortion-frequency',
        insight: `${topDistortion.type} is the most common distortion pattern, appearing in ${topDistortion.frequency} models`,
        evidence: [
          `Frequency: ${topDistortion.frequency}/${statistics.totalModels} models`,
          `Example thoughts: ${topDistortion.exampleThoughts.join('; ')}`,
        ],
        clinicalRelevance: 'high',
        actionableRecommendations: [
          `Develop specialized ${topDistortion.type} identification training`,
          'Create intervention techniques specifically for this distortion',
          'Include this pattern in therapist competency assessments',
        ],
      })
    }

    // Communication style insights
    const styleData = statistics.conversationalStyles.styleDistribution
    const mostChallengingStyle = Object.entries(styleData).sort(
      ([, a], [, b]) => b - a,
    )[0]

    if (mostChallengingStyle) {
      const [style, count] = mostChallengingStyle
      insights.push({
        category: 'communication-style',
        insight: `${style} communication style is most common (${count} models), requiring specialized engagement techniques`,
        evidence: [
          `${count}/${statistics.totalModels} models use ${style} style`,
        ],
        clinicalRelevance: 'medium',
        actionableRecommendations: [
          `Develop ${style}-specific engagement protocols`,
          'Train therapists in style-adaptive communication',
          'Create role-playing scenarios for this communication style',
        ],
      })
    }

    // Data quality insights
    if (statistics.dataQuality.averageCompleteness < 0.8) {
      insights.push({
        category: 'treatment-planning',
        insight: `Dataset completeness is ${(statistics.dataQuality.averageCompleteness * 100).toFixed(1)}%, indicating need for enhanced assessment protocols`,
        evidence: [
          `Average completeness: ${(statistics.dataQuality.averageCompleteness * 100).toFixed(1)}%`,
          `Clinical validity: ${(statistics.dataQuality.averageClinicalValidity * 100).toFixed(1)}%`,
        ],
        clinicalRelevance: 'medium',
        actionableRecommendations: [
          'Implement more comprehensive initial assessments',
          'Develop standardized data collection protocols',
          'Enhance clinical interviewing techniques training',
        ],
      })
    }

    return insights
  }

  /**
   * Generate visualization data for frontend charts
   */
  private generateVisualizationData(
    models: CognitiveModel[],
    beliefAnalysis: BeliefAnalysis,
    emotionAnalysis: EmotionAnalysis,
    distortionAnalysis: DistortionAnalysis,
  ): VisualizationData {
    return {
      beliefNetworkGraph: this.createBeliefNetworkGraph(models),
      emotionIntensityHeatmap: this.createEmotionIntensityHeatmap(models),
      distortionFrequencyChart:
        this.createDistortionFrequencyChart(distortionAnalysis),
      demographicBreakdown: this.createDemographicBreakdown(models),
    }
  }

  // Helper methods for analysis

  private analyzeDemographics(models: CognitiveModel[]) {
    const ageRanges = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']
    const ageDistribution: Record<string, number> = {}

    for (const range of ageRanges) {
      ageDistribution[range] = 0
    }

    for (const model of models) {
      const { age } = model.demographicInfo
      let range = '65+'
      if (age <= 25) {
        range = '18-25'
      } else if (age <= 35) {
        range = '26-35'
      } else if (age <= 45) {
        range = '36-45'
      } else if (age <= 55) {
        range = '46-55'
      } else if (age <= 65) {
        range = '56-65'
      }

      ageDistribution[range]++
    }

    return {
      ageDistribution,
      genderDistribution: this.groupByProperty(
        models,
        'demographicInfo.gender',
      ),
      occupationDistribution: this.groupByProperty(
        models,
        'demographicInfo.occupation',
      ),
    }
  }

  private analyzeDiagnoses(models: CognitiveModel[]) {
    const primaryDiagnoses = this.groupByProperty(
      models,
      'diagnosisInfo.primaryDiagnosis',
    )
    const severityDistribution = this.groupByProperty(
      models,
      'diagnosisInfo.severity',
    )

    // Find comorbidity patterns
    const comorbidityPatterns = this.findDiagnosisComorbidityPatterns(models)

    return {
      primaryDiagnoses,
      severityDistribution,
      comorbidityPatterns,
    }
  }

  private analyzeConversationalStyles(models: CognitiveModel[]) {
    const styleMap = new Map<
      string,
      {
        count: number
        verbosity: number[]
        resistance: number[]
        insight: number[]
      }
    >()

    for (const model of models) {
      const style = this.inferConversationalStyleType(model.conversationalStyle)

      if (!styleMap.has(style)) {
        styleMap.set(style, {
          count: 0,
          verbosity: [],
          resistance: [],
          insight: [],
        })
      }

      const entry = styleMap.get(style)!
      entry.count++
      entry.verbosity.push(model.conversationalStyle.verbosity)
      entry.resistance.push(model.conversationalStyle.resistance)
      entry.insight.push(model.conversationalStyle.insightLevel)
    }

    const styleDistribution: Record<string, number> = {}
    const styleCharacteristics: Record<
      string,
      {
        averageVerbosity: number
        averageResistance: number
        averageInsightLevel: number
      }
    > = {}

    for (const [style, data] of styleMap) {
      styleDistribution[style] = data.count
      styleCharacteristics[style] = {
        averageVerbosity:
          data.verbosity.reduce((a, b) => a + b, 0) / data.verbosity.length,
        averageResistance:
          data.resistance.reduce((a, b) => a + b, 0) / data.resistance.length,
        averageInsightLevel:
          data.insight.reduce((a, b) => a + b, 0) / data.insight.length,
      }
    }

    // Rough difficulty mapping
    const difficultyDistribution: Record<string, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    }

    for (const model of models) {
      const difficulty = this.estimateStyleDifficulty(model.conversationalStyle)
      difficultyDistribution[difficulty]++
    }

    return {
      styleDistribution,
      difficultyDistribution,
      styleCharacteristics,
    }
  }

  private analyzeDataQuality(normalizedResults: NormalizationResult[]) {
    const completeness = normalizedResults.map(
      (r) => r.metadata.dataQuality.completeness,
    )
    const consistency = normalizedResults.map(
      (r) => r.metadata.dataQuality.consistency,
    )
    const clinicalValidity = normalizedResults.map(
      (r) => r.metadata.dataQuality.clinicalValidity,
    )

    const qualityDistribution: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    }

    for (const result of normalizedResults) {
      const avgQuality =
        (result.metadata.dataQuality.completeness +
          result.metadata.dataQuality.consistency +
          result.metadata.dataQuality.clinicalValidity) /
        3

      if (avgQuality >= 0.8) {
        qualityDistribution.high++
      } else if (avgQuality >= 0.6) {
        qualityDistribution.medium++
      } else {
        qualityDistribution.low++
      }
    }

    return {
      averageCompleteness:
        completeness.reduce((a, b) => a + b, 0) / completeness.length,
      averageConsistency:
        consistency.reduce((a, b) => a + b, 0) / consistency.length,
      averageClinicalValidity:
        clinicalValidity.reduce((a, b) => a + b, 0) / clinicalValidity.length,
      qualityDistribution,
    }
  }

  private getDefaultDataQuality() {
    return {
      averageCompleteness: 0.75,
      averageConsistency: 0.8,
      averageClinicalValidity: 0.85,
      qualityDistribution: { high: 0, medium: 0, low: 0 },
    }
  }

  private groupByProperty(
    items: unknown[],
    property: string,
    isArray = false,
  ): Record<string, number> {
    const result: Record<string, number> = {}

    for (const item of items) {
      const value = this.getNestedProperty(item, property)

      if (isArray && Array.isArray(value)) {
        for (const v of value) {
          result[v] = (result[v] || 0) + 1
        }
      } else if (value !== undefined && value !== null) {
        const key = String(value)
        result[key] = (result[key] || 0) + 1
      }
    }

    return result
  }

  private groupByRange(
    values: number[],
    ranges: number[],
  ): Record<string, number> {
    const result: Record<string, number> = {}

    for (let i = 0; i < ranges.length - 1; i++) {
      const min = ranges[i]
      const max = ranges[i + 1]
      const key = `${min}-${max}`
      result[key] = values.filter((v) => v >= min && v < max).length
    }

    return result
  }

  private getNestedProperty(obj: unknown, path: string): unknown {
    return path
      .split('.')
      .reduce(
        (current, key) => (current as Record<string, unknown>)?.[key],
        obj,
      )
  }

  private findCommonElements(arr: string[], limit: number): string[] {
    const counts = new Map<string, number>()

    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1)
    }

    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item)
  }

  private calculateDomainCorrelations(beliefs: CoreBelief[]) {
    // Simplified correlation calculation
    const domains = [...new Set(beliefs.flatMap((b) => b.relatedDomains))]
    const correlations: Array<{
      domain1: string
      domain2: string
      correlation: number
    }> = []

    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const domain1 = domains[i]
        const domain2 = domains[j]

        // Count co-occurrences
        let coOccurrences = 0
        let domain1Count = 0
        let domain2Count = 0

        for (const belief of beliefs) {
          const hasDomain1 = belief.relatedDomains.includes(domain1)
          const hasDomain2 = belief.relatedDomains.includes(domain2)

          if (hasDomain1) {
            domain1Count++
          }
          if (hasDomain2) {
            domain2Count++
          }
          if (hasDomain1 && hasDomain2) {
            coOccurrences++
          }
        }

        // Simple correlation approximation
        const correlation =
          domain1Count > 0 && domain2Count > 0
            ? coOccurrences / Math.sqrt(domain1Count * domain2Count)
            : 0

        if (correlation > 0.1) {
          // Only significant correlations
          correlations.push({ domain1, domain2, correlation })
        }
      }
    }

    return correlations
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 10)
  }

  private findEmotionComorbidityPatterns(models: CognitiveModel[]) {
    const emotionSets = models.map((m) =>
      m.emotionalPatterns.map((e) => e.emotion),
    )
    const patterns = new Map<string, number>()

    for (const emotions of emotionSets) {
      if (emotions.length > 1) {
        const sorted = emotions.sort().join('+')
        patterns.set(sorted, (patterns.get(sorted) || 0) + 1)
      }
    }

    return Array.from(patterns.entries())
      .filter(([_, freq]) => freq >= this.config.minFrequencyThreshold)
      .map(([emotions, frequency]) => ({
        emotions: emotions.split('+'),
        frequency,
        clinicalSignificance:
          frequency > models.length * 0.2 ? 'high' : 'medium',
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.config.maxResultsPerCategory)
  }

  private findDiagnosisComorbidityPatterns(models: CognitiveModel[]) {
    const comorbidityMap = new Map<string, number>()

    for (const model of models) {
      if (
        model.diagnosisInfo.secondaryDiagnoses &&
        model.diagnosisInfo.secondaryDiagnoses.length > 0
      ) {
        const diagnoses = [
          model.diagnosisInfo.primaryDiagnosis,
          ...model.diagnosisInfo.secondaryDiagnoses,
        ]
          .sort()
          .join('+')
        comorbidityMap.set(diagnoses, (comorbidityMap.get(diagnoses) || 0) + 1)
      }
    }

    return Array.from(comorbidityMap.entries())
      .filter(([_, freq]) => freq >= this.config.minFrequencyThreshold)
      .map(([diagnoses, frequency]) => ({
        diagnoses: diagnoses.split('+'),
        frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.config.maxResultsPerCategory)
  }

  private analyzeTriggerThemes(distortions: DistortionPattern[]) {
    const themeMap = new Map<
      string,
      { distortions: Set<string>; frequency: number }
    >()

    for (const distortion of distortions) {
      for (const theme of distortion.triggerThemes) {
        if (!themeMap.has(theme)) {
          themeMap.set(theme, { distortions: new Set(), frequency: 0 })
        }
        const entry = themeMap.get(theme)!
        entry.distortions.add(distortion.type)
        entry.frequency++
      }
    }

    return Array.from(themeMap.entries())
      .map(([theme, data]) => ({
        theme,
        associatedDistortions: Array.from(data.distortions),
        frequency: data.frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.config.maxResultsPerCategory)
  }

  private calculateModeFrequency(frequencies: string[]): string {
    const counts = new Map<string, number>()
    for (const freq of frequencies) {
      counts.set(freq, (counts.get(freq) || 0) + 1)
    }

    return (
      Array.from(counts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'occasional'
    )
  }

  private inferConversationalStyleType(style: {
    resistance: number
    verbosity: number
    insightLevel: number
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
    if (style.insightLevel <= 4) {
      return 'tangent'
    }
    return 'plain'
  }

  private estimateStyleDifficulty(style: {
    resistance: number
    verbosity: number
    insightLevel: number
  }): 'beginner' | 'intermediate' | 'advanced' {
    const complexity =
      style.resistance +
      (10 - style.insightLevel) +
      Math.abs(5 - style.verbosity)

    if (complexity <= 12) {
      return 'beginner'
    }
    if (complexity <= 18) {
      return 'intermediate'
    }
    return 'advanced'
  }

  // Visualization helper methods

  private createBeliefNetworkGraph(models: CognitiveModel[]) {
    const nodes: Array<{
      id: string
      label: string
      size: number
      group: string
    }> = []
    const edges: Array<{
      from: string
      to: string
      weight: number
      type: string
    }> = []

    const beliefCounts = new Map<string, number>()
    const domainCounts = new Map<string, number>()

    // Count beliefs and domains
    for (const model of models) {
      for (const belief of model.coreBeliefs) {
        beliefCounts.set(
          belief.belief,
          (beliefCounts.get(belief.belief) || 0) + 1,
        )

        for (const domain of belief.relatedDomains) {
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
        }
      }
    }

    // Create nodes for top beliefs and domains
    const topBeliefs = Array.from(beliefCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)

    const topDomains = Array.from(domainCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    for (const [belief, count] of topBeliefs) {
      nodes.push({
        id: `belief_${belief}`,
        label: belief,
        size: count,
        group: 'belief',
      })
    }

    for (const [domain, count] of topDomains) {
      nodes.push({
        id: `domain_${domain}`,
        label: domain,
        size: count,
        group: 'domain',
      })
    }

    // Create edges based on belief-domain relationships
    for (const model of models) {
      for (const belief of model.coreBeliefs) {
        const beliefId = `belief_${belief.belief}`

        for (const domain of belief.relatedDomains) {
          const domainId = `domain_${domain}`

          if (
            nodes.some((n) => n.id === beliefId) &&
            nodes.some((n) => n.id === domainId)
          ) {
            const existingEdge = edges.find(
              (e) => e.from === beliefId && e.to === domainId,
            )
            if (existingEdge) {
              existingEdge.weight++
            } else {
              edges.push({
                from: beliefId,
                to: domainId,
                weight: 1,
                type: 'belief-domain',
              })
            }
          }
        }
      }
    }

    return { nodes, edges }
  }

  private createEmotionIntensityHeatmap(models: CognitiveModel[]) {
    const emotions = [
      ...new Set(
        models.flatMap((m) => m.emotionalPatterns.map((e) => e.emotion)),
      ),
    ]
    const intensityLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    const data: number[][] = []

    for (const emotion of emotions) {
      const row: number[] = []
      for (const intensity of intensityLevels) {
        const count = models.reduce((sum, model) => {
          return (
            sum +
            model.emotionalPatterns.filter(
              (e) => e.emotion === emotion && e.intensity === intensity,
            ).length
          )
        }, 0)
        row.push(count)
      }
      data.push(row)
    }

    return { emotions, intensityLevels, data }
  }

  private createDistortionFrequencyChart(analysis: DistortionAnalysis) {
    const labels = analysis.mostCommonDistortions.map((d) => d.type)
    const frequencies = analysis.mostCommonDistortions.map((d) => d.frequency)
    const severity = analysis.mostCommonDistortions.map((d) => {
      if (d.averageFrequency === 'pervasive') {
        return 'high'
      }
      if (d.averageFrequency === 'frequent') {
        return 'medium'
      }
      return 'low'
    })

    return { labels, frequencies, severity }
  }

  private createDemographicBreakdown(models: CognitiveModel[]) {
    const ageGroups = this.analyzeDemographics(models).ageDistribution
    const genderDist = this.groupByProperty(models, 'demographicInfo.gender')
    const diagnosisDist = this.groupByProperty(
      models,
      'diagnosisInfo.primaryDiagnosis',
    )

    return {
      age: {
        labels: Object.keys(ageGroups),
        values: Object.values(ageGroups),
      },
      gender: {
        labels: Object.keys(genderDist),
        values: Object.values(genderDist),
      },
      diagnosis: {
        labels: Object.keys(diagnosisDist),
        values: Object.values(diagnosisDist),
      },
    }
  }
}

/**
 * Create and export analytics instance
 */
export const patientPsiAnalytics = new PatientPsiAnalytics()

/**
 * Utility function for quick dataset analysis
 */
export async function analyzePatientPsiDataset(
  models: CognitiveModel[],
  options?: Partial<AnalyticsConfig>,
) {
  const analytics = new PatientPsiAnalytics(options)
  return analytics.analyzeDataset(models)
}

/**
 * Utility function to generate insights summary
 */
export function generateInsightsSummary(
  insights: TherapeuticInsight[],
): string {
  const categories = [...new Set(insights.map((i) => i.category))]

  let summary = `Generated ${insights.length} therapeutic insights across ${categories.length} categories:\n\n`

  for (const category of categories) {
    const categoryInsights = insights.filter((i) => i.category === category)
    summary += `${category.toUpperCase()}:\n`

    for (const insight of categoryInsights) {
      summary += `• ${insight.insight}\n`
      summary += `  Clinical relevance: ${insight.clinicalRelevance}\n`
      summary += `  Key recommendations: ${insight.actionableRecommendations.slice(0, 2).join('; ')}\n\n`
    }
  }

  return summary
}
