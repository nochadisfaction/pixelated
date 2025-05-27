import { createLogger } from '@/utils/logger'
import type { MentalHealthCategory } from '../prompts' // Assuming MentalHealthCategory is defined here
import {
  buildRoutingPromptMessages,
  type RoutingClassificationCategory,
} from './routing_prompts'
import {
  LLMInvocationError,
  ClassificationParseError,
  // RouterInitializationError, // Not used yet, but good to have defined
  // RoutingDecisionError, // Not used yet
} from './errors'

const logger = createLogger({ context: 'MentalHealthTaskRouter' })

/**
 * Optional context to aid in routing decisions.
 */
export interface RoutingContext {
  userId?: string
  sessionId?: string
  // e.g., 'intake', 'crisis_support', 'regular_check_in'
  sessionType?: string
  // User or system provided hint for the type of analysis desired
  explicitTaskHint?: MentalHealthCategory | 'general' | string
}

/**
 * Output of the routing decision.
 */
export interface RoutingDecision {
  // The primary specialized analyzer or category to target
  targetAnalyzer:
    | MentalHealthCategory
    | 'general_mental_health'
    | 'unknown'
    | 'crisis'
  // Confidence in the routing decision (0.0 to 1.0)
  confidence: number
  // Optional: Any preliminary insights or data gathered during routing
  preliminaryInsights?: Record<string, unknown>
  // Optional: Reason or method used for routing
  routingMethod?:
    | 'keyword'
    | 'classification'
    | 'contextual'
    | 'explicit_hint'
    | 'fallback'
    | 'keyword+classification'
}

// Placeholder for specialized analyzer identifiers/categories
// This should align with how MentalLLaMAAdapter selects prompts/models
const AVAILABLE_ANALYZERS: Array<
  MentalHealthCategory | 'general_mental_health'
> = [
  'depression',
  'anxiety',
  'stress',
  // 'ptsd', // Example, assuming these are defined MentalHealthCategory types
  // 'suicidal_ideation',
  'general_wellness', // Assuming 'general_wellness' is a MentalHealthCategory
  // 'interpersonal_risk', // To be implemented
  'general_mental_health', // Fallback/broad analyzer
]

// Define a type for the LLM invoker function
export type LLMInvoker = (params: {
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  // Add other relevant LLM call parameters if needed
}) => Promise<{ content: string | null; error?: unknown }> // Simplified: assuming it returns a string to be parsed as JSON

// New: Configuration for mapping LLM categories to internal analyzers and flags
const LLM_CATEGORY_TO_ANALYZER_MAP: Record<
  RoutingClassificationCategory,
  {
    analyzer:
      | MentalHealthCategory
      | 'general_mental_health'
      | 'unknown'
      | 'crisis'
    isCritical?: boolean
  }
> = {
  depression: { analyzer: 'depression' },
  anxiety: { analyzer: 'anxiety' },
  stress: { analyzer: 'stress' },
  wellness_focus: { analyzer: 'general_wellness' },
  interpersonal_issue: { analyzer: 'unknown' }, // Placeholder: Map to 'interpersonal_risk' when available
  crisis_intervention_needed: { analyzer: 'crisis', isCritical: true },
  general_mental_health_inquiry: { analyzer: 'general_mental_health' },
  unknown: { analyzer: 'unknown' },
}

// New: Define keyword sets for routing
interface KeywordRule {
  keywords: Array<string | RegExp> // Allow strings or regex for more complex patterns
  analyzer: MentalHealthCategory | 'general_mental_health' | 'crisis'
  confidence: number
  isCritical?: boolean // Explicitly flag critical keyword sets
}

