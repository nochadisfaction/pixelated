/**
 * MentalLLaMA Prompt Template System
 *
 * Implements the 5-tiered framework for structured prompts:
 * 1. System Role - Domain-specific persona with expertise attributes
 * 2. Task Specification - Clear objectives with chain-of-thought reasoning
 * 3. Specifics & Context - Relevant details with emotional enhancement
 * 4. Few-Shot Examples - Reference cases to calibrate model responses
 * 5. Reminders & Refinements - Strategic instructions at prompt edges
 *
 * This system is designed to optimize model performance for mental health analysis
 * based on research-backed prompt engineering techniques.
 */

import { appLogger as logger } from '../../logging'

/**
 * Interface for a prompt message with role and content
 */
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Interface for a specific example case (few-shot learning)
 */
export interface FewShotExample {
  input: string
  output: {
    category: string
    confidence: number
    explanation: string
    supportingEvidence: string[]
    [key: string]: unknown
  }
}

/**
 * Interface defining the 5-tier prompt template structure
 */
export interface PromptTemplate {
  // Tier 1: System Role
  systemRole: string

  // Tier 2: Task Specification
  taskSpecification: string

  // Tier 3: Specifics & Context
  specificsAndContext: string

  // Tier 4: Few-Shot Examples
  examples: FewShotExample[]

  // Tier 5: Reminders & Refinements
  reminders: string[]

  // Optional configuration
  config?: {
    useChatFormat: boolean // Whether to use chat format or single-string format
    useMarkdown: boolean // Whether to format with markdown
    maxTokens?: number // Maximum token limit for context handling
  }
}

/**
 * Mental health categories supported by the system
 */
export type MentalHealthCategory =
  | 'depression'
  | 'anxiety'
  | 'stress'
  | 'ptsd'
  | 'suicidal'
  | 'substance_abuse'
  | 'eating_disorder'
  | 'bipolar'
  | 'ocd'
  | 'schizophrenia'
  | 'general_wellness'

/**
 * Options for optimizing templates
 */
export interface TemplateOptimizationOptions {
  useEmotionalContext?: boolean
  useChainOfThought?: boolean
  detailedEvidence?: boolean
  includeClinicalContext?: boolean
  maxExamples?: number
}

/**
 * Base template for mental health analysis with the 5-tier framework
 */
export const BASE_MENTAL_HEALTH_TEMPLATE: PromptTemplate = {
  systemRole: `You are a highly specialized mental health analysis system based on MentalLLaMA.
You possess deep expertise in clinical psychology, psychiatry, and therapeutic interventions.
Your role is to provide accurate, empathetic, and ethically sound mental health analysis with
particular expertise in depression, anxiety, stress, and crisis detection.`,

  taskSpecification: `Analyze the following text for mental health indicators using this structured approach:
1. Identify key emotional themes and language patterns
2. Evaluate indicators of specific conditions (depression, anxiety, stress, suicidal ideation)
3. Assess severity and acuity based on clinical standards
4. Determine confidence level in your assessment
5. Provide supporting evidence from the text with specific quotes or references`,

  specificsAndContext: `This analysis is critically important for providing appropriate support to individuals
who may be experiencing mental health challenges. Your assessment will directly impact the quality
of care provided. The text comes from a conversation where understanding the underlying
mental health dynamics is essential for offering proper therapeutic responses.`,

  examples: [],

  reminders: [
    'Prioritize clinical accuracy over general impressions',
    'Include only evidence directly found in the text',
    'Be precise with diagnostic language while avoiding overinterpretation',
    'When uncertain, indicate lower confidence rather than guessing',
    'Provide specific text references for any supporting evidence',
  ],

  config: {
    useChatFormat: true,
    useMarkdown: true,
  },
}

/**
 * Examples for depression detection
 */
