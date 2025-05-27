# AI Module

This module provides a comprehensive set of tools for integrating AI capabilities into the application. It includes services for sentiment analysis, crisis detection, response generation, and intervention analysis, as well as utilities for error handling and performance optimization.

## Table of Contents

- [Overview](#overview)
- [Services](#services)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The AI module is designed to provide a unified interface for interacting with various AI providers, including OpenAI and Anthropic. It abstracts away the details of the underlying APIs and provides a consistent interface for all AI-related functionality.

Key features include:

- Support for multiple AI providers (OpenAI, Anthropic)
- Specialized services for common AI tasks
- Comprehensive error handling
- Performance optimization with caching and metrics
- HIPAA-compliant audit logging

## Services

### AI Service Factory

The `createAIService` function creates an AI service with the specified provider and options. It automatically applies error handling and performance optimization wrappers.

```typescript
import { createAIService } from '../lib/ai'

const aiService = createAIService({
  provider: 'openai', // or 'anthropic'
  enableErrorHandling: true,
  enablePerformanceOptimization: true
})
```

### Sentiment Analysis

The `SentimentAnalysisService` analyzes the sentiment of text, providing a score and explanation.

```typescript
import { createAIService, SentimentAnalysisService } from '../lib/ai'

const aiService = createAIService()
const sentimentService = new SentimentAnalysisService({ aiService })

const result = await sentimentService.analyzeSentiment('I am feeling great today!')
// { sentiment: 'positive', score: 0.85, explanation: '...', model: '...', processingTime: 123 }
```

### Crisis Detection

The `CrisisDetectionService` detects potential crisis situations in text, providing a risk level and explanation.

```typescript
import { createAIService, CrisisDetectionService } from '../lib/ai'

const aiService = createAIService()
const crisisService = new CrisisDetectionService({ aiService })

const result = await crisisService.detectCrisis('I am feeling really down lately.')
// { is_crisis: true, risk_level: 'low', crisis_type: 'depression', confidence: 0.65, ... }
```

### Response Generation

The `ResponseGenerationService` generates responses to user messages, with support for streaming.

```typescript
import { createAIService, ResponseGenerationService } from '../lib/ai'

const aiService = createAIService()
const responseService = new ResponseGenerationService({ aiService })

const result = await responseService.generateResponse([
  { role: 'user', content: 'Hello, how are you?' }
])
// { response: 'I am doing well, thank you!', model: '...', processingTime: 123 }
```

### Intervention Analysis

The `InterventionAnalysisService` analyzes the effectiveness of therapeutic interventions.

```typescript
import { createAIService, InterventionAnalysisService } from '../lib/ai'

const aiService = createAIService()
const interventionService = new InterventionAnalysisService({ aiService })

const result = await interventionService.analyzeIntervention(
  conversation,
  interventionMessage,
  userResponse
)
// { effectiveness_score: 8, user_receptiveness: 'high', emotional_impact: 'positive', ... }
```

## Error Handling

The AI module includes a comprehensive error handling system that standardizes errors across different providers and provides detailed error information.

### AIError Class

The `AIError` class is a custom error class for AI-related errors. It includes a code, status code, context, and original error.

```typescript
import { AIError, AIErrorCodes } from '../lib/ai'

throw new AIError('The AI service is currently unavailable', {
  code: AIErrorCodes.SERVICE_UNAVAILABLE,
  statusCode: 503,
  context: { model: 'gpt-4o' }
})
```

### Error Handling Utilities

The module includes utilities for handling errors from AI services and transforming them into standardized AIErrors.

```typescript
import { AIErrorCodes, handleAIServiceError } from '../lib/ai'

try {
  // Call AI service
}
catch (error) {
  const aiError = handleAIServiceError(error, { model: 'gpt-4o' })
  console.error(`AI Error: ${aiError.message} (${aiError.code})`)
}
```

### API Error Handling

The module includes a utility for handling errors in API routes and returning appropriate responses.

```typescript
import { handleApiError } from '../lib/ai'

try {
  // API route logic
}
catch (error) {
  return handleApiError(error)
}
```

## Performance Optimization

The AI module includes utilities for optimizing the performance of AI services, including caching and metrics collection.

### Optimized AI Service

The `createOptimizedAIService` function creates a performance-optimized AI service wrapper.

```typescript
import { createOptimizedAIService } from '../lib/ai'

const optimizedService = createOptimizedAIService(aiService, {
  logToConsole: true,
  createAuditLogs: true,
  slowRequestThreshold: 3000,
  highTokenUsageThreshold: 1000
})
```

### Token Usage Optimization

The module includes utilities for estimating token usage and truncating messages to fit within token limits.

```typescript
import { estimateMessagesTokenCount, truncateMessages } from '../lib/ai'

const tokenCount = estimateMessagesTokenCount(messages)
console.log(`Estimated token count: ${tokenCount}`)

const truncatedMessages = truncateMessages(messages, 4000, 1000)
```

## Usage Examples

### Basic Usage

```typescript
import { createAIService } from '../lib/ai'

const aiService = createAIService()

const completion = await aiService.createChatCompletion(
  [{ role: 'user', content: 'Hello, how are you?' }],
  { model: 'gpt-4o' }
)

console.log(completion.content)
```

### Streaming Response

```typescript
import { createAIService } from '../lib/ai'

const aiService = createAIService()

const { stream } = await aiService.createStreamingChatCompletion(
  [{ role: 'user', content: 'Hello, how are you?' }],
  { model: 'gpt-4o' }
)

for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

### Error Handling

```typescript
import { AIError, AIErrorCodes, createAIService } from '../lib/ai'

const aiService = createAIService()

try {
  const completion = await aiService.createChatCompletion(
    [{ role: 'user', content: 'Hello, how are you?' }],
    { model: 'invalid-model' }
  )
}
catch (error) {
  if (error instanceof AIError && error.code === AIErrorCodes.INVALID_MODEL) {
    console.error('Invalid model specified')
  }
  else {
    console.error('An unexpected error occurred:', error)
  }
}
```

### Retry with Exponential Backoff

```typescript
import { createAIService, withRetry } from '../lib/ai'

const aiService = createAIService()

const completion = await withRetry(
  () => aiService.createChatCompletion(
    [{ role: 'user', content: 'Hello, how are you?' }],
    { model: 'gpt-4o' }
  ),
  {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 10000,
    factor: 2
  }
)
```

## API Reference

### AI Service

```typescript
interface AIService {
  createChatCompletion: (
    messages: AIMessage[],
    options?: AIServiceOptions
  ) => Promise<AICompletion>

  createStreamingChatCompletion: (
    messages: AIMessage[],
    options?: AIServiceOptions
  ) => Promise<AIStreamingCompletion>

  getModelInfo: (model: string) => ModelInfo
}
```

### AI Message

```typescript
interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
```

### AI Completion

```typescript
interface AICompletion {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
```

### AI Streaming Completion

```typescript
interface AIStreamingCompletion {
  stream: AsyncIterable<{ content: string }>
  model: string
}
```

### AI Service Options

```typescript
interface AIServiceOptions {
  model: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}
```

### Sentiment Analysis Result

```typescript
interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  explanation: string
  model: string
  processingTime: number
}
```

### Crisis Detection Result

```typescript
interface CrisisDetectionResult {
  is_crisis: boolean
  risk_level: 'high' | 'medium' | 'low' | 'none'
  crisis_type: string | null
  confidence: number
  reasoning: string
  model: string
  processingTime: number
}
```

### Response Generation Result

```typescript
interface ResponseGenerationResult {
  response: string
  model: string
  processingTime: number
  usage?: {
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
  }
}
```

### Intervention Analysis Result

```typescript
interface InterventionEffectivenessResult {
  effectiveness_score: number
  user_receptiveness: 'high' | 'medium' | 'low'
  emotional_impact: 'positive' | 'neutral' | 'negative'
  key_insights: string[]
  improvement_suggestions: string[]
  model: string
  processingTime: number
}
```

# AI Service Library

This library provides a comprehensive set of tools for working with AI services in a HIPAA-compliant environment.

## Features

- Multiple AI provider support (OpenAI, Anthropic, Gemini, Azure OpenAI)
- Advanced performance optimization
- Comprehensive error handling
- Detailed performance tracking and analytics
- HIPAA-compliant audit logging

## Usage

### Basic Usage

```typescript
import { createAIService } from './lib/ai/factory'

// Create a basic AI service
const aiService = createAIService({
  provider: 'openai',
  // Other provider-specific options
})

// Use the service
const response = await aiService.complete({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, how are you?' }
  ]
})
```

### With Advanced Performance Optimization

```typescript
import { createAIService } from './lib/ai/factory'

// Create an AI service with advanced performance optimization
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableCache: true,
    cacheTTL: 3600, // 1 hour
    enableRateLimit: true,
    maxRequestsPerMinute: 100,
    enableTokenOptimization: true,
    maxContextLength: 4000,
    enableBatching: true,
    batchWindow: 50, // ms
    maxBatchSize: 5,
    enableFallback: true,
    fallbackModels: ['gpt-3.5-turbo'],
    enableDetailedTracking: true
  }
})
```

## Advanced Performance Features

### Caching

The caching system stores responses to identical requests to reduce latency and costs. Cached responses are stored with a configurable TTL (Time To Live).

```typescript
// Configure caching
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableCache: true,
    cacheTTL: 3600 // 1 hour in seconds
  }
})
```

### Rate Limiting

Rate limiting prevents excessive API usage by limiting the number of requests per user within a time window.

```typescript
// Configure rate limiting
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableRateLimit: true,
    maxRequestsPerMinute: 100
  }
})
```

### Token Optimization

Token optimization reduces token usage by intelligently truncating conversation history while preserving context.

```typescript
// Configure token optimization
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableTokenOptimization: true,
    maxContextLength: 4000
  }
})
```

### Request Batching

Request batching combines multiple requests into batches to reduce overhead and improve throughput.

```typescript
// Configure request batching
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableBatching: true,
    batchWindow: 50, // ms
    maxBatchSize: 5
  }
})
```

### Fallback Models

Fallback models provide reliability by automatically switching to alternative models when the primary model fails.

```typescript
// Configure fallback models
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableFallback: true,
    fallbackModels: ['gpt-3.5-turbo', 'text-davinci-003']
  }
})
```

### Performance Tracking

Performance tracking collects detailed metrics on AI service usage, including latency, token usage, success rates, and more.

```typescript
// Configure performance tracking
const aiService = createAIService({
  provider: 'openai',
  enableAdvancedOptimization: true,
  advancedPerformanceOptions: {
    enableDetailedTracking: true
  }
})
```

## Performance Dashboard

The AI performance dashboard provides a comprehensive view of AI service performance metrics, including:

- Request counts
- Average latency
- Token usage
- Success rates
- Model breakdown
- Error distribution

Access the dashboard at `/admin/ai/performance`.

## Database Schema

Performance metrics are stored in the `ai_performance_metrics` table with the following schema:

| Column         | Type      | Description                           |
|----------------|-----------|---------------------------------------|
| id             | uuid      | Primary key                           |
| model          | text      | AI model name                         |
| latency        | integer   | Request latency in ms                 |
| input_tokens   | integer   | Number of input tokens                |
| output_tokens  | integer   | Number of output tokens               |
| total_tokens   | integer   | Total tokens used                     |
| success        | boolean   | Whether the request was successful    |
| error_code     | text      | Error code if request failed          |
| cached         | boolean   | Whether the response was cached       |
| optimized      | boolean   | Whether token optimization was applied|
| user_id        | uuid      | User ID                               |
| session_id     | text      | Session ID                            |
| request_id     | uuid      | Unique request ID                     |
| timestamp      | timestamp | Request timestamp                     |
