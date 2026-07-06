import * as React from "react"
import { cn } from "@/lib/utils"

function AIPanel({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ai-panel"
      className={cn(
        "rounded-xl bg-[length:200%_200%] bg-gradient-to-r from-primary via-primary/40 to-primary p-px [animation:ai-panel-glow_6s_ease_infinite]",
        className
      )}
      {...props}
    >
      <div className="rounded-[calc(var(--radius-xl)-1px)] bg-card p-4">{children}</div>
    </div>
  )
}

export { AIPanel }
