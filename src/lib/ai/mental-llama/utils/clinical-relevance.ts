/**
 * Clinical Relevance Scoring for Mental Health Explanations
 *
 * This module implements specialized metrics for evaluating the clinical relevance
 * of mental health explanations, based on domain-specific criteria including:
 *
 * 1. Evidence-based terminology and references
 * 2. Diagnostic criteria alignment
 * 3. Treatment relevance
 * 4. Clinical accuracy
 * 5. Alignment with established mental health frameworks
 */

import { logger } from '../../../logging'
import { MentalLLaMAModelProvider } from '../MentalLLaMAModelProvider'

/**
 * Interface for clinical relevance scoring parameters
 */
export interface ClinicalRelevanceParams {
  // The explanation to evaluate
  explanation: string

  // The mental health category being explained
  category: string

  // Optional expert reference explanations
  expertExplanations?: string[]

  // Optional model provider for advanced scoring
  modelProvider?: MentalLLaMAModelProvider
}

/**
 * Results of clinical relevance evaluation
 */
export interface ClinicalRelevanceResult {
  // Overall clinical relevance score (0-1)
  overallScore: number

  // Component scores
  components: {
    // Evidence-based language score
    evidenceBasedScore: number

    // Diagnostic criteria alignment score
    diagnosticCriteriaScore: number

    // Treatment relevance score
    treatmentRelevanceScore: number

    // Clinical accuracy score
    clinicalAccuracyScore: number

    // Framework alignment score
    frameworkAlignmentScore: number
  }

  // Identified strengths (optional)
  strengths?: string[]

  // Identified weaknesses (optional)
  weaknesses?: string[]

  // Improvement suggestions (optional)
  improvementSuggestions?: string[]
}

/**
 * Evaluate the clinical relevance of a mental health explanation
 *
 * @param params Parameters for clinical relevance evaluation
 * @returns Clinical relevance evaluation results
 */
export async function evaluateClinicalRelevance(
  params: ClinicalRelevanceParams,
): Promise<ClinicalRelevanceResult> {
  const { explanation, category, expertExplanations, modelProvider } = params

  logger.info('Evaluating clinical relevance of mental health explanation', {
    category,
    hasExpertExplanations: !!expertExplanations,
    hasModelProvider: !!modelProvider,
  })

  try {
    // Use model provider if available for more sophisticated evaluation
    if (modelProvider) {
      return await evaluateWithModelProvider(
        explanation,
        category,
        expertExplanations,
        modelProvider,
      )
    }

    // Otherwise use heuristic approach
    return evaluateWithHeuristics(explanation, category, expertExplanations)
  } catch (error) {
    logger.error('Error evaluating clinical relevance', { error })

    // Return default scores in case of error
    return {
      overallScore: 0.5,
      components: {
        evidenceBasedScore: 0.5,
        diagnosticCriteriaScore: 0.5,
        treatmentRelevanceScore: 0.5,
        clinicalAccuracyScore: 0.5,
        frameworkAlignmentScore: 0.5,
      },
    }
  }
}

/**
 * Evaluate clinical relevance using model provider
 */
