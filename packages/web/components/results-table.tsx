"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/status-badge"
import { CodeBlock } from "@/components/code-block"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Result {
  taskId: string
  docTag: string
  a: {
    passedFirstTry: boolean
    finalCode?: string
  }
  b: {
    passedFirstTry: boolean
    passedAfterRetry: boolean
    totalAttempts: number
    finalCode?: string
  }
}

interface ResultsTableProps {
  results: Result[]
}

function ResultRow({ result }: { result: Result }) {
  const [expanded, setExpanded] = useState(false)

  const aStatus = result.a.passedFirstTry ? "passed" : "failed"
  const bStatus = result.b.passedFirstTry
    ? "passed"
    : result.b.passedAfterRetry
    ? "completed"
    : "failed"

  return (
    <>
      <tr
        className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            )}
            <span className="font-mono text-sm">{result.taskId}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className="font-mono text-sm text-muted-foreground">{result.docTag}</span>
        </td>
        <td className="py-3 px-4">
          <StatusBadge status={aStatus} />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={bStatus} />
            {result.b.totalAttempts > 1 && (
              <span className="text-xs text-muted-foreground">
                ({result.b.totalAttempts} attempts)
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-right">
          {result.b.passedFirstTry && !result.a.passedFirstTry && (
            <span className="text-green-600 text-sm font-medium">+doc win</span>
          )}
          {result.a.passedFirstTry && !result.b.passedFirstTry && (
            <span className="text-amber-600 text-sm font-medium">baseline win</span>
          )}
          {result.b.passedAfterRetry && (
            <span className="text-blue-600 text-sm font-medium">retry saved</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                {result.a.finalCode && (
                  <CodeBlock
                    title={`Baseline (A) - ${result.a.passedFirstTry ? "Passed" : "Failed"}`}
                    content={result.a.finalCode}
                    tone={result.a.passedFirstTry ? "success" : "danger"}
                  />
                )}
              </div>
              <div>
                {result.b.finalCode && (
                  <CodeBlock
                    title={`Informed (B) - ${result.b.passedFirstTry ? "Passed first try" : result.b.passedAfterRetry ? "Passed after retry" : "Failed"}`}
                    content={result.b.finalCode}
                    tone={result.b.passedFirstTry || result.b.passedAfterRetry ? "success" : "danger"}
                  />
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function ResultsTable({ results }: ResultsTableProps) {
  return (
    <div className="bg-card border-border/60 rounded-2xl border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/30 border-b border-border/40">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Task</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Doc Tag</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Baseline (A)</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Informed (B)</th>
            <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Impact</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <ResultRow key={result.taskId} result={result} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
