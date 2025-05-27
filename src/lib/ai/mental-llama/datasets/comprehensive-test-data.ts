/**
 * MentalLLaMA Comprehensive Test Dataset
 *
 * This module provides an expanded set of test cases for evaluating
 * mental health analysis prompts across different categories and scenarios.
 */

import { PromptTestCase } from '../evaluator'

/**
 * Depression test dataset with diverse indicators and severity levels
 */
export function createDepressionTestDataset(): PromptTestCase[] {
  return [
    // Explicit depression indicators
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
      id: 'depression-explicit-2',
      text: "I've been diagnosed with depression for years. The medication helps sometimes, but lately I feel like I'm slipping back into that dark place again.",
      expectedCategory: 'depression',
      expectedConfidence: 0.95,
      expectedEvidence: [
        'diagnosed with depression',
        'dark place',
        'slipping back',
      ],
      labels: ['explicit', 'recurrence', 'medical-history'],
    },

    // Implicit depression indicators
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
      id: 'depression-implicit-2',
      text: "I just don't have the energy anymore. Food has lost its taste, and I've dropped 10 pounds without trying. My friends keep calling, but I don't pick up.",
      expectedCategory: 'depression',
      expectedConfidence: 0.87,
      expectedEvidence: [
        'no energy',
        'food lost taste',
        'weight loss',
        'social withdrawal',
      ],
      labels: ['implicit', 'vegetative-symptoms'],
    },

    // Mixed symptoms
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
      id: 'depression-mixed-2',
      text: "My concentration is shot. I sit down to work and just stare at the screen for hours. I keep thinking about how I've failed at everything important.",
      expectedCategory: 'depression',
      expectedConfidence: 0.8,
      expectedEvidence: [
        'concentration problems',
        'negative self-evaluation',
        'rumination',
      ],
      labels: ['cognitive-symptoms', 'negative-thinking'],
    },

    // Severe cases with suicidal ideation
    {
      id: 'depression-severe-1',
      text: "I feel completely worthless and hopeless. Sometimes I think about just going to sleep and never waking up. What's the point anymore?",
      expectedCategory: 'depression',
      expectedConfidence: 0.9,
      expectedEvidence: ['worthless', 'hopeless', 'passive suicidal ideation'],
      labels: ['severe', 'suicidal-ideation'],
    },

    // Edge cases
    {
      id: 'depression-grief-1',
      text: "Since my mother died last month, I've been so sad. I cry every day and I miss her terribly. I know it's normal, but it hurts so much.",
      expectedCategory: 'depression',
      expectedConfidence: 0.6, // Lower confidence due to grief context
      expectedEvidence: ['sad', 'cry every day'],
      labels: ['grief', 'bereavement', 'situational'],
    },

    // Non-depression cases
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
    {
      id: 'not-depression-3',
      text: "I've been feeling more anxious than usual lately. I worry about everything and find it hard to relax.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.85,
      labels: ['not-depression', 'anxiety'],
    },
  ]
}

/**
 * Anxiety test dataset with diverse presentations
 */
