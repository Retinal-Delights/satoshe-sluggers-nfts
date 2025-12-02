// components/ui/textarea.tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-neutral-600 focus-visible:border-brand-pink focus-visible:ring-brand-pink/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-[2px] border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-1 focus-visible:rounded-[2px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      spellCheck={false}
      {...props}
    />
  )
}

export { Textarea }