async function evaluateWithModelProvider(
  explanation: string,
  category: string,
  expertExplanations?: string[],
  modelProvider?: MentalLLaMAModelProvider,
): Promise<ClinicalRelevanceResult> {
  logger.info('Evaluating clinical relevance using model provider')

  if (!modelProvider) {
    throw new Error('Model provider is required for model-based evaluation')
  }

  // Create prompt for clinical relevance evaluation
  const prompt = `
    As a clinical mental health expert, evaluate the following explanation for ${category} in terms of clinical relevance and accuracy.

    Explanation to evaluate:
    """
    ${explanation}
    """

    Please rate this explanation on a scale of 0-10 for the following criteria:
    1. Evidence-based language: Use of proper clinical terminology and references to research
    2. Diagnostic criteria alignment: Consistency with DSM-5/ICD-11 criteria for ${category}
    3. Treatment relevance: Mentions appropriate treatment approaches or considerations
    4. Clinical accuracy: Factual correctness of clinical statements
    5. Framework alignment: Consistency with established mental health frameworks

    Also identify key strengths, weaknesses, and provide improvement suggestions.
  `

  // Generate evaluation using the model
  const messages = [
    {
      role: 'system',
      content:
        'You are a clinical mental health expert skilled at evaluating explanations.',
    },
    { role: 'user', content: prompt },
  ]

  const response = await modelProvider.chat({ messages })
  const content = response.choices[0]?.message.content || ''

  // Parse scores from response (this is a simplified approach)
  const evidenceBasedMatch = content.match(/evidence-based language:?\s*(\d+)/i)
  const diagnosticCriteriaMatch = content.match(
    /diagnostic criteria alignment:?\s*(\d+)/i,
  )
  const treatmentRelevanceMatch = content.match(
    /treatment relevance:?\s*(\d+)/i,
  )
  const clinicalAccuracyMatch = content.match(/clinical accuracy:?\s*(\d+)/i)
  const frameworkAlignmentMatch = content.match(
    /framework alignment:?\s*(\d+)/i,
  )

  // Extract strengths, weaknesses, and suggestions
  const strengthsMatch = content.match(/strengths:?\s*(.+?)(?=weaknesses:|$)/is)
  const weaknessesMatch = content.match(
    /weaknesses:?\s*(.+?)(?=improvements:|$)/is,
  )
  const suggestionsMatch = content.match(
    /(?:improvements|suggestions):?\s*(.+?)(?=$)/is,
  )

  // Parse scores, normalizing to 0-1 scale
  const evidenceBasedScore = evidenceBasedMatch
    ? parseInt(evidenceBasedMatch[1]) / 10
    : 0.5
  const diagnosticCriteriaScore = diagnosticCriteriaMatch
    ? parseInt(diagnosticCriteriaMatch[1]) / 10
    : 0.5
  const treatmentRelevanceScore = treatmentRelevanceMatch
    ? parseInt(treatmentRelevanceMatch[1]) / 10
    : 0.5
  const clinicalAccuracyScore = clinicalAccuracyMatch
    ? parseInt(clinicalAccuracyMatch[1]) / 10
    : 0.5
  const frameworkAlignmentScore = frameworkAlignmentMatch
    ? parseInt(frameworkAlignmentMatch[1]) / 10
    : 0.5

  // Calculate overall score
  const overallScore =
    evidenceBasedScore * 0.25 +
    diagnosticCriteriaScore * 0.3 +
    treatmentRelevanceScore * 0.15 +
    clinicalAccuracyScore * 0.2 +
    frameworkAlignmentScore * 0.1

  // Process strengths, weaknesses, and suggestions
  const strengths =
    strengthsMatch?.[1]
      ?.trim()
      .split(/\n|-/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0) || []

  const weaknesses =
    weaknessesMatch?.[1]
      ?.trim()
      .split(/\n|-/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0) || []

  const improvementSuggestions =
    suggestionsMatch?.[1]
      ?.trim()
      .split(/\n|-/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0) || []

  return {
    overallScore,
    components: {
      evidenceBasedScore,
      diagnosticCriteriaScore,
      treatmentRelevanceScore,
      clinicalAccuracyScore,
      frameworkAlignmentScore,
    },
    strengths,
    weaknesses,
    improvementSuggestions,
  }
}

/**
 * Evaluate clinical relevance using heuristics
 */
function evaluateWithHeuristics(
  explanation: string,
  category: string,
  expertExplanations?: string[],
): ClinicalRelevanceResult {
  logger.info('Evaluating clinical relevance using heuristics')

  const lowerExplanation = explanation.toLowerCase()

  // Evidence-based language score
  const evidenceBasedScore = evaluateEvidenceBasedLanguage(lowerExplanation)

  // Diagnostic criteria alignment score
  const diagnosticCriteriaScore = evaluateDiagnosticCriteriaAlignment(
    lowerExplanation,
    category,
  )

  // Treatment relevance score
  const treatmentRelevanceScore = evaluateTreatmentRelevance(
    lowerExplanation,
    category,
  )

  // Clinical accuracy score (if expert explanations available, compare against them)
  const clinicalAccuracyScore = expertExplanations
    ? evaluateClinicalAccuracyWithReferences(
        lowerExplanation,
        expertExplanations,
      )
    : evaluateClinicalAccuracyHeuristic(lowerExplanation, category)

  // Framework alignment score
  const frameworkAlignmentScore = evaluateFrameworkAlignment(
    lowerExplanation,
    category,
  )

  // Calculate overall score (weighted average of component scores)
  const overallScore =
    evidenceBasedScore * 0.25 +
    diagnosticCriteriaScore * 0.3 +
    treatmentRelevanceScore * 0.15 +
    clinicalAccuracyScore * 0.2 +
    frameworkAlignmentScore * 0.1

  return {
    overallScore,
    components: {
      evidenceBasedScore,
      diagnosticCriteriaScore,
      treatmentRelevanceScore,
      clinicalAccuracyScore,
      frameworkAlignmentScore,
    },
  }
}

