'use client'

import type { AIMessage } from '../../../lib/ai'
import { useEffect, useRef } from 'react'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

export interface ChatContainerProps {
  messages: AIMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  error?: string
  className?: string
  inputPlaceholder?: string
  disabled?: boolean
  onRetry?: () => void
}

/**
 * Container component for the chat interface
 */
export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  error,
  className = '',
  inputPlaceholder,
  disabled = false,
  onRetry,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {isLoading && (
              <ChatMessage
                message={{ role: 'assistant', content: '', name: 'assistant' }}
                isLoading={true}
              />
            )}

            {error && (
              <div className="error-container p-4 bg-red-50 border border-red-200 rounded-md my-4">
                <p className="font-medium text-red-700">
                  Failed to send message
                </p>
                <p className="text-red-600 text-sm mb-2">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={inputPlaceholder}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