export const DEPRESSION_EXAMPLES: FewShotExample[] = [
  {
    input:
      "I just don't see the point anymore. Nothing brings me joy and I feel empty all the time.",
    output: {
      category: 'depression',
      confidence: 0.92,
      explanation:
        'The text shows clear indicators of depression including anhedonia, existential hopelessness, and emotional emptiness.',
      supportingEvidence: [
        'Expression of emptiness',
        'Anhedonia (lack of joy)',
        'Existential hopelessness',
      ],
    },
  },
  {
    input:
      "I've been sleeping a lot lately, maybe 12 hours a day, but I still feel tired. I used to love painting but haven't touched my brushes in months.",
    output: {
      category: 'depression',
      confidence: 0.87,
      explanation:
        'The text exhibits multiple depression indicators including hypersomnia, persistent fatigue, and loss of interest in previously enjoyed activities (anhedonia).',
      supportingEvidence: [
        'Hypersomnia (excessive sleeping)',
        'Persistent fatigue despite excessive sleep',
        'Loss of interest in previously enjoyed activities (painting)',
      ],
    },
  },
]

/**
 * Examples for anxiety detection
 */
export const ANXIETY_EXAMPLES: FewShotExample[] = [
  {
    input:
      "My heart races whenever I think about going outside. I'm constantly worried something terrible will happen.",
    output: {
      category: 'anxiety',
      confidence: 0.89,
      explanation:
        'The individual demonstrates classic anxiety symptoms including physiological arousal, pervasive worry, and catastrophic thinking patterns.',
      supportingEvidence: [
        'Physical symptoms (racing heart)',
        'Anticipatory anxiety',
        'Catastrophic thinking',
      ],
    },
  },
  {
    input:
      "I keep checking if I locked the door, sometimes 10 times before I can leave. My thoughts are spinning out of control with 'what-ifs' and I can't focus on anything else.",
    output: {
      category: 'anxiety',
      confidence: 0.94,
      explanation:
        'The text indicates anxiety with compulsive checking behavior, rumination on hypothetical scenarios, and interference with cognitive functioning.',
      supportingEvidence: [
        'Compulsive checking behavior',
        "Rumination on 'what-if' scenarios",
        'Inability to focus due to intrusive thoughts',
      ],
    },
  },
]

/**
 * Examples for stress detection
 */
export const STRESS_EXAMPLES: FewShotExample[] = [
  {
    input:
      "Work has been overwhelming lately. I'm constantly under pressure to meet deadlines, and I've started having headaches and trouble sleeping.",
    output: {
      category: 'stress',
      confidence: 0.85,
      explanation:
        'The text indicates acute stress related to work pressure, manifesting in both psychological pressure and physical symptoms.',
      supportingEvidence: [
        'Work overwhelm',
        'Pressure from deadlines',
        'Physical symptoms (headaches)',
        'Sleep disturbance',
      ],
    },
  },
]

/**
 * Examples for suicidal ideation detection
 */
export const SUICIDAL_EXAMPLES: FewShotExample[] = [
  {
    input:
      "I don't think I can go on anymore. Everyone would be better off without me. I've been thinking about how to end it all.",
    output: {
      category: 'suicidal',
      confidence: 0.95,
      explanation:
        'The text contains explicit indicators of suicidal ideation including statement of inability to continue, belief others would benefit from their absence, and active contemplation of methods.',
      supportingEvidence: [
        'Expression of inability to continue',
        "Belief others would be 'better off'",
        'Active contemplation of ending life',
      ],
    },
  },
]

/**
 * Category-specific templates with specialized components
 */
export const CATEGORY_TEMPLATES: Record<
  MentalHealthCategory,
  Partial<PromptTemplate>
