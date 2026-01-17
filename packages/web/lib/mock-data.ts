export type RunStatus = "running" | "paused" | "completed"
export type PackageStatus =
  | "queued"
  | "generating"
  | "testing"
  | "comparing"
  | "passed"
  | "failed"
export type StepStatus = "pending" | "running" | "complete"
export type StepId = "queue" | "generate" | "test" | "compare"

export const runSteps: Array<{ id: StepId; label: string }> = [
  { id: "queue", label: "Queue" },
  { id: "generate", label: "Generate" },
  { id: "test", label: "Test" },
  { id: "compare", label: "Compare" },
]

export type PackageInfo = {
  id: string
  name: string
  version: string
  repository: string
  description: string
  category: string
}

export type RunStep = {
  id: StepId
  label: string
  status: StepStatus
  durationMs: number
}

export type PackageResult = {
  passed: boolean
  summary: string
  code: string
  output: string
  error?: string
}

export type RunPackage = PackageInfo & {
  status: PackageStatus
  steps: RunStep[]
  baseline: PackageResult
  informed: PackageResult
}

export type RunSummary = {
  id: string
  name: string
  status: RunStatus
  startedAt: string
  updatedAt: string
  packagesTotal: number
  packagesCompleted: number
  baselinePassRate: number
  informedPassRate: number
  uplift: number
}

export type RunActivity = {
  id: string
  time: string
  message: string
  tone?: "info" | "success" | "warning" | "error"
}

export type ExportJob = {
  id: string
  scope: "run" | "package"
  target: string
  format: string
  status: "queued" | "running" | "completed"
  requestedAt: string
  files: number
  size: string
}

export const packageCatalog: PackageInfo[] = [
  {
    id: "node-fetch",
    name: "node-fetch",
    version: "3.3.2",
    repository: "github.com/node-fetch/node-fetch",
    description: "Fetch API for Node.js",
    category: "http",
  },
  {
    id: "axios",
    name: "axios",
    version: "1.6.8",
    repository: "github.com/axios/axios",
    description: "Promise based HTTP client",
    category: "http",
  },
  {
    id: "lodash",
    name: "lodash",
    version: "4.17.21",
    repository: "github.com/lodash/lodash",
    description: "Utility helpers and collections",
    category: "utilities",
  },
  {
    id: "date-fns",
    name: "date-fns",
    version: "3.6.0",
    repository: "github.com/date-fns/date-fns",
    description: "Modern date utilities",
    category: "utilities",
  },
  {
    id: "zod",
    name: "zod",
    version: "3.22.4",
    repository: "github.com/colinhacks/zod",
    description: "Type-safe schema validation",
    category: "validation",
  },
  {
    id: "chalk",
    name: "chalk",
    version: "5.3.0",
    repository: "github.com/chalk/chalk",
    description: "Terminal string styling",
    category: "cli",
  },
  {
    id: "commander",
    name: "commander",
    version: "12.0.0",
    repository: "github.com/tj/commander.js",
    description: "CLI option parser",
    category: "cli",
  },
  {
    id: "uuid",
    name: "uuid",
    version: "9.0.1",
    repository: "github.com/uuidjs/uuid",
    description: "UUID generation",
    category: "utilities",
  },
  {
    id: "pino",
    name: "pino",
    version: "9.0.0",
    repository: "github.com/pinojs/pino",
    description: "JSON logger",
    category: "logging",
  },
  {
    id: "dotenv",
    name: "dotenv",
    version: "16.4.5",
    repository: "github.com/motdotla/dotenv",
    description: "Environment variable loader",
    category: "config",
  },
]

const baseDurations = [1200, 4200, 2600, 1800]

const codeSamples: Record<
  string,
  {
    baseline: { code: string; output: string; error?: string; passed: boolean }
    informed: { code: string; output: string; error?: string; passed: boolean }
  }
