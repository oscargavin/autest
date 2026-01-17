"use client"

import { useEffect, useState } from "react"
import { SectionHeading } from "@/components/section-heading"
import { StatusBadge } from "@/components/status-badge"
import { ResultsTable } from "@/components/results-table"
import { formatPercent } from "@/lib/format"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface LibraryInfo {
  name: string
  taskCount: number
  docCount: number
  generatedAt: string | null
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

interface LibraryResultsPanelProps {
  library: string
  libraryInfo: LibraryInfo
  initialResults: EvaluationReport | null
  pollIntervalMs?: number
}

export function LibraryResultsPanel({
  library,
  libraryInfo,
  initialResults,
  pollIntervalMs = 3000,
}: LibraryResultsPanelProps) {
  const [results, setResults] = useState<EvaluationReport | null>(initialResults)
  const [polling, setPolling] = useState(!initialResults)

  useEffect(() => {
    if (!polling) return

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/results/${library}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        setResults(data.results)
        setPolling(false)
      } catch {
        // ignore, keep polling
      }
    }, pollIntervalMs)

    return () => clearInterval(timer)
  }, [library, pollIntervalMs, polling])

  const summary = results?.summary

  return (
    <div className="space-y-4">
      <SectionHeading
        title={library}
        description={`${libraryInfo.taskCount} tasks · ${libraryInfo.docCount} doc sections`}
        actions={<StatusBadge status={results ? "evaluated" : "pending"} />}
      />

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">Total tasks</p>
              <p className="text-2xl font-semibold">{summary.totalTasks}</p>
            </div>
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">Baseline pass rate</p>
              <p className="text-2xl font-semibold">{formatPercent(summary.aFirstPassRate)}</p>
              <p className="text-muted-foreground text-xs">Without documentation</p>
            </div>
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">Informed pass rate</p>
              <p className="text-2xl font-semibold text-green-600">{formatPercent(summary.bFirstPassRate)}</p>
              <p className="text-muted-foreground text-xs">With documentation</p>
            </div>
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">Doc impact</p>
              <p className="text-2xl font-semibold text-blue-600">+{summary.docImpact}%</p>
              <p className="text-muted-foreground text-xs">Percentage point improvement</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">B failed first pass</p>
              <p className="text-xl font-semibold">{summary.bFailedFirstPass}</p>
            </div>
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">Rescued by retry</p>
              <p className="text-xl font-semibold text-amber-600">{summary.bRescuedByRetry}</p>
            </div>
            <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
              <p className="text-muted-foreground text-xs">Final B pass rate</p>
              <p className="text-xl font-semibold text-green-600">{formatPercent(summary.bFinalPassRate)}</p>
            </div>
          </div>

          <SectionHeading
            title="Task results"
            description="Individual task outcomes comparing baseline vs informed variants."
          />

          <ResultsTable results={results.results} />
        </>
      ) : (
        <div className="bg-card border-border/60 rounded-2xl border p-8 text-center">
          <p className="text-muted-foreground">No evaluation results yet.</p>
          <p className="text-muted-foreground text-sm mt-2">
            Results will appear here as soon as evaluation completes.
          </p>
        </div>
      )}
    </div>
  )
}
