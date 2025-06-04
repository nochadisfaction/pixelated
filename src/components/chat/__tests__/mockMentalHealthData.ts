import type { MentalHealthAnalysis } from '../../../lib/ai/types/MentalHealthAnalysis'

export const mockMentalHealthAnalysis: MentalHealthAnalysis = {
  sessionId: 'session-123456',
  emotionalState: 'Mild anxiety with underlying stress',
  cognitivePatterns: [
    'Catastrophizing thoughts about future outcomes',
    'Self-critical inner dialogue',
    'Black and white thinking patterns',
  ],
  strengths: [
    'Strong self-awareness',
    'Willingness to seek help',
    'Good problem-solving abilities',
  ],
  primaryConcerns: [
    'Persistent worry about work performance',
    'Difficulty relaxing and unwinding',
    'Sleep disturbances (trouble falling asleep)',
  ],
  therapeuticRecommendations: [
    'Cognitive Behavioral Therapy techniques to address thought patterns',
    'Mindfulness practices for anxiety reduction',
    'Establishing a consistent sleep routine',
    'Consider journaling to track thought patterns',
  ],
  riskFactors: [
    'Mild insomnia leading to fatigue',
    'Work-related stress',
    'No suicidal ideation or self-harm risk identified',
  ],
  assessmentTimestamp: new Date('2023-09-15T14:30:00Z').getTime(),
  confidenceScore: 0.87,
}

export const mockEmptyAnalysis: MentalHealthAnalysis = {
  sessionId: 'empty-session',
  emotionalState: '',
  cognitivePatterns: [],
  strengths: [],
  primaryConcerns: [],
  therapeuticRecommendations: [],
  riskFactors: [],
  assessmentTimestamp: new Date('2023-09-16T10:00:00Z').getTime(),
  confidenceScore: 0.5,
}
