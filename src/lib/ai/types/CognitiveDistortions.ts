/**
 * Types and interfaces for cognitive distortion detection
 */

/**
 * Types of cognitive distortions
 */
export enum CognitiveDistortionType {
  CATASTROPHIZING = 'catastrophizing',
  BLACK_AND_WHITE = 'black_and_white',
  OVERGENERALIZATION = 'overgeneralization',
  MIND_READING = 'mind_reading',
  EMOTIONAL_REASONING = 'emotional_reasoning',
  PERSONALIZATION = 'personalization',
  FILTERING = 'filtering',
  SHOULD_STATEMENTS = 'should_statements',
  LABELING = 'labeling',
  FORTUNE_TELLING = 'fortune_telling',
  MAGNIFICATION = 'magnification',
  MINIMIZATION = 'minimization',
  DISQUALIFYING_POSITIVE = 'disqualifying_positive',
  JUMPING_TO_CONCLUSIONS = 'jumping_to_conclusions',
}

/**
 * Configuration for a cognitive distortion
 */
export interface CognitiveDistortionConfig {
  type: CognitiveDistortionType
  name: string
  description: string
  examples: string[]
  patterns: RegExp[]
  challengingQuestions: string[]
}

/**
 * Detected cognitive distortion in text
 */
export interface CognitiveDistortion {
  type: CognitiveDistortionType
  evidence: string
  confidence: number
  alternativeThought?: string
}

/**
 * Cognitive distortion detection result
 */
export interface CognitiveDistortionResult {
  distortions: CognitiveDistortion[]
  overallNegativeThinking: number // 0-1 scale
  summary: string
  timestamp: number
}

/**
 * Predefined cognitive distortion configurations
 */
export const cognitiveDistortionConfigs: Record<
  CognitiveDistortionType,
  CognitiveDistortionConfig
