"use client"

import { useState, useEffect } from "react"

const DYSLEXIA_MODE_KEY = "dyslexia-friendly-mode"

/**
 * Hook to manage dyslexia-friendly font mode
 * Persists preference in localStorage
 */
export function useDyslexiaMode() {
  const [isDyslexiaMode, setIsDyslexiaMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(DYSLEXIA_MODE_KEY)
    if (saved === "true") {
      setIsDyslexiaMode(true)
      document.documentElement.classList.add("dyslexia-mode")
    }
  }, [])

  const toggleDyslexiaMode = () => {
    const newValue = !isDyslexiaMode
    setIsDyslexiaMode(newValue)
    
    if (newValue) {
      document.documentElement.classList.add("dyslexia-mode")
      localStorage.setItem(DYSLEXIA_MODE_KEY, "true")
    } else {
      document.documentElement.classList.remove("dyslexia-mode")
      localStorage.setItem(DYSLEXIA_MODE_KEY, "false")
    }
  }

  return {
    isDyslexiaMode,
    toggleDyslexiaMode,
    mounted,
  }
}
