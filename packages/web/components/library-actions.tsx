"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlayIcon, DownloadIcon, Loader2Icon, FileTextIcon } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface LibraryActionsProps {
  library: string
  hasResults: boolean
}

export function LibraryActions({ library, hasResults }: LibraryActionsProps) {
  const router = useRouter()
  const [runLoading, setRunLoading] = useState(false)

  const handleRun = async () => {
    setRunLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pipeline', library }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/jobs/${data.job.id}`)
      }
    } finally {
      setRunLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleRun} disabled={runLoading}>
        {runLoading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <PlayIcon className="size-4" />
        )}
        Run pipeline
      </Button>
      {hasResults && (
        <>
          <Button variant="outline" asChild>
            <a href={`${API_BASE}/api/training/${encodeURIComponent(library)}/sft.jsonl`} download>
              <FileTextIcon className="size-4" />
              SFT
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`${API_BASE}/api/training/${encodeURIComponent(library)}/dpo.jsonl`} download>
              <DownloadIcon className="size-4" />
              DPO
            </a>
          </Button>
        </>
      )}
    </>
  )
}
