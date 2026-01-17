"use client"

import { cn } from "@/lib/utils"
import type { StepStatus } from "@/lib/mock-data"

type TimelineStep = {
  id: string
  label: string
  status: StepStatus
  durationMs: number
}

const statusStyles: Record<StepStatus, string> = {
  pending: "border-border text-muted-foreground",
  running: "border-primary text-primary",
  complete: "border-emerald-500 text-emerald-600",
}

export function StepTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="grid gap-3">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3">
          <div
            className={cn(
              "bg-background flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
              statusStyles[step.status]
            )}
          >
            {step.label.slice(0, 1)}
          </div>
          <div className="flex flex-1 items-center justify-between">
            <div>
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-muted-foreground text-xs">
                {step.status}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {Math.round(step.durationMs / 100) / 10}s
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
