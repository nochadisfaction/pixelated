export interface TechniqueAdaptation {
  id: string
  name: string
  description: string
  adaptationFactors: string[]
  adaptationReason: string
  steps: string[]
  explanationStyle?: string
  explanation?: string
}

export interface MediaRecommendation {
  type: 'video' | 'audio' | 'image' | 'text' | 'interactive'
  title: string
  description: string
  url?: string
}
