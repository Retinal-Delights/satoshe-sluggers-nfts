// components/scroll-buttons.tsx
"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ScrollButtons() {
  const [isAtTop, setIsAtTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollBottom = documentHeight - (scrollTop + windowHeight)
      
      // If near top (< 100px from top), show down arrow to scroll to bottom
      // If near bottom (< 100px from bottom), show up arrow to scroll to top
      // Otherwise, show down arrow if we're closer to top, up arrow if closer to bottom
      if (scrollTop < 100) {
        setIsAtTop(true) // Near top - show down arrow
      } else if (scrollBottom < 100) {
        setIsAtTop(false) // Near bottom - show up arrow
      } else {
        // In the middle - show down arrow if we have more content below than above
        setIsAtTop(scrollBottom > scrollTop)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Check initial state

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTopOrBottom = () => {
    // If at top (showing down arrow), scroll to bottom; otherwise scroll to top
    const scrollHeight = document.documentElement.scrollHeight
    const windowHeight = window.innerHeight
    const target = isAtTop ? scrollHeight - windowHeight : 0
    const start = window.pageYOffset
    const distance = target - start
    const duration = 3500 // 3.5 seconds for slower, more gentle scroll
    let startTime: number | null = null

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      const easing = easeInOutCubic(progress)
      
      window.scrollTo(0, start + distance * easing)
      
      if (progress < 1) {
        requestAnimationFrame(animation)
      }
    }

    requestAnimationFrame(animation)
  }

  return (
    <TooltipProvider>
      {/* Scroll Up/Down Button - Bottom Right - Always Visible */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={scrollToTopOrBottom}
            className="fixed bottom-6 right-4 sm:right-6 lg:right-8 xl:right-12 z-50 w-10 h-10 rounded-full bg-brand-pink hover:bg-brand-pink/90 text-off-white shadow-lg hover:shadow-xl hover:ring-2 hover:ring-white/30 transition-all duration-300 flex items-center justify-center group"
            aria-label={isAtTop ? "Scroll to bottom" : "Scroll to top"}
          >
            {isAtTop ? (
              <ArrowDown className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-neutral-800 text-off-white border-neutral-600">
          <p>{isAtTop ? "Scroll to bottom" : "Scroll to top"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

