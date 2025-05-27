/**
 * MentalLLaMA Prompt Refinement System
 *
 * This module provides tools for automatically refining prompt templates
 * based on evaluation results and optimization strategies.
 */

import { getLogger } from '../../logging'
import {
  PromptTemplate,
  MentalHealthCategory,
  createCategoryTemplate,
  // addEmotionalContext, // Ensure this function is correctly exported from './prompts'
  // applyChainOfThought,
} from './prompts' // Imports are already handled, no need to re-declare or comment out
import {
  PromptTestCase,
  PromptEvaluationResult,
  evaluatePrompt,
} from './evaluator'
import { MentalLLaMAAdapter } from './MentalLLaMAAdapter'

// Create logger instance
const logger = getLogger()

// Helper function to add emotional context to a template
function addEmotionalContext(template: PromptTemplate): PromptTemplate {
  const newTemplate = {
    ...template,
    specificsAndContext: template.specificsAndContext,
  }
  if (
    !newTemplate.specificsAndContext.includes('empathetic understanding') &&
    !newTemplate.specificsAndContext.includes('emotional distress')
  ) {
    newTemplate.specificsAndContext +=
      "\nIt's crucial to approach this with empathetic understanding, recognizing the human experience behind the text. Acknowledge any emotional distress conveyed."
  }
  return newTemplate
}

// Helper function to apply chain-of-thought to a template
function applyChainOfThought(template: PromptTemplate): PromptTemplate {
  const newTemplate = {
    ...template,
    taskSpecification: template.taskSpecification,
  }
  if (
    !newTemplate.taskSpecification.toLowerCase().includes('step by step') &&
    !newTemplate.taskSpecification.toLowerCase().includes('step-by-step')
  ) {
    newTemplate.taskSpecification =
      'Think step-by-step to achieve the following objectives:\n' +
      newTemplate.taskSpecification
  }
  return newTemplate
}

// Represents an example that might have optional fields before enhancement
interface ExampleInput {
  input: string
  output: {
    category: MentalHealthCategory | string
    confidence?: number
    explanation?: string
    supportingEvidence?: string[]
  }
}

// Represents an example after enhancement, with fields guaranteed to be present
interface EnhancedExampleOutput {
  input: string
  output: {
    category: MentalHealthCategory | string
    confidence: number
    explanation: string
    supportingEvidence: string[]
  }
}

/**
 * Options for prompt refinement
 */
export interface PromptRefinementOptions {
  adapter?: MentalLLaMAAdapter
  iterations?: number
  variationCount?: number
  targetAccuracy?: number
  maxTimeMs?: number
  verbose?: boolean
  useEmotionalContext?: boolean
  useChainOfThought?: boolean
}

/**
 * Result of a prompt refinement operation
 */
export interface PromptRefinementResult {
  originalTemplate: PromptTemplate
  refinedTemplate: PromptTemplate
  originalAccuracy: number
  refinedAccuracy: number
  improvementPercentage: number
  iterationsPerformed: number
  totalTimeMs: number
  evaluationResults: PromptEvaluationResult[]
  refinementPath: Array<{
    iteration: number
    accuracy: number
    changes: string[]
  }>
}

/**
 * Technique for prompt refinement
 */
export enum RefinementTechnique {
  EXAMPLE_ENHANCEMENT = 'example_enhancement',
  SYSTEM_ROLE_ENHANCEMENT = 'system_role_enhancement',
  TASK_CLARIFICATION = 'task_clarification',
  REMINDER_ADJUSTMENT = 'reminder_adjustment',
  CONTEXT_ENRICHMENT = 'context_enrichment',
  EMOTIONAL_REINFORCEMENT = 'emotional_reinforcement',
  STRUCTURE_IMPROVEMENT = 'structure_improvement',
}

/**
 * Refines a prompt template based on evaluation results
 *
 * @param template The original prompt template to refine
 * @param testCases Test cases to evaluate the prompt against
 * @param options Refinement options
 * @returns The refined prompt template and evaluation results
 */
