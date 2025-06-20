import { useState, useCallback, useEffect } from 'react';
import { useMemory } from './useMemory';
import { useAuth } from './useAuth';
import { useAIService } from './useAIService';
import { useMentalHealthAnalysis } from './useMentalHealthAnalysis';
import type { Message } from '@/types/chat';
import type { ChatMessage as AIMessage } from '@/lib/ai/models/types';
import { generateUniqueId } from '@/lib/utils';

export interface ChatMessage extends Message {
  id: string;
  timestamp: number;
  memoryStored?: boolean;
  analyzed?: boolean;
}

interface UseChatWithMemoryOptions {
  sessionId?: string;
  enableMemory?: boolean;
  enableAnalysis?: boolean;
  maxMemoryContext?: number;
}

interface ChatWithMemoryReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  regenerateResponse: () => Promise<void>;
  getConversationSummary: () => Promise<string>;
  memoryStats: {
    totalMemories: number;
    sessionMemories: number;
    contextUsed: number;
  };
}

/**
 * Enhanced chat hook with mem0 memory integration
 */
export function useChatWithMemory(
  options: UseChatWithMemoryOptions = {}
): ChatWithMemoryReturn {
  const {
    sessionId = generateUniqueId(),
    enableMemory = true,
    enableAnalysis = true,
    maxMemoryContext = 10,
  } = options;

  const { user } = useAuth();
  const { getAIResponse } = useAIService();
  const { analyzeMessage } = useMentalHealthAnalysis();
  
  // Initialize memory with conversation category
  const memory = useMemory({
    userId: user?.id?.toString() || 'anonymous',
    category: 'conversation',
    autoLoad: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryStats, setMemoryStats] = useState({
    totalMemories: 0,
    sessionMemories: 0,
    contextUsed: 0,
  });

  // Update memory stats when memories change
  useEffect(() => {
    const sessionMemories = memory.memories.filter(
      m => m.metadata?.sessionId === sessionId
    ).length;

    setMemoryStats({
      totalMemories: memory.memories.length,
      sessionMemories,
      contextUsed: Math.min(sessionMemories, maxMemoryContext),
    });
  }, [memory.memories, sessionId, maxMemoryContext]);

  /**
   * Store message in memory with context
   */
  const storeMessageInMemory = useCallback(async (
    message: ChatMessage,
    context?: {
      analysis?: any;
      emotions?: string[];
      topics?: string[];
    }
  ) => {
    if (!enableMemory || !user?.id) {
      return;
    }

    try {
      const memoryContent = `${message.role}: ${message.content}`;
      const metadata = {
        category: 'conversation',
        sessionId,
        messageId: message.id,
        timestamp: message.timestamp.toString(),
        role: message.role,
        tags: [
          'chat-message',
          message.role,
          ...(context?.emotions || []),
          ...(context?.topics || []),
        ],
        analysis: context?.analysis,
        emotions: context?.emotions,
        topics: context?.topics,
      };

      await memory.addMemory(memoryContent, metadata);
      
      // Mark message as stored
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, memoryStored: true }
          : msg
      ));
    } catch (err) {
      console.error('Failed to store message in memory:', err);
    }
  }, [enableMemory, user?.id, sessionId, memory]);

  /**
   * Retrieve relevant memory context for AI response
   */
  const getMemoryContext = useCallback(async (query: string): Promise<string> => {
    if (!enableMemory || !user?.id) {
      return '';
    }

    try {
      // Search for relevant memories
      const relevantMemories = await memory.searchMemories(query, {
        limit: maxMemoryContext,
      });

      if (relevantMemories.length === 0) {
        return '';
      }

      // Format memories for context
      const contextEntries = relevantMemories.map(mem => {
        const metadata = mem.metadata || {};
        const role = (metadata as any).role || 'unknown';
        const timestamp = (metadata as any).timestamp ? new Date((metadata as any).timestamp).toLocaleString() : 'unknown';
        
        return `[${timestamp}] ${role}: ${mem.content}`;
      });

      return `## Conversation Context from Memory:\n${contextEntries.join('\n')}\n\n`;
    } catch (err) {
      console.error('Failed to retrieve memory context:', err);
      return '';
    }
  }, [enableMemory, user?.id, memory, maxMemoryContext, sessionId]);

  /**
   * Analyze message content for memory enhancement
   */
  const analyzeMessageContent = useCallback(async (content: string) => {
    if (!enableAnalysis) {
      return {};
    }

    try {
      const analysis = await analyzeMessage(content);
      
      // Extract topics and emotions for better memory categorization
      const emotions = analysis?.emotions || [];
      const topics = extractTopics(content); // You'll need to implement this
      
      return {
        analysis,
        emotions,
        topics,
      };
    } catch (err) {
      console.error('Failed to analyze message:', err);
      return {};
    }
  }, [enableAnalysis, analyzeMessage]);

  /**
   * Send a message with memory integration
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) {
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: generateUniqueId(),
      role: 'user',
      content: content.trim(),
      name: '',
      timestamp: Date.now(),
      memoryStored: false,
      analyzed: false,
    };

    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);

    try {
      // Analyze user message
      const messageAnalysis = await analyzeMessageContent(content);
      
      // Store user message in memory
      await storeMessageInMemory(userMessage, messageAnalysis);

      // Get memory context for AI response
      const memoryContext = await getMemoryContext(content);

      // Prepare messages for AI with memory context
      const aiMessages: AIMessage[] = [
        {
          role: 'system',
          content: `You are a helpful AI assistant with access to conversation history and user preferences. Use the provided context to give personalized responses.

${memoryContext}

Remember to:
- Reference relevant past conversations when appropriate
- Maintain consistency with user preferences
- Build upon previous topics and insights
- Be empathetic and supportive in mental health contexts`,
          name: '',
        },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          name: msg.name || '',
        })),
        {
          role: 'user',
          content,
          name: '',
        },
      ];

      // Convert messages to a single prompt string
      const promptString = aiMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
      
      // Get AI response
      const aiResponse = await getAIResponse(promptString);

      const assistantMessage: ChatMessage = {
        id: generateUniqueId(),
        role: 'assistant',
        content: aiResponse,
        name: '',
        timestamp: Date.now(),
        memoryStored: false,
        analyzed: false,
      };

      // Add AI response to conversation
      setMessages(prev => [...prev, assistantMessage]);

      // Analyze and store AI response
      const responseAnalysis = await analyzeMessageContent(aiResponse);
      await storeMessageInMemory(assistantMessage, responseAnalysis);

      // Store conversation insights
      if (enableMemory && user?.id) {
        const insights = await generateConversationInsights(userMessage, assistantMessage);
        if (insights) {
          await memory.addMemory(`Conversation insight: ${insights}`, {
            role: 'system',
            category: 'insights',
            sessionId,
            tags: ['conversation-insight', 'ai-analysis'],
            timestamp: Date.now().toString(),
          });
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: generateUniqueId(),
        role: 'system',
        content: `Error: ${errorMessage}`,
        name: '',
        timestamp: Date.now(),
        memoryStored: false,
        analyzed: false,
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    messages,
    getAIResponse,
    analyzeMessageContent,
    storeMessageInMemory,
    getMemoryContext,
    enableMemory,
    user?.id,
    memory,
    sessionId,
  ]);

  /**
   * Regenerate the last AI response
   */
  const regenerateResponse = useCallback(async () => {
    if (messages.length < 2 || isLoading) {
      return;
    }

    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) {
      return;
    }

    // Remove the last assistant message
    setMessages(prev => {
      const lastAssistantIndex = prev.map(m => m.role).lastIndexOf('assistant');
      if (lastAssistantIndex === -1) {
        return prev;
      }
      return prev.slice(0, lastAssistantIndex);
    });

    // Regenerate response
    await sendMessage(lastUserMessage.content);
  }, [messages, isLoading, sendMessage]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Generate conversation summary
   */
  const getConversationSummary = useCallback(async (): Promise<string> => {
    if (messages.length === 0) {
      return 'No conversation to summarize.';
    }

    try {
      const conversationText = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const summaryPrompt = `Summarize the following conversation in 2-3 sentences, focusing on key topics and insights.

Conversation:
${conversationText}`;

      return await getAIResponse(summaryPrompt);
    } catch (err) {
      return 'Failed to generate conversation summary.';
    }
  }, [messages, getAIResponse]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    regenerateResponse,
    getConversationSummary,
    memoryStats,
  };
}

