"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Library {
  name: string
  taskCount: number
  docCount: number
}

interface NewJobButtonProps {
  libraries: Library[]
}

type JobType = 'generate' | 'run' | 'evaluate' | 'export'

export function NewJobButton({ libraries }: NewJobButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<JobType>('evaluate')
  const [selectedLibrary, setSelectedLibrary] = useState(libraries[0]?.name || '')
  const [newLibraryName, setNewLibraryName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const library = selectedType === 'generate' ? newLibraryName : selectedLibrary

    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, library }),
      })

      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        New job
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create new job</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">
              Job type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as JobType)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2"
            >
              <option value="generate">Generate tasks</option>
              <option value="run">Run tests</option>
              <option value="evaluate">Evaluate results</option>
              <option value="export">Export training data</option>
            </select>
          </div>

          {selectedType === 'generate' ? (
            <div>
              <label className="text-sm text-muted-foreground block mb-2">
                Library name (Context7 ID)
              </label>
              <input
                type="text"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
                placeholder="e.g., tanstack-router"
                className="w-full bg-background border border-border rounded-lg px-3 py-2"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-sm text-muted-foreground block mb-2">
                Library
              </label>
              <select
                value={selectedLibrary}
                onChange={(e) => setSelectedLibrary(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2"
                required
              >
                {libraries.length === 0 ? (
                  <option value="">No libraries available</option>
                ) : (
                  libraries.map((lib) => (
                    <option key={lib.name} value={lib.name}>
                      {lib.name} ({lib.taskCount} tasks)
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create job'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
