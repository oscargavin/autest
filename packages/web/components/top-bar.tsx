"use client"

import { BellIcon, SearchIcon, MoonIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { MobileNav } from "@/components/mobile-nav"
import { StatusPill } from "@/components/status-pill"
import { useTheme } from "@/components/theme-provider"

export function TopBar() {
  const { toggleTheme } = useTheme()

  return (
    <header className="bg-background/80 border-border/60 sticky top-0 z-40 flex items-center gap-4 border-b px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <p className="text-sm font-semibold">Autest Operations</p>
          <p className="text-muted-foreground text-xs">
            Live visibility for model creators
          </p>
        </div>
      </div>
      <div className="ml-auto hidden w-72 lg:block">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search runs, packages" />
        </InputGroup>
      </div>
      <div className="flex items-center gap-3">
        <StatusPill label="Streaming" tone="active" />
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          <MoonIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <BellIcon className="size-4" />
        </Button>
      </div>
    </header>
  )
}
