import React, { useId } from 'react'

import { cn } from '../../lib/utils'

export interface ListProps
  extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  /** List type */
  type?: 'ul' | 'ol'
  /** List variant */
  variant?: 'default' | 'disc' | 'circle' | 'square' | 'decimal' | 'none'
  /** List size */
  size?: 'sm' | 'md' | 'lg'
  /** Whether items have dividers */
  divided?: boolean
  /** Whether list is horizontal */
  horizontal?: boolean
  /** Maximum number of items to display (with "...and X more" for others) */
  maxItems?: number
  /** Whether list items have hover effect */
  hoverable?: boolean
  /** Additional class name */
  className?: string
}

export function List({
  type = 'ul',
  variant = 'default',
  size = 'md',
  divided = false,
  horizontal = false,
  maxItems,
  hoverable = false,
  className,
  children,
  ...props
}: ListProps) {
  // Size classes
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  // List style classes
  const variantClasses = {
    default: type === 'ul' ? 'list-disc' : 'list-decimal',
    disc: 'list-disc',
    circle: 'list-[circle]',
    square: 'list-[square]',
    decimal: 'list-decimal',
    none: 'list-none',
  }

  // Layout classes
  const layoutClasses = horizontal
    ? 'flex flex-row flex-wrap gap-x-6'
    : 'flex flex-col gap-y-2'

  // Divided classes
  const dividedClasses =
    divided && !horizontal
      ? 'divide-y divide-gray-200 dark:divide-gray-700'
      : ''

  // Hover classes
  const hoverClasses = hoverable
    ? 'has-[[data-list-item]]:hover:[[data-list-item]:hover:bg-gray-50] has-[[data-list-item]]:hover:[[data-list-item]:hover:dark:bg-gray-800]'
    : ''

  const Component = type === 'ol' ? 'ol' : 'ul'

  // Handle maxItems if specified
  let childrenArray = React.Children.toArray(children)
  let extraItemsCount = 0

  if (maxItems && childrenArray.length > maxItems) {
    extraItemsCount = childrenArray.length - maxItems
    childrenArray = childrenArray.slice(0, maxItems)
  }

  return (
    <Component
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        layoutClasses,
        dividedClasses,
        hoverClasses,
        { 'pl-5': variant !== 'none' && !horizontal },
        className,
      )}
      role={type === 'ul' ? 'list' : undefined}
      {...props}
    >
      {childrenArray}

      {extraItemsCount > 0 && (
        <li className="text-gray-500 italic">
          ...and {extraItemsCount} more item
          {extraItemsCount > 1 ? 's' : ''}
        </li>
      )}
    </Component>
  )
}

export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Whether the item is active */
  active?: boolean
  /** Whether the item is disabled */
  disabled?: boolean
  /** Icon to display before the item */
  icon?: React.ReactNode
  /** Additional content to display after the item */
  suffix?: React.ReactNode
  /** Whether the item is clickable */
  clickable?: boolean
  /** Callback when the item is clicked */
  onClick?: (e: React.MouseEvent) => void
  /** Additional class name */
  className?: string
}

export function ListItem({
  active = false,
  disabled = false,
  icon,
  suffix,
  clickable = false,
  onClick,
  className,
  children,
  ...props
}: ListItemProps) {
  return (
    <li
      data-list-item
      className={cn(
        'relative py-2 rounded-sm',
        {
          'text-primary font-medium': active,
          'text-gray-400 dark:text-gray-600 pointer-events-none': disabled,
          'cursor-pointer': clickable || onClick,
          'transition-colors': clickable || onClick,
        },
        className,
      )}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled ? true : undefined}
      aria-current={active ? 'true' : undefined}
      {...props}
    >
      {/* If we have an icon, use a custom layout */}
      {icon ? (
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
          <span className="flex-grow">{children}</span>
          {suffix && <span className="flex-shrink-0 ml-auto">{suffix}</span>}
        </div>
      ) : (
        // Otherwise, standard layout with optional suffix
        <>
          {children}
          {suffix && <span className="ml-auto float-right">{suffix}</span>}
        </>
      )}
    </li>
  )
}

export interface ListGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** List group title */
  heading: React.ReactNode
  /** Whether the group is collapsible */
  collapsible?: boolean
  /** Whether the group is expanded (if collapsible) */
  expanded?: boolean
  /** Function to call when expand state changes */
  onExpandedChange?: (expanded: boolean) => void
  /** Badge to display next to the title */
  badge?: React.ReactNode
  /** Additional class name */
  className?: string
}

export function ListGroup({
  heading,
  collapsible = false,
  expanded = true,
  onExpandedChange,
  badge,
  className,
  children,
  ...props
}: ListGroupProps) {
  const uniqueId = useId()
  const contentId = `list-group-${uniqueId}`

  const handleToggle = () => {
    if (collapsible && onExpandedChange) {
      onExpandedChange(!expanded)
    }
  }

  return (
    <div className={cn('mb-4', className)} {...props}>
      {/* Group header */}
      <div
        className={cn('mb-2 font-medium text-gray-900 dark:text-gray-100', {
          'cursor-pointer': collapsible,
        })}
        onClick={collapsible ? handleToggle : undefined}
        aria-expanded={collapsible ? expanded : undefined}
        aria-controls={collapsible ? contentId : undefined}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <svg
              className={cn('h-4 w-4 transition-transform duration-200', {
                'rotate-90': expanded,
              })}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
          <div className="flex-grow">{heading}</div>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
      </div>

      {/* Group content with animation */}
      <div
        id={contentId}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          {
            'max-h-0 opacity-0': collapsible && !expanded,
            'max-h-[1000px] opacity-100': !collapsible || expanded,
          },
        )}
      >
        <div className="pl-2">{children}</div>
      </div>
    </div>
  )
}

/**
 * Nested list item that can contain another lis
 */
export interface NestedListItemProps extends Omit<ListItemProps, 'children'> {
  /** Label for the nested list item */
  label: React.ReactNode
  /** Whether the nested list is expanded */
  expanded?: boolean
  /** On expanded change handler */
  onExpandedChange?: (expanded: boolean) => void
  /** Children of the nested list item (typically another List) */
  children: React.ReactNode
}

export function NestedListItem({
  label,
  expanded = false,
  onExpandedChange,
  icon,
  suffix,
  className,
  children,
  ...props
}: NestedListItemProps) {
  const uniqueId = useId()
  const contentId = `nested-list-${uniqueId}`

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExpandedChange) {
      onExpandedChange(!expanded)
    }
  }

  return (
    <li data-list-item className={cn('relative py-2', className)} {...props}>
      <div
        className="flex items-center cursor-pointer"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {icon && <span className="flex-shrink-0 mr-3">{icon}</span>}

        <svg
          className={cn('h-4 w-4 mr-2 transition-transform duration-200', {
            'rotate-90': expanded,
          })}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>

        <span className="flex-grow">{label}</span>
        {suffix && <span className="flex-shrink-0 ml-auto">{suffix}</span>}
      </div>

      <div
        id={contentId}
        className={cn(
          'pl-6 mt-2 overflow-hidden transition-all duration-300 ease-in-out',
          {
            'max-h-0 opacity-0': !expanded,
            'max-h-[1000px] opacity-100': expanded,
          },
        )}
      >
        {children}
      </div>
    </li>
  )
}

export default List
