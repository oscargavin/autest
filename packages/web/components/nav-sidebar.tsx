"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ActivityIcon,
  GaugeIcon,
  PackageIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react"

export const navItems = [
  { href: "/", label: "Dashboard", icon: GaugeIcon },
  { href: "/jobs", label: "Jobs", icon: ActivityIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-card border-border/60 text-foreground hidden h-screen w-64 flex-col border-r px-5 py-6 lg:sticky lg:top-0 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <Image
          src="/logo.png"
          alt="Autest"
          width={36}
          height={36}
          className="dark:invert"
        />
        <div>
          <p className="text-sm font-semibold">Autest</p>
          <p className="text-muted-foreground text-xs">Doc impact testing</p>
        </div>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto flex items-center gap-2 rounded-2xl border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
        <ZapIcon className="size-4" />
        Daemon: localhost:3001
      </div>
    </aside>
  )
}
