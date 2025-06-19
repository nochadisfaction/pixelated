export interface MentalLLaMAModelConfigResult {
  /** Indicates whether the MentalLLaMA model is properly configured (API keys, provider, etc.) */
  isConfigured: boolean
  /** Optional human-readable connection status */
  connectionStatus?: string
}

/**
 * Quick sanity-check used by the /api/ai/mental-health/status endpoint.
 * Currently acts as a lightweight stub until the full MentalLLaMA
 * integration layer is completed.
 */
export async function verifyMentalLLaMAModelConfiguration(): Promise<MentalLLaMAModelConfigResult> {
  try {
    // TODO: Replace with real availability checks (e.g. env vars, provider ping)
    const hasApiKey = Boolean(process.env.TOGETHER_API_KEY || process.env.OPENAI_API_KEY)

    return {
      isConfigured: hasApiKey,
      connectionStatus: hasApiKey ? 'available' : 'missing-configuration',
    }
  } catch {
    // In case of unexpected runtime errors, report not configured.
    return {
      isConfigured: false,
      connectionStatus: 'error',
    }
  }
} 