> = {
  "node-fetch": {
    baseline: {
      passed: true,
      output: "Status 200, body length 498",
      code: `import fetch from "node-fetch"

test("basic response", async () => {
  const response = await fetch("https://example.com")
  expect(response.ok).toBe(true)
})`,
    },
    informed: {
      passed: true,
      output: "Parsed JSON payload with 3 keys",
      code: `import fetch from "node-fetch"

test("json response", async () => {
  const response = await fetch("https://example.com/data")
  const payload = await response.json()
  expect(payload).toHaveProperty("id")
})`,
    },
  },
  axios: {
    baseline: {
      passed: false,
      output: "",
      error: "TypeError: Cannot read properties of undefined (reading 'data')",
      code: `import axios from "axios"

test("basic request", async () => {
  const response = await axios.get("https://example.com")
  expect(response.data).toBeDefined()
})`,
    },
    informed: {
      passed: true,
      output: "Status 200, data keys: 5",
      code: `import axios from "axios"

test("response object", async () => {
  const response = await axios.get("https://example.com")
  expect(response.status).toBe(200)
  expect(response.data).toBeTruthy()
})`,
    },
  },
  lodash: {
    baseline: {
      passed: true,
      output: "Array length 3",
      code: `import { uniq } from "lodash"

test("uniq items", () => {
  const result = uniq(["alpha", "alpha", "beta", "gamma"])
  expect(result.length).toBe(3)
})`,
    },
    informed: {
      passed: true,
      output: "Array length 3",
      code: `import { uniq } from "lodash"

test("uniq items", () => {
  const result = uniq(["alpha", "alpha", "beta", "gamma"])
  expect(result).toEqual(["alpha", "beta", "gamma"])
})`,
    },
  },
  "date-fns": {
    baseline: {
      passed: true,
      output: "Parsed date 2025-02-18",
      code: `import { parseISO } from "date-fns"

test("parse iso", () => {
  const result = parseISO("2025-02-18")
  expect(result instanceof Date).toBe(true)
})`,
    },
    informed: {
      passed: true,
      output: "Formatted date 18 Feb 2025",
      code: `import { parseISO, format } from "date-fns"

test("format date", () => {
  const date = parseISO("2025-02-18")
  const value = format(date, "dd MMM yyyy")
  expect(value).toBe("18 Feb 2025")
})`,
    },
  },
  zod: {
    baseline: {
      passed: true,
      output: "Validation succeeded",
      code: `import { z } from "zod"

test("basic validation", () => {
  const schema = z.object({ name: z.string() })
  expect(schema.safeParse({ name: "Riley" }).success).toBe(true)
})`,
    },
    informed: {
      passed: true,
      output: "Validation succeeded",
      code: `import { z } from "zod"

test("schema safety", () => {
  const schema = z.object({ name: z.string().min(2) })
  expect(schema.parse({ name: "Riley" })).toBeTruthy()
})`,
    },
  },
  chalk: {
    baseline: {
      passed: false,
      output: "",
      error: "TypeError: chalk.green is not a function",
      code: `import chalk from "chalk"

test("styles", () => {
  const value = chalk.green("ready")
  expect(value).toContain("ready")
})`,
    },
    informed: {
      passed: true,
      output: "Styled string length 10",
      code: `import chalk from "chalk"

test("styles", () => {
  const value = chalk.bold.green("ready")
  expect(value).toContain("ready")
})`,
    },
  },
  commander: {
    baseline: {
      passed: false,
      output: "",
      error: "Error: unknown option '--name'",
      code: `import { Command } from "commander"

test("flag parsing", () => {
  const program = new Command()
  program.parse(["node", "cli", "--name", "Nova"])
  expect(program.opts()).toHaveProperty("name")
})`,
    },
    informed: {
      passed: true,
      output: "Parsed name: Nova",
      code: `import { Command } from "commander"

test("flag parsing", () => {
  const program = new Command()
  program.option("--name <value>")
  program.parse(["node", "cli", "--name", "Nova"])
  expect(program.opts().name).toBe("Nova")
})`,
    },
  },
  uuid: {
    baseline: {
      passed: true,
      output: "UUID generated",
      code: `import { v4 as uuid } from "uuid"

test("uuid", () => {
  const value = uuid()
  expect(value).toHaveLength(36)
})`,
    },
    informed: {
      passed: true,
      output: "UUID generated",
      code: `import { v4 as uuid, validate } from "uuid"

test("uuid", () => {
  const value = uuid()
  expect(validate(value)).toBe(true)
})`,
    },
  },
  pino: {
    baseline: {
      passed: true,
      output: "Log entry written",
      code: `import pino from "pino"

test("logger", () => {
  const logger = pino()
  logger.info({ service: "api" }, "ready")
  expect(logger.level).toBeDefined()
})`,
    },
    informed: {
      passed: true,
      output: "Log entry written",
      code: `import pino from "pino"

test("logger", () => {
  const logger = pino({ level: "info" })
  logger.info({ service: "api" }, "ready")
  expect(logger.level).toBe("info")
})`,
    },
  },
  dotenv: {
    baseline: {
      passed: false,
      output: "",
      error: "TypeError: Cannot read properties of undefined (reading 'value')",
      code: `import dotenv from "dotenv"

test("load env", () => {
  dotenv.config()
  expect(process.env.API_KEY).toBeDefined()
})`,
    },
    informed: {
      passed: false,
      output: "",
      error: "Missing API_KEY in test environment",
      code: `import dotenv from "dotenv"

test("load env", () => {
  const result = dotenv.config()
  expect(result.parsed).toBeDefined()
})`,
    },
  },
}

