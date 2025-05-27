/**
 * MentalLLaMA Prompt Evaluation System
 *
 * This module provides tools for evaluating the performance of prompt templates
 * against known test cases, helping to optimize prompt engineering efforts.
 */

import { getLogger } from '../../logging'
import { PromptTemplate, MentalHealthCategory, buildPrompt } from './prompts'
import { MentalLLaMAAdapter } from './MentalLLaMAAdapter'
import { MentalLLaMAFactory } from './MentalLLaMAFactory'

const logger = getLogger()

/**
 * Test case for evaluating prompt performance
 */
export interface PromptTestCase {
  id: string
  text: string
  expectedCategory: MentalHealthCategory
  expectedConfidence?: number
  expectedEvidence?: string[]
  labels?: string[]
}

/**
 * Results of a prompt evaluation run
 */
export interface PromptEvaluationResult {
  testCaseId: string
  expectedCategory: MentalHealthCategory
  actualCategory: string
  expectedConfidence?: number
  actualConfidence: number
  confidenceError?: number
  categoryMatch: boolean
  evidenceMatches?: number
  evidenceTotal?: number
  evidenceScore?: number
  processingTime: number
  prompt?: string
  response?: string
}

/**
 * Summary metrics for a prompt evaluation
 */
export interface PromptEvaluationMetrics {
  accuracy: number
  averageConfidence: number
  confidenceAlignment: number
  evidenceQuality: number
  falsePositiveRate: number
  falseNegativeRate: number
  averageProcessingTime: number
  testCaseCount: number
  successCount: number
  failureCount: number
}

/**
 * Options for evaluating prompts
 */
export interface PromptEvaluationOptions {
  adapter?: MentalLLaMAAdapter
  verbose?: boolean
  saveResponses?: boolean
  confidenceThreshold?: number
  timeoutMs?: number
}

/**
 * Represents the expected structure of the analysis object.
 */
interface MentalHealthAnalysisResponse {
  categories: Record<string, number>
  analysis: string
  confidenceScore: number
  hasMentalHealthIssue?: boolean
  mentalHealthCategory?: string
  explanation?: string
  confidence?: number
  supportingEvidence?: string[]
  _routingDecision?: unknown // Using 'unknown' for RoutingDecision as its definition is not in the current context
}

/**
 * Evaluates a prompt template against a set of test cases
 */
