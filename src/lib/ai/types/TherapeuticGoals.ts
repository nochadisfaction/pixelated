/**
 * Types and interfaces for therapeutic goal setting and tracking
 */

/**
 * Categories of therapeutic goals
 */
export enum GoalCategory {
  EMOTIONAL = 'emotional',
  BEHAVIORAL = 'behavioral',
  COGNITIVE = 'cognitive',
  INTERPERSONAL = 'interpersonal',
  PHYSICAL = 'physical',
  SPIRITUAL = 'spiritual',
}

/**
 * Goal tracking status
 */
export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  ABANDONED = 'abandoned',
}

/**
 * Goal checkpoint/milestone
 */
export interface GoalCheckpoint {
  id: string
  description: string
  isCompleted: boolean
  completedAt?: number
  notes?: string
}

/**
 * Progress snapshot
 */
export interface ProgressSnapshot {
  timestamp: number
  progressPercent: number
  notes: string
}

/**
 * Therapeutic goal
 */
export interface TherapeuticGoal {
  id: string
  title: string
  description: string
  category: GoalCategory
  status: GoalStatus
  createdAt: number
  updatedAt: number
  targetDate?: number
  progress: number // 0-100%
  checkpoints: GoalCheckpoint[]
  progressHistory: ProgressSnapshot[]
  relatedInterventions: string[]
  relevantDistortions?: string[]
  notes?: string
}

/**
 * Goal template
 */
export interface GoalTemplate {
  id: string
  title: string
  description: string
  category: GoalCategory
  suggestedCheckpoints: string[]
  recommendedFor: string[]
  timeframeInDays: number
  difficulty: 'easy' | 'moderate' | 'challenging'
}

/**
 * Predefined goal templates for common therapeutic objectives
 */
