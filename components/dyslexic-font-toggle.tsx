"use client"

import { useDyslexicFont } from "@/hooks/useDyslexicFont"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Type } from "lucide-react"

export default function DyslexicFontToggle() {
  const { isEnabled, toggle } = useDyslexicFont()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggle()
              }
            }}
            className={`p-2 rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${
              isEnabled 
                ? 'bg-neutral-800 text-brand-pink' 
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
            aria-label={isEnabled ? "Disable dyslexic-friendly font" : "Enable dyslexic-friendly font"}
            aria-pressed={isEnabled}
          >
            <Type className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          sideOffset={8} 
          className="bg-neutral-800 text-off-white border-neutral-600"
          collisionPadding={20}
        >
          <p>{isEnabled ? "Disable" : "Enable"} Dyslexic-Friendly Font</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

