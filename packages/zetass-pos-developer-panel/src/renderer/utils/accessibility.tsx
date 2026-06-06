import { useEffect } from 'react'

/**
 * Enhanced keyboard navigation hook
 */
export function useKeyboardNav() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      // Tab navigation enhancement
      if (e.key === 'Tab') {
        // Add visible focus indicator
        document.body.classList.add('keyboard-nav')
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        const event = new CustomEvent('escape-pressed')
        window.dispatchEvent(event)
      }

      // Arrow key navigation for lists
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
        const focusable = document.querySelectorAll('[role="option"], [role="menuitem"]')
        const current = document.activeElement
        const currentIndex = Array.from(focusable).indexOf(current as Element)

        if (currentIndex !== -1) {
          e.preventDefault()
          const nextIndex = e.key === 'ArrowDown' 
            ? Math.min(currentIndex + 1, focusable.length - 1)
            : Math.max(currentIndex - 1, 0)
          ;(focusable[nextIndex] as HTMLElement).focus()
        }
      }
    }

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-nav')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])
}

/**
 * Announce to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Focus trap for modals
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Focus first element
    firstElement?.focus()

    container.addEventListener('keydown', handleTab as any)
    return () => container.removeEventListener('keydown', handleTab as any)
  }, [isActive, containerRef])
}

/**
 * Skip to main content link
 */
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
    >
      Skip to main content
    </a>
  )
}
