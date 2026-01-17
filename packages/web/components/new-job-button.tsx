"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlusIcon, SearchIcon, PackageIcon, Loader2Icon } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Library {
  name: string
  taskCount: number
  docCount: number
}

interface NpmPackage {
  name: string
  description: string
  version: string
}

interface NewJobButtonProps {
  libraries: Library[]
}

type JobType = 'generate' | 'run' | 'evaluate' | 'export'

async function searchNpm(query: string): Promise<NpmPackage[]> {
  if (!query || query.length < 2) return []

  try {
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.objects.map((obj: { package: NpmPackage }) => ({
      name: obj.package.name,
      description: obj.package.description || '',
      version: obj.package.version,
    }))
  } catch {
    return []
  }
}

export function NewJobButton({ libraries }: NewJobButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<JobType>('generate')

  // Package selection
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NpmPackage[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounced npm search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const results = await searchNpm(searchQuery)
      setSearchResults(results)
      setSearching(false)
      setShowResults(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelectPackage = (pkg: NpmPackage) => {
    setSelectedPackage(pkg.name)
    setSearchQuery(pkg.name)
    setShowResults(false)
  }

  const handleSelectExisting = (name: string) => {
    setSelectedPackage(name)
    setSearchQuery(name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackage) return

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, library: selectedPackage }),
      })

      if (res.ok) {
        setOpen(false)
        setSearchQuery('')
        setSelectedPackage('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSearchQuery('')
    setSelectedPackage('')
    setSearchResults([])
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
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg">
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

          <div ref={searchRef}>
            <label className="text-sm text-muted-foreground block mb-2">
              Package
            </label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedPackage('')
                }}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                placeholder="Search npm packages..."
                className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2"
              />
              {searching && (
                <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* Search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-w-lg bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((pkg) => (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <PackageIcon className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{pkg.name}</span>
                      <span className="text-xs text-muted-foreground">v{pkg.version}</span>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {pkg.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Existing libraries quick select */}
          {libraries.length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground block mb-2">
                Or select existing
              </label>
              <div className="flex flex-wrap gap-2">
                {libraries.map((lib) => (
                  <button
                    key={lib.name}
                    type="button"
                    onClick={() => handleSelectExisting(lib.name)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedPackage === lib.name
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {lib.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedPackage && (
            <div className="bg-muted/50 rounded-lg px-4 py-3">
              <p className="text-sm">
                Will {selectedType} tasks for <span className="font-semibold">{selectedPackage}</span>
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPackage}>
              {loading ? 'Creating...' : 'Create job'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