const buildSteps = (status: PackageStatus, durations: number[]) => {
  const indexByStatus: Record<PackageStatus, number> = {
    queued: 0,
    generating: 1,
    testing: 2,
    comparing: 3,
    passed: 4,
    failed: 4,
  }

  const activeIndex = indexByStatus[status]

  return runSteps.map((step, index) => {
    let stepStatus: StepStatus = "pending"

    if (index < activeIndex) {
      stepStatus = "complete"
    } else if (index === activeIndex && status !== "passed" && status !== "failed") {
      stepStatus = "running"
    } else if (status === "passed" || status === "failed") {
      stepStatus = "complete"
    }

    return {
      id: step.id,
      label: step.label,
      status: stepStatus,
      durationMs: durations[index] ?? baseDurations[index],
    }
  })
}

const buildRunPackage = (
  packageInfo: PackageInfo,
  status: PackageStatus,
  durations: number[] = baseDurations
): RunPackage => {
  const samples = codeSamples[packageInfo.id]

  return {
    ...packageInfo,
    status,
    steps: buildSteps(status, durations),
    baseline: {
      passed: samples.baseline.passed,
      summary: samples.baseline.passed ? "Baseline passed" : "Baseline failed",
      code: samples.baseline.code,
      output: samples.baseline.output,
      error: samples.baseline.error,
    },
    informed: {
      passed: samples.informed.passed,
      summary: samples.informed.passed ? "Informed passed" : "Informed failed",
      code: samples.informed.code,
      output: samples.informed.output,
      error: samples.informed.error,
    },
  }
}

export const runs: RunSummary[] = [
  {
    id: "run-4821",
    name: "Autest Run 4821",
    status: "running",
    startedAt: "09:12",
    updatedAt: "Just now",
    packagesTotal: 10,
    packagesCompleted: 6,
    baselinePassRate: 40,
    informedPassRate: 70,
    uplift: 30,
  },
  {
    id: "run-4784",
    name: "Autest Run 4784",
    status: "paused",
    startedAt: "08:05",
    updatedAt: "12 min ago",
    packagesTotal: 10,
    packagesCompleted: 4,
    baselinePassRate: 30,
    informedPassRate: 50,
    uplift: 20,
  },
  {
    id: "run-4710",
    name: "Autest Run 4710",
    status: "completed",
    startedAt: "Yesterday",
    updatedAt: "2 hours ago",
    packagesTotal: 10,
    packagesCompleted: 10,
    baselinePassRate: 50,
    informedPassRate: 80,
    uplift: 30,
  },
]

