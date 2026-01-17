"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  running: "bg-primary/10 text-primary border border-primary/20",
  paused: "bg-muted text-muted-foreground border border-border",
  completed: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  queued: "bg-muted text-muted-foreground border border-border",
  pending: "bg-muted text-muted-foreground border border-border",
  generating: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
  testing: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
  comparing: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
  passed: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  evaluated: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
}

type StatusBadgeProps =
  | { label: string; tone: string; status?: never }
  | { status: string; label?: never; tone?: never }

export function StatusBadge(props: StatusBadgeProps) {
  const status = 'status' in props && props.status ? props.status : props.tone
  const label = 'status' in props && props.status ? props.status : props.label

  return (
    <Badge className={cn("px-2 py-1 text-xs capitalize", statusStyles[status || 'pending'])}>
      {label}
    </Badge>
  )
}