export async function evaluatePrompt(
  template: PromptTemplate,
  testCases: PromptTestCase[],
  options: PromptEvaluationOptions = {},
): Promise<{
  results: PromptEvaluationResult[]
  metrics: PromptEvaluationMetrics
}> {
  // Create adapter if not provided
  const adapter = options.adapter || (await createDefaultAdapter())

  const results: PromptEvaluationResult[] = []
  const verbose = options.verbose || false
  const saveResponses = options.saveResponses || false
  const confidenceThreshold = options.confidenceThreshold || 0.5
  const timeoutMs = options.timeoutMs || 30_000

  // Track metrics
  let successCount = 0
  let totalConfidenceError = 0
  let totalConfidence = 0
  let totalEvidenceScore = 0
  let totalProcessingTime = 0
  let validEvidenceTests = 0

  // Track confusion matrix data
  const confusionMatrix: Record<string, Record<string, number>> = {}
  const categories = Array.from(
    new Set(testCases.map((tc) => tc.expectedCategory.toLowerCase())),
  )
  categories.forEach((cat) => {
    confusionMatrix[cat] = {}
    categories.forEach((innerCat) => {
      confusionMatrix[cat][innerCat] = 0
    })
  })

  // Process each test case
  for (const testCase of testCases) {
    if (verbose) {
      logger.info(`Evaluating test case: ${testCase.id}`)
    }

    const startTime = Date.now()
    let _timedOut = false // renamed to indicate unused

    // Build the prompt
    const prompt = buildPrompt(template, testCase.text)

    // Use a promise with timeout to handle potential hanging
    const analysisPromise = new Promise<unknown>((resolve, reject) => {
      try {
        // Convert MentalHealthCategory to type for analyzeMentalHealth
        const categoryParam = testCase.expectedCategory

        // Now the adapter supports all MentalHealthCategory types
        adapter
          .analyzeMentalHealth(testCase.text, [categoryParam])
          .then((analysis) => resolve(analysis))
          .catch((error) => reject(error))
      } catch (error) {
        reject(error)
      }
    })

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        _timedOut = true
        reject(new Error(`Analysis timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    // Run the analysis
    let analysis
    try {
      analysis = (await Promise.race([
        analysisPromise,
        timeoutPromise,
      ])) as MentalHealthAnalysisResponse
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(`Error analyzing test case ${testCase.id}`, { error })

      // Create a failure result
      results.push({
        testCaseId: testCase.id,
        expectedCategory: testCase.expectedCategory,
        actualCategory: 'error',
        actualConfidence: 0,
        categoryMatch: false,
        processingTime: Date.now() - startTime,
        prompt:
          typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2),
        response: `Error: ${errorMessage}`,
      })

      // Add error case to confusion matrix
      const expectedCategoryNormalized = testCase.expectedCategory.toLowerCase()
      const errorCategoryNormalized = 'error'

      // Ensure error category exists in matrix
      if (!categories.includes(errorCategoryNormalized)) {
        categories.push(errorCategoryNormalized)
        // Add column to all existing rows
        Object.keys(confusionMatrix).forEach((cat) => {
          confusionMatrix[cat][errorCategoryNormalized] = 0
        })
        // Create a new row
        confusionMatrix[errorCategoryNormalized] = {}
        categories.forEach((cat) => {
          confusionMatrix[errorCategoryNormalized][cat] = 0
        })
      }

      // Ensure expected category exists in matrix
      if (!confusionMatrix[expectedCategoryNormalized]) {
        confusionMatrix[expectedCategoryNormalized] = {}
        categories.forEach((cat) => {
          confusionMatrix[expectedCategoryNormalized][cat] = 0
        })
        // Add to all existing rows
        categories.forEach((cat) => {
          if (cat !== expectedCategoryNormalized) {
            confusionMatrix[cat][expectedCategoryNormalized] = 0
          }
        })
        categories.push(expectedCategoryNormalized)
      }

      // Update confusion matrix for error case
      confusionMatrix[expectedCategoryNormalized][errorCategoryNormalized]++

      continue
    }

    // Calculate metrics
    const processingTime = Date.now() - startTime
    const actualCategory = analysis.mentalHealthCategory || ''
    const actualConfidence = analysis.confidence || 0
    const categoryMatch =
      actualCategory.toLowerCase() === testCase.expectedCategory.toLowerCase()

    // Calculate confidence error if expected confidence is provided
    let confidenceError = undefined
    if (testCase.expectedConfidence !== undefined) {
      confidenceError = Math.abs(actualConfidence - testCase.expectedConfidence)
      totalConfidenceError += confidenceError
    }

    // Calculate evidence match score if expected evidence is provided
    let evidenceMatches: number | undefined = undefined
    let evidenceTotal = undefined
    let evidenceScore = undefined

    if (
      testCase.expectedEvidence &&
      testCase.expectedEvidence.length > 0 &&
      analysis.supportingEvidence
    ) {
      validEvidenceTests++
      evidenceMatches = 0

      // Count matches between expected and actual evidence
      const actualEvidenceLower = analysis.supportingEvidence.map((e: string) =>
        e.toLowerCase(),
      )
      testCase.expectedEvidence.forEach((evidence) => {
        if (
          actualEvidenceLower.some((actual: string) =>
            actual.includes(evidence.toLowerCase()),
          )
        ) {
          evidenceMatches!++
        }
      })

      evidenceTotal = testCase.expectedEvidence.length
      evidenceScore = evidenceMatches / evidenceTotal
      totalEvidenceScore += evidenceScore
    }

    // Normalize categories for confusion matrix
    const expectedCategoryNormalized = testCase.expectedCategory.toLowerCase()
    const actualCategoryNormalized = actualCategory.toLowerCase()

    // Update confusion matrix with proper error handling for missing keys
    if (!confusionMatrix[expectedCategoryNormalized]) {
      // If the expected category isn't in our matrix, add it
      confusionMatrix[expectedCategoryNormalized] = {}
      categories.forEach((cat) => {
        confusionMatrix[expectedCategoryNormalized][cat] = 0
      })
      // Add the new category to all existing rows
      categories.forEach((cat) => {
        confusionMatrix[cat][expectedCategoryNormalized] = 0
      })
      // Add the category to our list
      categories.push(expectedCategoryNormalized)
    }

    // If the actual category isn't in our matrix, add it
    if (!categories.includes(actualCategoryNormalized)) {
      categories.push(actualCategoryNormalized)
      // Add column to all existing rows
      Object.keys(confusionMatrix).forEach((cat) => {
        confusionMatrix[cat][actualCategoryNormalized] = 0
      })
      // Create a new row if needed
      if (!confusionMatrix[actualCategoryNormalized]) {
        confusionMatrix[actualCategoryNormalized] = {}
        categories.forEach((cat) => {
          confusionMatrix[actualCategoryNormalized][cat] = 0
        })
      }
    }

    // Now safely increment the confusion matrix counter
    confusionMatrix[expectedCategoryNormalized][actualCategoryNormalized]++

    // Update success counters
    if (categoryMatch && actualConfidence >= confidenceThreshold) {
      successCount++
    }

    // Update total confidence
    totalConfidence += actualConfidence

    // Update total processing time
    totalProcessingTime += processingTime

    // Create the result
    const result: PromptEvaluationResult = {
      testCaseId: testCase.id,
      expectedCategory: testCase.expectedCategory,
      actualCategory,
      expectedConfidence: testCase.expectedConfidence,
      actualConfidence,
      confidenceError,
      categoryMatch,
      evidenceMatches,
      evidenceTotal,
      evidenceScore,
      processingTime,
    }

    // Add prompt and response if requested
    if (saveResponses) {
      result.prompt =
        typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2)
      result.response = JSON.stringify(analysis, null, 2)
    }

    results.push(result)

    if (verbose) {
      logger.info(
        `Test case ${testCase.id} completed: ${categoryMatch ? 'PASS' : 'FAIL'}`,
      )
    }
  }

  // Calculate false positive and negative rates from confusion matrix
  const falsePositives: Record<string, number> = {}
  const falseNegatives: Record<string, number> = {}
  const truePositives: Record<string, number> = {}

  categories.forEach((cat) => {
    let fp = 0
    categories.forEach((wrongCat) => {
      if (wrongCat !== cat) {
        // Safely access values with default of 0 for missing entries
        fp += confusionMatrix[wrongCat]?.[cat]
          ? confusionMatrix[wrongCat][cat]
          : 0
      }
    })
    falsePositives[cat] = fp

    let fn = 0
    categories.forEach((wrongCat) => {
      if (wrongCat !== cat) {
        // Safely access values with default of 0 for missing entries
        fn += confusionMatrix[cat]?.[wrongCat]
          ? confusionMatrix[cat][wrongCat]
          : 0
      }
    })
    falseNegatives[cat] = fn

    // Safely get true positives with default of 0
    truePositives[cat] = confusionMatrix[cat]?.[cat]
      ? confusionMatrix[cat][cat]
      : 0
  })

  // Calculate overall metrics
  const testCaseCount = testCases.length
  const accuracy = successCount / testCaseCount
  const falsePositiveRate =
    Object.values(falsePositives).reduce((sum, val) => sum + val, 0) /
    testCaseCount
  const falseNegativeRate =
    Object.values(falseNegatives).reduce((sum, val) => sum + val, 0) /
    testCaseCount
  const averageConfidence = totalConfidence / testCaseCount
  const confidenceAlignment =
    testCaseCount - totalConfidenceError / testCaseCount
  const evidenceQuality =
    validEvidenceTests > 0 ? totalEvidenceScore / validEvidenceTests : 0
  const averageProcessingTime = totalProcessingTime / testCaseCount

  // Build metrics object
  const metrics: PromptEvaluationMetrics = {
    accuracy,
    averageConfidence,
    confidenceAlignment,
    evidenceQuality,
    falsePositiveRate,
    falseNegativeRate,
    averageProcessingTime,
    testCaseCount,
    successCount,
    failureCount: testCaseCount - successCount,
  }

  return { results, metrics }
}

/**
 * Creates a simple depression test dataset
 */
export function createDepressionTestDataset(): PromptTestCase[] {
  return [
    {
      id: 'depression-explicit-1',
      text: "I've been feeling so depressed lately. I can't seem to find joy in anything and I'm sleeping all the time.",
      expectedCategory: 'depression',
      expectedConfidence: 0.9,
      expectedEvidence: [
        'depressed',
        "can't find joy",
        'sleeping all the time',
      ],
      labels: ['explicit', 'clear-indicators'],
    },
    {
      id: 'depression-implicit-1',
      text: "Everything seems gray and pointless. I used to enjoy hiking, but now I can't even get myself to leave the house.",
      expectedCategory: 'depression',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'everything seems gray',
        'pointless',
        "can't leave house",
      ],
      labels: ['implicit', 'anhedonia'],
    },
    {
      id: 'depression-mixed-1',
      text: "I'm just tired all the time, even when I get plenty of sleep. My friends invite me out but I keep making excuses not to go.",
      expectedCategory: 'depression',
      expectedConfidence: 0.7,
      expectedEvidence: [
        'tired all the time',
        'making excuses',
        'social withdrawal',
      ],
      labels: ['implicit', 'fatigue', 'isolation'],
    },
    {
      id: 'not-depression-1',
      text: 'Work has been stressful lately with all these deadlines. I need a vacation soon.',
      expectedCategory: 'stress',
      expectedConfidence: 0.8,
      labels: ['not-depression', 'stress'],
    },
    {
      id: 'not-depression-2',
      text: "I'm feeling down today because I got some bad news, but I'll be okay after spending some time with friends.",
      expectedCategory: 'general_wellness',
      expectedConfidence: 0.7,
      labels: ['not-depression', 'situational'],
    },
  ]
}

/**
 * Creates a simple anxiety test dataset
 */
export function createAnxietyTestDataset(): PromptTestCase[] {
  return [
    {
      id: 'anxiety-explicit-1',
      text: "My anxiety is through the roof lately. I keep worrying about everything that could go wrong and I can't stop.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.9,
      expectedEvidence: ['anxiety', 'worrying', "can't stop"],
      labels: ['explicit', 'clear-indicators'],
    },
    {
      id: 'anxiety-physical-1',
      text: "My heart races all the time and I feel like I can't breathe. I'm constantly on edge waiting for something bad to happen.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.85,
      expectedEvidence: ['heart races', "can't breathe", 'on edge'],
      labels: ['physical-symptoms', 'anticipatory'],
    },
    {
      id: 'not-anxiety-1',
      text: "I'm feeling nervous about my presentation tomorrow, but I've prepared well and I know it will go fine.",
      expectedCategory: 'general_wellness',
      expectedConfidence: 0.75,
      labels: ['not-anxiety', 'normal-nervousness'],
    },
  ]
}

/**
 * Creates a simple PTSD test dataset
 */
export function createPTSDTestDataset(): PromptTestCase[] {
  return [
    {
      id: 'ptsd-explicit-1',
      text: "I keep having these vivid flashbacks of the accident. Loud noises make me panic and I feel like I'm back there again.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.9,
      expectedEvidence: [
        'flashbacks',
        'loud noises',
        'panic',
        'feeling back there',
      ],
      labels: ['explicit', 'clear-indicators'],
    },
    {
      id: 'ptsd-implicit-1',
      text: "I haven't slept well in months. I keep having these nightmares and I avoid driving now. I just can't handle being in a car anymore.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'nightmares',
        'avoid driving',
        "can't handle being in a car",
      ],
      labels: ['implicit', 'avoidance'],
    },
    {
      id: 'not-ptsd-1',
      text: "I was in an accident last week and I'm still a bit shaken up, but I'm working through it and getting better each day.",
      expectedCategory: 'general_wellness',
      expectedConfidence: 0.7,
      labels: ['not-ptsd', 'normal-reaction'],
    },
  ]
}

/**
 * Creates a full test dataset covering multiple categories
 */
export function createComprehensiveTestDataset(): PromptTestCase[] {
  return [
    ...createDepressionTestDataset(),
    ...createAnxietyTestDataset(),
    ...createPTSDTestDataset(),
    // Add more test cases for other categories as needed
  ]
}

/**
 * Compare performance between two prompt templates
 */
export async function comparePromptTemplates(
  templateA: PromptTemplate,
  templateB: PromptTemplate,
  testCases: PromptTestCase[],
  options: PromptEvaluationOptions = {},
): Promise<{
  templateAName: string
  templateBName: string
  templateAMetrics: PromptEvaluationMetrics
  templateBMetrics: PromptEvaluationMetrics
  improvement: {
    accuracy: number
    confidenceAlignment: number
    evidenceQuality: number
    processingTime: number
  }
  winner: 'A' | 'B' | 'tie'
}> {
  // Run evaluations
  const resultA = await evaluatePrompt(templateA, testCases, options)
  const resultB = await evaluatePrompt(templateB, testCases, options)

  // Calculate improvements
  const accuracy = resultB.metrics.accuracy - resultA.metrics.accuracy
  const confidenceAlignment =
    resultB.metrics.confidenceAlignment - resultA.metrics.confidenceAlignment
  const evidenceQuality =
    resultB.metrics.evidenceQuality - resultA.metrics.evidenceQuality
  const processingTime =
    resultA.metrics.averageProcessingTime -
    resultB.metrics.averageProcessingTime

  // Determine winner
  let winner: 'A' | 'B' | 'tie' = 'tie'

  // Simple scoring: accuracy is most important, followed by evidence quality
  const scoreA = resultA.metrics.accuracy * 2 + resultA.metrics.evidenceQuality
  const scoreB = resultB.metrics.accuracy * 2 + resultB.metrics.evidenceQuality

  if (scoreB > scoreA) {
    winner = 'B'
  } else if (scoreA > scoreB) {
    winner = 'A'
  }

  return {
    templateAName: 'Template A',
    templateBName: 'Template B',
    templateAMetrics: resultA.metrics,
    templateBMetrics: resultB.metrics,
    improvement: {
      accuracy,
      confidenceAlignment,
      evidenceQuality,
      processingTime,
    },
    winner,
  }
}

/**
 * Creates a default MentalLLaMAAdapter for testing
 * Extends MentalLLaMAFactory with a custom createAdapter method
 */
async function createDefaultAdapter(): Promise<MentalLLaMAAdapter> {
  try {
    // We need to create an adapter since createAdapter doesn't exist
    const result = await MentalLLaMAFactory.createForTesting()
    return result.adapter
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to create default adapter', { error })
    throw new Error(`Failed to create evaluation adapter: ${errorMessage}`)
  }
}

export default {
  evaluatePrompt,
  comparePromptTemplates,
  createDepressionTestDataset,
  createAnxietyTestDataset,
  createComprehensiveTestDataset,
}
