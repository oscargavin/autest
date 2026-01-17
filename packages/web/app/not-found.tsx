import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { SectionHeading } from "@/components/section-heading"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <AppShell>
      <SectionHeading
        title="Page not found"
        description="The page you are looking for does not exist."
        actions={
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
    </AppShell>
  )
}
