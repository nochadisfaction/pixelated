import type { Scenario } from '@/types/scenarios'

export const clientScenarios: Scenario[] = [
  {
    id: 'resistant_client',
    name: 'Resistant Client',
    description:
      'Client who is resistant to therapy and challenges the process',
    tags: ['resistance', 'skepticism', 'challenge'],
    difficulty: 'intermediate',
    category: 'other',
  },
  {
    id: 'trauma_survivor',
    name: 'Trauma Survivor',
    description:
      'Client dealing with complex trauma requiring careful handling',
    tags: ['trauma', 'ptsd', 'sensitivity'],
    difficulty: 'advanced',
    category: 'trauma',
  },
  {
    id: 'crisis_situation',
    name: 'Crisis Situation',
    description: 'Client in acute distress requiring immediate stabilization',
    tags: ['crisis', 'emergency', 'stabilization'],
    difficulty: 'advanced',
    category: 'other',
  },
  {
    id: 'boundary_testing',
    name: 'Boundary Testing',
    description: 'Client who consistently tests professional boundaries',
    tags: ['boundaries', 'challenge', 'professional'],
    difficulty: 'intermediate',
    category: 'other',
  },
  {
    id: 'depression_management',
    name: 'Depression Management',
    description: 'Client experiencing severe depression and low motivation',
    tags: ['depression', 'mood', 'motivation'],
    difficulty: 'intermediate',
    category: 'depression',
  },
  {
    id: 'anxiety_support',
    name: 'Anxiety Support',
    description: 'Client dealing with generalized anxiety and panic attacks',
    tags: ['anxiety', 'panic', 'stress'],
    difficulty: 'beginner',
    category: 'anxiety',
  },
]
