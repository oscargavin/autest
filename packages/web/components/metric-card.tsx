import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function MetricCard({
  title,
  value,
  delta,
}: {
  title: string
  value: string
  delta?: string
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-1 py-4">
        <p className="text-muted-foreground text-xs">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold">{value}</p>
          {delta && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                delta.startsWith("+")
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {delta}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