/**
 * Evaluate evidence-based language
 */
function evaluateEvidenceBasedLanguage(explanation: string): number {
  // Check for evidence-based language patterns
  const evidencePatterns = [
    'research shows',
    'studies indicate',
    'evidence suggests',
    'according to',
    'literature supports',
    'meta-analysis',
    'clinical trials',
    'findings suggest',
    'peer-reviewed',
    'empirically supported',
    'statistically significant',
    'systematic review',
    'randomized controlled trial',
  ]

  // Check for clinical terminology
  const clinicalTerms = [
    'diagnostic criteria',
    'dsm-5',
    'icd-11',
    'assessment',
    'differential diagnosis',
    'comorbid',
    'etiology',
    'prevalence',
    'incidence',
    'prognosis',
    'symptomatology',
    'clinical presentation',
    'psychopathology',
  ]

  // Count occurrences of evidence patterns and clinical terms
  const evidenceCount = evidencePatterns.filter((pattern) =>
    explanation.includes(pattern),
  ).length

  const termCount = clinicalTerms.filter((term) =>
    explanation.includes(term),
  ).length

  // Calculate evidence-based score with appropriate scaling
  const patternScore = Math.min(evidenceCount / 2, 1.0)
  const termScore = Math.min(termCount / 3, 1.0)

  // Combine scores
  return 0.6 * patternScore + 0.4 * termScore
}

/**
 * Evaluate diagnostic criteria alignment
 */
function evaluateDiagnosticCriteriaAlignment(
  explanation: string,
  category: string,
): number {
  // Define diagnostic criteria keywords for different mental health categories
  const diagnosticCriteria: Record<string, string[]> = {
    depression: [
      'depressed mood',
      'anhedonia',
      'weight loss',
      'insomnia',
      'hypersomnia',
      'psychomotor agitation',
      'fatigue',
      'worthlessness',
      'guilt',
      'concentration',
      'suicidal',
      'loss of interest',
      'sleep disturbance',
      'appetite change',
      'low energy',
      'negative thoughts',
    ],
    anxiety: [
      'excessive worry',
      'difficulty controlling worry',
      'restlessness',
      'easily fatigued',
      'difficulty concentrating',
      'irritability',
      'muscle tension',
      'sleep disturbance',
      'nervousness',
      'fear',
      'avoidance',
      'apprehension',
      'anticipation',
      'autonomic arousal',
    ],
    ptsd: [
      'traumatic event',
      'intrusive memories',
      'flashbacks',
      'nightmares',
      'psychological distress',
      'physiological reactivity',
      'avoidance',
      'negative alterations',
      'hyperarousal',
      'startle response',
      'hypervigilance',
      'dissociation',
      're-experiencing',
      'trigger',
    ],
    ocd: [
      'obsessions',
      'compulsions',
      'intrusive thoughts',
      'repetitive behaviors',
      'excessive hand washing',
      'checking',
      'ordering',
      'counting',
      'mental rituals',
      'neutralizing',
      'distress',
      'time-consuming',
      'not pleasurable',
      'ego-dystonic',
    ],
    bipolar: [
      'mania',
      'hypomania',
      'elevated mood',
      'irritable mood',
      'inflated self-esteem',
      'decreased need for sleep',
      'pressured speech',
      'flight of ideas',
      'distractibility',
      'increased activity',
      'excessive involvement',
      'poor judgment',
      'grandiosity',
      'racing thoughts',
    ],
    suicidal: [
      'suicidal ideation',
      'suicidal thoughts',
      'suicide plan',
      'suicide attempt',
      'intent',
      'preparatory behavior',
      'hopelessness',
      'feeling trapped',
      'burden',
      'wish to die',
      'no reason to live',
      'access to means',
      'suicide note',
      'farewell messages',
    ],
  }

  // Get criteria for the specified category, or use a general set
  const criteriaList = diagnosticCriteria[category] || [
    'symptoms',
    'diagnosis',
    'criteria',
    'assessment',
    'clinical presentation',
    'mental health',
    'psychological',
  ]

  // Count matches
  const matchCount = criteriaList.filter((criterion) =>
    explanation.includes(criterion),
  ).length

  // Calculate score with appropriate scaling
  // Higher weight for high-value criteria if more than half are present
  return matchCount >= criteriaList.length / 2
    ? 0.7 + 0.3 * (matchCount / criteriaList.length)
    : 0.7 * (matchCount / criteriaList.length)
}

