import * as React from "react"

import { MobileInputShell } from "@/components/layout/mobile-input-shell"
import {
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_TEXT,
} from "@/lib/ui/form-control-styles"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <MobileInputShell>
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          FORM_CONTROL_TEXT,
          FORM_CONTROL_FOCUS,
          className
        )}
        {...props}
      />
    </MobileInputShell>
  )
})

export { Textarea }
