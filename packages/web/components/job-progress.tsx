"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ActivityFeed } from "@/components/activity-feed"
import { StepTimeline } from "@/components/step-timeline"
import { DetailCard } from "@/components/detail-card"
import { formatDistanceToNow } from "@/lib/format"
import type { RunActivity, StepStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ProgressEvent {
  stage: string
  percent: number
  message: string
}

interface JobProgressProps {
  jobId: string
  initialProgress: ProgressEvent | null
}

interface TimelineStep {
  id: string
  label: string
  status: StepStatus
  durationMs: number
}

const stageOrder = ["init", "mcp", "generate", "parse", "validate", "write", "run", "evaluate", "export", "done"]

const stageLabels: Record<string, string> = {
  init: "Initialize",
  mcp: "Context7",
  generate: "Generate",
  parse: "Parse",
  validate: "Validate",
  write: "Write",
  run: "Run",
  evaluate: "Evaluate",
  export: "Export",
  done: "Complete",
}

const stageNotes: Record<string, string> = {
  init: "Preparing workspace and inputs.",
  mcp: "Connecting to Context7 documentation.",
  generate: "Synthesizing docs + tasks.",
  parse: "Parsing model output into JSON.",
  validate: "Validating docs + tasks.",
  write: "Persisting tasks + docs files.",
  run: "Executing baseline and informed runs.",
  evaluate: "Computing summary metrics.",
  export: "Writing training examples.",
  done: "Run complete. Results are available.",
}

const stageStatusTone: Record<string, RunActivity["tone"]> = {
  init: "info",
  mcp: "info",
  generate: "info",
  parse: "info",
  validate: "info",
  write: "info",
  run: "warning",
  evaluate: "info",
  export: "info",
  done: "success",
}

const formatStage = (stage?: string) => {
  if (!stage) return "waiting"
  const normalized = stage.toLowerCase()
  return stageLabels[normalized] ?? normalized
}

const getStageKey = (stage?: string) => {
  if (!stage) return "init"
  const normalized = stage.toLowerCase()
  if (normalized.includes("pipeline")) {
    const parts = normalized.split(":")
    return parts[parts.length - 1].trim()
  }
  return normalized.split(" ")[0]
}

const getStageIndex = (key: string) => {
  const index = stageOrder.indexOf(key)
  return index === -1 ? 0 : index
}

const getStepStatus = (index: number, activeIndex: number, isDone: boolean): StepStatus => {
  if (isDone || index < activeIndex) return "complete"
  if (index === activeIndex) return "running"
  return "pending"
}

const buildTimeline = (activeKey: string, lastUpdate: string | null, isDone: boolean): TimelineStep[] => {
  const activeIndex = getStageIndex(activeKey)
  return stageOrder.map((stage, index) => ({
    id: stage,
    label: stageLabels[stage],
    status: getStepStatus(index, activeIndex, isDone),
    durationMs: lastUpdate ? Math.max(400, Date.now() - new Date(lastUpdate).getTime()) : 1200,
  }))
}

export function JobProgress({ jobId, initialProgress }: JobProgressProps) {
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressEvent | null>(initialProgress)
  const [logs, setLogs] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(
    initialProgress ? new Date().toISOString() : null
  )

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/jobs/${jobId}/sse`)

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data) as ProgressEvent
      setProgress(data)
      setLastUpdate(new Date().toISOString())
      setLogs((prev) => [...prev.slice(-19), `[${data.stage}] ${data.message}`])
    })

    eventSource.addEventListener('complete', () => {
      eventSource.close()
      setConnected(false)
      router.refresh()
    })

    eventSource.addEventListener('error', (e) => {
      if (e instanceof MessageEvent) {
        const data = JSON.parse(e.data)
        setLogs((prev) => [...prev, `Error: ${data.error}`])
      }
      eventSource.close()
      setConnected(false)
      router.refresh()
    })

    eventSource.onerror = () => {
      eventSource.close()
      setConnected(false)
    }

    return () => {
      eventSource.close()
    }
  }, [jobId, router])

  const stageKey = getStageKey(progress?.stage)
  const stageLabel = formatStage(progress?.stage)
  const stageNote = stageNotes[stageKey] ?? "Working on the current step."
  const isDone = stageKey === "done"
  const timeline = useMemo(
    () => buildTimeline(stageKey, lastUpdate, isDone),
    [stageKey, lastUpdate, isDone]
  )

  const activities = useMemo<RunActivity[]>(() => {
    return logs.map((log, index) => ({
      id: `${jobId}-${index}`,
      time: lastUpdate ? formatDistanceToNow(lastUpdate) : "just now",
      message: log,
      tone: stageStatusTone[stageKey] ?? "info",
    }))
  }, [jobId, logs, lastUpdate, stageKey])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div className="bg-card border-border/60 rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("size-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-muted")} />
              <span className="text-sm font-medium">
                {stageLabel || 'Waiting...'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress?.percent ?? 0}%
            </span>
          </div>

          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>

          {progress?.message && (
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard title="Phase overview" description={stageNote}>
            <StepTimeline steps={timeline} />
          </DetailCard>
          <DetailCard title="Live activity" description="Current job signals as they arrive.">
            {activities.length > 0 ? (
              <ActivityFeed activities={activities.slice(0, 6)} />
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for the first update...</p>
            )}
          </DetailCard>
        </div>
      </div>

      <div className="space-y-4">
        <DetailCard title="Progress notes" description="Recent stage updates.">
          {logs.length > 0 ? (
            <div className="bg-muted/50 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="text-muted-foreground">
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          )}
        </DetailCard>
        <DetailCard title="What happens next" description="Results appear here once complete.">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Tasks and documentation are generated.</li>
            <li>Baseline and informed runs execute.</li>
            <li>Metrics are evaluated and saved.</li>
            <li>Training exports are produced.</li>
          </ul>
        </DetailCard>
      </div>
    </div>
  )
}
