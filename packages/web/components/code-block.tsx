import { cn } from "@/lib/utils"

export function CodeBlock({
  title,
  content,
  tone = "default",
}: {
  title: string
  content: string
  tone?: "default" | "success" | "warning" | "danger"
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-muted/40 flex flex-col gap-2 rounded-2xl border p-4",
        tone === "success" && "border-emerald-500/30",
        tone === "warning" && "border-amber-500/30",
        tone === "danger" && "border-rose-500/30"
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  )
}
