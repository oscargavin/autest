import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LibraryResultsPanel } from "@/components/library-results-panel"
import { SectionHeading } from "@/components/section-heading"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { PlayIcon, DownloadIcon } from "lucide-react"

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

  return (
    <AppShell>
      <SectionHeading
        title={library}
        description={`${libraryInfo.taskCount} tasks · ${libraryInfo.docCount} doc sections`}
        actions={
          <>
            <StatusBadge status={results ? "evaluated" : "pending"} />
            <Button variant="outline">
              <PlayIcon className="size-4" />
              Run evaluation
            </Button>
            {results && (
              <Button variant="outline">
                <DownloadIcon className="size-4" />
                Export
              </Button>
            )}
          </>
        }
      />

      <LibraryResultsPanel library={library} libraryInfo={libraryInfo} initialResults={results} />
    </AppShell>
  )
}
