"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function LiveIndicator({
  label = "Live",
  active = true,
}: {
  label?: string
  active?: boolean
}) {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    if (!active) return

    const timer = setInterval(() => setPulse((prev) => !prev), 1000)
    return () => clearInterval(timer)
  }, [active])

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "size-2 rounded-full",
          active ? "bg-emerald-500" : "bg-muted-foreground",
          pulse && active && "opacity-30"
        )}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