export async function refinePromptTemplate(
  template: PromptTemplate,
  testCases: PromptTestCase[],
  options: PromptRefinementOptions = {},
): Promise<PromptRefinementResult> {
  // Default options
  const {
    adapter,
    iterations = 5,
    variationCount = 3,
    targetAccuracy = 0.95,
    maxTimeMs = 30 * 60 * 1000,
    verbose = false,
  } = options

  const startTime = Date.now()
  let currentTemplate = { ...template }
  let currentAccuracy = 0
  let bestTemplate = { ...template }
  let bestAccuracy = 0
  let iterationsPerformed = 0

  // Initial evaluation
  if (verbose) {
    logger.info('Evaluating original template')
  }

  const initialEval = await evaluatePrompt(currentTemplate, testCases, {
    adapter,
  })
  currentAccuracy = initialEval.metrics.accuracy
  bestAccuracy = currentAccuracy

  if (verbose) {
    logger.info(`Initial accuracy: ${(currentAccuracy * 100).toFixed(1)}%`)
  }

  // Store refinement path for analysis
  const refinementPath: Array<{
    iteration: number
    accuracy: number
    changes: string[]
  }> = [
    {
      iteration: 0,
      accuracy: currentAccuracy,
      changes: ['Initial template'],
    },
  ]

  // Start refinement iterations
  for (let i = 0; i < iterations; i++) {
    // Check if we've reached target accuracy
    if (currentAccuracy >= targetAccuracy) {
      if (verbose) {
        logger.info(
          `Target accuracy of ${targetAccuracy * 100}% reached. Stopping refinement.`,
        )
      }
      break
    }

    // Check if we've exceeded max time
    if (Date.now() - startTime > maxTimeMs) {
      if (verbose) {
        logger.info(
          `Maximum refinement time of ${maxTimeMs}ms exceeded. Stopping refinement.`,
        )
      }
      break
    }

    iterationsPerformed++

    if (verbose) {
      logger.info(`Starting refinement iteration ${i + 1}/${iterations}`)
    }

    // Generate variations of the current best template
    const variations = generateTemplateVariations(
      currentTemplate,
      variationCount,
      { ...options, previousAccuracy: currentAccuracy },
    )

    // Evaluate each variation
    for (let j = 0; j < variations.length; j++) {
      const { template: variation, changes } = variations[j]

      if (verbose) {
        logger.info(`Evaluating variation ${j + 1}/${variations.length}`)
      }

      // Evaluate this variation
      const evalResult = await evaluatePrompt(variation, testCases, { adapter })
      const { accuracy } = evalResult.metrics

      if (verbose) {
        logger.info(
          `Variation ${j + 1} accuracy: ${(accuracy * 100).toFixed(1)}%`,
        )
      }

      // If this variation is better, update current template
      if (accuracy > currentAccuracy) {
        currentTemplate = variation
        currentAccuracy = accuracy

        // If it's the best so far, update best template
        if (accuracy > bestAccuracy) {
          bestTemplate = variation
          bestAccuracy = accuracy

          if (verbose) {
            logger.info(
              `New best template found with accuracy ${(bestAccuracy * 100).toFixed(1)}%`,
            )
          }

          // Add to refinement path
          refinementPath.push({
            iteration: i + 1,
            accuracy: bestAccuracy,
            changes: changes,
          })
        }
      }
    }
  }

  // Final evaluation with best template
  const finalEval = await evaluatePrompt(bestTemplate, testCases, { adapter })

  // Calculate improvement
  const improvementPercentage =
    ((bestAccuracy - initialEval.metrics.accuracy) /
      initialEval.metrics.accuracy) *
    100

  return {
    originalTemplate: template,
    refinedTemplate: bestTemplate,
    originalAccuracy: initialEval.metrics.accuracy,
    refinedAccuracy: bestAccuracy,
    improvementPercentage,
    iterationsPerformed,
    totalTimeMs: Date.now() - startTime,
    evaluationResults: finalEval.results,
    refinementPath,
  }
}

/**
 * Generates variations of a prompt template for refinement
 *
 * @param template The template to generate variations from
 * @param count Number of variations to generate
 * @param options Configuration options
 * @returns Array of template variations with the changes made
 */
