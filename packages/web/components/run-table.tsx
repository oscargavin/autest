import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { formatDelta, formatPercent } from "@/lib/format"
import type { RunSummary } from "@/lib/mock-data"

export function RunTable({ runs }: { runs: RunSummary[] }) {
  return (
    <Card className="border-border/60">
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="pb-3 font-medium">Run</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Packages</th>
              <th className="pb-3 font-medium">Baseline</th>
              <th className="pb-3 font-medium">Informed</th>
              <th className="pb-3 font-medium">Uplift</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-border/60 border-t">
                <td className="py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{run.name}</span>
                    <span className="text-muted-foreground text-xs">
                      Started {run.startedAt}
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <StatusBadge label={run.status} tone={run.status} />
                </td>
                <td className="py-4">
                  {run.packagesCompleted}/{run.packagesTotal}
                </td>
                <td className="py-4">{formatPercent(run.baselinePassRate)}</td>
                <td className="py-4">{formatPercent(run.informedPassRate)}</td>
                <td className="py-4">{formatDelta(run.uplift)}</td>
                <td className="py-4 text-right">
                  <Link
                    className="text-primary text-xs font-medium"
                    href={`/runs/${run.id}`}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
