// Temporary stub for MentalLLaMAFactory until full implementation is ready
export class MentalLLaMAFactory {
  static async createFromEnv() {
    return {
      adapter: {
        analyzeMentalHealth: async (text: string) => ({ hasMentalHealthIssue: false, mentalHealthCategory: 'none', explanation: 'Not implemented' }),
        analyzeMentalHealthWithExpertGuidance: async () => ({ hasMentalHealthIssue: false, mentalHealthCategory: 'none', explanation: 'Not implemented', expertGuided: false })
      },
      modelProvider: {
        getModelTier: () => 'stub'
      }
    }
  }
} 