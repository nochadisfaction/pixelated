import React, { forwardRef } from 'react'

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Size of the radio button */
  size?: 'sm' | 'md' | 'lg'
  /** Label for the radio button */
  label?: string
  /** Error message to display */
  error?: string
  /** Helper text to display */
  helperText?: string
  /** Whether the radio button is required */
  isRequired?: boolean
  /** Whether the radio button is disabled */
  isDisabled?: boolean
  /** Additional wrapper className for styling */
  wrapperClassName?: string
  /** Additional className for styling */
  className?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      size = 'md',
      label,
      error,
      helperText,
      isRequired = false,
      isDisabled = false,
      wrapperClassName = '',
      className = '',
      ...props
    },
    ref,
  ) => {
    // Base radio classes
    const baseRadioClasses =
      'rounded-full border text-primary focus:ring-primary bg-white dark:bg-gray-900'

    // Size-specific radio classes
    const sizeRadioClasses = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    }

    // Error state classes
    const errorRadioClasses = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-gray-600'

    // Disabled state classes
    const disabledRadioClasses = isDisabled
      ? 'opacity-60 cursor-not-allowed'
      : ''

    // Combined radio classes
    const radioClasses = [
      baseRadioClasses,
      sizeRadioClasses[size],
      errorRadioClasses,
      disabledRadioClasses,
      className,
    ].join(' ')

    // Font size for label based on radio size
    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    }

    return (
      <div className={`${wrapperClassName}`}>
        <div className="flex items-center">
          <input
            ref={ref}
            type="radio"
            className={radioClasses}
            disabled={isDisabled}
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

          {label && (
            <label
              htmlFor={props.id}
              className={`ml-2 font-medium text-gray-700 dark:text-gray-300 ${labelSizeClasses[size]} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>

        {(error || helperText) && (
          <div className="mt-1 ml-6 text-sm">
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

Radio.displayName = 'Radio'

export default Radio
