"use client"

import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const chartColors = {
  baseline: "#64748b",  // slate-500
  informed: "#10b981",  // emerald-500
}

// Custom tick component for rotated labels
function CustomXAxisTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="end"
        fill="currentColor"
        className="text-xs fill-muted-foreground"
        transform="rotate(-35)"
      >
        {payload.value.length > 16 ? `${payload.value.slice(0, 14)}…` : payload.value}
      </text>
    </g>
  )
}

// Custom tooltip component
interface TooltipPayload {
  value: number
  dataKey: string
  payload: { label: string; baseline: number; informed: number }
}

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload
  const uplift = data.informed - data.baseline

  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-lg min-w-[160px]">
      <p className="font-medium text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: chartColors.baseline }}
            />
            <span className="text-xs text-muted-foreground">Baseline</span>
          </div>
          <span className="text-sm font-medium">{data.baseline}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: chartColors.informed }}
            />
            <span className="text-xs text-muted-foreground">Informed</span>
          </div>
          <span className="text-sm font-medium">{data.informed}%</span>
        </div>
        <div className="border-t border-border pt-1.5 mt-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Uplift</span>
            <span className={`text-sm font-semibold ${uplift > 0 ? 'text-emerald-500' : uplift < 0 ? 'text-red-500' : ''}`}>
              {uplift > 0 ? '+' : ''}{uplift}pp
            </span>
          </div>
        </div>
      </div>
    </div>
  )
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
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ left: 0, right: 16, top: 8, bottom: 60 }}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick x={0} y={0} payload={{ value: '' }} />}
              interval={0}
              height={60}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickCount={6}
              width={32}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.12 }}
            />
            <Legend
              formatter={(value) => value === 'baseline' ? 'Baseline (A)' : 'Informed (B)'}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Bar
              dataKey="baseline"
              name="baseline"
              fill={chartColors.baseline}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="informed"
              name="informed"
              fill={chartColors.informed}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
