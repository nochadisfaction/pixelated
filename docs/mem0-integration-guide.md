# Mem0 Memory Integration Guide

## Overview

This guide explains how we've integrated [mem0](https://mem0.ai) into our chat system to enable AI learning and persistent memory across conversations. The integration allows the AI to remember user preferences, past conversations, and context to provide increasingly personalized responses.

## What's Been Added

### 1. Enhanced Chat Hook (`useChatWithMemory`)

**File:** `src/hooks/useChatWithMemory.ts`

A powerful React hook that combines:
- **Memory Storage**: Automatically stores conversations in mem0
- **Context Retrieval**: Fetches relevant memories for personalized responses  
- **Emotional Analysis**: Analyzes messages for emotions and topics
- **Conversation Insights**: Generates insights about conversation patterns

#### Key Features:
- Stores each message with metadata (emotions, topics, timestamps)
- Retrieves relevant conversation history for AI context
- Tracks memory statistics (total memories, session memories, context used)
- Supports conversation summarization and export

#### Usage:
```typescript
const {
  messages,
  isLoading,
  error,
  sendMessage,
  clearMessages,
  regenerateResponse,
  getConversationSummary,
  memoryStats,
} = useChatWithMemory({
  sessionId: 'unique-session-id',
  enableMemory: true,
  enableAnalysis: true,
  maxMemoryContext: 15,
});
```

### 2. Memory-Aware Chat Component (`MemoryAwareChatSystem`)

**File:** `src/components/chat/MemoryAwareChatSystem.tsx`

A complete chat interface with memory visualization:
- **Memory Statistics Panel**: Shows total memories, session memories, and context usage
- **Conversation Insights**: Displays AI-generated conversation summaries
- **Memory Controls**: Toggle memory and analysis features on/off
- **Export Functionality**: Download conversation data as JSON
- **Real-time Indicators**: Visual feedback when messages are stored in memory

#### Props:
```typescript
interface MemoryAwareChatSystemProps {
  className?: string;
  sessionId?: string;
  title?: string;
  subtitle?: string;
  enableMemoryToggle?: boolean;
  enableAnalysisToggle?: boolean;
  showMemoryStats?: boolean;
  showMemoryInsights?: boolean;
}
```

### 3. Demo Page (`chat-with-memory.astro`)

**File:** `src/pages/chat-with-memory.astro`

A showcase page demonstrating the memory capabilities:
- Feature highlights explaining persistent memory, emotional intelligence, and learning analytics
- Instructions on how to experience memory features
- Technical details about the implementation
- Beautiful UI with proper responsive design

## How Memory Works

### 1. Message Storage
When a user sends a message:
```typescript
// Message is analyzed for emotions and topics
const messageAnalysis = await analyzeMessageContent(content);

// Stored in mem0 with rich metadata
await memory.addMemory(`${message.role}: ${message.content}`, {
  category: 'conversation',
  sessionId,
  messageId: message.id,
  timestamp: message.timestamp,
  role: message.role,
  tags: ['chat-message', message.role, ...emotions, ...topics],
  analysis: messageAnalysis,
  emotions: emotions,
  topics: topics,
});
```

### 2. Context Retrieval
Before generating AI responses:
```typescript
// Search for relevant memories
const relevantMemories = await memory.searchMemories(query, {
  limit: maxMemoryContext,
  sessionId, // Prioritize current session
});

// Format as context for AI
const context = `## Conversation Context from Memory:\n${contextEntries.join('\n')}\n\n`;
```

### 3. AI System Prompt Enhancement
The AI receives enhanced context:
```typescript
const systemMessage = {
  role: 'system',
  content: `You are a helpful AI assistant with access to conversation history and user preferences. Use the provided context to give personalized responses.

${memoryContext}

Remember to:
- Reference relevant past conversations when appropriate
- Maintain consistency with user preferences
- Build upon previous topics and insights
- Be empathetic and supportive in mental health contexts`,
};
```

## Memory Categories and Tags

### Categories:
- `conversation`: Regular chat messages
- `insights`: AI-generated conversation insights
- `preferences`: User preferences and settings
- `mental-health`: Therapeutic insights and analysis

### Tags:
- `chat-message`: Regular conversation messages
- `user` / `assistant`: Message role
- `conversation-insight`: AI-generated insights
- `therapy`: Therapeutic conversations
- `emotion-{emotion}`: Detected emotions (sad, happy, anxious, etc.)
- `topic-{topic}`: Extracted topics (work, family, health, etc.)

## Integration Examples

### Basic Chat with Memory
```typescript
import { useChatWithMemory } from '@/hooks/useChatWithMemory';