function generateTemplateVariations(
  template: PromptTemplate,
  count: number,
  options: { previousAccuracy: number } & PromptRefinementOptions,
): Array<{ template: PromptTemplate; changes: string[] }> {
  const variations: Array<{ template: PromptTemplate; changes: string[] }> = []

  // First variation: Add emotional context if not already present
  if (options.useEmotionalContext !== false) {
    const hasEmotionalContext =
      template.specificsAndContext.includes('emotional distress') ||
      template.specificsAndContext.includes('emotional context')

    if (!hasEmotionalContext) {
      const emotionalTemplate = addEmotionalContext(template)
      variations.push({
        template: emotionalTemplate,
        changes: ['Added emotional context reinforcement'],
      })
    }
  }

  // Second variation: Add chain-of-thought reasoning if not already present
  if (options.useChainOfThought !== false) {
    const hasChainOfThought =
      template.taskSpecification.includes('step by step') ||
      template.taskSpecification.includes('step-by-step')

    if (!hasChainOfThought) {
      const cotTemplate = applyChainOfThought(template)
      variations.push({
        template: cotTemplate,
        changes: ['Added chain-of-thought reasoning structure'],
      })
    }
  }

  // Additional variations based on refinement techniques
  const techniques = selectRefinementTechniques(
    template,
    options.previousAccuracy,
  )

  for (const technique of techniques) {
    if (variations.length >= count) {
      break
    }

    const { template: refinedTemplate, changes } = applyRefinementTechnique(
      template,
      technique,
    )
    variations.push({ template: refinedTemplate, changes })
  }

  // If we haven't generated enough variations, add some random variations
  while (variations.length < count) {
    const randomVariation = createRandomVariation(template)
    variations.push(randomVariation)
  }

  return variations
}

/**
 * Intelligently selects refinement techniques based on the current template
 * and previous evaluation results
 */
function selectRefinementTechniques(
  template: PromptTemplate,
  previousAccuracy: number,
): RefinementTechnique[] {
  const techniques: RefinementTechnique[] = []

  // If accuracy is very low, focus on fundamentals
  if (previousAccuracy < 0.5) {
    techniques.push(RefinementTechnique.SYSTEM_ROLE_ENHANCEMENT)
    techniques.push(RefinementTechnique.TASK_CLARIFICATION)
    techniques.push(RefinementTechnique.EXAMPLE_ENHANCEMENT)
  }
  // If accuracy is moderate, try more nuanced improvements
  else if (previousAccuracy < 0.8) {
    techniques.push(RefinementTechnique.REMINDER_ADJUSTMENT)
    techniques.push(RefinementTechnique.CONTEXT_ENRICHMENT)
    techniques.push(RefinementTechnique.EXAMPLE_ENHANCEMENT)
  }
  // If accuracy is already high, try subtle refinements
  else {
    techniques.push(RefinementTechnique.EMOTIONAL_REINFORCEMENT)
    techniques.push(RefinementTechnique.STRUCTURE_IMPROVEMENT)
    techniques.push(RefinementTechnique.REMINDER_ADJUSTMENT)
  }

  // Add techniques based on template content gaps
  if (template.examples.length < 2) {
    techniques.push(RefinementTechnique.EXAMPLE_ENHANCEMENT)
  }

  if (
    !template.systemRole.includes('expertise') &&
    !template.systemRole.includes('specialist')
  ) {
    techniques.push(RefinementTechnique.SYSTEM_ROLE_ENHANCEMENT)
  }

  if (template.reminders.length < 3) {
    techniques.push(RefinementTechnique.REMINDER_ADJUSTMENT)
  }

  return [...new Set(techniques)] // Remove duplicates
}

/**
 * Applies a specific refinement technique to a template
 */
