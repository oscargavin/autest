import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import type { TaskSet, Task, Attempt, ProgressCallback } from './types.js';

const MAX_ITERATIONS_A = 1;
const MAX_ITERATIONS_B = 3;

export interface RunOptions {
  library: string;
  variant: 'a' | 'b' | 'all';
  tasksDir?: string;
  outputDir?: string;
  concurrency?: number;
  onProgress?: ProgressCallback;
}

export interface RunResult {
  attempts: Attempt[];
  summary: {
    totalTasks: number;
    aPassed: number;
    bPassed: number;
  };
}

export function loadTaskSet(library: string, tasksDir = './tasks'): TaskSet {
  const content = readFileSync(`${tasksDir}/${library}/tasks.json`, 'utf-8');
  return JSON.parse(content);
}

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

export async function runTests(options: RunOptions): Promise<RunResult> {
  const {
    library,
    variant,
    tasksDir = './tasks',
    outputDir = './generated',
    concurrency = 10,
    onProgress
  } = options;

  const emit = (stage: string, percent: number, message: string) => {
    onProgress?.({ stage, percent, message });
  };

  emit('init', 0, `Loading task set for ${library}`);
  const taskSet = loadTaskSet(library, tasksDir);

  const totalTasks = taskSet.tasks.length;
  emit('init', 5, `Running ${variant} variant(s) for ${totalTasks} tasks (concurrency: ${concurrency})`);

  let completed = 0;
  const totalVariants = variant === 'all' ? totalTasks * 2 : totalTasks;

  // Build list of work items
  const workItems: Array<{ task: Task; v: 'a' | 'b' }> = [];
  for (const task of taskSet.tasks) {
    if (variant === 'a' || variant === 'all') {
      workItems.push({ task, v: 'a' });
    }
    if (variant === 'b' || variant === 'all') {
      workItems.push({ task, v: 'b' });
    }
  }

  // Run in parallel with concurrency limit
  const attemptArrays = await runWithConcurrency(
    workItems,
    async ({ task, v }) => {
      const attempts = await runTaskVariant(task, v, taskSet);
      completed++;
      emit('run', 5 + (completed / totalVariants) * 90, `${completed}/${totalVariants} (${task.id} [${v.toUpperCase()}])`);
      return attempts;
    },
    concurrency
  );

  const allAttempts = attemptArrays.flat();

  // Save results
  emit('write', 95, 'Writing results...');
  const outDir = `${outputDir}/${library}`;
  mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(
    `${outDir}/attempts-${variant}-${timestamp}.json`,
    JSON.stringify(allAttempts, null, 2)
  );

  // Calculate summary
  const aAttempts = allAttempts.filter(a => a.variant === 'a');
  const bAttempts = allAttempts.filter(a => a.variant === 'b');
  const aPassed = new Set(aAttempts.filter(a => a.passed).map(a => a.taskId)).size;
  const bPassed = new Set(bAttempts.filter(a => a.passed).map(a => a.taskId)).size;

  emit('done', 100, `Complete: A=${aPassed}/${totalTasks}, B=${bPassed}/${totalTasks}`);

  return {
    attempts: allAttempts,
    summary: {
      totalTasks,
      aPassed,
      bPassed
    }
  };
}