// Order matters: Crisis keywords should be checked first.
const KEYWORD_ROUTING_RULES: KeywordRule[] = [
  {
    analyzer: 'crisis',
    keywords: [
      /kill\s+(myself|me)/i,
      /end\s+(my\s+)?life/i,
      /can't\s+go\s+on/i,
      /want\s+to\s+die/i,
      /active\s+plan\s+to\s+harm/i,
      /going\s+to\s+hurt\s+myself/i,
      /suicide\s+plan/i,
      /not\s+worth\s+living/i,
    ],
    confidence: 0.9,
    isCritical: true,
  },
  {
    analyzer: 'depression',
    keywords: [
      'depressed',
      'hopeless',
      'feeling down',
      'empty',
      /no\s+interest/i,
      /don't\s+enjoy/i,
      'very sad',
      'miserable',
      'suicidal thoughts', // "suicidal thoughts" without immediate plan context
    ],
    confidence: 0.65,
  },
  {
    analyzer: 'anxiety',
    keywords: [
      'anxious',
      'worried',
      'nervous',
      /panic\s+attack/i,
      /can't\s+relax/i,
      'fearful',
      'scared',
      /overwhelmed\s+by\s+worry/i,
      /heart\s+racing/i,
      'dread',
      'uneasy',
    ],
    confidence: 0.65,
  },
  {
    analyzer: 'stress',
    keywords: [
      'stressed',
      'overwhelmed',
      'pressure',
      /burnt\s+out/i,
      /too\s+much\s+work/i,
      /can't\s+cope/i,
      'under strain',
      'frazzled',
    ],
    confidence: 0.6,
  },
  {
    analyzer: 'general_wellness', // Maps to 'general_wellness' MentalHealthCategory
    keywords: [
      /improve\s+wellbeing/i,
      'mindfulness',
      /cope\s+better/i,
      /feel\s+good/i,
      /positive\s+habits/i,
      'resilience',
      /self\s*[- ]?care/i,
    ],
    confidence: 0.7, // Wellness keywords can be quite indicative
  },
  // Add more rules as needed, e.g., for interpersonal_issue
]

export class MentalHealthTaskRouter {
  private llmInvoker: LLMInvoker

  constructor(llmInvoker: LLMInvoker) {
    this.llmInvoker = llmInvoker
    logger.info('MentalHealthTaskRouter initialized with LLM invoker.')
  }