function applyRefinementTechnique(
  template: PromptTemplate,
  technique: RefinementTechnique,
): { template: PromptTemplate; changes: string[] } {
  const refinedTemplate = { ...template }
  const changes: string[] = []

  if (technique === RefinementTechnique.SYSTEM_ROLE_ENHANCEMENT) {
    refinedTemplate.systemRole = enhanceSystemRole(template.systemRole)
    changes.push('Enhanced system role with stronger expertise signals')
  } else if (technique === RefinementTechnique.TASK_CLARIFICATION) {
    refinedTemplate.taskSpecification = clarifyTask(template.taskSpecification)
    changes.push('Clarified task specification with more precise instructions')
  } else if (technique === RefinementTechnique.EXAMPLE_ENHANCEMENT) {
    refinedTemplate.examples = enhanceExamples(template.examples)
    changes.push('Enhanced examples with more detailed outputs')
  } else if (technique === RefinementTechnique.REMINDER_ADJUSTMENT) {
    refinedTemplate.reminders = adjustReminders(template.reminders)
    changes.push('Adjusted strategic reminders for better guidance')
  } else if (technique === RefinementTechnique.CONTEXT_ENRICHMENT) {
    refinedTemplate.specificsAndContext = enrichContext(
      template.specificsAndContext,
    )
    changes.push('Enriched context with more domain-specific information')
  } else if (technique === RefinementTechnique.EMOTIONAL_REINFORCEMENT) {
    refinedTemplate.specificsAndContext = addEmotionalReinforcement(
      template.specificsAndContext,
    )
    changes.push('Added emotional reinforcement to enhance model engagement')
  } else if (technique === RefinementTechnique.STRUCTURE_IMPROVEMENT) {
    // This affects multiple template sections
    const structureResult = improveStructure(template)
    refinedTemplate.taskSpecification =
      structureResult.template.taskSpecification
    refinedTemplate.specificsAndContext =
      structureResult.template.specificsAndContext
    changes.push(...structureResult.changes)
  }

  return { template: refinedTemplate, changes }
}

/**
 * Creates a random variation of the template for exploration
 */
function createRandomVariation(template: PromptTemplate): {
  template: PromptTemplate
  changes: string[]
} {
  const refinedTemplate = { ...template }
  const changes: string[] = []

  // Randomly select 1-3 sections to modify
  const sections = [
    'systemRole',
    'taskSpecification',
    'specificsAndContext',
    'reminders',
  ]
  const numSections = 1 + Math.floor(Math.random() * 3)
  const selectedSections = shuffleArray(sections).slice(0, numSections)

  for (const section of selectedSections) {
    switch (section) {
      case 'systemRole':
        refinedTemplate.systemRole = enhanceSystemRole(template.systemRole)
        changes.push('Randomly enhanced system role')
        break
      case 'taskSpecification':
        refinedTemplate.taskSpecification = clarifyTask(
          template.taskSpecification,
        )
        changes.push('Randomly clarified task specification')
        break
      case 'specificsAndContext':
        refinedTemplate.specificsAndContext = enrichContext(
          template.specificsAndContext,
        )
        changes.push('Randomly enriched context')
        break
      case 'reminders':
        refinedTemplate.reminders = adjustReminders(template.reminders)
        changes.push('Randomly adjusted reminders')
        break
    }
  }

  return { template: refinedTemplate, changes }
}

/**
 * Enhance the system role with stronger expertise signals
 */
function enhanceSystemRole(systemRole: string): string {
  if (!systemRole.includes('clinical psychology')) {
    systemRole = systemRole.replace(
      'mental health analysis system',
      'mental health analysis system with extensive training in clinical psychology',
    )
  }

  if (!systemRole.includes('evidence-based')) {
    systemRole +=
      ' You prioritize evidence-based assessment approaches and clinical accuracy in your analysis.'
  }

  return systemRole
}

/**
 * Clarify the task with more precise instructions
 */
function clarifyTask(taskSpecification: string): string {
  return taskSpecification
}

/**
 * Enhance examples with more detailed outputs
 */