export function createAnxietyTestDataset(): PromptTestCase[] {
  return [
    // Explicit anxiety indicators
    {
      id: 'anxiety-explicit-1',
      text: "My anxiety is through the roof lately. I keep worrying about everything that could go wrong and I can't stop.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.9,
      expectedEvidence: ['anxiety', 'worrying', "can't stop"],
      labels: ['explicit', 'clear-indicators'],
    },
    {
      id: 'anxiety-explicit-2',
      text: "I've been diagnosed with generalized anxiety disorder and panic disorder. My medication helps, but I still have panic attacks regularly.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.95,
      expectedEvidence: [
        'diagnosed with generalized anxiety',
        'panic disorder',
        'panic attacks',
      ],
      labels: ['explicit', 'diagnosis', 'medication'],
    },

    // Physical symptoms
    {
      id: 'anxiety-physical-1',
      text: "My heart races all the time and I feel like I can't breathe. I'm constantly on edge waiting for something bad to happen.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.85,
      expectedEvidence: ['heart races', "can't breathe", 'on edge'],
      labels: ['physical-symptoms', 'anticipatory'],
    },
    {
      id: 'anxiety-physical-2',
      text: "I get these dizzy spells and my hands shake. My stomach is always in knots, and I've developed this nervous tic where I blink repeatedly.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.8,
      expectedEvidence: [
        'dizzy spells',
        'hands shake',
        'stomach in knots',
        'nervous tic',
      ],
      labels: ['physical-symptoms', 'somatic'],
    },

    // Social anxiety
    {
      id: 'anxiety-social-1',
      text: "I dread going to parties or meetings. I'm terrified of saying something stupid, and I can feel everyone judging me all the time.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.85,
      expectedEvidence: ['dread', 'terrified', 'feel everyone judging'],
      labels: ['social-anxiety', 'fear-of-judgment'],
    },

    // Specific phobia
    {
      id: 'anxiety-phobia-1',
      text: "I can't even look at pictures of spiders without having a panic attack. I check under my bed every night and shake out all my clothes.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'panic attack',
        'check under bed',
        'shake out clothes',
      ],
      labels: ['specific-phobia', 'compulsive-behavior'],
    },

    // Panic disorder
    {
      id: 'anxiety-panic-1',
      text: "The panic attacks come out of nowhere. My heart feels like it's going to burst out of my chest, I can't breathe, and I'm convinced I'm dying.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.9,
      expectedEvidence: [
        'panic attacks',
        'heart',
        "can't breathe",
        "convinced I'm dying",
      ],
      labels: ['panic-disorder', 'acute'],
    },

    // Mixed anxiety and depression
    {
      id: 'anxiety-depression-mix-1',
      text: "I worry constantly but also feel empty inside. I'm exhausted all the time from the constant stress but can't sleep at night because my mind won't shut off.",
      expectedCategory: 'anxiety', // Primary category
      expectedConfidence: 0.75, // Lower due to mixed presentation
      expectedEvidence: [
        'worry constantly',
        'constant stress',
        "mind won't shut off",
      ],
      labels: ['mixed', 'comorbid-depression'],
    },

    // Not anxiety
    {
      id: 'not-anxiety-1',
      text: "I'm feeling nervous about my presentation tomorrow, but I've prepared well and I know it will go fine.",
      expectedCategory: 'general_wellness',
      expectedConfidence: 0.75,
      labels: ['not-anxiety', 'normal-nervousness'],
    },
    {
      id: 'not-anxiety-2',
      text: "I've been sad and tearful since the breakup. I miss him terribly and keep wondering what I did wrong.",
      expectedCategory: 'depression',
      expectedConfidence: 0.8,
      labels: ['not-anxiety', 'depression', 'situational'],
    },
  ]
}

/**
 * Stress test dataset with various presentations
 */