export async function runTaskVariant(
  task: Task,
  variant: 'a' | 'b',
  taskSet: TaskSet
): Promise<Attempt[]> {
  const attempts: Attempt[] = [];
  const docSection = taskSet.docs.find(d => d.id === task.docTag);
  const docs = docSection
    ? `## ${docSection.title}\n\n${docSection.content}\n\n\`\`\`javascript\n${docSection.codeExamples.join('\n')}\n\`\`\``
    : '';

  let currentCode = '';
  let passed = false;
  const maxIterations = variant === 'a' ? MAX_ITERATIONS_A : MAX_ITERATIONS_B;

  for (let iteration = 1; iteration <= maxIterations && !passed; iteration++) {
    let prompt: string;
    if (iteration === 1) {
      prompt = variant === 'a' ? buildPromptA(task) : buildPromptB(task, docs);
    } else {
      const lastAttempt = attempts[attempts.length - 1];
      const previousErrors = attempts.map(a => {
        const match = a.testOutput.match(/error: ['"](.*?)['"]|Error: (.*?)(?:\n|$)/);
        return { code: a.code, error: match ? (match[1] || match[2]) : 'Failed' };
      });
      prompt = buildRetryPrompt(
        task,
        lastAttempt.code,
        lastAttempt.testOutput,
        variant === 'b' ? docs : undefined,
        previousErrors,
        task.testCode
      );
    }

    try {
      const { text } = await generateText({
        model: xai('grok-4-1-fast-reasoning'),
        prompt
      });

      currentCode = extractCode(text);
      const testResult = await executeTest(currentCode, task.testCode);

      const attempt: Attempt = {
        taskId: task.id,
        variant,
        iteration,
        code: currentCode,
        testOutput: testResult.output,
        passed: testResult.passed,
        timestamp: new Date().toISOString()
      };

      attempts.push(attempt);
      passed = testResult.passed;
    } catch (err) {
      attempts.push({
        taskId: task.id,
        variant,
        iteration,
        code: currentCode,
        testOutput: String(err),
        passed: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  return attempts;
}

async function executeTest(code: string, testCode: string): Promise<{ passed: boolean; output: string }> {
  const fullCode = `${code}\n\n${testCode}`;
  const testFile = `./generated/temp-test-${Date.now()}.mjs`;

  mkdirSync('./generated', { recursive: true });
  writeFileSync(testFile, fullCode);

  return new Promise((resolve) => {
    const proc = spawn('node', ['--test', testFile], { timeout: 30000 });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      try { unlinkSync(testFile); } catch { }
      resolve({ passed: code === 0, output: stdout + stderr });
    });

    proc.on('error', (err) => {
      resolve({ passed: false, output: err.message });
    });
  });
}

function extractCode(text: string): string {
  const codeBlockMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return text.trim();
}

function buildPromptA(task: Task): string {
  return `Write a JavaScript function that solves this task:

${task.description}

Requirements:
- Write ONLY the function implementation
- Use modern JavaScript (ES modules, async/await)
- The function will be tested with Node.js node:test
- Any library APIs referenced in the task are available as globals (no imports)
- Do NOT import external libraries
- DO NOT IMPORT ANYTHING

Respond with ONLY the function code, no explanations.`;
}

function buildPromptB(task: Task, docs: string): string {
  return `Write a JavaScript function that solves this task:

${task.description}

## Relevant Documentation
${docs}

## Requirements
- Write ONLY the function implementation (export function ...)
- Use modern JavaScript (ES modules, async/await)
- The function will be tested with Node.js node:test
- Follow the patterns shown in the documentation exactly
- Library functions are available as globals in the test environment (no imports needed)
- Do NOT import external libraries

Respond with ONLY the function code, no explanations or imports.`;
}

function buildRetryPrompt(
  task: Task,
  previousCode: string,
  testOutput: string,
  docs?: string,
  allPreviousAttempts?: Array<{ code: string; error: string }>,
  testCode?: string
): string {
  const errorMatch = testOutput.match(/error: ['"](.*?)['"]|Error: (.*?)(?:\n|$)|error: \|-\n\s+(.*?)(?:\n|$)/);
  const keyError = errorMatch ? (errorMatch[1] || errorMatch[2] || errorMatch[3]) : 'Test failed';

  let prompt = `Your previous solution failed. Let's debug this systematically.

## The Error
${keyError}

## Your Previous Code
\`\`\`javascript
${previousCode}
\`\`\`

## Task
${task.description}
`;

  if (allPreviousAttempts && allPreviousAttempts.length > 1) {
    prompt += `
## Previous Attempts (don't repeat these mistakes)
${allPreviousAttempts.slice(0, -1).map((a, i) =>
      `Attempt ${i + 1}: ${a.error.slice(0, 100)}...`
    ).join('\n')}
`;
  }

  if (docs) {
    prompt += `
## Relevant Documentation
Study this carefully - the API patterns here are correct:
${docs}
`;
  }

  if (testCode && allPreviousAttempts && allPreviousAttempts.length >= 1) {
    prompt += `
## Actual Test Code (study this carefully!)
\`\`\`javascript
${testCode}
\`\`\`
`;
  }

  prompt += `
## Test Environment Notes
- Functions from the library are mocked globally (no imports needed)
- Use the function names directly as shown in docs
- DON'T add async unless the return value needs to be awaited
 - Do NOT import external libraries

## Instructions
1. First, explain in one sentence WHY your code failed
2. Then provide the corrected code

Format your response as:
ANALYSIS: [one sentence explaining the root cause]

\`\`\`javascript
[corrected code]
\`\`\``;

  return prompt;
}
