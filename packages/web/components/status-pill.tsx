import { cn } from "@/lib/utils"

export function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: "active" | "idle"
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "active"
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  )
}
