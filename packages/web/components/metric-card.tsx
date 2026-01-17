import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function MetricCard({
  title,
  value,
  delta,
  icon,
}: {
  title: string
  value: string
  delta?: string
  icon?: ReactNode
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4">
        <div className="bg-muted text-foreground flex size-10 items-center justify-center rounded-2xl">
          {icon}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-muted-foreground text-xs">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{value}</p>
            {delta && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  delta.startsWith("+")
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600"
                )}
              >
                {delta}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
