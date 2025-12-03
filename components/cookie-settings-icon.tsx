"use client"

import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

declare global {
  interface Window {
    Termly?: {
      displayPreferenceModal?: () => void;
      displayBanner?: () => void;
    };
  }
}

// Cookie Settings Icon - Fixed position component
// This component is rendered directly in layout.tsx to ensure it's always visible
export default function CookieSettingsIcon() {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const isScrollingRef = useRef(false)

  // Prevent tooltip from closing on scroll by tracking scroll state
  useEffect(() => {
    if (typeof window === 'undefined') return

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      isScrollingRef.current = true
      clearTimeout(scrollTimeout)
      
      // If tooltip is open, keep it open during scroll
      if (tooltipOpen) {
        scrollTimeout = setTimeout(() => {
          isScrollingRef.current = false
        }, 150)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [tooltipOpen])

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip 
        open={tooltipOpen} 
        onOpenChange={(open) => {
          // Prevent closing during active scrolling
          if (!open && isScrollingRef.current) {
            return // Don't close if currently scrolling
          }
          setTooltipOpen(open)
        }}
      >
        <TooltipTrigger asChild>
          <a
            href="#"
            className="termly-display-preferences w-10 h-10 flex items-center justify-center hover:bg-neutral-700/50 rounded-full transition-all duration-300"
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '20px',
              zIndex: 99999
            }}
            aria-label="Cookie settings"
            onClick={(e) => {
              e.preventDefault();
              if (typeof window !== 'undefined' && window.Termly?.displayPreferenceModal) {
                window.Termly.displayPreferenceModal();
              }
            }}
          >
            <Image
              src="/icons/cookies/cookies-icon-48px.png"
              alt="Cookie settings"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </a>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-neutral-800 text-off-white border-neutral-600"
        >
          <p>Cookie Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

