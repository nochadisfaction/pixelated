import React, { useCallback, useEffect, useState } from 'react'

import { cn } from '../../lib/utils'
import { Button } from './button'
import FocusTrap from '../accessibility/FocusTrap'

export interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Function to call when the dialog is closed */
  onClose: () => void
  /** Dialog title */
  title?: React.ReactNode
  /** Dialog description/content */
  children: React.ReactNode
  /** Footer content */
  footer?: React.ReactNode
  /** Whether to show a close button in the header */
  showCloseButton?: boolean
  /** Additional className for the dialog */
  className?: string
  /** Additional className for the backdrop */
  backdropClassName?: string
  /** Maximum width of the dialog */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether to close when clicking outside */
  closeOnOutsideClick?: boolean
  /** Whether to close when pressing escape */
  closeOnEsc?: boolean
}

export interface ConfirmDialogProps
  extends Omit<DialogProps, 'footer' | 'children'> {
  /** Message to show in the dialog */
  message: React.ReactNode
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Confirm button variant */
  confirmVariant?: 'primary' | 'danger'
  /** Function to call when confirmed */
  onConfirm: () => void
  /** Dialog content */
  children?: React.ReactNode
  /** Additional props for the confirm button */
  confirmButtonProps?: Record<string, unknown>
  /** Additional props for the cancel button */
  cancelButtonProps?: Record<string, unknown>
  /** Whether this is a dangerous action */
  isDanger?: boolean
  /** Whether the dialog is in loading state */
  loading?: boolean
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  className = '',
  backdropClassName = '',
  maxWidth = 'md',
  closeOnOutsideClick = true,
  closeOnEsc = true,
}: DialogProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (isOpen && closeOnEsc && e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, closeOnEsc])

  // Prevent body scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle outside click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOutsideClick && e.target === e.currentTarget) {
        onClose()
      }
    },
    [closeOnOutsideClick, onClose],
  )

  // Max width classes
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        backdropClassName,
      )}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <FocusTrap active={isOpen} autoFocus={true}>
        <div
          className={cn(
            'w-full rounded-lg bg-white shadow-lg dark:bg-gray-800',
            'overflow-hidden flex flex-col',
            maxWidthClasses[maxWidth],
            className,
          )}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
              {showCloseButton && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  )
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonProps = {},
  cancelButtonProps = {},
  isDanger = false,
  loading = false,
  className = '',
  backdropClassName = '',
  maxWidth = 'sm',
  closeOnOutsideClick = true,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } catch (error) {
      console.error('Error in confirmation handler:', error)
    } finally {
      setIsConfirming(false)
      onClose()
    }
  }, [onConfirm, onClose])

  if (!isOpen) {
    return null
  }

  const isLoading = loading || isConfirming

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        backdropClassName,
      )}
      onClick={
        closeOnOutsideClick && isLoading
          ? (e: React.MouseEvent) => e.stopPropagation()
          : onClose
      }
      aria-modal="true"
      role="alertdialog"
    >
      <FocusTrap active={isOpen} autoFocus={true}>
        <div
          className={cn(
            'w-full rounded-lg bg-white shadow-lg dark:bg-gray-800',
            'overflow-hidden flex flex-col',
            maxWidth === 'sm' ? 'max-w-sm' : 'max-w-md',
            className,
          )}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              {...cancelButtonProps}
            >
              {cancelText}
            </Button>
            <Button
              variant={isDanger ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={isLoading}
              {...confirmButtonProps}
            >
              {isLoading && (
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {confirmText}
            </Button>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}

/**
 * Custom hook for using a dialog
 */
export function useDialog(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}

/**
 * Custom hook for using a confirm dialog
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmProps, setConfirmProps] = useState<
    Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>
  >({
    title: 'Confirm',
    message: '',
    onConfirm: () => null,
  })

  const confirm = useCallback(
    (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
      setConfirmProps(props)
      setIsOpen(true)

      return new Promise<boolean>((resolve) => {
        setConfirmProps({
          ...props,
          onConfirm: () => {
            if (props.onConfirm) {
              props.onConfirm()
            }
            resolve(true)
          },
        })
      })
    },
    [],
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    confirm,
    close,
    confirmProps,
  }
}

export default Dialog
