import React, { useState, useEffect, forwardRef } from 'react'
import type { ReactNode } from 'react'
import { dlpService, type DLPRule, DLPAction } from '../../../lib/security/dlp'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Create an inline Label component
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string
  children: ReactNode
}

const Label = ({ htmlFor, children, ...props }: LabelProps) => (
  <label
    htmlFor={htmlFor}
    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    {...props}
  >
    {children}
  </label>
)

// Create an inline Textarea component
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, placeholder, value, onChange, rows, ...props }, ref) => (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      ref={ref}
      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  ),
)

Textarea.displayName = 'Textarea'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-radix'

/**
 * DLP Rule Editor Component
 *
 * Handles creating new rules and editing existing ones
 */
export default function DLPRuleEditor() {
  // Default empty rule
  const defaultRule = {
    id: '',
    name: '',
    description: '',
    action: DLPAction.REDACT,
    isActive: true,
  }

  // State for the rule being edited
  const [currentRule, setCurrentRule] = useState<Partial<DLPRule>>(defaultRule)
  const [isEditing, setIsEditing] = useState(false)

  // Listen for edit-rule events
  useEffect(() => {
    const handleEditRule = (event: CustomEvent) => {
      setCurrentRule(event.detail)
      setIsEditing(true)
    }

    const handleNewRule = () => {
      setCurrentRule(defaultRule)
      setIsEditing(false)
    }

    // Add event listeners
    document.addEventListener('dlp:edit-rule', handleEditRule as EventListener)
    document.addEventListener('dlp:new-rule', handleNewRule)

    // Clean up event listeners on unmount
    return () => {
      document.removeEventListener(
        'dlp:edit-rule',
        handleEditRule as EventListener,
      )
      document.removeEventListener('dlp:new-rule', handleNewRule)
    }
  }, [defaultRule])

  // Handle input changes
  const handleChange = (field: string, value: string | boolean) => {
    setCurrentRule({
      ...currentRule,
      [field]: value,
    })
  }

  // Save rule
  const saveRule = () => {
    // Validation
    if (!currentRule.id || !currentRule.name) {
      document.dispatchEvent(
        new CustomEvent('dlp:error', {
          detail: { message: 'Rule ID and name are required' },
        }),
      )
      return
    }

    try {
      // Need to construct a valid rule with a matches function
      const ruleToSave: DLPRule = {
        id: currentRule.id || '',
        name: currentRule.name || '',
        description: currentRule.description || '',
        action: (currentRule.action as DLPAction) || DLPAction.REDACT,
        isActive:
          currentRule.isActive === undefined ? true : !!currentRule.isActive,
        // Default matcher looks for the term specified in the rule name
        matches: (content: string) => {
          const searchTerm = currentRule.name?.toLowerCase() || ''
          return content.toLowerCase().includes(searchTerm)
        },
      }

      // If it's a REDACT rule, add a redact function
      if (ruleToSave.action === DLPAction.REDACT) {
        ruleToSave.redact = (content: string) => {
          const searchTerm = currentRule.name?.toLowerCase() || ''
          return content.replace(new RegExp(searchTerm, 'gi'), '[REDACTED]')
        }
      }

      // Add to DLP service
      dlpService.addRule(ruleToSave)

      // Dispatch event to notify that a rule has been saved
      document.dispatchEvent(
        new CustomEvent('dlp:rule-saved', {
          detail: {
            rule: ruleToSave,
            isEditing,
          },
        }),
      )

      // Reset the form and switch to rules tab
      setCurrentRule(defaultRule)
      setIsEditing(false)

      // Switch back to rules tab
      const rulesTab = document.querySelector('[value="rules"]') as HTMLElement
      if (rulesTab) {
        setTimeout(() => {
          rulesTab.click()

          // Trigger event to refresh rules list
          document.dispatchEvent(new CustomEvent('dlp:rules-updated'))
        }, 100)
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      document.dispatchEvent(
        new CustomEvent('dlp:error', {
          detail: {
            message: `Error saving rule: ${error instanceof Error ? error.message : String(error)}`,
          },
        }),
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit DLP Rule' : 'Create New DLP Rule'}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Modify the existing DLP rule'
            : 'Define a new rule to control how sensitive data is handled'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            saveRule()
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-id">Rule ID</Label>
              <Input
                id="rule-id"
                placeholder="unique-rule-id"
                value={currentRule.id}
                onChange={(e) => handleChange('id', e.target.value)}
                readOnly={isEditing}
                className={isEditing ? 'bg-muted' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="PHI Detection"
                value={currentRule.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Textarea
              id="rule-description"
              placeholder="Describe what this rule does and when it applies"
              value={currentRule.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleChange('description', e.target.value)
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-action">Action</Label>
              <Select
                value={currentRule.action as string}
                onValueChange={(value: string) => handleChange('action', value)}
              >
                <SelectTrigger id="rule-action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DLPAction.ALLOW}>Allow</SelectItem>
                  <SelectItem value={DLPAction.REDACT}>Redact</SelectItem>
                  <SelectItem value={DLPAction.BLOCK}>Block</SelectItem>
                  <SelectItem value={DLPAction.BLOCK_AND_ALERT}>
                    Block & Alert
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="rule-active"
                checked={!!currentRule.isActive}
                onCheckedChange={(checked: boolean) =>
                  handleChange('isActive', checked)
                }
              />

              <Label htmlFor="rule-active">Active</Label>
            </div>
          </div>

          {currentRule.action === DLPAction.REDACT && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Preview:</strong> When this rule is triggered, matching
                content will be redacted.
              </p>
              <div className="text-sm">
                <span>Original: </span>
                <span className="font-mono">
                  This contains {currentRule.name || '[term]'}
                </span>
              </div>
              <div className="text-sm">
                <span>Redacted: </span>
                <span className="font-mono">This contains [REDACTED]</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentRule(defaultRule)
                setIsEditing(false)

                // Switch back to rules tab
                const rulesTab = document.querySelector(
                  '[value="rules"]',
                ) as HTMLElement
                if (rulesTab) {
                  rulesTab.click()
                }
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
