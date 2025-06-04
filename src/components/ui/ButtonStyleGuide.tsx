import * as React from 'react'
import { Button } from './button'

/**
 * Button Style Guide Component
 *
 * This component displays all available button variants and sizes
 * to serve as a reference for the standardized button system.
 */
export function ButtonStyleGuide() {
  const variants = [
    'default',
    'destructive',
    'outline',
    'secondary',
    'ghost',
    'link',
  ] as const

  const sizes = ['default', 'sm', 'lg', 'icon'] as const

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Button Variants</h2>
        <p className="text-muted-foreground">
          Use button variants to convey different meanings and importance
          levels.
        </p>
        <div className="flex flex-wrap gap-4">
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Button Sizes</h2>
        <p className="text-muted-foreground">
          Use different button sizes based on context and space requirements.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              {size === 'icon'
                ? '✓'
                : size.charAt(0).toUpperCase() + size.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Button States</h2>
        <p className="text-muted-foreground">
          Buttons have different states to indicate interaction possibilities.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="outline" disabled>
            Outline Disabled
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Button with Icon</h2>
        <p className="text-muted-foreground">
          Buttons can include icons to enhance meaning and visual appeal.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button>
            <svg
              className="mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Continue
          </Button>
          <Button variant="outline">
            <svg
              className="mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ButtonStyleGuide
