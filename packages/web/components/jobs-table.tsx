"use client"

import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import { formatDistanceToNow } from "@/lib/format"

interface Job {
  id: string
  type: string
  library: string
  status: string
  progress: { stage: string; percent: number; message: string } | null
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface JobsTableProps {
  jobs: Job[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="bg-card border-border/60 rounded-2xl border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/30 border-b border-border/40">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Job ID</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Type</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Library</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Progress</th>
            <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map((job) => (
            <tr
              key={job.id}
              className="border-b border-border/40 hover:bg-muted/30 transition-colors"
            >
              <td className="py-3 px-4">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-mono text-sm text-primary hover:underline"
                >
                  {job.id.slice(0, 8)}
                </Link>
              </td>
              <td className="py-3 px-4">
                <span className="capitalize text-sm">{job.type}</span>
              </td>
              <td className="py-3 px-4">
                <Link
                  href={`/libraries/${job.library}`}
                  className="text-sm hover:underline"
                >
                  {job.library}
                </Link>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={job.status} />
              </td>
              <td className="py-3 px-4">
                {job.status === 'running' && job.progress ? (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${job.progress.percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {job.progress.stage}
                    </span>
                  </div>
                ) : job.error ? (
                  <span className="text-xs text-rose-600 truncate max-w-48 block">
                    {job.error}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                {formatDistanceToNow(job.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