> = {
  depression: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of depression. You are trained to identify subtle and explicit indicators of depressive disorders, including major depressive disorder, persistent depressive disorder, and adjustment disorders with depressed mood.`,
    examples: DEPRESSION_EXAMPLES,
  },

  anxiety: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of anxiety disorders. You are trained to identify subtle and explicit indicators of generalized anxiety disorder, panic disorder, social anxiety, and phobias.`,
    examples: ANXIETY_EXAMPLES,
  },

  stress: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of stress. You are trained to identify acute and chronic stress patterns, burnout indicators, and adaptive versus maladaptive stress responses.`,
    examples: STRESS_EXAMPLES,
  },

  suicidal: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of suicidal ideation. You are trained to identify subtle and explicit indicators of suicidal thoughts, intentions, and risk factors with high precision and care.`,
    examples: SUICIDAL_EXAMPLES,
    reminders: [
      'Prioritize identification of explicit and implicit risk factors',
      'Distinguish between passive thoughts and active planning',
      'Flag any indication of access to means or specific plans',
      'Err on the side of caution when uncertain',
      'Avoid dismissing subtle warning signs',
    ],
  },

  ptsd: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of post-traumatic stress disorder (PTSD). You are trained to identify trauma responses, hypervigilance, avoidance, intrusive memories, and other PTSD indicators.`,
  },

  substance_abuse: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of substance use disorders. You are trained to identify patterns of substance dependence, withdrawal, tolerance, and impact on functioning.`,
  },

  eating_disorder: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of eating disorders. You are trained to identify patterns related to anorexia nervosa, bulimia nervosa, binge eating disorder, and other disordered eating patterns.`,
  },

  bipolar: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of bipolar disorder. You are trained to identify patterns of mood fluctuation, manic episodes, hypomanic states, and depressive episodes.`,
  },

  ocd: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of obsessive-compulsive disorder (OCD). You are trained to identify obsessive thoughts, compulsive behaviors, and related anxiety patterns.`,
  },

  schizophrenia: {
    systemRole: `You are a specialized mental health analysis system with particular expertise in detecting signs of schizophrenia spectrum disorders. You are trained to identify indications of thought disorders, hallucinations, delusions, and disorganized behavior.`,
  },

  general_wellness: {
    systemRole: `You are a specialized mental health analysis system with a focus on overall psychological wellness. You are trained to assess general mental health status, coping strategies, resilience factors, and support systems.`,
  },
}

/**
 * Creates a category-specific template by merging the base template with category overrides
 * @param category The mental health category
 * @returns A complete prompt template for the specified category
 */
export function createCategoryTemplate(
  category: MentalHealthCategory,
): PromptTemplate {
  const categoryTemplate = CATEGORY_TEMPLATES[category] || {}

  return {
    ...BASE_MENTAL_HEALTH_TEMPLATE,
    ...categoryTemplate,
    // Deep merge for arrays
    examples: [
      ...(categoryTemplate.examples || []),
      ...(BASE_MENTAL_HEALTH_TEMPLATE.examples || []),
    ],
    reminders: [
      ...(categoryTemplate.reminders || []),
      ...(BASE_MENTAL_HEALTH_TEMPLATE.reminders || []),
    ],
  }
}

/**
 * Creates a fully optimized template for a specific category with additional optimization options
 * @param category The mental health category to focus on
 * @param options Additional optimization options
 * @returns A fully optimized prompt template
 */
export function createOptimizedTemplate(
  category: MentalHealthCategory,
  options: TemplateOptimizationOptions = {},
): PromptTemplate {
  // Start with the category-specific template
  const baseTemplate = createCategoryTemplate(category)

  // Apply optimizations based on options
  const optimizedTemplate: PromptTemplate = {
    ...baseTemplate,
    config: {
      ...baseTemplate.config,
      useChatFormat: true, // Always use chat format for optimized templates
      useMarkdown: baseTemplate.config?.useMarkdown ?? true, // Ensure useMarkdown is always defined
    },
  }

  // Enhanced emotional context
  if (options.useEmotionalContext) {
    optimizedTemplate.specificsAndContext = `${baseTemplate.specificsAndContext}
