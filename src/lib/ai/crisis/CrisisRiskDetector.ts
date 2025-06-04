import { appLogger as logger } from '../../logging'
import type { RiskAssessment } from './types'

/**
 * CrisisRiskDetector - Service for detecting and analyzing crisis risk in text
 * 
 * This service uses NLP techniques and pattern matching to identify potential
 * mental health crises and assess their severity.
 */
export class CrisisRiskDetector {
  // Risk phrases with severity weights (higher = more severe)
  private suicidalRiskPatterns: [RegExp, number][] = [
    [/\b(?:going to|will|want to|planning to|intend to|about to) (?:kill|hurt|harm) (?:myself|me)\b/i, 0.95],
    [/\b(?:contemplating|considering) suicide\b/i, 0.9],
    [/\b(?:end|take) my life\b/i, 0.95],
    [/\b(?:don'?t|do not) want to (?:live|exist|be here)\b/i, 0.85],
    [/\b(?:better off|easier) (?:dead|if I was dead|if I wasn'?t alive)\b/i, 0.9],
    [/\b(?:prepared|getting ready) (?:to die|for death|for the end)\b/i, 0.95],
    [/\b(?:wrote|writing|finished) (?:a|my) (?:suicide note|goodbye letter)\b/i, 0.95],
    [/\b(?:have|got|purchased|bought) (?:a gun|pills|rope|knife|medication)\b/i, 0.85],
    [/\bsuicid(?:e|al)\b/i, 0.8],
    [/\b(?:kill|hurt|harm) (?:myself|me)\b/i, 0.9],
  ]

  private selfHarmRiskPatterns: [RegExp, number][] = [
    [/\b(?:cut|cutting|burn|burning|hurt|hurting) (?:myself|my body|my arm|my leg|my skin)\b/i, 0.8],
    [/\b(?:started|resumed|considering) (?:self harm|self-harm|cutting|burning)\b/i, 0.8],
    [/\b(?:addicted to|can'?t stop) (?:cutting|self-harm|hurting myself)\b/i, 0.85],
    [/\brelease (?:pain|pressure|emotions|feelings) through (?:cutting|burning|harming)\b/i, 0.75],
  ]

  private harmToOthersPatterns: [RegExp, number][] = [
    [/\b(?:want|going|planning) to (?:hurt|harm|kill) (?:someone|them|him|her|people)\b/i, 0.95],
    [/\b(?:violent|homicidal) (?:thoughts|impulses|urges)\b/i, 0.9],
    [/\bcan'?t control (?:my anger|myself|violent impulses)\b/i, 0.85],
    [/\b(?:hurt|harm|injure|attack) (?:others|someone|them)\b/i, 0.85],
  ]

  private severeDepressionPatterns: [RegExp, number][] = [
    [/\bcompletely (?:hopeless|empty|numb)\b/i, 0.75],
    [/\bno reason to (?:continue|go on|live)\b/i, 0.8],
    [/\b(?:constant|persistent|overwhelming) (?:sadness|emptiness|despair)\b/i, 0.7],
    [/\bcan'?t (?:function|get out of bed|continue|go on)\b/i, 0.7],
    [/\b(?:serious|severe|major|clinical) depression\b/i, 0.7],
  ]

  private severeAnxietyPatterns: [RegExp, number][] = [
    [/\b(?:panic attack|panic episode)\b/i, 0.6],
    [/\bcan'?t (?:breathe|function|calm down|stop shaking)\b/i, 0.65],
    [/\b(?:overwhelming|debilitating|crippling) (?:anxiety|fear|worry|panic)\b/i, 0.65],
    [/\b(?:heart racing|hyperventilating|passing out)\b/i, 0.6],
  ]

  private substanceIssuePatterns: [RegExp, number][] = [
    [/\b(?:overdose|overdosing|OD)\b/i, 0.8],
    [/\b(?:addicted|addiction|withdrawal|relapse)\b/i, 0.65],
    [/\b(?:drinking|using) (?:too much|excessively|constantly)\b/i, 0.6],
    [/\b(?:substance|alcohol|drug) (?:problem|issue|abuse|dependence)\b/i, 0.6],
  ]

  /**
   * Analyze text for crisis risk indicators
   * @param text Text to analyze for crisis risk
   * @returns Risk assessment with scores and detected risks
   */
  public analyzeText(text: string): RiskAssessment {
    logger.info('Analyzing text for crisis risk indicators')
    
    // Normalize text for consistent analysis
    const normalizedText = this.normalizeText(text)
    
    // Empty text check
    if (!normalizedText || normalizedText.trim().length === 0) {
      return this.createNullAssessment()
    }
    
    // Run all pattern detections
    const suicidalMatches = this.detectPatterns(normalizedText, this.suicidalRiskPatterns)
    const selfHarmMatches = this.detectPatterns(normalizedText, this.selfHarmRiskPatterns)
    const harmToOthersMatches = this.detectPatterns(normalizedText, this.harmToOthersPatterns)
    const severeDepressionMatches = this.detectPatterns(normalizedText, this.severeDepressionPatterns)
    const severeAnxietyMatches = this.detectPatterns(normalizedText, this.severeAnxietyPatterns)
    const substanceIssueMatches = this.detectPatterns(normalizedText, this.substanceIssuePatterns)
    
    // Calculate risk scores for each category
    const suicidalRiskScore = this.calculateRiskScore(suicidalMatches)
    const selfHarmRiskScore = this.calculateRiskScore(selfHarmMatches)
    const harmToOthersRiskScore = this.calculateRiskScore(harmToOthersMatches)
    const severeDepressionRiskScore = this.calculateRiskScore(severeDepressionMatches)
    const severeAnxietyRiskScore = this.calculateRiskScore(severeAnxietyMatches)
    const substanceIssueRiskScore = this.calculateRiskScore(substanceIssueMatches)
    
    // Find primary risk (highest score)
    const riskScores: [string, number][] = [
      ['suicidal_ideation', suicidalRiskScore],
      ['self_harm', selfHarmRiskScore],
      ['harm_others', harmToOthersRiskScore],
      ['severe_depression', severeDepressionRiskScore],
      ['severe_anxiety', severeAnxietyRiskScore],
      ['substance_issue', substanceIssueRiskScore]
    ]
    
    // Sort by score descending
    riskScores.sort((a, b) => b[1] - a[1])
    
    // Calculate overall risk (weighted average with emphasis on higher risks)
    const overallRiskScore = this.calculateOverallRisk([
      suicidalRiskScore * 1.5, // Weight suicide risk higher
      selfHarmRiskScore * 1.3,
      harmToOthersRiskScore * 1.3,
      severeDepressionRiskScore,
      severeAnxietyRiskScore,
      substanceIssueRiskScore
    ])
    
    // Get secondary risks (any non-zero risks that aren't the primary)
    const secondaryRisks = riskScores
      .filter(([risk, score]) => score > 0.3 && risk !== riskScores[0][0])
      .map(([risk]) => risk)
    
    // Determine if immediate action is required
    const immediateActionRequired = 
      overallRiskScore > 0.7 || // High overall risk
      suicidalRiskScore > 0.8 || // High suicide risk
      harmToOthersRiskScore > 0.8 || // High risk to others
      selfHarmRiskScore > 0.8 // High self-harm risk
    
    // Construct the assessment
    const assessment: RiskAssessment = {
      overallRiskScore,
      primaryRisk: riskScores[0][0],
      secondaryRisks,
      confidenceScore: this.calculateConfidenceScore(riskScores, text.length),
      immediateActionRequired,
      analysisTimestamp: new Date().toISOString()
    }
    
    logger.info('Crisis risk assessment completed', {
      overallRisk: assessment.overallRiskScore,
      primaryRisk: assessment.primaryRisk,
      immediateAction: assessment.immediateActionRequired
    })
    
    return assessment
  }
  
  /**
   * Normalize text for consistent analysis
   */
  private normalizeText(text: string): string {
    if (!text) {
      return ''
    }
    
    return text
      .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim()
  }
  
  /**
   * Detect patterns in text
   */
  private detectPatterns(
    text: string, 
    patterns: [RegExp, number][]
  ): Array<{ pattern: RegExp; score: number; match: string }> {
    const matches: Array<{ pattern: RegExp; score: number; match: string }> = []
    
    for (const [pattern, score] of patterns) {
      const matchResult = text.match(pattern)
      if (matchResult) {
        matches.push({
          pattern,
          score,
          match: matchResult[0]
        })
      }
    }
    
    return matches
  }
  
  /**
   * Calculate risk score from pattern matches
   */
  private calculateRiskScore(
    matches: Array<{ pattern: RegExp; score: number; match: string }>
  ): number {
    if (matches.length === 0) {
      return 0
    }
    
    // Take the highest score from all matches
    const highestScore = Math.max(...matches.map(m => m.score))
    
    // Increase score slightly if multiple matches
    const multiplier = Math.min(1 + (matches.length - 1) * 0.1, 1.3)
    
    return Math.min(highestScore * multiplier, 1)
  }
  
  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(individualScores: number[]): number {
    if (individualScores.length === 0) {
      return 0
    }
    
    // Handle case with all zeros
    if (individualScores.every(score => score === 0)) {
      return 0
    }
    
    // Sort scores in descending order
    const sortedScores = [...individualScores].sort((a, b) => b - a)
    
    // Give more weight to higher scores
    let weightedSum = 0
    let weightSum = 0
    
    for (let i = 0; i < sortedScores.length; i++) {
      const weight = Math.pow(0.7, i) // Exponentially decreasing weights
      weightedSum += sortedScores[i] * weight
      weightSum += weight
    }
    
    return weightedSum / weightSum
  }
  
  /**
   * Calculate confidence score for the assessment
   */
  private calculateConfidenceScore(scores: [string, number][], textLength: number): number {
    // Baseline confidence
    let confidence = 0.7
    
    // Adjust based on text length (longer text = more context = higher confidence)
    if (textLength < 20) {
      confidence -= 0.2 // Very short text reduces confidence
    } else if (textLength > 100) {
      confidence += 0.1 // Longer text increases confidence
    }
    
    // Adjust based on pattern matches (more/stronger matches = higher confidence)
    const nonZeroScores = scores.filter(([_, score]) => score > 0)
    if (nonZeroScores.length >= 2) {
      confidence += 0.1 // Multiple risk categories increases confidence
    }
    
    // Adjust based on strength of top match
    const topScore = scores[0][1]
    if (topScore > 0.8) {
      confidence += 0.1 // Strong top match increases confidence
    } else if (topScore < 0.5 && topScore > 0) {
      confidence -= 0.1 // Weak top match decreases confidence
    }
    
    // Ensure confidence is within bounds
    return Math.max(0.5, Math.min(confidence, 0.95))
  }
  
  /**
   * Create a null assessment for empty/invalid text
   */
  private createNullAssessment(): RiskAssessment {
    return {
      overallRiskScore: 0,
      primaryRisk: 'none',
      secondaryRisks: [],
      confidenceScore: 0.5,
      immediateActionRequired: false,
      analysisTimestamp: new Date().toISOString()
    }
  }
  
  /**
   * Extract risk terms that were matched in the text
   * @param text Text that was analyzed
   * @param assessment The assessment result
   * @returns Array of detected risk terms/phrases
   */
  public extractRiskTerms(text: string, assessment: RiskAssessment): string[] {
    const matches: string[] = []
    const normalizedText = this.normalizeText(text)
    
    // Get all pattern groups based on detected risks
    const patternGroups: [RegExp, number][][] = []
    
    if (assessment.primaryRisk === 'suicidal_ideation' || assessment.secondaryRisks.includes('suicidal_ideation')) {
      patternGroups.push(this.suicidalRiskPatterns)
    }
    
    if (assessment.primaryRisk === 'self_harm' || assessment.secondaryRisks.includes('self_harm')) {
      patternGroups.push(this.selfHarmRiskPatterns)
    }
    
    if (assessment.primaryRisk === 'harm_others' || assessment.secondaryRisks.includes('harm_others')) {
      patternGroups.push(this.harmToOthersPatterns)
    }
    
    if (assessment.primaryRisk === 'severe_depression' || assessment.secondaryRisks.includes('severe_depression')) {
      patternGroups.push(this.severeDepressionPatterns)
    }
    
    if (assessment.primaryRisk === 'severe_anxiety' || assessment.secondaryRisks.includes('severe_anxiety')) {
      patternGroups.push(this.severeAnxietyPatterns)
    }
    
    if (assessment.primaryRisk === 'substance_issue' || assessment.secondaryRisks.includes('substance_issue')) {
      patternGroups.push(this.substanceIssuePatterns)
    }
    
    // Find all matches
    for (const patternGroup of patternGroups) {
      for (const [pattern] of patternGroup) {
        const matchResult = normalizedText.match(pattern)
        if (matchResult) {
          matches.push(matchResult[0])
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(matches)]
  }
} 