  /**
   * Determines the most appropriate route for analyzing the given text.
   *
   * @param text The input text to analyze.
   * @param context Optional contextual information.
   * @returns A RoutingDecision indicating the target analyzer and confidence.
   */
  public async determineRoute(
    text: string,
    context?: RoutingContext,
  ): Promise<RoutingDecision> {
    logger.info('Determining route for text...', {
      textLength: text.length,
      context,
    })

    // 1. Check for explicit hints - this takes highest precedence
    if (context?.explicitTaskHint) {
      const hint = context.explicitTaskHint as
        | MentalHealthCategory
        | 'general_mental_health'
        | 'crisis' // Allow crisis as a hint
        | 'general' // Explicitly include 'general' here for clarity
      // Validate if the hint is a known analyzer or a special case like 'general' or 'crisis'
      if (
        hint === 'crisis' ||
        hint === 'general' || // This comparison is intentional
        AVAILABLE_ANALYZERS.includes(
          hint as MentalHealthCategory | 'general_mental_health',
        )
      ) {
        logger.info(`Routing based on explicit hint: ${hint}`)
        const targetAnalyzer =
          hint === 'general' ? 'general_mental_health' : hint
        // Contextual rules can still apply to an explicit hint (e.g., to confirm or add insights)
        const preliminaryDecision: RoutingDecision = {
          targetAnalyzer,
          confidence: 0.99, // High confidence for explicit hints
          routingMethod: 'explicit_hint',
        }
        const contextualOverride = this.applyContextualRules(
          text,
          context,
          preliminaryDecision,
        )
        return contextualOverride || preliminaryDecision
      }
    }

    // 2. Get decisions from keyword matching and LLM classification
    const keywordDecision = this.matchKeywords(text)
    const classificationDecision = await this.performBroadClassification(
      text,
      context,
    )

    let bestPreliminaryDecision: RoutingDecision

    // 3. Combine Keyword and Classification decisions
    if (keywordDecision && classificationDecision) {
      // If both have results, pick the better one
      // Prioritize critical keyword matches
      if (
        keywordDecision.preliminaryInsights?.is_critical_flag &&
        keywordDecision.targetAnalyzer === 'crisis'
      ) {
        bestPreliminaryDecision = keywordDecision
        logger.info('Prioritizing critical keyword decision.', {
          keywordDecision,
        })
      } else if (
        classificationDecision.preliminaryInsights?.is_critical_flag &&
        classificationDecision.targetAnalyzer === 'crisis'
      ) {
        bestPreliminaryDecision = classificationDecision
        logger.info('Prioritizing critical classification decision.', {
          classificationDecision,
        })
      }
      // If keyword points to crisis and classification doesn't, keyword wins
      else if (
        keywordDecision.targetAnalyzer === 'crisis' &&
        classificationDecision.targetAnalyzer !== 'crisis'
      ) {
        bestPreliminaryDecision = keywordDecision
        logger.info(
          'Keyword detected crisis, classification did not. Prioritizing keyword.',
          { keywordDecision },
        )
      }
      // If classification points to crisis and keyword doesn't, classification wins
      else if (
        classificationDecision.targetAnalyzer === 'crisis' &&
        keywordDecision.targetAnalyzer !== 'crisis'
      ) {
        bestPreliminaryDecision = classificationDecision
        logger.info(
          'Classification detected crisis, keyword did not. Prioritizing classification.',
          { classificationDecision },
        )
      }
      // If they agree on the analyzer, combine confidence (e.g., take max, or slightly boost)
      else if (
        keywordDecision.targetAnalyzer === classificationDecision.targetAnalyzer
      ) {
        bestPreliminaryDecision = {
          ...keywordDecision, // or classificationDecision, as target is same
          confidence: Math.min(
            1.0,
            Math.max(
              keywordDecision.confidence,
              classificationDecision.confidence,
            ) + 0.1,
          ),
          routingMethod: 'keyword+classification',
          preliminaryInsights: {
            ...keywordDecision.preliminaryInsights,
            classification_insights: classificationDecision.preliminaryInsights,
          },
        }
        logger.info('Keyword and classification agreed.', {
          bestPreliminaryDecision,
        })
      }
      // If they disagree and no crisis, pick based on higher confidence
      else if (
        keywordDecision.confidence >= classificationDecision.confidence
      ) {
        bestPreliminaryDecision = keywordDecision
        logger.info(
          'Keyword and classification disagreed, keyword has higher/equal confidence.',
          { keywordDecision },
        )
      } else {
        bestPreliminaryDecision = classificationDecision
        logger.info(
          'Keyword and classification disagreed, classification has higher confidence.',
          { classificationDecision },
        )
      }
    } else if (keywordDecision) {
      bestPreliminaryDecision = keywordDecision
      logger.info('Only keyword decision available.', { keywordDecision })
    } else if (classificationDecision) {
      bestPreliminaryDecision = classificationDecision
      logger.info('Only classification decision available.', {
        classificationDecision,
      })
    } else {
      // Should not happen if classification always returns a fallback
      logger.error(
        'No decision from keyword or classification, this indicates an issue.',
      )
      bestPreliminaryDecision = {
        targetAnalyzer: 'unknown',
        confidence: 0.05, // Very low confidence
        routingMethod: 'fallback',
      }
    }

    // 4. Apply Contextual Rules to the chosen preliminary decision
    const contextualOverride = this.applyContextualRules(
      text,
      context,
      bestPreliminaryDecision,
    )
    const finalDecision = contextualOverride || bestPreliminaryDecision

    logger.info('Final routing decision made.', { finalDecision })
    return finalDecision

    // Fallback logic (now part of the decision combination process above)
    /*
    logger.info('No specific route determined, using fallback.');
    return {
      targetAnalyzer: 'general_mental_health',
      confidence: 0.3, // Low confidence for fallback
      routingMethod: 'fallback',
    };
    */
  }

  private matchKeywords(text: string): RoutingDecision | null {
    const lowerCaseText = text.toLowerCase() // Normalize text for matching

    for (const rule of KEYWORD_ROUTING_RULES) {
      for (const keyword of rule.keywords) {
        if (
          typeof keyword === 'string' &&
          lowerCaseText.includes(keyword.toLowerCase())
        ) {
          logger.info(
            `Keyword match found: rule for '${rule.analyzer}', keyword '${keyword}'`,
          )
          return {
            targetAnalyzer: rule.analyzer,
            confidence: rule.confidence,
            routingMethod: 'keyword',
            preliminaryInsights: {
              matched_keyword: keyword,
              matched_rule_analyzer: rule.analyzer,
              is_critical_flag: rule.isCritical || false,
            },
          }
        } else if (keyword instanceof RegExp && keyword.test(text)) {
          // Test regex against original text for case sensitivity if needed by regex
          logger.info(
            `Regex keyword match found: rule for '${rule.analyzer}', regex '${keyword.source}'`,
          )
          return {
            targetAnalyzer: rule.analyzer,
            confidence: rule.confidence,
            routingMethod: 'keyword',
            preliminaryInsights: {
              matched_keyword: keyword.source,
              matched_rule_analyzer: rule.analyzer,
              is_critical_flag: rule.isCritical || false,
            },
          }
        }
      }
    }
    logger.debug('No keyword match found.', {
      textSample: lowerCaseText.substring(0, 50),
    })
    return null
  }

