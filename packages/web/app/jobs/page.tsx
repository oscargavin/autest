import { AppShell } from "@/components/app-shell"
import { SectionHeading } from "@/components/section-heading"
import { JobsTable } from "@/components/jobs-table"
import { NewJobButton } from "@/components/new-job-button"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getJobs() {
  try {
    const res = await fetch(`${API_BASE}/api/jobs`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.jobs
  } catch {
    return []
  }
}

async function getLibraries() {
  try {
    const res = await fetch(`${API_BASE}/api/libraries`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.libraries
  } catch {
    return []
  }
}

export default async function JobsPage() {
  const [jobs, libraries] = await Promise.all([
    getJobs(),
    getLibraries(),
  ])

  return (
    <AppShell>
      <SectionHeading
        title="Jobs"
        description="Task generation, evaluation runs, and exports."
        actions={<NewJobButton libraries={libraries} />}
      />

      {jobs.length === 0 ? (
        <div className="bg-card border-border/60 rounded-2xl border p-8 text-center">
          <p className="text-muted-foreground">No jobs yet.</p>
          <p className="text-muted-foreground text-sm mt-2">
            Create a new job to generate tasks or run evaluations.
          </p>
        </div>
      ) : (
        <JobsTable jobs={jobs} />
      )}
    </AppShell>
  )
}
