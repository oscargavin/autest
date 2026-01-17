export const formatDuration = (ms: number) => {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.round(ms / 100) / 10
  return `${seconds}s`
}

export const formatPercent = (value: number) => `${value}%`

export const formatDelta = (value: number) => `${value > 0 ? "+" : ""}${value}%`

export const formatDistanceToNow = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