export function createStressTestDataset(): PromptTestCase[] {
  return [
    // Work-related stress
    {
      id: 'stress-work-1',
      text: "Work has been overwhelming lately. I have so many deadlines and my boss keeps adding more projects. I've started having headaches and can't sleep well at night.",
      expectedCategory: 'stress',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'overwhelming',
        'deadlines',
        'headaches',
        "can't sleep",
      ],
      labels: ['work-stress', 'physical-symptoms'],
    },
    {
      id: 'stress-work-2',
      text: "I'm constantly checking my work email, even at 3 AM. My performance review is coming up, and I'm terrified I'll be let go in the next round of layoffs.",
      expectedCategory: 'stress',
      expectedConfidence: 0.8,
      expectedEvidence: ['constantly checking', 'terrified', 'layoffs'],
      labels: ['work-stress', 'job-insecurity'],
    },

    // Academic stress
    {
      id: 'stress-academic-1',
      text: "Finals are next week and I'm behind in all my classes. I've been pulling all-nighters but still feel unprepared. My parents will kill me if I fail.",
      expectedCategory: 'stress',
      expectedConfidence: 0.85,
      expectedEvidence: ['finals', 'behind', 'all-nighters', 'unprepared'],
      labels: ['academic-stress', 'performance-anxiety'],
    },

    // Financial stress
    {
      id: 'stress-financial-1',
      text: "I don't know how I'm going to pay rent this month. The bills keep piling up, and I've maxed out all my credit cards. I wake up with my heart racing thinking about money.",
      expectedCategory: 'stress',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'pay rent',
        'bills piling up',
        'maxed out credit cards',
        'heart racing',
      ],
      labels: ['financial-stress', 'physiological-symptoms'],
    },

    // Relationship stress
    {
      id: 'stress-relationship-1',
      text: "My partner and I have been fighting non-stop. I'm walking on eggshells at home and feel tense all the time. I've started drinking more just to cope with the tension.",
      expectedCategory: 'stress',
      expectedConfidence: 0.8,
      expectedEvidence: [
        'fighting',
        'walking on eggshells',
        'tense',
        'drinking more',
      ],
      labels: ['relationship-stress', 'maladaptive-coping'],
    },

    // Caregiver stress
    {
      id: 'stress-caregiver-1',
      text: "Taking care of my father with dementia is exhausting. I never get a break, and I feel guilty when I even think about taking time for myself. I'm always on alert waiting for the next crisis.",
      expectedCategory: 'stress',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'exhausting',
        'never get a break',
        'guilty',
        'always on alert',
      ],
      labels: ['caregiver-stress', 'chronic'],
    },

    // Acute stress
    {
      id: 'stress-acute-1',
      text: "The car accident was two days ago, and I can't stop replaying it in my mind. Every time I hear a car horn, I jump. I'm afraid to drive now.",
      expectedCategory: 'stress',
      expectedConfidence: 0.8,
      expectedEvidence: ["can't stop replaying", 'jump', 'afraid to drive'],
      labels: ['acute-stress', 'traumatic-event'],
    },

    // Chronic stress
    {
      id: 'stress-chronic-1',
      text: "I've been under constant pressure for years. My hair is falling out, I get sick all the time, and I can't remember the last time I felt relaxed or happy.",
      expectedCategory: 'stress',
      expectedConfidence: 0.9,
      expectedEvidence: [
        'constant pressure',
        'hair falling out',
        'get sick',
        "can't remember feeling relaxed",
      ],
      labels: ['chronic-stress', 'physical-manifestations'],
    },

    // Not stress
    {
      id: 'not-stress-1',
      text: "I feel sad most days and don't enjoy things anymore. I sleep too much and have gained weight from emotional eating.",
      expectedCategory: 'depression',
      expectedConfidence: 0.85,
      labels: ['not-stress', 'depression'],
    },
    {
      id: 'not-stress-2',
      text: 'I worry excessively about everything, even small things. I have trouble controlling these worries and feel restless most of the time.',
      expectedCategory: 'anxiety',
      expectedConfidence: 0.85,
      labels: ['not-stress', 'anxiety'],
    },
  ]
}

/**
 * PTSD test dataset with various trauma types
 */
