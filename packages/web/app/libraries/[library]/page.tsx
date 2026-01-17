import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { SectionHeading } from "@/components/section-heading"
import { StatusBadge } from "@/components/status-badge"
import { ResultsTable } from "@/components/results-table"
import { LibraryActions } from "@/components/library-actions"
import { formatPercent } from "@/lib/format"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

async function getLibraryInfo(library: string) {
  try {
    const res = await fetch(`${API_BASE}/api/libraries`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.libraries.find((l: { name: string }) => l.name === library)
  } catch {
    return null
  }
}

export default async function LibraryDetailPage({
  params,
}: {
  params: Promise<{ library: string }>
}) {
  const { library } = await params
  const [results, libraryInfo] = await Promise.all([
    getResults(library),
    getLibraryInfo(library),
  ])

  if (!libraryInfo) {
    notFound()
  }

  const summary = results?.summary

  return (
    <AppShell>
      <SectionHeading
        title={library}
        description={`${libraryInfo.taskCount} tasks · ${libraryInfo.docCount} doc sections`}
        actions={
          <>
            <StatusBadge status={results ? "evaluated" : "pending"} />
            <LibraryActions library={library} hasResults={!!results} />
          </>
        }
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
            Click &quot;Run evaluation&quot; to start testing this library.
          </p>
        </div>
      )}
    </AppShell>
  )
}
