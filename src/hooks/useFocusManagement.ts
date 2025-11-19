import { useEffect, RefObject } from 'react'

/**
 * Auto-focus an element when a condition becomes true
 * @param ref Reference to the element to focus
 * @param condition When true, the element will be focused
 * @param options Focus options
 */
export function useFocusOnMount(
  ref: RefObject<HTMLElement>,
  condition: boolean = true,
  options?: { select?: boolean }
) {
  useEffect(() => {
    if (condition && ref.current) {
      ref.current.focus()
      if (options?.select && 'select' in ref.current) {
        ;(ref.current as HTMLInputElement | HTMLTextAreaElement).select()
      }
    }
  }, [condition, options?.select])
}

/**
 * Programmatically focus an element with optional text selection
 * @param ref Reference to the element to focus
 * @param options Focus options
 */
export function focusElement(
  ref: RefObject<HTMLElement>,
  options?: { select?: boolean; delay?: number }
) {
  const delay = options?.delay ?? 0

  setTimeout(() => {
    if (ref.current) {
      ref.current.focus()
      if (options?.select && 'select' in ref.current) {
        ;(ref.current as HTMLInputElement | HTMLTextAreaElement).select()
      }
    }
  }, delay)
}
