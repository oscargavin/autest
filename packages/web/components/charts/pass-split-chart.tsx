"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const chartColors = {
  baseline: "hsl(var(--chart-4))",
  informed: "hsl(var(--chart-2))",
}

export function PassSplitChart({
  title,
  data,
}: {
  title: string
  data: Array<{ label: string; baseline: number; informed: number }>
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 16, top: 8 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickCount={6}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                borderRadius: 12,
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.12 }}
            />
            <Bar
              dataKey="baseline"
              fill={chartColors.baseline}
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="informed"
              fill={chartColors.informed}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
