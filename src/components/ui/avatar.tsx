import React, { useState } from 'react'
import { cn } from '../../lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string
  /** Alt text for the avatar image */
  alt?: string
  /** Initials to display when no image is available */
  initials?: string
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  /** Whether the avatar should be rounded */
  rounded?: boolean
  /** Avatar shape (circle or square) */
  shape?: 'circle' | 'square'
  /** Status indicator (online, busy, away, offline) */
  status?: 'online' | 'busy' | 'away' | 'offline'
  /** Position of the status indicator */
  statusPosition?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
  /** Border color for the avatar */
  borderColor?: string
  /** Additional classes for styling */
  className?: string
}

export function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',
  rounded = true,
  shape = 'circle',
  status,
  statusPosition = 'bottom-right',
  borderColor,
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = useState(false)

  // Size classes or custom size
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  }

  // Shape classes
  const shapeClasses =
    shape === 'circle' ? 'rounded-full' : rounded ? 'rounded-md' : ''

  // Status indicator classes
  const statusClasses = {
    online: 'bg-green-500',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500',
  }

  // Status position classes
  const statusPositionClasses = {
    'top-right': '-right-0.5 -top-0.5',
    'bottom-right': '-right-0.5 -bottom-0.5',
    'bottom-left': '-left-0.5 -bottom-0.5',
    'top-left': '-left-0.5 -top-0.5',
  }

  // Handle custom size
  const sizeStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px`, fontSize: `${size / 2.5}px` }
      : {}

  // Prepare border style if provided
  const borderStyle = borderColor ? { border: `2px solid ${borderColor}` } : {}

  // Calculate background color for initials based on the string
  const getInitialsBackgroundColor = (initials?: string) => {
    if (!initials) {
      return 'bg-gray-300 dark:bg-gray-700'
    }

    // Simple hash function to generate consistent color
    const hash = initials
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)

    const colors = [
      'bg-blue-500 dark:bg-blue-600',
      'bg-green-500 dark:bg-green-600',
      'bg-purple-500 dark:bg-purple-600',
      'bg-yellow-500 dark:bg-yellow-600',
      'bg-red-500 dark:bg-red-600',
      'bg-pink-500 dark:bg-pink-600',
      'bg-indigo-500 dark:bg-indigo-600',
      'bg-teal-500 dark:bg-teal-600',
    ]

    return colors[hash % colors.length]
  }

  const renderContent = () => {
    if (hasError || !src) {
      return (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center text-white',
            getInitialsBackgroundColor(initials),
          )}
        >
          {initials ? (
            <span className="font-medium uppercase">{initials}</span>
          ) : (
            <svg
              className="h-1/2 w-1/2 text-gray-400 dark:text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      )
    }
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-800',
        typeof size === 'string' ? sizeClasses[size] : '',
        shapeClasses,
        className,
      )}
      style={{ ...sizeStyle, ...borderStyle }}
      {...props}
    >
      {renderContent()}

      {/* Status indicator */}
      {status && (
        <span
          className={cn(
            'absolute h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800',
            statusClasses[status],
            statusPositionClasses[statusPosition],
          )}
        />
      )}
    </div>
  )
}

export default Avatar
