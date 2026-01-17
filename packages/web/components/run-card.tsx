import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { formatPercent } from "@/lib/format"
import type { RunSummary } from "@/lib/mock-data"

export function RunCard({ run }: { run: RunSummary }) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{run.name}</p>
            <p className="text-muted-foreground text-xs">
              Updated {run.updatedAt}
            </p>
          </div>
          <StatusBadge label={run.status} tone={run.status} />
        </div>
        <div className="grid gap-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Packages</span>
            <span>
              {run.packagesCompleted}/{run.packagesTotal}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Baseline pass</span>
            <span>{formatPercent(run.baselinePassRate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Informed pass</span>
            <span>{formatPercent(run.informedPassRate)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Link
            href={`/runs/${run.id}`}
            className="text-sm font-medium text-primary"
          >
            View run
          </Link>
          <Link
            href={`/runs/${run.id}/results`}
            className="text-xs text-muted-foreground"
          >
            Results
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