export const runPackagesById: Record<string, RunPackage[]> = {
  "run-4821": [
    buildRunPackage(packageCatalog[0], "comparing"),
    buildRunPackage(packageCatalog[1], "testing"),
    buildRunPackage(packageCatalog[2], "passed"),
    buildRunPackage(packageCatalog[3], "passed"),
    buildRunPackage(packageCatalog[4], "passed"),
    buildRunPackage(packageCatalog[5], "failed"),
    buildRunPackage(packageCatalog[6], "queued"),
    buildRunPackage(packageCatalog[7], "generating"),
    buildRunPackage(packageCatalog[8], "passed"),
    buildRunPackage(packageCatalog[9], "failed"),
  ],
  "run-4784": [
    buildRunPackage(packageCatalog[0], "generating"),
    buildRunPackage(packageCatalog[1], "queued"),
    buildRunPackage(packageCatalog[2], "queued"),
    buildRunPackage(packageCatalog[3], "passed"),
    buildRunPackage(packageCatalog[4], "passed"),
    buildRunPackage(packageCatalog[5], "testing"),
    buildRunPackage(packageCatalog[6], "queued"),
    buildRunPackage(packageCatalog[7], "queued"),
    buildRunPackage(packageCatalog[8], "passed"),
    buildRunPackage(packageCatalog[9], "failed"),
  ],
  "run-4710": packageCatalog.map((item) =>
    buildRunPackage(
      item,
      codeSamples[item.id].informed.passed ? "passed" : "failed"
    )
  ),
}

export const runActivityById: Record<string, RunActivity[]> = {
  "run-4821": [
    {
      id: "evt-001",
      time: "09:18",
      message: "node-fetch moved to compare step",
      tone: "info",
    },
    {
      id: "evt-002",
      time: "09:17",
      message: "axios baseline test failed",
      tone: "warning",
    },
    {
      id: "evt-003",
      time: "09:16",
      message: "lodash informed test passed",
      tone: "success",
    },
    {
      id: "evt-004",
      time: "09:15",
      message: "zod documentation prompt injected",
      tone: "info",
    },
    {
      id: "evt-005",
      time: "09:14",
      message: "queue depth adjusted to 10 packages",
      tone: "info",
    },
  ],
  "run-4784": [
    {
      id: "evt-101",
      time: "08:16",
      message: "run paused by operator",
      tone: "warning",
    },
    {
      id: "evt-102",
      time: "08:14",
      message: "node-fetch moved to generate step",
      tone: "info",
    },
  ],
  "run-4710": [
    {
      id: "evt-201",
      time: "Yesterday",
      message: "run completed with 80% informed pass rate",
      tone: "success",
    },
  ],
}

export const runPassTrends: Record<
  string,
  Array<{ time: string; baseline: number; informed: number }>
> = {
  "run-4821": [
    { time: "09:05", baseline: 20, informed: 30 },
    { time: "09:08", baseline: 30, informed: 45 },
    { time: "09:11", baseline: 35, informed: 55 },
    { time: "09:14", baseline: 40, informed: 60 },
    { time: "09:17", baseline: 40, informed: 70 },
  ],
  "run-4784": [
    { time: "08:02", baseline: 10, informed: 15 },
    { time: "08:06", baseline: 20, informed: 35 },
    { time: "08:10", baseline: 30, informed: 50 },
  ],
  "run-4710": [
    { time: "Yesterday", baseline: 25, informed: 35 },
    { time: "Yesterday", baseline: 40, informed: 60 },
    { time: "Yesterday", baseline: 50, informed: 80 },
  ],
}

export const exportJobs: ExportJob[] = [
  {
    id: "export-01",
    scope: "run",
    target: "Autest Run 4710",
    format: "JSON",
    status: "completed",
    requestedAt: "2 hours ago",
    files: 4,
    size: "28 MB",
  },
  {
    id: "export-02",
    scope: "package",
    target: "node-fetch",
    format: "CSV",
    status: "running",
    requestedAt: "18 min ago",
    files: 1,
    size: "3.2 MB",
  },
  {
    id: "export-03",
    scope: "run",
    target: "Autest Run 4784",
    format: "Parquet",
    status: "queued",
    requestedAt: "5 min ago",
    files: 6,
    size: "42 MB",
  },
]

export const getRunById = (runId: string) =>
  runs.find((run) => run.id === runId) ?? runs[0]

export const getRunPackages = (runId: string) =>
  runPackagesById[runId] ?? runPackagesById[runs[0].id]

export const getRunActivity = (runId: string) =>
  runActivityById[runId] ?? runActivityById[runs[0].id]

export const getRunTrend = (runId: string) =>
  runPassTrends[runId] ?? runPassTrends[runs[0].id]

export const getPackageFromRun = (runId: string, packageId: string) => {
  const packages = getRunPackages(runId)
  return packages.find((item) => item.id === packageId) ?? packages[0]
}
