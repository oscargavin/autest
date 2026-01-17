"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { JobsTable } from "@/components/jobs-table"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Job {
  id: string
  type: string
  library: string
  status: string
  progress: { stage: string; percent: number; message: string } | null
  result: unknown
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface JobsListLiveProps {
  initialJobs: Job[]
}

export function JobsListLive({ initialJobs }: JobsListLiveProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [connected, setConnected] = useState(false)

  const updateJob = useCallback((updatedJob: Job) => {
    setJobs(prev => {
      const index = prev.findIndex(j => j.id === updatedJob.id)
      if (index === -1) {
        // New job - add to beginning
        return [updatedJob, ...prev]
      }
      // Update existing job
      const next = [...prev]
      next[index] = updatedJob
      return next
    })
  }, [])

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/jobs/sse`)

    eventSource.onopen = () => {
      setConnected(true)
    }

    // Initial jobs list
    eventSource.addEventListener('jobs', (e) => {
      const jobsList = JSON.parse(e.data) as Job[]
      setJobs(jobsList)
    })

    // New job created
    eventSource.addEventListener('job:created', (e) => {
      const job = JSON.parse(e.data) as Job
      setJobs(prev => [job, ...prev.filter(j => j.id !== job.id)])
    })

    // Job progress update
    eventSource.addEventListener('job:progress', (e) => {
      const { jobId, progress } = JSON.parse(e.data)
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, progress, status: 'running' } : j
      ))
    })

    // Job completed
    eventSource.addEventListener('job:complete', (e) => {
      const job = JSON.parse(e.data) as Job
      updateJob(job)
    })

    // Job failed
    eventSource.addEventListener('job:error', (e) => {
      const job = JSON.parse(e.data) as Job
      updateJob(job)
    })

    eventSource.onerror = () => {
      setConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [updateJob])

  return (
    <div className="space-y-2">
      {connected && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          Live updates
        </div>
      )}
      <JobsTable jobs={jobs} />
    </div>
  )
}