  private async performBroadClassification(
    text: string,
    _context?: RoutingContext, // context might be used by the LLM prompt in future or for pre-filtering
  ): Promise<RoutingDecision> {
    const messages = buildRoutingPromptMessages(text)
    let llmResponseContent: string | null = null
    let llmError: unknown = null

    try {
      logger.debug('Invoking LLM for broad classification...')
      const llmResult = await this.llmInvoker({
        messages,
        temperature: 0.1, // Low temperature for classification
        max_tokens: 150, // Expecting a short JSON response
      })
      llmResponseContent = llmResult.content
      llmError = llmResult.error

      if (llmError) {
        logger.error('LLM invocation for routing returned an error object.', {
          llmError,
        })
        throw new LLMInvocationError(
          'LLM invocation for routing failed.',
          llmError instanceof Error ? llmError : new Error(String(llmError)),
        )
      }
      if (!llmResponseContent) {
        logger.warn('LLM response for routing was empty or null.')
        // This case could also throw an error or return a default 'unknown' decision directly
        // For now, letting it proceed to JSON parsing which will fail and be caught
        throw new LLMInvocationError(
          'LLM response for routing was empty or null.',
        )
      }
    } catch (error) {
      if (error instanceof LLMInvocationError) {
        throw error
      } // Re-throw if already our type
      logger.error('Error during LLM invocation for routing.', { error })
      throw new LLMInvocationError(
        'Failed to invoke LLM for routing classification.',
        error instanceof Error ? error : new Error(String(error)),
      )
    }

    let classificationResult: {
      category: RoutingClassificationCategory
      confidence: number
      reasoning?: string
    }

    try {
      // Attempt to sanitize before parsing
      const sanitizedOutput = llmResponseContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      logger.debug('Attempting to parse LLM classification response:', {
        sanitizedOutput,
      })
      classificationResult = JSON.parse(sanitizedOutput)
    } catch (parseError) {
      logger.error('Failed to parse LLM classification JSON response.', {
        rawOutput: llmResponseContent,
        parseError,
      })
      throw new ClassificationParseError(
        'Failed to parse LLM classification response.',
        llmResponseContent,
      )
    }

    const { category, confidence, reasoning } = classificationResult

    if (!category || typeof confidence !== 'number') {
      logger.warn('Invalid or incomplete classification result from LLM.', {
        classificationResult,
      })
      throw new ClassificationParseError(
        'LLM classification response is invalid or incomplete.',
        llmResponseContent,
      )
    }

    const mapped = LLM_CATEGORY_TO_ANALYZER_MAP[category]
    if (!mapped) {
      logger.warn(
        `LLM returned unknown category: ${category}. Defaulting to 'unknown'.`,
      )
      return {
        targetAnalyzer: 'unknown',
        confidence: confidence * 0.5, // Reduce confidence for unknown category
        routingMethod: 'classification',
        preliminaryInsights: {
          llm_raw_category: category,
          llm_confidence: confidence,
          llm_reasoning: reasoning,
          parse_issue: 'Unknown category mapping',
        },
      }
    }

    const targetAnalyzer =
      AVAILABLE_ANALYZERS.some((a) => a === mapped.analyzer) ||
      mapped.analyzer === 'crisis'
        ? mapped.analyzer
        : 'unknown'

    let currentConfidence = confidence
    if (targetAnalyzer === 'unknown' && mapped.analyzer !== 'unknown') {
      logger.warn(
        `Mapped analyzer '${mapped.analyzer}' not in AVAILABLE_ANALYZERS. Defaulting target to 'unknown'.`,
      )
      currentConfidence *= 0.7 // Penalize confidence if mapped analyzer is not available
    }

    if (mapped.isCritical && targetAnalyzer === 'crisis') {
      logger.info(
        `Critical category ${category} detected by LLM, mapped to ${targetAnalyzer}.`,
      )
      currentConfidence = Math.max(currentConfidence, 0.9) // Boost confidence for critical detections
    }

    logger.info('LLM classification successful.', {
      category,
      confidence: currentConfidence,
      targetAnalyzer,
    })

    return {
      targetAnalyzer,
      confidence: currentConfidence,
      routingMethod: 'classification',
      preliminaryInsights: {
        llm_raw_category: category,
        llm_reported_confidence: confidence,
        llm_reasoning: reasoning,
        is_critical_flag: mapped.isCritical || false,
      },
    }
  }

