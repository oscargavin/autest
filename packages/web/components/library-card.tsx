import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import { formatPercent } from "@/lib/format"
import { ArrowRightIcon, FileTextIcon, ListChecksIcon } from "lucide-react"

interface LibraryCardProps {
  library: {
    name: string
    taskCount: number
    docCount: number
    generatedAt: string | null
    results?: {
      summary: {
        aFirstPassRate: number
        bFirstPassRate: number
        docImpact: number
        bFinalPassRate: number
      }
    } | null
  }
}

export function LibraryCard({ library }: LibraryCardProps) {
  const hasResults = !!library.results
  const summary = library.results?.summary

  return (
    <Link
      href={`/libraries/${library.name}`}
      className="bg-card border-border/60 hover:border-border group flex flex-col gap-4 rounded-2xl border p-5 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{library.name}</h3>
          <p className="text-muted-foreground text-sm">
            {library.taskCount} tasks &middot; {library.docCount} docs
          </p>
        </div>
        <StatusBadge status={hasResults ? "evaluated" : "pending"} />
      </div>

      {hasResults && summary ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-muted-foreground text-xs">Baseline</p>
            <p className="font-semibold">{formatPercent(summary.aFirstPassRate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Informed</p>
            <p className="font-semibold text-green-600">{formatPercent(summary.bFirstPassRate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Uplift</p>
            <p className="font-semibold text-blue-600">+{summary.docImpact}%</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <ListChecksIcon className="size-4" />
            {library.taskCount} tasks ready
          </span>
          <span className="flex items-center gap-1">
            <FileTextIcon className="size-4" />
            {library.docCount} doc sections
          </span>
        </div>
      )}

      <div className="flex items-center justify-end text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        View details
        <ArrowRightIcon className="size-4 ml-1" />
      </div>
    </Link>
  )
}
