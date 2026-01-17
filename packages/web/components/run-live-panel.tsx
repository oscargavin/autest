"use client"

import { useEffect, useState } from "react"
import { ActivityFeed } from "@/components/activity-feed"
import { PackageTable } from "@/components/package-table"
import { StepTimeline } from "@/components/step-timeline"
import type { PackageStatus, RunActivity, RunPackage } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const streamStatuses: PackageStatus[] = [
  "queued",
  "generating",
  "testing",
  "comparing",
]

const statusOrder: PackageStatus[] = [
  "queued",
  "generating",
  "testing",
  "comparing",
  "passed",
  "failed",
]

const getNextStatus = (pkg: RunPackage): PackageStatus => {
  switch (pkg.status) {
    case "queued":
      return "generating"
    case "generating":
      return "testing"
    case "testing":
      return "comparing"
    case "comparing":
      return pkg.informed.passed ? "passed" : "failed"
    default:
      return pkg.status
  }
}

const getStepStatus = (status: PackageStatus, index: number) => {
  const activeIndex = statusOrder.indexOf(status)

  if (status === "passed" || status === "failed") {
    return "complete"
  }

  if (index < activeIndex) {
    return "complete"
  }

  if (index === activeIndex) {
    return "running"
  }

  return "pending"
}

const updateSteps = (pkg: RunPackage, status: PackageStatus): RunPackage => {
  return {
    ...pkg,
    status,
    steps: pkg.steps.map((step, index) => ({
      ...step,
      status: getStepStatus(status, index),
    })),
  }
}

const buildActivity = (pkg: RunPackage, status: PackageStatus): RunActivity => {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return {
    id: `evt-${pkg.id}-${status}-${Date.now()}`,
    time: timestamp,
    message: `${pkg.name} moved to ${status}`,
    tone: status === "failed" ? "warning" : "info",
  }
}

export function RunLivePanel({
  runId,
  initialPackages,
  initialActivity,
  streaming,
}: {
  runId: string
  initialPackages: RunPackage[]
  initialActivity: RunActivity[]
  streaming: boolean
}) {
  const [packages, setPackages] = useState(initialPackages)
  const [activity, setActivity] = useState(initialActivity)

  useEffect(() => {
    if (!streaming) return

    const timer = setInterval(() => {
      setPackages((prev) => {
        const targetIndex = prev.findIndex((pkg) =>
          streamStatuses.includes(pkg.status)
        )

        if (targetIndex === -1) {
          return prev
        }

        const target = prev[targetIndex]
        const nextStatus = getNextStatus(target)
        const updated = updateSteps(target, nextStatus)
        const activityEntry = buildActivity(target, nextStatus)

        setActivity((prevActivity) =>
          [activityEntry, ...prevActivity].slice(0, 6)
        )

        return prev.map((pkg, index) =>
          index === targetIndex ? updated : pkg
        )
      })
    }, 3500)

    return () => clearInterval(timer)
  }, [streaming])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <PackageTable packages={packages} runId={runId} />
      <div className="flex flex-col gap-6">
        <div
          className={cn(
            "rounded-2xl border border-dashed border-border/70 p-4",
            streaming ? "bg-muted/40" : "bg-background"
          )}
        >
          <p className="text-muted-foreground text-xs">Active step timeline</p>
          <StepTimeline steps={packages[0].steps} />
        </div>
        <ActivityFeed activities={activity} />
      </div>
    </div>
  )
}