/**
 * Evaluate treatment relevance
 */
function evaluateTreatmentRelevance(
  explanation: string,
  category: string,
): number {
  // Define treatment approaches for different mental health categories
  const treatmentApproaches: Record<string, string[]> = {
    depression: [
      'antidepressant',
      'ssri',
      'snri',
      'cognitive behavioral therapy',
      'cbt',
      'psychotherapy',
      'behavioral activation',
      'exercise',
      'interpersonal therapy',
      'mindfulness',
      'electroconvulsive therapy',
      'transcranial',
      'counseling',
    ],
    anxiety: [
      'cognitive behavioral therapy',
      'cbt',
      'exposure therapy',
      'ssri',
      'benzodiazepine',
      'relaxation techniques',
      'mindfulness',
      'acceptance',
      'commitment therapy',
      'act',
      'anxiety management',
      'breathing exercises',
    ],
    ptsd: [
      'trauma-focused therapy',
      'emdr',
      'eye movement desensitization',
      'prolonged exposure',
      'cognitive processing therapy',
      'trauma processing',
      'ssri',
      'imagery rehearsal',
      'narrative therapy',
      'safety planning',
      'stress inoculation',
    ],
    ocd: [
      'exposure and response prevention',
      'erp',
      'cognitive behavioral therapy',
      'cbt',
      'ssri',
      'antidepressant',
      'acceptance',
      'commitment therapy',
      'act',
      'habit reversal',
      'mindfulness',
      'metacognitive therapy',
    ],
    bipolar: [
      'mood stabilizer',
      'lithium',
      'valproate',
      'lamotrigine',
      'antipsychotic',
      'psychoeducation',
      'cognitive behavioral therapy',
      'interpersonal therapy',
      'social rhythm therapy',
      'family-focused therapy',
      'sleep regulation',
    ],
    suicidal: [
      'safety planning',
      'suicide prevention',
      'crisis intervention',
      'hotline',
      'cognitive behavioral therapy',
      'dialectical behavior therapy',
      'dbt',
      'hospitalization',
      'lethal means restriction',
      'collaborative assessment',
      'follow-up care',
      'medication',
    ],
  }

  // Get treatment approaches for the specified category, or use a general set
  const approachesList = treatmentApproaches[category] || [
    'treatment',
    'therapy',
    'intervention',
    'support',
    'medication',
    'therapeutic',
    'counseling',
    'approach',
    'strategy',
  ]

  // Count matches
  const matchCount = approachesList.filter((approach) =>
    explanation.includes(approach),
  ).length

  // Calculate score with appropriate scaling
  return Math.min(
    0.4 + 0.6 * (matchCount / Math.min(approachesList.length, 5)),
    1.0,
  )
}

/**
 * Evaluate clinical accuracy with reference explanations
 */
function evaluateClinicalAccuracyWithReferences(
  explanation: string,
  referenceExplanations: string[],
): number {
  // Extract key phrases from reference explanations
  const referenceKeyPhrases = extractKeyPhrases(referenceExplanations)

  // Count matching key phrases in the explanation
  const matchCount = referenceKeyPhrases.filter((phrase) =>
    explanation.includes(phrase.toLowerCase()),
  ).length

  // Calculate accuracy score
  return Math.min(
    0.5 + 0.5 * (matchCount / Math.min(referenceKeyPhrases.length, 10)),
    1.0,
  )
}

/**
 * Evaluate clinical accuracy using heuristics
 */
