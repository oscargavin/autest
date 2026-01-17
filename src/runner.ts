import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { generateText } from './llm.js';
import { runTestsInSandbox } from './e2b-runner.js';
import type { TaskSet, Task, Attempt } from './types.js';

const MAX_ITERATIONS_A = 1;  // A gets one shot (baseline)
const MAX_ITERATIONS_B = 3;  // B gets retries with feedback

interface RunConfig {
  variant: 'a' | 'b' | 'all';
  library: string;
}

function loadTaskSet(library: string): TaskSet {
  const content = readFileSync(`./tasks/${library}/tasks.json`, 'utf-8');
  return JSON.parse(content);
}

function buildPromptA(task: Task): string {
  return `Write a JavaScript function that solves this task:

${task.description}

Requirements:
- Write ONLY the function implementation
- Use modern JavaScript (ES modules, async/await)
- The function will be tested with Node.js node:test

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
  // Extract the key error from test output
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

  // Show history of attempts to avoid repeating mistakes
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

  // On iteration 2+, show the actual test code to help debug
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

async function extractCode(response: string): Promise<string> {
  const codeBlockMatch = response.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  return response.trim();
}

async function runTaskVariant(
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
    console.log(`  [${variant.toUpperCase()}] Iteration ${iteration}/${maxIterations}`);

    let prompt: string;
    if (iteration === 1) {
      prompt = variant === 'a' ? buildPromptA(task) : buildPromptB(task, docs);
    } else {
      const lastAttempt = attempts[attempts.length - 1];
      // Extract key errors from previous attempts to avoid repeating
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
        task.testCode // Show actual test on retries
      );
    }

    try {
      const response = await generateText(
        'You are a helpful coding assistant that writes concise JavaScript functions.',
        prompt
      );

      currentCode = await extractCode(response);
      const testResult = await runTestsInSandbox(currentCode, task.testCode);

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

      console.log(`    ${passed ? '✓ PASSED' : '✗ FAILED'}`);
    } catch (err) {
      console.error(`    Error: ${err}`);
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

async function runAll(config: RunConfig) {
  const taskSet = loadTaskSet(config.library);
  console.log(`\nRunning ${config.variant} variant(s) for ${taskSet.tasks.length} tasks\n`);

  const allAttempts: Attempt[] = [];

  for (const task of taskSet.tasks) {
    console.log(`\nTask: ${task.id} (${task.docTag})`);
    console.log(`Description: ${task.description.slice(0, 60)}...`);

    if (config.variant === 'a' || config.variant === 'all') {
      const attempts = await runTaskVariant(task, 'a', taskSet);
      allAttempts.push(...attempts);
    }

    if (config.variant === 'b' || config.variant === 'all') {
      const attempts = await runTaskVariant(task, 'b', taskSet);
      allAttempts.push(...attempts);
    }
  }

  // Save results
  const outDir = `./generated/${config.library}`;
  mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(
    `${outDir}/attempts-${config.variant}-${timestamp}.json`,
    JSON.stringify(allAttempts, null, 2)
  );

  // Summary
  const aAttempts = allAttempts.filter(a => a.variant === 'a');
  const bAttempts = allAttempts.filter(a => a.variant === 'b');

  const aTasksPassed = new Set(aAttempts.filter(a => a.passed).map(a => a.taskId)).size;
  const bTasksPassed = new Set(bAttempts.filter(a => a.passed).map(a => a.taskId)).size;

  console.log('\n========== Summary ==========');
  if (aAttempts.length > 0) {
    console.log(`Variant A: ${aTasksPassed}/${taskSet.tasks.length} tasks passed`);
  }
  if (bAttempts.length > 0) {
    console.log(`Variant B: ${bTasksPassed}/${taskSet.tasks.length} tasks passed`);
  }
}

// CLI
const args = process.argv.slice(2);
const variant = (args[0] || 'all') as 'a' | 'b' | 'all';
const library = args[1] || 'node-fetch';

runAll({ variant, library }).catch(console.error);