export const goalTemplates: GoalTemplate[] = [
  {
    id: 'anxiety-reduction',
    title: 'Reduce Daily Anxiety',
    description:
      'Work on reducing anxiety through mindfulness and cognitive techniques',
    category: GoalCategory.EMOTIONAL,
    suggestedCheckpoints: [
      'Practice deep breathing for 5 minutes daily',
      'Identify 3 anxiety triggers',
      'Learn to recognize physical symptoms of anxiety',
      'Implement one coping strategy for each trigger',
      'Reduce avoidance behaviors by facing one feared situation',
    ],
    recommendedFor: ['anxiety', 'stress', 'panic', 'worry'],
    timeframeInDays: 30,
    difficulty: 'moderate',
  },
  {
    id: 'mood-improvement',
    title: 'Improve Mood and Energy',
    description:
      'Increase positive activities and challenge negative thinking to improve mood',
    category: GoalCategory.EMOTIONAL,
    suggestedCheckpoints: [
      'Schedule one enjoyable activity daily',
      'Track mood patterns for one week',
      'Identify and challenge 3 negative thoughts daily',
      'Increase physical activity by 20 minutes daily',
      'Connect with one supportive person each week',
    ],
    recommendedFor: ['depression', 'low mood', 'fatigue', 'isolation'],
    timeframeInDays: 45,
    difficulty: 'moderate',
  },
  {
    id: 'thought-challenge',
    title: 'Challenge Negative Thinking Patterns',
    description:
      'Identify and modify negative cognitive patterns using CBT techniques',
    category: GoalCategory.COGNITIVE,
    suggestedCheckpoints: [
      'Complete 3 thought records',
      'Identify personal cognitive distortions',
      'Practice reframing 1 negative thought daily',
      'Create alternative responses to automatic thoughts',
      'Apply cognitive challenging in real-time situations',
    ],
    recommendedFor: [
      'negative thinking',
      'cognitive distortions',
      'rumination',
      'self-criticism',
    ],
    timeframeInDays: 28,
    difficulty: 'challenging',
  },
  {
    id: 'stress-management',
    title: 'Develop Stress Management Skills',
    description: 'Build a toolkit of effective stress reduction techniques',
    category: GoalCategory.BEHAVIORAL,
    suggestedCheckpoints: [
      'Learn and practice 3 relaxation techniques',
      'Implement a regular sleep schedule',
      'Set boundaries in one stressful relationship',
      'Create a time management system',
      'Practice saying "no" to non-essential commitments',
    ],
    recommendedFor: ['stress', 'burnout', 'overwhelm', 'work-life balance'],
    timeframeInDays: 35,
    difficulty: 'moderate',
  },
  {
    id: 'assertiveness',
    title: 'Improve Assertive Communication',
    description:
      'Develop confidence in expressing needs and setting boundaries',
    category: GoalCategory.INTERPERSONAL,
    suggestedCheckpoints: [
      'Identify 3 situations requiring assertive responses',
      'Practice "I" statements in minor interactions',
      'Set one boundary with a safe person',
      'Express a need directly to someone close',
      'Handle one difficult conversation using assertive techniques',
    ],
    recommendedFor: [
      'people pleasing',
      'conflict avoidance',
      'relationship issues',
      'boundary issues',
    ],
    timeframeInDays: 42,
    difficulty: 'challenging',
  },
  {
    id: 'mindfulness-practice',
    title: 'Establish Daily Mindfulness Practice',
    description: 'Develop a consistent mindfulness meditation routine',
    category: GoalCategory.BEHAVIORAL,
    suggestedCheckpoints: [
      'Practice 5 minutes of mindfulness daily',
      'Try 3 different meditation techniques',
      'Extend practice to 10 minutes daily',
      'Apply mindfulness to one daily activity',
      'Notice and name emotions throughout the day',
    ],
    recommendedFor: [
      'anxiety',
      'stress',
      'emotional regulation',
      'present-moment awareness',
    ],
    timeframeInDays: 30,
    difficulty: 'moderate',
  },
  {
    id: 'social-connection',
    title: 'Increase Social Connection',
    description: 'Reduce isolation and build meaningful social interactions',
    category: GoalCategory.INTERPERSONAL,
    suggestedCheckpoints: [
      'Reach out to one person weekly',
      'Accept one social invitation',
      'Initiate a conversation with someone new',
      'Share something meaningful in a conversation',
      'Plan and follow through on a social activity',
    ],
    recommendedFor: ['isolation', 'loneliness', 'social anxiety', 'withdrawal'],
    timeframeInDays: 60,
    difficulty: 'challenging',
  },
  {
    id: 'self-compassion',
    title: 'Develop Self-Compassion',
    description:
      'Replace self-criticism with a kinder, more compassionate inner voice',
    category: GoalCategory.EMOTIONAL,
    suggestedCheckpoints: [
      'Notice and name self-critical thoughts',
      'Write a compassionate letter to yourself',
      'Practice self-soothing during difficult moments',
      'Respond to personal failure with kindness',
      'Speak to yourself as you would to a good friend',
    ],
    recommendedFor: [
      'self-criticism',
      'perfectionism',
      'shame',
      'low self-worth',
    ],
    timeframeInDays: 40,
    difficulty: 'challenging',
  },
]

/**
 * Find goal templates suitable for a given issue
 */
export function findRelevantGoalTemplates(issue: string): GoalTemplate[] {
  return goalTemplates.filter((template) =>
    template.recommendedFor.some((rec) =>
      rec.toLowerCase().includes(issue.toLowerCase()),
    ),
  )
}

/**
 * Create a new therapeutic goal from a template
 */
export function createGoalFromTemplate(
  template: GoalTemplate,
  userId: string,
): TherapeuticGoal {
  const now = Date.now()
  const targetDate = template.timeframeInDays
    ? now + template.timeframeInDays * 24 * 60 * 60 * 1000
    : undefined

  return {
    id: `goal_${now}_${userId}`,
    title: template.title,
    description: template.description,
    category: template.category,
    status: GoalStatus.NOT_STARTED,
    createdAt: now,
    updatedAt: now,
    targetDate,
    progress: 0,
    checkpoints: template.suggestedCheckpoints.map((description, index) => ({
      id: `checkpoint_${index}_${now}`,
      description,
      isCompleted: false,
    })),
    progressHistory: [
      {
        timestamp: now,
        progressPercent: 0,
        notes: 'Goal created',
      },
    ],
    relatedInterventions: [],
  }
}
