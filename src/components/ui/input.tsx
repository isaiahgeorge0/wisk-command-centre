import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { MobileInputShell } from "@/components/layout/mobile-input-shell"
import {
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_TEXT,
} from "@/lib/ui/form-control-styles"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <MobileInputShell>
      <InputPrimitive
        type={type}
        data-slot="input"
        className={cn(
          "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:h-9 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          FORM_CONTROL_TEXT,
          FORM_CONTROL_FOCUS,
          className
        )}
        {...props}
      />
    </MobileInputShell>
  )
}

export { Input }