  private applyContextualRules(
    text: string,
    context: RoutingContext | undefined, // Make context optional here
    currentDecision: RoutingDecision, // The decision from keyword or LLM classification
  ): RoutingDecision | null {
    logger.debug('Applying contextual rules...', { context, currentDecision })

    // Rule 1: Session Type influencing routing
    if (context?.sessionType) {
      // Add null check for context
      // Example: If session is about stress management, and current decision is vague, bias towards stress if keywords exist
      if (
        context.sessionType === 'stress_management_session' &&
        currentDecision.targetAnalyzer !== 'stress' &&
        (text.toLowerCase().includes('stress') ||
          text.toLowerCase().includes('overwhelmed'))
      ) {
        logger.info(
          `Contextual rule: sessionType 'stress_management_session' is biasing towards 'stress'.`,
        )
        return {
          targetAnalyzer: 'stress',
          confidence: Math.max(currentDecision.confidence, 0.65), // Boost or set reasonable confidence
          routingMethod: 'contextual',
          preliminaryInsights: {
            ...currentDecision.preliminaryInsights,
            contextual_rule: 'stress_session_bias',
          },
        }
      }

      // Example: If session is a crisis follow-up and text still indicates distress
      if (
        context.sessionType === 'crisis_intervention_follow_up' &&
        currentDecision.targetAnalyzer !== 'crisis'
      ) {
        // Check for lingering crisis indicators, even if not caught by primary crisis keywords
        const crisisKeywords = [
          /still\s+feel\s+terrible/i,
          /not\s+getting\s+better/i,
          /want\s+to\s+give\s+up/i,
        ]
        for (const keyword of crisisKeywords) {
          if (keyword.test(text)) {
            logger.warn(
              `Contextual rule: 'crisis_intervention_follow_up' session with distress indicators. Elevating to crisis.`,
            )
            return {
              targetAnalyzer: 'crisis',
              confidence: 0.9, // High confidence due to context + keywords
              routingMethod: 'contextual',
              preliminaryInsights: {
                ...currentDecision.preliminaryInsights,
                contextual_rule: 'crisis_follow_up_distress',
                matched_keyword: keyword.source,
              },
            }
          }
        }
      }

      // Example: If explicitTaskHint was 'general_wellness' but somehow missed, and sessionType supports it
      if (
        context.explicitTaskHint === 'general_wellness' &&
        context.sessionType === 'wellness_coaching' &&
        currentDecision.targetAnalyzer !== 'general_wellness'
      ) {
        logger.info(
          `Contextual rule: Re-aligning to 'general_wellness' based on explicit hint and session type.`,
        )
        return {
          targetAnalyzer: 'general_wellness',
          confidence: 0.85,
          routingMethod: 'contextual',
          preliminaryInsights: {
            ...currentDecision.preliminaryInsights,
            contextual_rule: 'wellness_hint_session_realignment',
          },
        }
      }
    }

    // Add more contextual rules here based on other context fields like userId (user history), etc.

    logger.debug('No overriding contextual rule applied.')
    return null // No contextual rule applied that overrides the current decision
  }
}

// Example usage (for testing or integration into MentalLLaMAAdapter):
// async function testRouter() {
//   const router = new MentalHealthTaskRouter();
//   const decision = await router.determineRoute("I've been feeling very anxious and stressed about work lately.");
//   console.log(decision);
//   const decision2 = await router.determineRoute("I want to improve my overall wellbeing.", { explicitTaskHint: 'wellness' });
//   console.log(decision2);
// }
// testRouter();
