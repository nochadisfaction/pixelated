export const DEFAULT_SYSTEM_PROMPT = `...` // Keep the existing content

interface SystemPromptOptions {
  model?: string
  temperature?: number
  contextLimit?: number
}

export function getSystemPrompt(_options?: SystemPromptOptions): string {
  return DEFAULT_SYSTEM_PROMPT
}
