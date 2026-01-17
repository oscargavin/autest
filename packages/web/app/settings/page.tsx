"use client"

import { AppShell } from "@/components/app-shell"
import { SectionHeading } from "@/components/section-heading"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { MoonIcon, SunIcon } from "lucide-react"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <AppShell>
      <SectionHeading
        title="Settings"
        description="Display preferences for the Autest console."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Choose how the console is rendered for demos or reviews.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
              >
                <MoonIcon className="size-4" />
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
              >
                <SunIcon className="size-4" />
                Light
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Dashboard density</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Manage how much detail appears on the run overview screens.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">Compact</Button>
              <Button variant="outline">Comfortable</Button>
              <Button variant="outline">Expanded</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
