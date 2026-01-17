import { ReactNode } from "react"
import { NavSidebar } from "@/components/nav-sidebar"
import { TopBar } from "@/components/top-bar"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/30 text-foreground min-h-screen">
      <div className="flex min-h-screen">
        <NavSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