> = {
  [CognitiveDistortionType.CATASTROPHIZING]: {
    type: CognitiveDistortionType.CATASTROPHIZING,
    name: 'Catastrophizing',
    description:
      'Expecting the worst possible outcome without considering other more likely possibilities.',
    examples: [
      'If I fail this test, my whole career is ruined.',
      'This headache must mean I have a brain tumor.',
      "If I make a mistake in this presentation, everyone will think I'm incompetent.",
    ],
    patterns: [
      /\bworst\b.+\bscenario\b/i,
      /what if .+\bhappen\b/i,
      /\beverything\b.+\bfall apart\b/i,
      /\bdisaster\b/i,
      /\bcatastrophe\b/i,
      /\bcan't handle\b/i,
      /\bterrible\b.+\bhappen\b/i,
    ],
    challengingQuestions: [
      "What's the evidence that this outcome will actually happen?",
      "What's the most likely outcome in this situation?",
      'Even if the worst happens, could you cope with it?',
      'Has this happened before? What was the actual outcome?',
    ],
  },
  [CognitiveDistortionType.BLACK_AND_WHITE]: {
    type: CognitiveDistortionType.BLACK_AND_WHITE,
    name: 'Black and White Thinking',
    description:
      'Seeing situations in absolute, all-or-nothing terms, without acknowledging the middle ground.',
    examples: [
      "If I'm not perfect, I'm a failure.",
      'Either I do this perfectly or not at all.',
      "She was late, so she obviously doesn't respect me.",
    ],
    patterns: [
      /\beither\b.+\bor\b/i,
      /\bperfect\b/i,
      /\balways\b/i,
      /\bnever\b/i,
      /\bcompletely\b/i,
      /\btotally\b/i,
      /\babsolutely\b/i,
      /\bnothing\b/i,
      /\bworthless\b/i,
    ],
    challengingQuestions: [
      'Are there any shades of gray in this situation?',
      'Is there a middle ground between these two extremes?',
      'Can you think of exceptions to this rule?',
      'Is it possible for something to be partially successful?',
    ],
  },
  [CognitiveDistortionType.OVERGENERALIZATION]: {
    type: CognitiveDistortionType.OVERGENERALIZATION,
    name: 'Overgeneralization',
    description:
      'Applying one experience to all future situations or making broad conclusions based on a single event.',
    examples: [
      "I got rejected for one job, so I'll never find employment.",
      "She didn't call me back, just like everyone always abandons me.",
      "I failed once, so I'll always fail at this.",
    ],
    patterns: [
      /\beveryone\b/i,
      /\beverything\b/i,
      /\balways\b/i,
      /\bnever\b/i,
      /\bevery time\b/i,
      /\bnobody\b/i,
      /\ball of them\b/i,
      /\bjust like last time\b/i,
    ],
    challengingQuestions: [
      "Has there ever been a time when this wasn't true?",
      'Are you basing this conclusion on just one or two experiences?',
      'What evidence contradicts this generalization?',
      'How many times has this actually happened versus succeeded?',
    ],
  },
  [CognitiveDistortionType.MIND_READING]: {
    type: CognitiveDistortionType.MIND_READING,
    name: 'Mind Reading',
    description:
      'Assuming you know what others are thinking or why they act the way they do.',
    examples: [
      "I know he thinks I'm incompetent.",
      "She didn't smile at me because she doesn't like me.",
      "They're only being nice because they feel sorry for me.",
    ],
    patterns: [
      /they (think|thought|believe|believed|feel|felt)/i,
      /he (thinks|thought|believes|believed|feels|felt)/i,
      /she (thinks|thought|believes|believed|feels|felt)/i,
      /\bthinking\b.+\babout me\b/i,
      /\bknow\b.+\bwhat\b.+\bthinking\b/i,
      /\bmust be\b.+\bthinking\b/i,
      /\bdoesn't like\b/i,
      /\bhates\b/i,
    ],
    challengingQuestions: [
      'How do I know this for certain without asking them?',
      'Is there any other possible explanation for their behavior?',
      'Have I verified this assumption by actually asking them?',
      'Am I jumping to conclusions based on my own insecurities?',
    ],
  },
  [CognitiveDistortionType.EMOTIONAL_REASONING]: {
    type: CognitiveDistortionType.EMOTIONAL_REASONING,
    name: 'Emotional Reasoning',
    description:
      'Taking your emotions as evidence of the truth. "I feel it, therefore it must be true."',
    examples: [
      'I feel like a failure, so I must be one.',
      'I feel anxious, so there must be real danger.',
      'I feel inadequate, so I must be incompetent.',
    ],
    patterns: [
      /\bfeel\b.+\btherefore\b/i,
      /\bfeel\b.+\bso i must\b/i,
      /\bbecause i feel\b/i,
      /\bfeel\b.+\bmeans\b/i,
      /\bfeel\b.+\bproves\b/i,
      /\bi feel\b.+\bam\b/i,
    ],
    challengingQuestions: [
      "Just because I feel this way, does it necessarily mean it's true?",
      'What facts or evidence support or contradict my feeling?',
      'If someone else felt this way in the same situation, what would I tell them?',
      'How might my emotional state be influencing my perception right now?',
    ],
  },
  [CognitiveDistortionType.PERSONALIZATION]: {
    type: CognitiveDistortionType.PERSONALIZATION,
    name: 'Personalization',
    description:
      "Taking excessive responsibility for external events or believing others' actions are specifically directed at you.",
    examples: [
      "My child failed the test because I didn't help them study enough.",
      "The meeting didn't go well because of my presentation.",
      "They canceled the event because they didn't want me there.",
    ],
    patterns: [
      /\bmy fault\b/i,
      /\bblame\b.+\bmyself\b/i,
      /\bbecause of me\b/i,
      /\bbecause i\b/i,
      /\bresponsible for\b/i,
      /\bif i had\b.+\bwouldn't have\b/i,
      /\bshould have\b.+\bprevented\b/i,
    ],
    challengingQuestions: [
      "Am I taking responsibility for something I don't have complete control over?",
      'What other factors might have contributed to this outcome?',
      'Would I hold someone else responsible in the same situation?',
      'Is there any evidence this was specifically directed at me?',
    ],
  },
  [CognitiveDistortionType.FILTERING]: {
    type: CognitiveDistortionType.FILTERING,
    name: 'Mental Filtering',
    description:
      'Focusing exclusively on negative aspects while ignoring positive ones.',
    examples: [
      'I got feedback on my report, but all I can think about is the one criticism.',
      'The evening was ruined because of that one awkward moment.',
      'Why focus on my accomplishments when I have this one failure?',
    ],
    patterns: [
      /\bfocus on\b.+\bnegative\b/i,
      /\bonly remember\b.+\bbad\b/i,
      /\bcan't get over\b/i,
      /\bruined by\b/i,
      /\bdespite\b.+\bstill feel\b/i,
      /\byes but\b/i,
    ],
    challengingQuestions: [
      'What positive aspects am I ignoring in this situation?',
      'Am I giving equal weight to both positive and negative information?',
      'If I look at the complete picture, how would my perspective change?',
      'What would be a more balanced view of this situation?',
    ],
  },
  [CognitiveDistortionType.SHOULD_STATEMENTS]: {
    type: CognitiveDistortionType.SHOULD_STATEMENTS,
    name: 'Should Statements',
    description:
      'Holding rigid rules about how you and others "should," "must," or "ought to" behave.',
    examples: [
      'I should be able to handle this without getting anxious.',
      'She should know better than to act like that.',
      'I must always be productive.',
    ],
    patterns: [
      /\bshould\b/i,
      /\bmust\b/i,
      /\bought to\b/i,
      /\bhave to\b/i,
      /\bsupposed to\b/i,
      /\bneed to\b.+\balways\b/i,
      /\bexpected to\b/i,
    ],
    challengingQuestions: [
      'Is this expectation realistic or achievable?',
      'What would happen if I replaced "should" with "it would be nice if"?',
      'Am I holding myself to an impossible standard?',
      'Where did this rule come from, and is it helpful for me?',
    ],
  },
  [CognitiveDistortionType.LABELING]: {
    type: CognitiveDistortionType.LABELING,
    name: 'Labeling',
    description:
      'Attaching a negative label to yourself or others instead of describing specific behaviors.',
    examples: ["I'm such a loser.", "He's a complete jerk.", "I'm a failure."],
    patterns: [
      /\bI am a\b.+\bfailure\b/i,
      /\bI'm a\b.+\bloser\b/i,
      /\bI'm\b.+\bstupid\b/i,
      /\bjerk\b/i,
      /\bidiot\b/i,
      /\bworthless\b/i,
      /\bhopeless\b/i,
      /\bpathetic\b/i,
      /\bwrong with\b.+\bme\b/i,
    ],
    challengingQuestions: [
      'Would you use this label for someone else in the same situation?',
      'What specific behaviors are you referring to instead of this global label?',
      'Does a single action or characteristic define your entire self?',
      'How might you describe this more accurately and specifically?',
    ],
  },
  [CognitiveDistortionType.FORTUNE_TELLING]: {
    type: CognitiveDistortionType.FORTUNE_TELLING,
    name: 'Fortune Telling',
    description:
      'Predicting the future negatively without considering other possible outcomes.',
    examples: [
      "I'll definitely blow the interview.",
      'This relationship will end badly like all my others.',
      "I'll never be successful.",
    ],
    patterns: [
      /\bwill never\b/i,
      /\bwon't ever\b/i,
      /\bdefinitely will\b/i,
      /\bbound to\b/i,
      /\bgoing to fail\b/i,
      /\bwon't work out\b/i,
      /\bi know\b.+\bwill happen\b/i,
    ],
    challengingQuestions: [
      'How can I be certain this will happen?',
      'What evidence do I have to predict this outcome?',
      "What are other possible outcomes I'm not considering?",
      'How many times have I correctly predicted the future before?',
    ],
  },
  [CognitiveDistortionType.MAGNIFICATION]: {
    type: CognitiveDistortionType.MAGNIFICATION,
    name: 'Magnification',
    description: 'Exaggerating the importance of negative events or qualities.',
    examples: [
      'This mistake will destroy my reputation forever.',
      'This is the most embarrassing thing that could ever happen.',
      'This setback is devastating to my goals.',
    ],
    patterns: [
      /\bhuge\b/i,
      /\bmassive\b/i,
      /\benormous\b/i,
      /\bcritical\b/i,
      /\bdevastating\b/i,
      /\bexcruciating\b/i,
      /\bunbearable\b/i,
      /\bimpossible\b/i,
    ],
    challengingQuestions: [
      'On a scale of 1-10, how significant is this really?',
      'Will this matter in a week? A month? A year?',
      'Am I using extreme language to describe this situation?',
      'What would be a more balanced perspective on the importance of this?',
    ],
  },
  [CognitiveDistortionType.MINIMIZATION]: {
    type: CognitiveDistortionType.MINIMIZATION,
    name: 'Minimization',
    description:
      'Downplaying the importance of positive events or personal strengths.',
    examples: [
      "That compliment doesn't count because they were just being nice.",
      'My success on that project was just luck.',
      'Anyone could have done what I did.',
    ],
    patterns: [
      /\bjust got lucky\b/i,
      /\banyone could\b/i,
      /\bno big deal\b/i,
      /\bdoesn't count\b/i,
      /\bjust being nice\b/i,
      /\bnot that important\b/i,
      /\bit was easy\b/i,
    ],
    challengingQuestions: [
      "Would I minimize someone else's achievement the same way?",
      'What would it mean if I fully acknowledged this positive aspect?',
      'Am I giving as much weight to positives as I do to negatives?',
      "What would a friend say about how I'm viewing this accomplishment?",
    ],
  },
  [CognitiveDistortionType.DISQUALIFYING_POSITIVE]: {
    type: CognitiveDistortionType.DISQUALIFYING_POSITIVE,
    name: 'Disqualifying the Positive',
    description:
      'Rejecting positive experiences by insisting they "don\'t count" for some reason.',
    examples: [
      'That person only said they liked my work because they feel sorry for me.',
      'I only did well because the task was easy.',
      "They're only being nice because they want something from me.",
    ],
    patterns: [
      /\bdon't count\b/i,
      /\bonly because\b/i,
      /\bjust being polite\b/i,
      /\bjust saying that\b/i,
      /\bthat doesn't prove\b/i,
      /\bfeel obligated\b/i,
      /\bthat's not real\b/i,
    ],
    challengingQuestions: [
      'Am I discounting evidence that contradicts my negative self-view?',
      'Is there any reason to believe this positive experience is valid?',
      'What would it mean if I accepted this positive feedback?',
      "Would I dismiss someone else's positive experience this way?",
    ],
  },
  [CognitiveDistortionType.JUMPING_TO_CONCLUSIONS]: {
    type: CognitiveDistortionType.JUMPING_TO_CONCLUSIONS,
    name: 'Jumping to Conclusions',
    description:
      'Making a negative interpretation even though there are no definite facts to support the conclusion.',
    examples: [
      "My friend didn't call me back, so she must be angry with me.",
      'He glanced at his watch, so he must be bored with our conversation.',
      "They haven't responded to my email yet, so they must not be interested.",
    ],
    patterns: [
      /\bmust mean\b/i,
      /\bobviously\b/i,
      /\bclearly\b/i,
      /\bno doubt\b/i,
      /\bcan only mean\b/i,
      /\bdidn't\b.+\bso\b/i,
      /\bassuming\b/i,
    ],
    challengingQuestions: [
      'What facts do I actually have to support this conclusion?',
      'What are some alternative explanations for what happened?',
      'Am I confusing a thought with a fact?',
      'What would I need to know to be certain about this interpretation?',
    ],
  },
}

/**
 * Get a cognitive distortion configuration by type
 */
export function getDistortionConfig(
  type: CognitiveDistortionType,
): CognitiveDistortionConfig {
  return cognitiveDistortionConfigs[type]
}

// Example PHI audit logging - uncomment and customize as needed
// logger.info('Accessing PHI data', {
//   userId: 'user-id-here',
//   action: 'read',
//   dataType: 'patient-record',
//   recordId: 'record-id-here'
// });