/**
 * Extract topics from message content (basic implementation)
 */
function extractTopics(content: string): string[] {
  // Basic keyword extraction - you can enhance this with NLP
  return content
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !commonWords.includes(word))
      .slice(0, 5);
}

/**
 * Generate conversation insights
 */
async function generateConversationInsights(
  userMessage: ChatMessage,
  _aiMessage: ChatMessage
): Promise<string | null> {
  try {
    // Analyze the conversation turn for insights
    const userContent = userMessage.content.toLowerCase();
    const insights: string[] = [];

    // Detect emotional states
    if (userContent.includes('sad') || userContent.includes('depressed')) {
      insights.push('User expressing sadness or depression');
    }
    if (userContent.includes('anxious') || userContent.includes('worried')) {
      insights.push('User expressing anxiety or worry');
    }
    if (userContent.includes('happy') || userContent.includes('excited')) {
      insights.push('User expressing positive emotions');
    }

    // Detect topic preferences
    if (userContent.includes('work') || userContent.includes('job')) {
      insights.push('Discussion about work/career');
    }
    if (userContent.includes('family') || userContent.includes('relationship')) {
      insights.push('Discussion about relationships');
    }

    return insights.length > 0 ? insights.join(', ') : null;
  } catch (err) {
    console.error('Failed to generate insights:', err);
    return null;
  }
}

// Common words to filter out from topic extraction
const commonWords = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
  'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'with',
  'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been',
  'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just',
  'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them',
  'well', 'were', 'what', 'would', 'more', 'could', 'should', 'where',
]; 