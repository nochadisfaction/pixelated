import type { AIMessage } from '../../lib/ai'
import type { CrisisDetectionResult } from '../../lib/ai/models/types'
import React, { useState } from 'react'
import {
  ChatContainer,
  useChatCompletion,
  useCrisisDetection,
  useSentimentAnalysis,
} from '../ai'
/**
 * Demo component for showcasing the chat interface
 */
export function ChatDemo() {
  // Initial system message
  const initialMessages: AIMessage[] = [
    {
      role: 'system',
      content:
        'You are a helpful and empathetic assistant. Respond to the user in a supportive and informative manner.',
      name: '',
    },
  ]

  // Chat completion hook
  const { messages, isLoading, error, sendMessage, retryLastMessage } =
    useChatCompletion({
      initialMessages,
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 1024,
      onError: (error) => {
        console.error('Chat error:', error)
      },
    })

  // Sentiment analysis hook
  const { analyzeText: analyzeSentiment, result: sentimentResult } =
    useSentimentAnalysis()

  // Crisis detection hook
  const { detectCrisis, result: crisisResult } = useCrisisDetection({
    sensitivityLevel: 'medium',
    onCrisisDetected: (result: CrisisDetectionResult) => {
      console.warn('Crisis detected:', result)
      // In a real app, you might trigger an alert or notification here
    },
  })

  // Analyze sentiment and detect crisis when user sends a message
  const handleSendMessage = async (message: string) => {
    // Send message to AI
    await sendMessage(message)

    // Analyze sentiment (in background)
    analyzeSentiment(message)

    // Detect crisis (in background)
    detectCrisis(message)
  }

  // Display sentiment and crisis info
  const [showAnalysis, setShowAnalysis] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <ChatContainer
          messages={messages
            .filter((m) => m.role !== 'system' && m.content !== undefined)
            .map((m) => ({
              role: m.role,
              content: m.content || '',
              name: m.name || '',
            }))}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error?.toString()}
          inputPlaceholder="Type a message..."
          onRetry={retryLastMessage}
        />
      </div>

      {/* Analysis panel (toggle with button) */}
      <div className="border-t p-4">
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md mb-2"
        >
          {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
        </button>

        {showAnalysis && (
          <div className="grid grid-cols-2 gap-4">
            {/* Sentiment Analysis */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Sentiment Analysis</h3>
              {sentimentResult ? (
                <div>
                  <p>Sentiment: {String(sentimentResult.sentiment)}</p>
                  <p>
                    Confidence: {(sentimentResult.confidence * 100).toFixed(0)}%
                  </p>
                  {sentimentResult.emotions && (
                    <div className="mt-2">
                      <p className="font-semibold">Emotions:</p>
                      <ul className="pl-4">
                        {Object.entries(sentimentResult.emotions).map(
                          ([emotion, score], idx) => {
                            return (
                              <li key={`${emotion}-${idx}`}>
                                {emotion}: {Math.floor(Number(score) * 100)}%
                              </li>
                            )
                          },
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No sentiment analysis available
                </p>
              )}
            </div>

            {/* Crisis Detection */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Crisis Detection</h3>
              {crisisResult ? (
                <div>
                  <p>Crisis Detected: {crisisResult.isCrisis ? 'Yes' : 'No'}</p>
                  <p>
                    Confidence: {(crisisResult.confidence * 100).toFixed(0)}%
                  </p>
                  {crisisResult.category && (
                    <p>Crisis Type: {crisisResult.category}</p>
                  )}
                  {crisisResult.severity && (
                    <p>Risk Level: {crisisResult.severity}</p>
                  )}
                  {crisisResult.recommendedAction && (
                    <p>Reasoning: {crisisResult.recommendedAction}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No crisis detection available
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
