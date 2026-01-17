"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import type { RunPackage } from "@/lib/mock-data"

export function PackageTable({
  packages,
  runId,
}: {
  packages: RunPackage[]
  runId: string
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="pb-3 font-medium">Package</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Baseline</th>
              <th className="pb-3 font-medium">Informed</th>
              <th className="pb-3 font-medium">Duration</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => {
              const totalDuration = pkg.steps.reduce(
                (total, step) => total + step.durationMs,
                0
              )

              return (
                <tr key={pkg.id} className="border-border/60 border-t">
                  <td className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{pkg.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {pkg.version}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <StatusBadge label={pkg.status} tone={pkg.status} />
                  </td>
                  <td className="py-4">
                    <StatusBadge
                      label={pkg.baseline.passed ? "Passed" : "Failed"}
                      tone={pkg.baseline.passed ? "passed" : "failed"}
                    />
                  </td>
                  <td className="py-4">
                    <StatusBadge
                      label={pkg.informed.passed ? "Passed" : "Failed"}
                      tone={pkg.informed.passed ? "passed" : "failed"}
                    />
                  </td>
                  <td className="py-4 text-muted-foreground">
                    {Math.round(totalDuration / 100) / 10}s
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/runs/${runId}/packages/${pkg.id}`}
                      className="text-primary text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
