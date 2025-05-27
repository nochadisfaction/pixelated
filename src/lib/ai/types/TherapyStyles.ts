/**
 * This module defines therapy style types and configurations used for the
 * mental health chat component's style selection functionality.
 */

/**
 * Identifiers for different therapy styles.
 */
export type TherapyStyleId =
  | 'cbt'
  | 'psychodynamic'
  | 'humanistic'
  | 'dbt'
  | 'act'
  | 'motivational'
  | 'solution_focused'
  | 'mindfulness'
  | 'emotionally_focused'
  | 'narrative'

/**
 * Structure for a therapy style configuration
 */
export interface TherapyStyle {
  id: TherapyStyleId
  name: string
  description: string
  techniquesUsed: string[]
  recommendedFor: string[]
}

/**
 * Map of all available therapy style configurations
 */
export const therapyStyleConfigs: Record<TherapyStyleId, TherapyStyle> = {
  cbt: {
    id: 'cbt',
    name: 'Cognitive Behavioral Therapy',
    description:
      'Focuses on identifying and changing negative thought patterns and behaviors that contribute to emotional difficulties.',
    techniquesUsed: [
      'Cognitive restructuring',
      'Behavioral experiments',
      'Thought records',
      'Problem-solving techniques',
    ],
    recommendedFor: [
      'Anxiety disorders',
      'Depression',
      'Phobias',
      'OCD',
      'PTSD',
      'Eating disorders',
    ],
  },

  psychodynamic: {
    id: 'psychodynamic',
    name: 'Psychodynamic Therapy',
    description:
      'Explores how past experiences and unconscious processes influence current behavior and relationships.',
    techniquesUsed: [
      'Free association',
      'Dream analysis',
      'Transference work',
      'Identifying defense mechanisms',
    ],
    recommendedFor: [
      'Complex emotional issues',
      'Relationship problems',
      'Self-exploration',
      'Identity issues',
      'Recurring life patterns',
    ],
  },

  humanistic: {
    id: 'humanistic',
    name: 'Humanistic Therapy',
    description:
      "Person-centered approach that emphasizes self-growth, authenticity, and reaching one's full potential.",
    techniquesUsed: [
      'Unconditional positive regard',
      'Empathic understanding',
      'Authentic therapist presence',
      'Present-centered awareness',
    ],
    recommendedFor: [
      'Self-esteem issues',
      'Personal growth',
      'Life transitions',
      'Existential concerns',
      'Self-actualization',
    ],
  },

  dbt: {
    id: 'dbt',
    name: 'Dialectical Behavior Therapy',
    description:
      'Combines CBT techniques with mindfulness strategies to help regulate emotions and improve interpersonal effectiveness.',
    techniquesUsed: [
      'Mindfulness skills',
      'Distress tolerance',
      'Emotion regulation',
      'Interpersonal effectiveness',
    ],
    recommendedFor: [
      'Borderline personality disorder',
      'Emotional dysregulation',
      'Self-harm behaviors',
      'Suicidal thoughts',
      'Impulsivity',
    ],
  },

  act: {
    id: 'act',
    name: 'Acceptance and Commitment Therapy',
    description:
      'Focuses on accepting difficult thoughts and feelings while committing to actions aligned with personal values.',
    techniquesUsed: [
      'Cognitive defusion',
      'Mindfulness practices',
      'Values clarification',
      'Committed action',
    ],
    recommendedFor: [
      'Anxiety',
      'Depression',
      'Chronic pain',
      'Work stress',
      'Existential concerns',
    ],
  },

  motivational: {
    id: 'motivational',
    name: 'Motivational Interviewing',
    description:
      'Collaborative conversation style that strengthens motivation and commitment to change.',
    techniquesUsed: [
      'Expressing empathy',
      'Developing discrepancy',
      'Rolling with resistance',
      'Supporting self-efficacy',
    ],
    recommendedFor: [
      'Addiction issues',
      'Health behavior changes',
      'Ambivalence about change',
      'Motivation difficulties',
      'Goal setting',
    ],
  },

  solution_focused: {
    id: 'solution_focused',
    name: 'Solution-Focused Brief Therapy',
    description:
      'Goal-oriented approach focusing on solutions rather than problems, emphasizing strengths and future orientation.',
    techniquesUsed: [
      'Miracle question',
      'Exception finding',
      'Scaling questions',
      'Future-oriented questions',
    ],
    recommendedFor: [
      'Specific goals or problems',
      'Time-limited therapy',
      'Performance enhancement',
      'Family conflicts',
      'Child behavioral issues',
    ],
  },

  mindfulness: {
    id: 'mindfulness',
    name: 'Mindfulness-Based Therapy',
    description:
      'Integrates mindfulness practices to develop awareness and acceptance of present moment experiences.',
    techniquesUsed: [
      'Meditation practices',
      'Body scan exercises',
      'Breathing techniques',
      'Present-moment awareness',
    ],
    recommendedFor: [
      'Stress reduction',
      'Anxiety',
      'Chronic pain',
      'Depression relapse prevention',
      'Rumination',
    ],
  },

  emotionally_focused: {
    id: 'emotionally_focused',
    name: 'Emotionally Focused Therapy',
    description:
      'Focuses on strengthening emotional bonds and creating secure attachment patterns, particularly in relationships.',
    techniquesUsed: [
      'Identifying attachment patterns',
      'Processing primary emotions',
      'Creating new emotional experiences',
      'Restructuring interactions',
    ],
    recommendedFor: [
      'Relationship issues',
      'Couples therapy',
      'Family conflicts',
      'Attachment insecurity',
      'Emotional disconnection',
    ],
  },

  narrative: {
    id: 'narrative',
    name: 'Narrative Therapy',
    description:
      'Explores how personal narratives shape identity and helps rewrite limiting stories to create empowering alternatives.',
    techniquesUsed: [
      'Externalizing problems',
      'Identifying unique outcomes',
      'Re-authoring lives',
      'Mapping the influence of problems',
    ],
    recommendedFor: [
      'Identity issues',
      'Trauma recovery',
      'Cultural challenges',
      'Life transitions',
      'Self-esteem issues',
    ],
  },
}