function evaluateClinicalAccuracyHeuristic(
  explanation: string,
  category: string,
): number {
  // Define key clinical facts for different mental health categories
  const clinicalFacts: Record<string, string[]> = {
    depression: [
      'mood disorder',
      'persistent sadness',
      'loss of interest',
      'affects thoughts',
      'affects behavior',
      'affects feelings',
      'biological factors',
      'psychological factors',
      'social factors',
      'neurotransmitter',
      'serotonin',
      'common mental disorder',
    ],
    anxiety: [
      'excessive worry',
      'autonomic symptoms',
      'fight or flight',
      'amygdala',
      'anticipation',
      'physical symptoms',
      'avoidance behavior',
      'safety behaviors',
      'cognitive distortions',
      'anxiety sensitivity',
      'most common disorder',
    ],
    ptsd: [
      'follows traumatic event',
      'threat to life',
      'witnessing death',
      'threat to physical integrity',
      're-experiencing',
      'intrusive memories',
      'hyperarousal',
      'avoidance',
      'negative cognitions',
      'altered mood',
      'neurobiological changes',
      'trauma response',
    ],
    ocd: [
      'obsessions and compulsions',
      'unwanted thoughts',
      'repetitive behaviors',
      'reduces anxiety',
      'not pleasurable',
      'excessive',
      'unreasonable',
      'time consuming',
      'distressing',
      'functional impairment',
      'ego-dystonic',
      'insight varies',
    ],
    bipolar: [
      'mood episodes',
      'mania',
      'hypomania',
      'depression',
      'cyclical pattern',
      'episodic',
      'genetic factors',
      'neurotransmitter dysregulation',
      'circadian rhythm',
      'bipolar i',
      'bipolar ii',
      'mood stabilizers',
    ],
    suicidal: [
      'risk factors',
      'warning signs',
      'previous attempts',
      'hopelessness',
      'psychological pain',
      'perception of burden',
      'isolation',
      'impulsivity',
      'access to means',
      'ideation to action',
      'preventable',
      'crisis',
    ],
  }

  // Get clinical facts for the specified category, or use a general set
  const factsList = clinicalFacts[category] || [
    'mental health',
    'psychological',
    'symptoms',
    'treatment',
    'diagnosis',
    'assessment',
    'evidence-based',
    'clinical',
  ]

  // Count matches
  const matchCount = factsList.filter((fact) =>
    explanation.includes(fact),
  ).length

  // Calculate accuracy score with appropriate scaling
  return 0.5 + 0.5 * (matchCount / Math.min(factsList.length, 10))
}

/**
 * Evaluate framework alignment
 */
function evaluateFrameworkAlignment(
  explanation: string,
  category: string,
): number {
  // Define clinical frameworks relevant to mental health
  const frameworks = [
    'biopsychosocial',
    'cognitive behavioral',
    'psychodynamic',
    'humanistic',
    'systems',
    'attachment',
    'developmental',
    'neurobiological',
    'evolutionary',
    'diathesis-stress',
    'recovery model',
    'trauma-informed',
    'strengths-based',
  ]

  // Define category-specific framework terms
  const categoryFrameworks: Record<string, string[]> = {
    depression: [
      'cognitive model',
      'learned helplessness',
      'negative triad',
      'behavioral activation',
    ],
    anxiety: [
      'intolerance of uncertainty',
      'threat appraisal',
      'safety behaviors',
      'worry cycle',
    ],
    ptsd: [
      'trauma model',
      'fear network',
      'emotional processing',
      'fragmented memory',
    ],
    ocd: [
      'inhibitory learning',
      'thought-action fusion',
      'inflated responsibility',
      'perfectionism',
    ],
    bipolar: [
      'kindling hypothesis',
      'behavioral activation system',
      'social rhythm',
      'goal dysregulation',
    ],
    suicidal: [
      'interpersonal theory',
      'escape theory',
      'fluid vulnerability',
      'entrapment model',
    ],
  }

  // Combine general frameworks with category-specific frameworks
  const allFrameworks = [...frameworks, ...(categoryFrameworks[category] || [])]

  // Count framework references
  const frameworkCount = allFrameworks.filter((framework) =>
    explanation.includes(framework),
  ).length

  // Calculate alignment score with appropriate scaling
  return Math.min(
    0.3 + 0.7 * (frameworkCount / Math.min(allFrameworks.length, 5)),
    1.0,
  )
}

/**
 * Extract key phrases from reference explanations
 */
function extractKeyPhrases(referenceExplanations: string[]): string[] {
  // Simple extraction of key phrases (sentences or parts of sentences)
  const phrases: string[] = []

  for (const reference of referenceExplanations) {
    // Split into sentences
    const sentences = reference
      .toLowerCase()
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // Process each sentence
    for (const sentence of sentences) {
      // Split long sentences further at conjunctions
      if (sentence.length > 100) {
        const parts = sentence
          .split(/,|;|\band\b|\bor\b|\bbut\b|\bhowever\b/)
          .map((p) => p.trim())
        phrases.push(...parts.filter((p) => p.length > 20))
      } else if (sentence.length > 20) {
        phrases.push(sentence)
      }
    }
  }

  // Deduplicate and return
  return Array.from(new Set(phrases))
}
