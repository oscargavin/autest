import { AppShell } from "@/components/app-shell"
import { MetricCard } from "@/components/metric-card"
import { SectionHeading } from "@/components/section-heading"
import { LibraryCard } from "@/components/library-card"
import { PassSplitChart } from "@/components/charts/pass-split-chart"
import { formatDelta, formatPercent } from "@/lib/format"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

export default async function DashboardPage() {
  const [libraries, jobs] = await Promise.all([
    getLibraries(),
    getJobs(),
  ])

  // Fetch results for all libraries
  const librariesWithResults = await Promise.all(
    libraries.map(async (lib: { name: string; taskCount: number; docCount: number }) => {
      const results = await getResults(lib.name)
      return { ...lib, results }
    })
  )

  const activeJobs = jobs.filter((j: { status: string }) => j.status === 'running' || j.status === 'pending')
  const completedLibraries = librariesWithResults.filter((l) => l.results)

  // Calculate aggregate stats
  const avgBaseline = completedLibraries.length > 0
    ? Math.round(completedLibraries.reduce((sum, l) => sum + (l.results?.summary?.aFirstPassRate || 0), 0) / completedLibraries.length)
    : 0
  const avgInformed = completedLibraries.length > 0
    ? Math.round(completedLibraries.reduce((sum, l) => sum + (l.results?.summary?.bFirstPassRate || 0), 0) / completedLibraries.length)
    : 0
  const avgUplift = avgInformed - avgBaseline

  // Chart data from completed evaluations
  const chartData = completedLibraries.map((lib) => ({
    label: lib.name,
    baseline: lib.results?.summary?.aFirstPassRate || 0,
    informed: lib.results?.summary?.bFirstPassRate || 0,
  }))

  return (
    <AppShell>
      <SectionHeading
        title="Dashboard"
        description="Documentation impact measurement across libraries."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Libraries"
          value={`${libraries.length}`}
          delta={`${completedLibraries.length} evaluated`}
        />
        <MetricCard
          title="Active jobs"
          value={`${activeJobs.length}`}
          delta={`${jobs.length} total`}
        />
        <MetricCard
          title="Avg baseline pass"
          value={formatPercent(avgBaseline)}
        />
        <MetricCard
          title="Avg doc uplift"
          value={formatPercent(avgUplift)}
          delta={formatDelta(avgUplift)}
        />
      </div>

      {chartData.length > 0 && (
        <PassSplitChart title="Baseline vs Informed" data={chartData} />
      )}

      <SectionHeading
        title="Libraries"
        description="Available libraries for documentation testing."
      />

      {libraries.length === 0 ? (
        <div className="bg-card border-border/60 rounded-2xl border p-8 text-center">
          <p className="text-muted-foreground">No libraries found. Generate tasks first.</p>
          <p className="text-muted-foreground text-sm mt-2">
            Run: <code className="bg-muted px-2 py-1 rounded">pnpm daemon</code> then create a generate job.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {librariesWithResults.map((lib) => (
            <LibraryCard key={lib.name} library={lib} />
          ))}
        </div>
      )}
    </AppShell>
  )
}