This analysis requires attention to emotional nuance and context. Look for subtle emotional
patterns that might indicate underlying mental health concerns. Pay particular attention to
emotional language, metaphors, intensity markers, and emotion regulation indicators.`
  }

  // Enhanced chain-of-thought reasoning
  if (options.useChainOfThought) {
    optimizedTemplate.taskSpecification = `${baseTemplate.taskSpecification}
Use a step-by-step chain-of-thought approach in your analysis:
1. First, identify all potential indicators without judgment
2. Evaluate each indicator's relevance and strength
3. Consider alternative explanations for observed patterns
4. Weigh the combined evidence for different mental health categories
5. Draw a conclusion with an appropriate confidence level
6. Provide your full reasoning process`
  }

  // Enhanced evidence collection
  if (options.detailedEvidence) {
    optimizedTemplate.reminders = [
      'For each supporting evidence point, provide the exact text quoted',
      'Rate each evidence point on strength (strong, moderate, weak)',
      'Consider both explicit statements and implicit indicators',
      'Distinguish between current and historical evidence',
      ...optimizedTemplate.reminders,
    ]
  }

  // Include clinical context
  if (options.includeClinicalContext) {
    optimizedTemplate.systemRole = `${optimizedTemplate.systemRole}
Your analysis should be informed by clinical best practices, DSM-5 diagnostic criteria,
and evidence-based assessment approaches. Consider severity, duration, impact on functioning,
and differential diagnosis in your evaluation.`
  }

  // Limit examples if specified
  if (options.maxExamples !== undefined && options.maxExamples >= 0) {
    optimizedTemplate.examples = optimizedTemplate.examples.slice(
      0,
      options.maxExamples,
    )
  }

  return optimizedTemplate
}

/**
 * Builds a complete prompt from a template and input text
 * @param template The prompt template to use
 * @param inputText The text to analyze
 * @returns An array of prompt messages in chat format or a single string
 */
export function buildPrompt(
  template: PromptTemplate,
  inputText: string,
): PromptMessage[] | string {
  try {
    // Format examples as text
    const formattedExamples = template.examples
      .map((example, index) => {
        const formattedOutput = JSON.stringify(example.output, null, 2)
        return `
Example ${index + 1}:
Input: "${example.input}"
Analysis: ${formattedOutput}
`
      })
      .join('\n')

    // Format reminders
    const formattedReminders = template.reminders
      .map((reminder) => `- ${reminder}`)
      .join('\n')

    // Build the prompt content with markdown formatting if enabled
    const buildContent = (content: string): string => {
      return template.config?.useMarkdown
        ? content
        : content.replace(/#{1,6} /g, '').replace(/\*\*/g, '')
    }

    // Build the complete prompt content
    const userContent = buildContent(`
${template.taskSpecification ? `## Task\n${template.taskSpecification}\n` : ''}
${template.specificsAndContext ? `## Context\n${template.specificsAndContext}\n` : ''}
${template.examples.length > 0 ? `## Examples\n${formattedExamples}\n` : ''}
${template.reminders.length > 0 ? `## Important Reminders\n${formattedReminders}\n` : ''}

## Text for Analysis
"${inputText}"
`)

    // Return in the appropriate format
    if (template.config?.useChatFormat) {
      return [
        {
          role: 'system',
          content: buildContent(template.systemRole),
        },
        {
          role: 'user',
          content: userContent,
        },
      ]
    } else {
      return `${buildContent(template.systemRole)}\n\n${userContent}`
    }
  } catch (error) {
    logger.error('Error building prompt', { error })

    // Fallback to a basic prompt if there's an error
    if (template.config?.useChatFormat) {
      return [
        {
          role: 'system',
          content: 'You are a mental health analysis system.',
        },
        {
          role: 'user',
          content: `Analyze the following text for mental health indicators: "${inputText}"`,
        },
      ]
    } else {
      return `You are a mental health analysis system. Analyze the following text for mental health indicators: "${inputText}"`
    }
  }
}
