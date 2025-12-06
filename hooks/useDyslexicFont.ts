"use client"

import { useState, useEffect } from 'react'

const DYSLEXIC_FONT_KEY = 'dyslexic-font-enabled'

export function useDyslexicFont() {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    // Check localStorage on mount
    const saved = localStorage.getItem(DYSLEXIC_FONT_KEY)
    if (saved === 'true') {
      setIsEnabled(true)
      document.documentElement.classList.add('dyslexic-font')
    }
  }, [])

  const toggle = () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    
    if (newValue) {
      document.documentElement.classList.add('dyslexic-font')
      localStorage.setItem(DYSLEXIC_FONT_KEY, 'true')
    } else {
      document.documentElement.classList.remove('dyslexic-font')
      localStorage.setItem(DYSLEXIC_FONT_KEY, 'false')
    }
  }

  return { isEnabled, toggle }
}

