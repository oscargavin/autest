"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

export function JobProgress({ jobId, initialProgress }: JobProgressProps) {
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressEvent | null>(initialProgress)
  const [logs, setLogs] = useState<string[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/jobs/${jobId}/sse`)

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data) as ProgressEvent
      setProgress(data)
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

  return (
    <div className="bg-card border-border/60 rounded-2xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
          <span className="text-sm font-medium">
            {progress?.stage || 'Waiting...'}
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

      {logs.length > 0 && (
        <div className="bg-muted/50 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="text-muted-foreground">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
