import type { AIMessage } from '../models/ai-types'

/**
 * Prompt Optimizer Configuration
 */
export interface PromptOptimizerConfig {
  /**
   * Maximum number of messages to include
   * @default 10
   */
  maxMessages?: number

  /**
   * Maximum length of each message in characters
   * @default 1000
   */
  maxMessageLength?: number

  /**
   * Whether to enable summarization of long conversation history
   * @default true
   */
  enableSummarization?: boolean

  /**
   * Whether to enable the optimizer
   * @default true
   */
  enabled?: boolean
}

/**
 * Prompt Optimizer Service
 *
 * Optimizes prompts to reduce token usage while maintaining context
 */
export class PromptOptimizerService {
  dispose() {
    throw new Error('Method not implemented.')
  }

  private maxMessages: number
  private maxMessageLength: number
  private enableSummarization: boolean
  private enabled: boolean

  constructor(config: PromptOptimizerConfig = {}) {
    this.maxMessages = config.maxMessages || 10
    this.maxMessageLength = config.maxMessageLength || 1000
    this.enableSummarization = config.enableSummarization !== false
    this.enabled = config.enabled !== false
  }

  /**
   * Optimize a list of messages to reduce token usage
   */
  optimizeMessages(messages: AIMessage[]): AIMessage[] {
    if (!this.enabled) {
      return messages
    }

    // Make a copy to avoid modifying the original
    let optimized = [...messages]

    // Apply message length limits
    optimized = this.truncateMessageLengths(optimized)

    // Apply message count limits
    optimized = this.limitMessageCount(optimized)

    // Apply summarization if enabled and needed
    if (this.enableSummarization && optimized.length > 4) {
      optimized = this.summarizeHistory(optimized)
    }

    return optimized
  }

  /**
   * Truncate message lengths to reduce token usage
   */
  private truncateMessageLengths(messages: AIMessage[]): AIMessage[] {
    return messages.map((msg) => {
      const content = msg.content || ''
      if (content.length <= this.maxMessageLength) {
        return msg
      }

      // Preserve system messages completely
      if (msg.role === 'system') {
        return msg
      }

      // For other messages, truncate content
      return {
        ...msg,
        content: `${content.substring(
          0,
          this.maxMessageLength,
        )} [...truncated ${content.length - this.maxMessageLength} characters]`,
      }
    })
  }

  /**
   * Limit the number of messages to reduce token usage
   */
  private limitMessageCount(messages: AIMessage[]): AIMessage[] {
    if (messages.length <= this.maxMessages) {
      return messages
    }

    // Always keep system messages
    const systemMessages = messages.filter((msg) => msg.role === 'system')

    // Keep the most recent messages (excluding system messages)
    const nonSystemMessages = messages.filter((msg) => msg.role !== 'system')
    const recentMessages = nonSystemMessages.slice(
      -this.maxMessages + systemMessages.length,
    )

    // Add a note about truncated history if there were messages removed
    if (nonSystemMessages.length > recentMessages.length) {
      const truncatedCount = nonSystemMessages.length - recentMessages.length
      const historyNote: AIMessage = {
        role: 'system',
        content: `[Note: ${truncatedCount} earlier messages have been omitted to optimize token usage]`,
        name: '',
      }

      return [...systemMessages, historyNote, ...recentMessages]
    }

    return [...systemMessages, ...recentMessages]
  }

  /**
   * Summarize conversation history to reduce token usage
   */
  private summarizeHistory(messages: AIMessage[]): AIMessage[] {
    // Keep system messages and the most recent 3 messages
    const systemMessages = messages.filter((msg) => msg.role === 'system')
    const recentMessages = messages.slice(-3)

    // Get the messages to summarize (excluding system and recent)
    const toSummarize = messages.filter(
      (msg) => msg.role !== 'system' && !recentMessages.includes(msg),
    )

    if (toSummarize.length <= 1) {
      return messages
    }

    // Create a simple summary of the conversation history
    const summary: AIMessage = {
      role: 'system',
      content: `[Conversation summary: ${this.createConversationSummary(toSummarize)}]`,
      name: '',
    }

    return [...systemMessages, summary, ...recentMessages]
  }

  /**
   * Create a simple summary of conversation messages
   */
  private createConversationSummary(messages: AIMessage[]): string {
    const userMessages = messages.filter((msg) => msg.role === 'user')
    const assistantMessages = messages.filter((msg) => msg.role === 'assistant')

    return `This conversation includes ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. The main topics discussed were: ${this.extractTopics(messages)}.`
  }

  /**
   * Extract main topics from messages (simplified implementation)
   */
  private extractTopics(messages: AIMessage[]): string {
    // In a real implementation, this would use NLP techniques
    // For now, we'll just extract some keywords from the messages

    const allText = messages.map((msg) => msg.content).join(' ')
    const words = allText.split(/\s+/)
    const wordCounts: Record<string, number> = {}

    // Count word frequencies
    for (const word of words) {
      const cleaned = word.toLowerCase().replace(/\W/g, '')
      if (cleaned.length > 4) {
        // Only consider words longer than 4 chars
        wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1
      }
    }

    // Get top 5 words by frequency
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)

    return topWords.join(', ') || 'general conversation'
  }
}
