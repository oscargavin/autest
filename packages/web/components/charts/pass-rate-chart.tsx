"use client"

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const chartColors = {
  baseline: "hsl(var(--chart-3))",
  informed: "hsl(var(--chart-2))",
}

export function PassRateChart({
  title,
  data,
}: {
  title: string
  data: Array<{ time: string; baseline: number; informed: number }>
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8 }}>
            <XAxis dataKey="time" tickLine={false} axisLine={false} />
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
            <Line
              type="monotone"
              dataKey="baseline"
              stroke={chartColors.baseline}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="informed"
              stroke={chartColors.informed}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
