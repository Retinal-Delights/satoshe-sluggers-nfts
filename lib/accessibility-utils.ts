// lib/accessibility-utils.ts
"use client"

/**
 * Announces a message to screen readers using a live region
 * @param message - The text to announce to screen readers
 * @param priority - Announcement priority: 'polite' (default) or 'assertive' (interrupts)
 * @example
 * announceToScreenReader("NFT added to favorites", "polite")
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const liveRegion = document.getElementById('live-region')
  if (liveRegion) {
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.textContent = message
    
    // Clear after a short delay to allow for new announcements
    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = ''
      }
    }, 1000)
  }
}

/**
 * Traps keyboard focus within a container (e.g., modal or dialog)
 * Prevents tabbing outside the element and cycles focus within it
 * @param element - The container element to trap focus within
 * @returns Cleanup function to remove the focus trap
 * @example
 * const cleanup = trapFocus(modalElement)
 * // Later: cleanup() to remove trap
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>
  
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
  }
  
  element.addEventListener('keydown', handleTabKey)
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Generates keyboard event handlers for common navigation patterns
 * Returns an object with onKeyDown handler that maps keys to callbacks
 * @param onEnter - Callback for Enter or Space key
 * @param onEscape - Callback for Escape key
 * @param onArrowUp - Callback for ArrowUp key
 * @param onArrowDown - Callback for ArrowDown key
 * @param onArrowLeft - Callback for ArrowLeft key
 * @param onArrowRight - Callback for ArrowRight key
 * @returns Object with onKeyDown handler for use in React components
 * @example
 * <div {...getKeyboardNavigationProps(() => handleClick(), () => handleClose())} />
 */
export function getKeyboardNavigationProps(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void
) {
  return {
    onKeyDown: (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          onEnter?.()
          break
        case 'Escape':
          onEscape?.()
          break
        case 'ArrowUp':
          onArrowUp?.()
          break
        case 'ArrowDown':
          onArrowDown?.()
          break
        case 'ArrowLeft':
          onArrowLeft?.()
          break
        case 'ArrowRight':
          onArrowRight?.()
          break
      }
    }
  }
}

/**
 * Generates descriptive alt text for NFT images
 * @param name - NFT name
 * @param cardNumber - NFT card number
 * @param rank - NFT rank
 * @param rarity - Rarity tier name
 * @param tier - Rarity tier number
 * @returns Formatted alt text string for screen readers
 */
export function generateNFTAltText(name: string, cardNumber: number, rank: string | number, rarity: string, tier: string | number) {
  return `${name} - NFT #${cardNumber}, Rank ${rank}, ${rarity} rarity, Tier ${tier}`
}

/**
 * Generates ARIA label for buttons with action and item context
 * @param action - The action being performed (e.g., "Add", "Remove", "View")
 * @param itemName - The name of the item being acted upon
 * @param additionalInfo - Optional additional context information
 * @returns Formatted ARIA label string
 * @example
 * generateButtonAriaLabel("Add", "NFT #1234", "to favorites") // "Add NFT #1234 - to favorites"
 */
export function generateButtonAriaLabel(action: string, itemName: string, additionalInfo?: string) {
  return `${action} ${itemName}${additionalInfo ? ` - ${additionalInfo}` : ''}`
}

// Focus restoration
let previousFocusElement: HTMLElement | null = null

/**
 * Saves the currently focused element for later restoration
 * Useful when opening modals/dialogs to restore focus when closing
 */
export function saveFocus() {
  previousFocusElement = document.activeElement as HTMLElement
}

/**
 * Restores focus to the previously saved element
 * Typically called when closing a modal/dialog to return focus to trigger element
 */
export function restoreFocus() {
  if (previousFocusElement) {
    previousFocusElement.focus()
    previousFocusElement = null
  }
}
