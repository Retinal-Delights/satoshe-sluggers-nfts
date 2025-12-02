// components/scroll-buttons.tsx
"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ScrollButtons() {
  const scrollToTop = () => {
    const start = window.pageYOffset
    const distance = -start
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

  const scrollToBottom = () => {
    const scrollHeight = document.documentElement.scrollHeight
    const windowHeight = window.innerHeight
    const target = scrollHeight - windowHeight
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
      {/* Two separate scroll buttons - Bottom Right - Stacked vertically */}
      <div className="fixed bottom-6 right-2 sm:right-3 lg:right-4 xl:right-6 2xl:right-8 z-50 flex flex-col gap-2">
        {/* Scroll Up Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={scrollToTop}
              className="w-7 h-7 rounded-full bg-brand-pink hover:bg-brand-pink/90 text-off-white shadow-lg hover:shadow-xl hover:ring-2 hover:ring-white/30 transition-all duration-300 flex items-center justify-center"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-neutral-800 text-off-white border-neutral-600">
            <p>Scroll to top</p>
          </TooltipContent>
        </Tooltip>

        {/* Scroll Down Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={scrollToBottom}
              className="w-7 h-7 rounded-full bg-brand-pink hover:bg-brand-pink/90 text-off-white shadow-lg hover:shadow-xl hover:ring-2 hover:ring-white/30 transition-all duration-300 flex items-center justify-center"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-neutral-800 text-off-white border-neutral-600">
            <p>Scroll to bottom</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