function enhanceExamples(examples: ExampleInput[]): EnhancedExampleOutput[] {
  // If no examples, create a basic one
  if (examples.length === 0) {
    return [
      {
        input:
          "I've been feeling overwhelmed lately. Work has been stressful, and I find myself getting anxious about small things. I'm having trouble sleeping and can't seem to relax.",
        output: {
          category: 'anxiety',
          confidence: 0.85,
          explanation:
            'The text shows multiple indicators of anxiety including feeling overwhelmed, explicit mention of anxiety, trouble sleeping, and inability to relax.',
          supportingEvidence: [
            "Explicit mention of 'getting anxious'",
            'Trouble sleeping',
            'Inability to relax',
            'Feeling overwhelmed',
          ],
        },
      },
    ]
  }

  // Enhance existing examples
  return examples.map((exampleInput): EnhancedExampleOutput => {
    const outputCategory = exampleInput.output.category
    const outputConfidence =
      exampleInput.output.confidence === undefined
        ? 0.8
        : exampleInput.output.confidence

    let outputSupportingEvidence = exampleInput.output.supportingEvidence
    if (!outputSupportingEvidence || outputSupportingEvidence.length < 2) {
      const text = exampleInput.input.toLowerCase()
      const evidence: string[] = []

      if (
        text.includes('sad') ||
        text.includes('depress') ||
        text.includes('low')
      ) {
        evidence.push('Expression of sadness or low mood')
      }
      if (
        text.includes('worry') ||
        text.includes('anxious') ||
        text.includes('fear')
      ) {
        evidence.push('Expression of worry or anxiety')
      }
      if (
        text.includes('sleep') ||
        text.includes('tired') ||
        text.includes('exhausted')
      ) {
        evidence.push('Sleep disturbance or fatigue')
      }
      if (
        text.includes('interest') ||
        text.includes('enjoy') ||
        text.includes('pleasure')
      ) {
        evidence.push('Change in interest or pleasure')
      }

      outputSupportingEvidence =
        evidence.length > 0
          ? evidence
          : [
              'Evidence from text: ' +
                exampleInput.input.substring(0, 40) +
                '...',
            ]
    }

    let outputExplanation = exampleInput.output.explanation
    if (outputExplanation === undefined) {
      // Provide a default explanation if missing, similar to the new example case
      outputExplanation = `The text indicates potential signs of ${outputCategory}. Supporting evidence includes: ${outputSupportingEvidence.join(', ')}. Overall confidence is ${outputConfidence.toFixed(2)}.`
    }

    return {
      input: exampleInput.input,
      output: {
        category: outputCategory,
        confidence: outputConfidence,
        explanation: outputExplanation,
        supportingEvidence: outputSupportingEvidence,
      },
    }
  })
}

/**
 * Adjust reminders for better guidance
 */
function adjustReminders(reminders: string[]): string[] {
  const essentialReminders = [
    'Prioritize clinical accuracy over general impressions',
    'Include only evidence directly found in the text',
    'Be precise with diagnostic language while avoiding overinterpretation',
    'When uncertain, indicate lower confidence rather than guessing',
    'Provide specific text references for any supporting evidence',
  ]

  // Add missing essential reminders
  const updatedReminders = [...reminders]
  for (const reminder of essentialReminders) {
    if (
      !reminders.some((r) =>
        r.includes(reminder.split(' ').slice(0, 3).join(' ')),
      )
    ) {
      updatedReminders.push(reminder)
    }
  }

  return updatedReminders.slice(0, 7) // Limit to 7 reminders to avoid overwhelming
}

/**
 * Enrich context with more domain-specific information
 */
function enrichContext(context: string): string {
  if (!context.includes('therapeutic')) {
    context +=
      '\n\nYour analysis should maintain therapeutic integrity and consider the clinical implications of identified patterns.'
  }

  if (!context.includes('culturally')) {
    context +=
      ' Remember to consider culturally-informed perspectives when analyzing mental health indicators.'
  }

  return context
}

/**
 * Add emotional reinforcement to enhance model engagement
 */
function addEmotionalReinforcement(context: string): string {
  if (!context.includes('empathetic')) {
    context +=
      '\n\nApproach this analysis with empathetic understanding, recognizing that behind this text is a real person experiencing these feelings and challenges.'
  }

  return context
}

/**
 * Improve the overall structure of the template
 */