function MyChat() {
  const { messages, sendMessage, memoryStats } = useChatWithMemory({
    sessionId: 'user-123-session',
    enableMemory: true,
  });

  return (
    <div>
      <div>Total Memories: {memoryStats.totalMemories}</div>
      {/* Chat interface */}
    </div>
  );
}
```

### Therapy-Specific Integration
```typescript
const therapyChat = useChatWithMemory({
  sessionId: `therapy-${patientId}-${Date.now()}`,
  enableMemory: true,
  enableAnalysis: true,
  maxMemoryContext: 25, // Higher context for therapy
});

// Store therapy-specific insights
await memory.addMemory(`Therapy insight: ${analysis.explanation}`, {
  category: 'mental-health',
  tags: ['therapy', 'analysis', analysis.category],
  emotions: emotions.map(e => e.emotion),
  riskLevel: analysis.riskLevel,
  timestamp: Date.now(),
});
```

## Memory Statistics

The system tracks detailed statistics:
- **Total Memories**: All memories across all sessions
- **Session Memories**: Memories specific to current session
- **Context Used**: Number of memories currently being used for AI context

## Privacy and Control

### User Controls:
- **Memory Toggle**: Users can enable/disable memory storage
- **Analysis Toggle**: Users can enable/disable message analysis
- **Export Data**: Users can download their conversation data
- **Clear Session**: Users can clear current conversation

### Data Structure:
```typescript
interface ExportData {
  timestamp: string;
  sessionId: string;
  userId: string;
  summary: string;
  messageCount: number;
  memoryStats: MemoryStats;
  messages: Array<{
    role: string;
    content: string;
    timestamp: number;
    analyzed: boolean;
    memoryStored: boolean;
  }>;
}
```

## Configuration

### Environment Variables Required:
```bash
# Mem0 API Configuration
MEM0_API_KEY=your_mem0_api_key_here
DEFAULT_USER_ID=default_user
DEFAULT_APP_ID=pixelated
DEFAULT_AGENT_ID=pixelated_ai
```

### Memory Configuration:
The system uses the existing `Mem0Client` configuration from `src/lib/memory/mem0-client.ts`

## Benefits

### For Users:
- **Personalized Conversations**: AI remembers user preferences and history
- **Continuous Learning**: AI gets smarter with each interaction
- **Context Awareness**: AI can reference past conversations naturally
- **Progress Tracking**: Users can see their conversation patterns over time

### For Therapeutic Applications:
- **Session Continuity**: Therapists can build on previous sessions
- **Pattern Recognition**: Identify emotional patterns and triggers
- **Progress Monitoring**: Track client progress over time
- **Risk Assessment**: Early detection of concerning patterns

## Next Steps

1. **Test the Integration**: Visit `/chat-with-memory` to experience the memory features
2. **Customize for Your Use Case**: Modify the memory categories and tags
3. **Enhance Analysis**: Add more sophisticated NLP for topic and emotion detection
4. **Privacy Controls**: Implement user data management features
5. **Analytics**: Build dashboards to visualize memory and conversation patterns

## Troubleshooting

### Common Issues:

1. **Memory Not Storing**: Check that `MEM0_API_KEY` is set correctly
2. **Context Not Loading**: Verify user authentication is working
3. **Performance Issues**: Adjust `maxMemoryContext` for your use case
4. **Type Errors**: Ensure all interfaces are properly imported

### Debug Tips:
- Check browser console for memory storage errors
- Verify network requests to mem0 API are successful
- Test with memory disabled to isolate issues

## Architecture Diagram

```
User Message → Analysis Engine → Memory Storage (mem0)
     ↓              ↓                    ↓
Chat Interface → AI Context Builder → Personalized Response
     ↑              ↑                    ↑
Memory Stats ← Memory Retrieval ← Relevant Memories
```

This integration transforms your chat system from a stateless conversation tool into an intelligent, learning AI companion that grows smarter with every interaction. 