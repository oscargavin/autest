import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { SectionHeading } from "@/components/section-heading"
import { StatusBadge } from "@/components/status-badge"
import { JobProgress } from "@/components/job-progress"
import { JobResultsPanel } from "@/components/job-results-panel"
import { formatDistanceToNow } from "@/lib/format"
import Link from "next/link"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getJob(jobId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.job
  } catch {
    return null
  }
}

async function getResults(library: string) {
  try {
    const res = await fetch(`${API_BASE}/api/results/${library}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.results
  } catch {
    return null
  }
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const job = await getJob(jobId)

  if (!job) {
    notFound()
  }

  const isActive = job.status === 'pending' || job.status === 'running'
  const results = job.status === 'completed' ? await getResults(job.library) : null

  return (
    <AppShell>
      <SectionHeading
        title={`Job ${job.id.slice(0, 8)}`}
        description={
          <span>
            {job.type} job for{' '}
            <Link href={`/libraries/${job.library}`} className="text-primary hover:underline">
              {job.library}
            </Link>
          </span>
        }
        actions={<StatusBadge status={job.status} />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs">Type</p>
          <p className="text-xl font-semibold capitalize">{job.type}</p>
        </div>
        <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs">Library</p>
          <p className="text-xl font-semibold">{job.library}</p>
        </div>
        <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-xl font-semibold">{formatDistanceToNow(job.createdAt)}</p>
        </div>
        <div className="bg-card border-border/60 flex flex-col gap-2 rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs">Duration</p>
          <p className="text-xl font-semibold">
            {job.completedAt && job.startedAt
              ? `${Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)}s`
              : job.startedAt
              ? 'In progress...'
              : 'Pending'}
          </p>
        </div>
      </div>

      {isActive && (
        <JobProgress jobId={job.id} initialProgress={job.progress} />
      )}

      {job.error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
          <p className="text-rose-600 font-medium">Error</p>
          <p className="text-rose-600 text-sm mt-1">{job.error}</p>
        </div>
      )}

      <JobResultsPanel initialJob={job} initialResults={results} />
    </AppShell>
  )
}