export function createPTSDTestDataset(): PromptTestCase[] {
  return [
    // Combat-related PTSD
    {
      id: 'ptsd-combat-1',
      text: "Ever since I returned from deployment, I can't sleep without nightmares. Loud noises make me hit the ground. I'm always scanning for threats and can't relax even at home.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.9,
      expectedEvidence: [
        'nightmares',
        'loud noises',
        'hit the ground',
        'scanning for threats',
      ],
      labels: ['combat-ptsd', 'hypervigilance'],
    },

    // Accident-related PTSD
    {
      id: 'ptsd-accident-1',
      text: "After the car crash, I have flashbacks of the impact whenever I get in a vehicle. My heart races, and sometimes I feel like I'm back in that moment again. I avoid driving at all costs now.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.85,
      expectedEvidence: [
        'flashbacks',
        'heart races',
        'back in that moment',
        'avoid driving',
      ],
      labels: ['accident-ptsd', 'avoidance'],
    },

    // Assault-related PTSD
    {
      id: 'ptsd-assault-1',
      text: "Since the attack, I can't stand being touched. I have panic attacks when someone gets too close, especially men. I keep having intrusive memories of his face.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.9,
      expectedEvidence: [
        "can't stand being touched",
        'panic attacks',
        'intrusive memories',
      ],
      labels: ['assault-ptsd', 'intrusions'],
    },

    // Natural disaster PTSD
    {
      id: 'ptsd-disaster-1',
      text: "The hurricane was five years ago, but I still can't handle rain or wind. When the weather gets bad, I feel trapped and terrified like I did when our house flooded. I check the weather forecast compulsively.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.85,
      expectedEvidence: [
        "can't handle rain",
        'trapped',
        'terrified',
        'check weather compulsively',
      ],
      labels: ['disaster-ptsd', 'triggers'],
    },

    // Complex PTSD (childhood)
    {
      id: 'ptsd-complex-1',
      text: "I grew up never knowing when my father would explode in rage. Now I flinch at loud voices and can't trust anyone. I feel damaged inside and have trouble controlling my emotions.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.8,
      expectedEvidence: [
        'flinch',
        "can't trust",
        'damaged inside',
        'trouble controlling emotions',
      ],
      labels: ['complex-ptsd', 'childhood-trauma'],
    },

    // Medical trauma
    {
      id: 'ptsd-medical-1',
      text: 'After being on a ventilator in the ICU, I have terrible nightmares about suffocating. I panic during medical procedures and avoid hospitals even when I need care.',
      expectedCategory: 'ptsd',
      expectedConfidence: 0.8,
      expectedEvidence: [
        'nightmares about suffocating',
        'panic during medical procedures',
        'avoid hospitals',
      ],
      labels: ['medical-ptsd', 'avoidance'],
    },

    // Work-related trauma (first responders)
    {
      id: 'ptsd-work-1',
      text: "As a firefighter, I've seen too many people we couldn't save. I keep seeing their faces when I try to sleep. I've started drinking just to get through the night without those images.",
      expectedCategory: 'ptsd',
      expectedConfidence: 0.85,
      expectedEvidence: ['keep seeing their faces', 'drinking', 'images'],
      labels: ['occupational-ptsd', 'substance-use'],
    },

    // Not PTSD
    {
      id: 'not-ptsd-1',
      text: "I'm still grieving my mother's death. I miss her terribly and sometimes feel like I see her in a crowd, but then realize it's not her.",
      expectedCategory: 'general_wellness',
      expectedConfidence: 0.7,
      labels: ['not-ptsd', 'grief'],
    },
    {
      id: 'not-ptsd-2',
      text: "I worry about getting into an accident when driving, but I still drive regularly. I'm just extra careful on the highway.",
      expectedCategory: 'anxiety',
      expectedConfidence: 0.7,
      labels: ['not-ptsd', 'normal-anxiety'],
    },
  ]
}

/**
 * Suicidal ideation test dataset with various risk levels
 */