/**
 * Get a single therapy style by ID
 */
export function getTherapyStyle(styleId: TherapyStyleId): TherapyStyle {
  return therapyStyleConfigs[styleId]
}

/**
 * Get default therapy style
 */
export function getDefaultTherapyStyle(): TherapyStyle {
  return therapyStyleConfigs.cbt
}

/**
 * Get recommended therapy styles based on a user's presenting issue
 */
export function getRecommendedStyles(issue: string): TherapyStyle[] {
  const lowerIssue = issue.toLowerCase()
  const matches: TherapyStyle[] = []

  // Map common issues to therapy styles
  const issueMap: Record<string, TherapyStyleId[]> = {
    'anxiety': ['cbt', 'mindfulness', 'act'],
    'depression': ['cbt', 'psychodynamic', 'act'],
    'trauma': ['psychodynamic', 'narrative', 'act'],
    'relationship': ['emotionally_focused', 'psychodynamic', 'humanistic'],
    'grief': ['humanistic', 'narrative', 'psychodynamic'],
    'addiction': ['motivational', 'mindfulness', 'cbt'],
    'self-esteem': ['humanistic', 'cbt', 'narrative'],
    'stress': ['mindfulness', 'cbt', 'solution_focused'],
    'anger': ['cbt', 'dbt', 'act'],
    'family': ['emotionally_focused', 'solution_focused', 'narrative'],
    'overwhelm': ['mindfulness', 'dbt', 'solution_focused'],
    'emotion': ['dbt', 'emotionally_focused', 'mindfulness'],
    'motivation': ['motivational', 'solution_focused', 'cbt'],
    'career': ['solution_focused', 'act', 'humanistic'],
    'parenting': ['solution_focused', 'humanistic', 'cbt'],
    'identity': ['narrative', 'humanistic', 'psychodynamic'],
    'purpose': ['humanistic', 'act', 'narrative'],
    'conflict': ['emotionally_focused', 'dbt', 'solution_focused'],
    'change': ['motivational', 'solution_focused', 'act'],
    'decision': ['solution_focused', 'act', 'cbt'],
  }

  // Check if the issue contains any keywords and add corresponding styles
  Object.entries(issueMap).forEach(([keyword, styleIds]) => {
    if (lowerIssue.includes(keyword)) {
      styleIds.forEach((styleId) => {
        const style = therapyStyleConfigs[styleId]
        if (!matches.includes(style)) {
          matches.push(style)
        }
      })
    }
  })

  // If no specific matches, return the three most generally applicable approaches
  if (matches.length === 0) {
    return [
      therapyStyleConfigs.cbt,
      therapyStyleConfigs.solution_focused,
      therapyStyleConfigs.humanistic,
    ]
  }

  return matches
}