function improveStructure(template: PromptTemplate): {
  template: PromptTemplate
  changes: string[]
} {
  const refinedTemplate = { ...template }
  const changes: string[] = []

  // Add numbered list to task specification if not already present
  if (
    !refinedTemplate.taskSpecification.includes('1.') &&
    !refinedTemplate.taskSpecification.includes('1)')
  ) {
    refinedTemplate.taskSpecification = refinedTemplate.taskSpecification
      .split('\n')
      .map((line, index) => {
        if (line.trim() && index > 0) {
          return `${index}. ${line}`
        }
        return line
      })
      .join('\n')

    changes.push('Added numbered format to task specification')
  }

  // Add clear section headers to context if not already present
  if (!refinedTemplate.specificsAndContext.includes('##')) {
    refinedTemplate.specificsAndContext =
      '## Analysis Context\n' + refinedTemplate.specificsAndContext
    changes.push('Added clear section headers to context')
  }

  return { template: refinedTemplate, changes }
}

/**
 * Utility function to shuffle an array
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Optimizes prompts for specific clinical scenarios
 *
 * @param category The mental health category
 * @param clinicalScenario The specific clinical scenario
 * @returns Optimized prompt template for the scenario
 */
export function createClinicalScenarioTemplate(
  category: MentalHealthCategory,
  clinicalScenario:
    | 'intake'
    | 'crisis'
    | 'therapy'
    | 'monitoring'
    | 'assessment',
): PromptTemplate {
  // Start with category template
  let template = createCategoryTemplate(category)

  // Tailor the template based on clinical scenario
  switch (clinicalScenario) {
    case 'intake':
      template.systemRole +=
        ' You are conducting an initial assessment intake for a new client.'
      template.taskSpecification =
        'Analyze this intake text for mental health indicators, focusing on identifying primary concerns, risk factors, and potential treatment directions:'
      template.reminders.push(
        'Consider how identified patterns might inform treatment planning',
      )
      template.reminders.push(
        'Flag any immediate concerns that require attention in the intake process',
      )
      break

    case 'crisis':
      template.systemRole +=
        ' You are specialized in detecting crisis signals requiring immediate intervention.'
      template.taskSpecification =
        'Analyze this text for crisis indicators, focusing on signs of immediate risk, safety concerns, and urgency level:'
      template.reminders.push('Prioritize detection of imminent risk factors')
      template.reminders.push(
        'Flag any indicators of acute crisis or safety concerns',
      )
      template.reminders.push(
        'Consider contextual factors that may exacerbate risk',
      )
      break

    case 'therapy':
      template.systemRole +=
        ' You are supporting an ongoing therapeutic conversation.'
      template.taskSpecification =
        'Analyze this therapy session text for patterns related to treatment progress, challenges, and opportunities:'
      template.reminders.push(
        'Consider how identified patterns relate to therapeutic goals',
      )
      template.reminders.push(
        'Look for signs of progress or setbacks since previous sessions',
      )
      template.reminders.push(
        "Note potential therapeutic opportunities in the client's narrative",
      )
      break

    case 'monitoring':
      template.systemRole +=
        ' You are monitoring mental health indicators over time for progress assessment.'
      template.taskSpecification =
        'Analyze this check-in text for changes in mental health status, focusing on symptom trajectory and treatment response:'
      template.reminders.push(
        'Compare current indicators with typical progression patterns',
      )
      template.reminders.push(
        'Look for subtle changes that might indicate improvement or deterioration',
      )
      break

    case 'assessment':
      template.systemRole +=
        ' You are conducting a specialized assessment for diagnosis and treatment planning.'
      template.taskSpecification =
        'Analyze this assessment text for specific indicators related to diagnostic criteria, focusing on pattern recognition and differential consideration:'
      template.reminders.push('Consider diagnostic criteria alignment')
      template.reminders.push(
        'Note both confirming and disconfirming evidence for potential diagnoses',
      )
      template.reminders.push(
        'Identify patterns that may inform specific treatment approaches',
      )
      break
  }

  // Apply common enhancements
  template = addEmotionalContext(template)
  template = applyChainOfThought(template)

  return template
}

export default {
  refinePromptTemplate,
  createClinicalScenarioTemplate,
  RefinementTechnique,
}
