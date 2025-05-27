import { Loader2, SendIcon } from 'lucide-react' // Lucide icons
import { useEffect, useRef, useState } from 'react'

export interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

/**
 * Component for inputting and sending chat messages
 */
export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message)
      setMessage('')

      // Reset textarea heigh
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end border rounded-lg p-2 bg-background"
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading || disabled}
        className="flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none p-2 max-h-[200px] min-h-[40px]"
        rows={1}
      />
      <button
        type="submit"
        disabled={!message.trim() || isLoading || disabled}
        className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <SendIcon className="h-5 w-5" />
        )}
      </button>
    </form>
  )
}
