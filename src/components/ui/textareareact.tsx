import React, { forwardRef } from 'react'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error message to display */
  error?: string
  /** Helper text to display below textarea */
  helperText?: string
  /** Label for the textarea */
  label?: string
  /** Whether the textarea is required */
  isRequired?: boolean
  /** Whether the textarea is disabled */
  isDisabled?: boolean
  /** Whether the textarea is read-only */
  isReadOnly?: boolean
  /** Make textarea take full width */
  fullWidth?: boolean
  /** Additional wrapper className for styling */
  wrapperClassName?: string
  /** Additional className for styling */
  className?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error,
      helperText,
      label,
      isRequired = false,
      isDisabled = false,
      isReadOnly = false,
      fullWidth = true,
      wrapperClassName = '',
      className = '',
      ...props
    },
    ref,
  ) => {
    // Base classes for textarea
    const baseTextareaClasses =
      'block bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed read-only:opacity-60 py-2 px-4'

    // Error state classes
    const errorTextareaClasses = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
      : ''

    // Width classes
    const widthClasses = fullWidth ? 'w-full' : ''

    // Combined textarea classes
    const textareaClasses = [
      baseTextareaClasses,
      errorTextareaClasses,
      widthClasses,
      className,
    ].join(' ')

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}>
        {label && (
          <label
            className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${isDisabled ? 'opacity-60' : ''}`}
          >
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={textareaClasses}
          disabled={isDisabled}
          readOnly={isReadOnly}
          required={isRequired}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${props.id}-error`
              : helperText
                ? `${props.id}-helper`
                : undefined
          }
          {...props}
        />

        {(error || helperText) && (
          <div className="mt-1 text-sm">
            {error ? (
              <p id={`${props.id}-error`} className="text-red-500">
                {error}
              </p>
            ) : helperText ? (
              <p
                id={`${props.id}-helper`}
                className="text-gray-500 dark:text-gray-400"
              >
                {helperText}
              </p>
            ) : null}
          </div>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

export default Textarea
