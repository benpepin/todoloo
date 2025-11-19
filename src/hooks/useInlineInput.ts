import { useState, useCallback, useRef, useEffect } from 'react'

export interface InlineInputOptions {
  /** Initial value for the input */
  initialValue: string
  /** Callback when input is saved */
  onSave: (value: string) => void | Promise<void>
  /** Optional callback when input is cancelled */
  onCancel?: () => void
  /** Auto-focus the input when editing starts (default: true) */
  autoFocus?: boolean
  /** Auto-select text when editing starts (default: false) */
  autoSelect?: boolean
  /** Save on blur event (default: true) */
  saveOnBlur?: boolean
  /** Allow empty values to be saved (default: false) */
  allowEmpty?: boolean
}

export interface InlineInputReturn {
  /** Current input value */
  value: string
  /** Update the input value */
  setValue: (value: string) => void
  /** Whether the input is in editing mode */
  isEditing: boolean
  /** Set editing mode */
  setIsEditing: (editing: boolean) => void
  /** Ref for the input element */
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
  /** Handler for key down events (handles Enter and Escape) */
  handleKeyDown: (e: React.KeyboardEvent) => void
  /** Handler for blur events */
  handleBlur: () => void
  /** Handler to save the input */
  handleSave: () => void
  /** Handler to cancel editing */
  handleCancel: () => void
}

/**
 * Hook for managing inline input fields with standardized keyboard handling
 * @param options Configuration options
 * @returns Input state and handlers
 */
export function useInlineInput(options: InlineInputOptions): InlineInputReturn {
  const {
    initialValue,
    onSave,
    onCancel,
    autoFocus = true,
    autoSelect = false,
    saveOnBlur = true,
    allowEmpty = false
  } = options

  const [value, setValue] = useState(initialValue)
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Auto-focus and select when editing starts
  useEffect(() => {
    if (isEditing && autoFocus && inputRef.current) {
      inputRef.current.focus()
      if (autoSelect) {
        inputRef.current.select()
      }
    }
  }, [isEditing, autoFocus, autoSelect])

  const handleSave = useCallback(async () => {
    const trimmedValue = value.trim()

    if (!allowEmpty && !trimmedValue) {
      // Reset to initial value if empty and not allowed
      setValue(initialValue)
      setIsEditing(false)
      return
    }

    try {
      await onSave(trimmedValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
      // Keep editing mode on error
    }
  }, [value, onSave, allowEmpty, initialValue])

  const handleCancel = useCallback(() => {
    setValue(initialValue)
    setIsEditing(false)
    onCancel?.()
  }, [initialValue, onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const handleBlur = useCallback(() => {
    if (saveOnBlur) {
      handleSave()
    }
  }, [saveOnBlur, handleSave])

  return {
    value,
    setValue,
    isEditing,
    setIsEditing,
    inputRef,
    handleKeyDown,
    handleBlur,
    handleSave,
    handleCancel
  }
}
