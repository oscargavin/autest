"use client"

import { useEffect, useMemo, useState } from "react"
import { ResultsTable } from "@/components/results-table"
import { SectionHeading } from "@/components/section-heading"
import { StatusBadge } from "@/components/status-badge"
import { DetailCard } from "@/components/detail-card"
import { formatPercent } from "@/lib/format"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface Job {
  id: string
  type: string
  library: string
  status: "pending" | "running" | "completed" | "failed"
  progress: { stage: string; percent: number; message: string } | null
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface Result {
  taskId: string
  docTag: string
  a: {
    passedFirstTry: boolean
    finalCode?: string
  }
  b: {
    passedFirstTry: boolean
    passedAfterRetry: boolean
    totalAttempts: number
    finalCode?: string
  }
}

interface EvaluationReport {
  library: string
  generatedAt: string
  evaluatedAt: string
  summary: {
    totalTasks: number
    aFirstPassRate: number
    bFirstPassRate: number
    docImpact: number
    bFailedFirstPass: number
    bRescuedByRetry: number
    iterationValue: number
    bFinalPassRate: number
  }
  results: Result[]
}

interface JobResultsPanelProps {
  initialJob: Job
  initialResults: EvaluationReport | null
  pollIntervalMs?: number
}

export function JobResultsPanel({
  initialJob,
  initialResults,
  pollIntervalMs = 3000,
}: JobResultsPanelProps) {
  const [job, setJob] = useState<Job>(initialJob)
  const [results, setResults] = useState<EvaluationReport | null>(initialResults)
  const [polling, setPolling] = useState(initialJob.status === "pending" || initialJob.status === "running")

  const shouldPoll = polling && !results

  useEffect(() => {
    if (!shouldPoll) return

    const timer = setInterval(async () => {
      try {
        const jobRes = await fetch(`${API_BASE}/api/jobs/${initialJob.id}`, { cache: "no-store" })
        if (jobRes.ok) {
          const data = await jobRes.json()
          setJob(data.job)
        }

        const resultsRes = await fetch(`${API_BASE}/api/results/${initialJob.library}`, { cache: "no-store" })
        if (resultsRes.ok) {
          const data = await resultsRes.json()
          setResults(data.results)
          setPolling(false)
        }
      } catch {
        // swallow errors and keep polling
      }
    }, pollIntervalMs)

    return () => clearInterval(timer)
  }, [initialJob.id, initialJob.library, pollIntervalMs, shouldPoll])

  const summary = results?.summary
  const durationLabel = useMemo(() => {
    if (!job.startedAt) return "Not started"
    const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now()
    const start = new Date(job.startedAt).getTime()
    const seconds = Math.max(0, Math.round((end - start) / 1000))
    return `${seconds}s`
  }, [job.completedAt, job.startedAt])

  if (!results) {
    return (
      <DetailCard
        title="Results"
        description={
          job.status === "failed"
            ? "This job failed before results were generated."
            : "Results will appear here as soon as evaluation completes."
        }
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-muted-foreground">{job.type} job</span>
          </div>
          <span className="text-muted-foreground">Duration: {durationLabel}</span>
        </div>
        {job.error && (
          <p className="text-sm text-rose-600">{job.error}</p>
        )}
      </DetailCard>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Results"
        description={`Evaluation finished for ${results.library}.`}
        actions={<StatusBadge status="evaluated" />}
      />
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
            <p className="text-muted-foreground text-xs">Total tasks</p>
            <p className="text-2xl font-semibold">{summary.totalTasks}</p>
          </div>
          <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
            <p className="text-muted-foreground text-xs">Baseline pass rate</p>
            <p className="text-2xl font-semibold">{formatPercent(summary.aFirstPassRate)}</p>
          </div>
          <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
            <p className="text-muted-foreground text-xs">Informed pass rate</p>
            <p className="text-2xl font-semibold text-green-600">{formatPercent(summary.bFirstPassRate)}</p>
          </div>
          <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
            <p className="text-muted-foreground text-xs">Doc impact</p>
            <p className="text-2xl font-semibold text-blue-600">+{summary.docImpact}%</p>
          </div>
        </div>
      )}
      <ResultsTable results={results.results} />
    </div>
  )
}
