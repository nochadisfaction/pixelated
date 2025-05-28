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
import { FallbackConfidenceThresholds } from '@/config/routingConfig';


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
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string[]
  use_self_consistency?: boolean
  self_consistency_variants?: number
  use_chain_of_thought?: boolean
  use_emotional_context?: boolean
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
    let classificationDecision: RoutingDecision | null = null
    
    try {
      classificationDecision = await this.performBroadClassification(text, context)
    } catch (error) {
      logger.error('Error during classification, will rely on fallback mechanisms', { error })
      // We'll continue with keywordDecision if available, or use fallback later
    }

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
      bestPreliminaryDecision = this.getFallbackDecision(text)
    }

    // 4. Apply Contextual Rules to the chosen preliminary decision
    const contextualOverride = this.applyContextualRules(
      text,
      context,
      bestPreliminaryDecision,
    )
    const finalDecision = contextualOverride || bestPreliminaryDecision

    // 5. Apply confidence thresholds and fallback mechanisms
    const finalDecisionWithFallback = this.applyFallbackMechanisms(text, finalDecision)

    logger.info('Final routing decision made.', { finalDecision: finalDecisionWithFallback })
    return finalDecisionWithFallback
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
    context?: RoutingContext, // Make sure context is an optional parameter
  ): Promise<RoutingDecision> {
    logger.info('Performing broad classification using LLM...', { context })
    const messages = buildRoutingPromptMessages(text, context)

    try {
      const llmResponse = await this.llmInvoker({
        messages,
        // Consider adding temperature, max_tokens if not defaults in llmInvoker
      })

      if (llmResponse.error || !llmResponse.content) {
        logger.error('LLM invocation failed or returned empty content.', {
          error: llmResponse.error,
        })
        throw new LLMInvocationError(
          'LLM invocation failed or returned empty content.',
          { cause: llmResponse.error },
        )
      }

      // Basic sanitization for LLM JSON output: remove potential markdown backticks
      let sanitizedContent = llmResponse.content.trim()
      if (sanitizedContent.startsWith('```json')) {
        sanitizedContent = sanitizedContent.substring(7)
      }
      if (sanitizedContent.endsWith('```')) {
        sanitizedContent = sanitizedContent.substring(
          0,
          sanitizedContent.length - 3,
        )
      }
      sanitizedContent = sanitizedContent.trim() // Trim again after removing backticks

      let parsedResponse: {
        category: RoutingClassificationCategory
        confidence?: number // Make confidence optional as LLM might not always provide it reliably
        reasoning?: string // Optional reasoning from LLM
      }

      try {
        parsedResponse = JSON.parse(sanitizedContent)
      } catch (e: unknown) {
        logger.error('Failed to parse LLM JSON response.', {
          content: llmResponse.content,
          sanitizedContent,
          error: e,
        })
        throw new ClassificationParseError(
          'Failed to parse LLM JSON response.',
          { cause: e },
        )
      }

      const llmCategory = parsedResponse.category
      const mapping = LLM_CATEGORY_TO_ANALYZER_MAP[llmCategory]

      let targetAnalyzer: RoutingDecision['targetAnalyzer'] = 'unknown'
      let confidence = parsedResponse.confidence ?? 0.5 // Default confidence if not provided
      let isCritical = false

      if (mapping) {
        targetAnalyzer = mapping.analyzer
        isCritical = mapping.isCritical ?? false
        if (isCritical) {
          logger.warn(
            `Critical category detected by LLM: ${llmCategory}, mapping to ${targetAnalyzer}`,
          )
          // Boost confidence for critical cases if not already high
          confidence = Math.max(confidence, 0.85)
        }
        // Validate if the mapped analyzer is actually available, otherwise fallback
        if (
          targetAnalyzer !== 'crisis' && // crisis is always a valid target
          targetAnalyzer !== 'unknown' && // unknown is always a valid target
          !AVAILABLE_ANALYZERS.includes(
            targetAnalyzer as MentalHealthCategory | 'general_mental_health',
          )
        ) {
          logger.warn(
            `LLM mapped to unavailable analyzer '${targetAnalyzer}'. Defaulting to 'general_mental_health'.`,
            { llmCategory },
          )
          targetAnalyzer = 'general_mental_health'
          // Adjust confidence as we are falling back due to unavailability
          confidence = Math.max(0.4, confidence * 0.7) // Keep some original confidence, but reduce
        }
      } else {
        logger.warn(
          `Unmapped LLM category: ${llmCategory}. Defaulting to 'unknown'.`,
        )
        targetAnalyzer = 'unknown'
        confidence = 0.3 // Low confidence for unmapped categories
      }

      // Ensure confidence is within bounds
      confidence = Math.max(0, Math.min(1, confidence))

      const decision: RoutingDecision = {
        targetAnalyzer,
        confidence,
        routingMethod: 'classification',
        preliminaryInsights: {
          llmCategory,
          llmReasoning: parsedResponse.reasoning,
          isCritical,
        },
      }
      logger.info('Broad classification decision:', decision)
      return decision
    } catch (error: unknown) {
      logger.error('Error during broad classification:', { error })
      if (
        error instanceof LLMInvocationError ||
        error instanceof ClassificationParseError
      ) {
        // Rethrow known errors to be handled by the caller
        throw error
      }
      // Fallback decision in case of unexpected errors
      return {
        targetAnalyzer: 'unknown',
        confidence: 0.1,
        routingMethod: 'fallback',
        preliminaryInsights: {
          error:
            error instanceof Error
              ? error.message
              : 'Unknown classification error',
        },
      }
    }
  }

  private applyContextualRules(
    text: string,
    context: RoutingContext | undefined,
    currentDecision: RoutingDecision,
  ): RoutingDecision | null {
    logger.debug('Applying contextual rules...', { context, currentDecision });

    if (!context) {
      logger.debug('No context provided for contextual rules.');
      return null;
    }

    const sessionTypeDecision = this.applySessionTypeRules(text, context, currentDecision);
    if (sessionTypeDecision) {
      return sessionTypeDecision;
    }

    const crisisEscalationDecision = this.applyCrisisEscalationRules(text, currentDecision);
    if (crisisEscalationDecision) {
      return crisisEscalationDecision;
    }

    logger.debug('No overriding contextual rule applied.');
    return null;
  }

  private applySessionTypeRules(
    text: string,
    context: RoutingContext,
    currentDecision: RoutingDecision,
  ): RoutingDecision | null {
    if (!context.sessionType) {
      return null;
    }

    const sessionTypeRules: Record<string, (text: string, decision: RoutingDecision) => RoutingDecision | null> = {
      stress_management_session: this.biasTowardsStress,
      crisis_intervention_follow_up: this.escalateToCrisis,
      wellness_coaching: this.realignToWellness,
      depression_therapy: this.biasTowardsDepression,
      anxiety_management: this.biasTowardsAnxiety,
    };

    const rule = sessionTypeRules[context.sessionType];
    return rule ? rule.call(this, text, currentDecision) : null;
  }

  private biasTowardsStress(text: string, decision: RoutingDecision): RoutingDecision | null {
    if (decision.targetAnalyzer !== 'stress' && /stress|overwhelmed/i.test(text)) {
      logger.info(`Biasing towards 'stress' based on session type.`);
      return this.createContextualDecision('stress', 0.65, decision, 'stress_session_bias');
    }
    return null;
  }

  private escalateToCrisis(text: string, decision: RoutingDecision): RoutingDecision | null {
    const crisisKeywords = [/still\s+feel\s+terrible/i, /not\s+getting\s+better/i, /want\s+to\s+give\s+up/i];
    if (decision.targetAnalyzer !== 'crisis' && crisisKeywords.some((kw) => kw.test(text))) {
      logger.warn(`Escalating to 'crisis' based on session type.`);
      return this.createContextualDecision('crisis', 0.9, decision, 'crisis_follow_up_distress');
    }
    return null;
  }

  private realignToWellness(text: string, decision: RoutingDecision): RoutingDecision | null {
    if (decision.targetAnalyzer !== 'general_wellness') {
      logger.info(`Realigning to 'general_wellness' based on session type.`);
      return this.createContextualDecision('general_wellness', 0.85, decision, 'wellness_hint_session_realignment');
    }
    return null;
  }

  private biasTowardsDepression(text: string, decision: RoutingDecision): RoutingDecision | null {
    if (
      decision.targetAnalyzer !== 'depression' &&
      decision.confidence < 0.8 &&
      /sad|down|tired|hopeless/i.test(text)
    ) {
      logger.info(`Biasing towards 'depression' based on session type.`);
      return this.createContextualDecision('depression', 0.7, decision, 'depression_session_bias');
    }
    return null;
  }

  private biasTowardsAnxiety(text: string, decision: RoutingDecision): RoutingDecision | null {
    if (
      decision.targetAnalyzer !== 'anxiety' &&
      decision.confidence < 0.8 &&
      /worry|anxious|nervous|fear/i.test(text)
    ) {
      logger.info(`Biasing towards 'anxiety' based on session type.`);
      return this.createContextualDecision('anxiety', 0.7, decision, 'anxiety_session_bias');
    }
    return null;
  }

  private applyCrisisEscalationRules(text: string, decision: RoutingDecision): RoutingDecision | null {
    if (
      decision.targetAnalyzer !== 'crisis' &&
      /feel (terrible|awful|horrible|like dying)/i.test(text) &&
      /(help|emergency|urgent)/i.test(text)
    ) {
      logger.warn(`Escalating to 'crisis' due to potential indicators.`);
      return this.createContextualDecision('crisis', 0.85, decision, 'crisis_escalation_safety_first');
    }
    return null;
  }

  private createContextualDecision(
    targetAnalyzer: MentalHealthCategory | 'general_mental_health' | 'unknown' | 'crisis',
    confidence: number,
    currentDecision: RoutingDecision,
    contextualRule: string,
  ): RoutingDecision {
    return {
      targetAnalyzer,
      confidence: Math.max(currentDecision.confidence, confidence),
      routingMethod: 'contextual',
      preliminaryInsights: {
        ...currentDecision.preliminaryInsights,
        contextual_rule: contextualRule,
      },
    };
  }

  /**
   * Applies fallback mechanisms for uncertain cases.
   * This ensures we have reasonable defaults when confidence is low.
   * 
   * @param text The input text being analyzed
   * @param decision The current routing decision
   * @returns A potentially modified routing decision with fallback applied
   */
  private applyFallbackMechanisms(
    text: string,
    decision: RoutingDecision
  ): RoutingDecision {
    // Define confidence thresholds
    
    const { LOW_CONFIDENCE_THRESHOLD, VERY_LOW_CONFIDENCE_THRESHOLD } = FallbackConfidenceThresholds;
    
    // If confidence is very low, use a more general analyzer
    if (decision.confidence < VERY_LOW_CONFIDENCE_THRESHOLD) {
      logger.info(`Very low confidence (${decision.confidence}). Using general_mental_health fallback.`)
      return this.getFallbackDecision(text)
    }
    
    // If confidence is low but not very low, consider text length
    if (decision.confidence < LOW_CONFIDENCE_THRESHOLD) {
      // For very short texts, fall back to general
      if (text.length < 20) {
        logger.info(`Low confidence (${decision.confidence}) with short text. Using general_mental_health fallback.`)
        return this.getFallbackDecision(text)
      }
      
      // For longer texts with low confidence, reduce confidence further to signal uncertainty
      logger.info(`Low confidence (${decision.confidence}). Reducing confidence further to signal uncertainty.`)
      return {
        ...decision,
        confidence: decision.confidence * 0.9,
        preliminaryInsights: {
          ...decision.preliminaryInsights,
          fallback_applied: 'confidence_reduction',
        },
      }
    }
    
    // Special case: If the decision is 'unknown' but with high confidence,
    // that's contradictory - use general_mental_health instead
    if (decision.targetAnalyzer === 'unknown' && decision.confidence > 0.7) {
      logger.info(`High confidence 'unknown' decision is contradictory. Using general_mental_health.`)
      return {
        targetAnalyzer: 'general_mental_health',
        confidence: 0.5, // Medium confidence for this fallback
        routingMethod: 'fallback',
        preliminaryInsights: {
          ...decision.preliminaryInsights,
          fallback_applied: 'unknown_with_high_confidence',
          original_analyzer: decision.targetAnalyzer,
          original_confidence: decision.confidence,
        },
      }
    }
    
    // For crisis cases, we might want to be more cautious
    if (decision.targetAnalyzer === 'crisis' && decision.confidence < 0.6) {
      // If confidence in crisis is borderline, we still err on the side of caution
      // but flag it as a potential false positive
      logger.warn(`Borderline crisis confidence (${decision.confidence}). Maintaining crisis classification but flagging as potential false positive.`)
      return {
        ...decision,
        preliminaryInsights: {
          ...decision.preliminaryInsights,
          fallback_applied: 'borderline_crisis_caution',
          potential_false_positive: true,
        },
      }
    }
    
    // No fallback needed
    return decision
  }
  
  /**
   * Gets a fallback decision when no reliable classification is available.
   * 
   * @param text The input text being analyzed
   * @returns A general fallback routing decision
   */
  private getFallbackDecision(text: string): RoutingDecision {
    // Check if the text is very short (likely not enough context)
    const isVeryShort = text.length < 10
    
    // Check if the text seems completely unrelated to mental health
    const seemsUnrelatedToMentalHealth = !this.containsAnyMentalHealthTerms(text)
    
    if (isVeryShort) {
      logger.info('Text is too short for reliable classification. Using fallback.')
      return {
        targetAnalyzer: 'unknown',
        confidence: 0.3,
        routingMethod: 'fallback',
        preliminaryInsights: {
          fallback_reason: 'text_too_short',
          text_length: text.length,
        },
      }
    }
    
    if (seemsUnrelatedToMentalHealth) {
      logger.info('Text appears unrelated to mental health. Using fallback.')
      return {
        targetAnalyzer: 'unknown',
        confidence: 0.4,
        routingMethod: 'fallback',
        preliminaryInsights: {
          fallback_reason: 'unrelated_to_mental_health',
        },
      }
    }
    
    // Default general fallback
    logger.info('Using general mental health fallback.')
    return {
      targetAnalyzer: 'general_mental_health',
      confidence: 0.3, // Low confidence for fallback
      routingMethod: 'fallback',
      preliminaryInsights: {
        fallback_reason: 'no_specific_classification',
      },
    }
  }
  
  /**
   * Checks if the text contains any mental health related terms.
   * This is a simple heuristic to determine if the text is likely
   * related to mental health at all.
   * 
   * @param text The input text to check
   * @returns boolean indicating if mental health terms were found
   */
  private containsAnyMentalHealthTerms(text: string): boolean {
    const lowerText = text.toLowerCase()
    
    const mentalHealthTerms = [
      'depress', 'anxiety', 'stress', 'mental', 'health',
      'therapy', 'feel', 'emotion', 'mood', 'sad',
      'happy', 'anger', 'worry', 'fear', 'panic',
      'trauma', 'cope', 'crisis', 'suicid', 'help',
      'mind', 'think', 'thought', 'psych', 'counseling',
      'wellness', 'wellbeing', 'self-care', 'selfcare',
    ]
    
    return mentalHealthTerms.some(term => lowerText.includes(term))
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
