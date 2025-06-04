import type { MentalHealthAnalysis } from '../types'

export const mockMentalHealthAnalysis: MentalHealthAnalysis = {
  emotionalState:
    'Client presents with moderate anxiety and intermittent low mood, expressing uncertainty about the future and rumination about past events. Affect is congruent with reported mood but with appropriate range and reactivity.',

  cognitivePatternsIdentified: [
    'Catastrophizing in relation to career uncertainties',
    'Overgeneralization from past negative experiences',
    'Black-and-white thinking regarding interpersonal relationships',
    'Self-critical internal dialogue',
  ],

  therapeuticRecommendations: [
    'Cognitive restructuring focused on career-related thoughts',
    'Behavioral activation to counter avoidance patterns',
    'Mindfulness practices to reduce rumination',
    'Self-compassion exercises to address self-criticism',
  ],

  riskFactors: [
    'Social isolation tendencies',
    'Disrupted sleep patterns',
    'Occasional passive suicidal ideation without intent or plan',
  ],

  strengths: [
    'Strong problem-solving abilities',
    'Willingness to engage in therapeutic process',
    'Supportive family relationships',
    'History of resilience in overcoming past challenges',
  ],

  primaryConcerns: [
    'Career uncertainty',
    'Perfectionism affecting work performance',
    'Difficulty maintaining social connections',
  ],

  copingMechanisms: [
    'Regular physical exercise',
    'Journaling when anxious',
    'Occasional avoidance through media consumption',
  ],

  behavioralObservations: [
    'Maintains good eye contact during conversation',
    'Fidgeting observed when discussing work-related topics',
    'Speech rate increases when describing anxious thoughts',
  ],

  sessionProgress:
    'Initial rapport established. Client showed openness to cognitive-behavioral approach and identified initial goals.',

  treatmentGoals: [
    'Develop more balanced thinking patterns about career prospects',
    'Establish consistent sleep hygiene routine',
    'Increase social engagement through structured activities',
  ],

  assessmentTimestamp: new Date().toISOString(),

  confidenceScore: 0.87,
}

export const mockLowSeverityAnalysis: MentalHealthAnalysis = {
  ...mockMentalHealthAnalysis,
  emotionalState:
    'Client presents with mild situational anxiety related to specific work project deadlines. Overall mood is stable with appropriate range of affect.',
  riskFactors: ['Temporary increase in work-related stress'],
  cognitivePatternsIdentified: [
    'Occasional perfectionism regarding work output',
    'Some anticipatory anxiety about deadlines',
  ],
}

export const mockHighSeverityAnalysis: MentalHealthAnalysis = {
  ...mockMentalHealthAnalysis,
  emotionalState:
    'Client presents with significant emotional distress, including persistent depressed mood, anhedonia, and heightened anxiety. Affect is restricted and predominantly negative.',
  riskFactors: [
    'Active suicidal ideation with vague plan but no immediate intent',
    'Significant sleep disturbance (less than 4 hours nightly)',
    'Recent job loss adding to financial strain',
    'Progressive social withdrawal over past 3 months',
    'Increased alcohol consumption reported as coping mechanism',
  ],
  cognitivePatternsIdentified: [
    'Pervasive hopelessness about the future',
    'Strong feelings of worthlessness and excessive guilt',
    'Catastrophizing about financial situation',
    'Mind-reading in social contexts leading to avoidance',
  ],
}
