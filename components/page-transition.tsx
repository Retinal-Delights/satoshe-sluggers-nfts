"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/lib/reduced-motion"

interface PageTransitionProps {
  children: React.ReactNode
}

/**
 * PageTransition Component
 * 
 * Provides subtle fade-in and y-axis movement animations for page content.
 * Respects user's reduced motion preferences.
 * 
 * Animation details:
 * - Fade in: opacity 0 → 1
 * - Y-axis movement: 20px → 0
 * - Duration: 0.3s with easeInOut
 * 
 * @param {PageTransitionProps} props - Component props
 * @param {React.ReactNode} props.children - Page content to animate
 * @returns {JSX.Element} Animated page wrapper
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const reducedMotion = useReducedMotion()

  // If user prefers reduced motion, skip animations
  if (reducedMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}

