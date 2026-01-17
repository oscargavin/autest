"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RunActivity } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const toneStyles: Record<string, string> = {
  info: "bg-sky-500/10 text-sky-600",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
  error: "bg-rose-500/10 text-rose-600",
}

export function ActivityFeed({ activities }: { activities: RunActivity[] }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Live activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-1 size-2 rounded-full",
                toneStyles[activity.tone ?? "info"]
              )}
            />
            <div className="flex-1">
              <p className="text-sm">{activity.message}</p>
              <p className="text-muted-foreground text-xs">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
