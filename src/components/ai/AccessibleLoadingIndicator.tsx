interface AccessibleLoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

export function AccessibleLoadingIndicator({
  size = 'medium',
  message = 'Loading...',
}: AccessibleLoadingIndicatorProps) {
  return (
    <div role="status" aria-live="polite">
      <div className={`loading-spinner ${size}`} />
      <span className="sr-only">{message}</span>
    </div>
  )
}