export function createSuicidalIdeationTestDataset(): PromptTestCase[] {
  return [
    // Passive ideation
    {
      id: 'suicidal-passive-1',
      text: "I don't think I can go on anymore. Sometimes I wish I could just go to sleep and never wake up.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.8,
      expectedEvidence: [
        "don't think I can go on",
        'go to sleep and never wake up',
      ],
      labels: ['passive-ideation', 'indirect-expression'],
    },
    {
      id: 'suicidal-passive-2',
      text: 'Life feels pointless and empty. I keep wondering if everyone would be better off without me around.',
      expectedCategory: 'suicidal',
      expectedConfidence: 0.75,
      expectedEvidence: ['pointless', 'empty', 'better off without me'],
      labels: ['passive-ideation', 'burden-perception'],
    },

    // Active ideation
    {
      id: 'suicidal-active-1',
      text: "I don't think I can go on anymore. Everyone would be better off without me. I've been thinking about how to end it all.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.95,
      expectedEvidence: ["can't go on", 'better off without me', 'end it all'],
      labels: ['active-ideation', 'clear-indicators'],
    },
    {
      id: 'suicidal-active-2',
      text: "I've been researching methods online. I think I've found one that would be quick and painless. I'm tired of fighting every day.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.95,
      expectedEvidence: [
        'researching methods',
        'quick and painless',
        'tired of fighting',
      ],
      labels: ['active-ideation', 'planning'],
    },

    // With specific plan
    {
      id: 'suicidal-plan-1',
      text: "I've collected enough pills to do it. I've written letters to my family explaining why. Friday night when everyone is out seems like the right time.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.98,
      expectedEvidence: [
        'collected enough pills',
        'written letters',
        'Friday night',
      ],
      labels: ['specific-plan', 'imminent-risk'],
    },

    // With previous attempt
    {
      id: 'suicidal-attempt-1',
      text: "The last time I tried, they found me before it was too late. This time I won't make the same mistake. I can't fail again.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.98,
      expectedEvidence: [
        'last time I tried',
        "won't make the same mistake",
        "can't fail again",
      ],
      labels: ['previous-attempt', 'imminent-risk'],
    },

    // Ambivalent
    {
      id: 'suicidal-ambivalent-1',
      text: "Part of me wants to end it all, but another part is scared. I don't know if I really want to die or just want the pain to stop.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.85,
      expectedEvidence: ['end it all', 'scared', 'want the pain to stop'],
      labels: ['ambivalent', 'emotional-pain'],
    },

    // Coded/indirect language
    {
      id: 'suicidal-coded-1',
      text: "I've found the permanent solution to my temporary problems. Soon I won't be a burden to anyone. This is my final message.",
      expectedCategory: 'suicidal',
      expectedConfidence: 0.9,
      expectedEvidence: [
        'permanent solution',
        "won't be a burden",
        'final message',
      ],
      labels: ['coded-language', 'high-risk'],
    },

    // Not suicidal
    {
      id: 'not-suicidal-1',
      text: 'I feel so depressed and hopeless. Nothing brings me joy anymore, and I just want to stay in bed all day.',
      expectedCategory: 'depression',
      expectedConfidence: 0.85,
      labels: ['not-suicidal', 'depression'],
    },
    {
      id: 'not-suicidal-2',
      text: "Sometimes I wonder what's the point of all this suffering, but I know I would never hurt myself because of my kids.",
      expectedCategory: 'depression',
      expectedConfidence: 0.7,
      labels: ['not-suicidal', 'protective-factors'],
    },
  ]
}

/**
 * Create a comprehensive test dataset by combining all categories
 */
export function createComprehensiveTestDataset(): PromptTestCase[] {
  return [
    ...createDepressionTestDataset(),
    ...createAnxietyTestDataset(),
    ...createStressTestDataset(),
    ...createPTSDTestDataset(),
    ...createSuicidalIdeationTestDataset(),
    // Add more specialized test sets as they become available
  ]
}

/**
 * Get a filtered test dataset based on specified criteria
 */
export function getFilteredTestDataset(options: {
  categories?: string[]
  labels?: string[]
  confidenceMin?: number
  confidenceMax?: number
  limit?: number
}): PromptTestCase[] {
  const fullDataset = createComprehensiveTestDataset()

  // Apply filters
  let filteredDataset = fullDataset

  // Filter by category
  if (options.categories && options.categories.length > 0) {
    filteredDataset = filteredDataset.filter((test) =>
      options.categories!.includes(test.expectedCategory),
    )
  }

  // Filter by labels
  if (options.labels && options.labels.length > 0) {
    filteredDataset = filteredDataset.filter(
      (test) =>
        test.labels &&
        options.labels!.some((label) => test.labels!.includes(label)),
    )
  }

  // Filter by confidence
  if (options.confidenceMin !== undefined) {
    filteredDataset = filteredDataset.filter(
      (test) =>
        test.expectedConfidence === undefined ||
        test.expectedConfidence >= options.confidenceMin!,
    )
  }

  if (options.confidenceMax !== undefined) {
    filteredDataset = filteredDataset.filter(
      (test) =>
        test.expectedConfidence === undefined ||
        test.expectedConfidence <= options.confidenceMax!,
    )
  }

  // Apply limit
  if (options.limit !== undefined && options.limit > 0) {
    filteredDataset = filteredDataset.slice(0, options.limit)
  }

  return filteredDataset
}

export default {
  createDepressionTestDataset,
  createAnxietyTestDataset,
  createStressTestDataset,
  createPTSDTestDataset,
  createSuicidalIdeationTestDataset,
  createComprehensiveTestDataset,
  getFilteredTestDataset,
}
