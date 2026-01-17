import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import type { TaskSet, Attempt, ProgressCallback } from './types.js';

interface SFTExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

interface DPOExample {
  prompt: string;
  chosen: string;
  rejected: string;
}

// Extended DPO with error context for teaching error correction
interface DPOWithFeedback extends DPOExample {
  rejected_error?: string;
}

export interface ExportStats {
  sftCount: number;
  dpoCount: number;
  dpoFromRetries: number;
  bothPass: number;
  aOnlyPass: number;
  bOnlyPass: number;
  bothFail: number;
}

export interface ExportOptions {
  library: string;
  tasksDir?: string;
  generatedDir?: string;
  trainingDir?: string;
  onProgress?: ProgressCallback;
}

function loadLatestAttempts(library: string, generatedDir: string): Attempt[] {
  const dir = `${generatedDir}/${library}`;
  const files = readdirSync(dir).filter(f => f.startsWith('attempts-') && f.endsWith('.json'));

  if (files.length === 0) {
    throw new Error(`No attempt files found in ${dir}`);
  }

  const latest = files.sort().pop()!;
  return JSON.parse(readFileSync(`${dir}/${latest}`, 'utf-8'));
}

function loadTaskSet(library: string, tasksDir: string): TaskSet {
  return JSON.parse(readFileSync(`${tasksDir}/${library}/tasks.json`, 'utf-8'));
}

function buildPrompt(task: { description: string; testCode: string }, withDocs: boolean, docs?: string): string {
  const base = `Write code to solve this task:

${task.description}

Your code will be tested with this test file:

\`\`\`typescript
${task.testCode}
\`\`\`

Return ONLY the code, no explanations.`;

  if (withDocs && docs) {
    return `${docs}\n\n---\n\n${base}`;
  }

  return base;
}

function getDocSection(taskSet: TaskSet, docTag: string): string {
  const doc = taskSet.docs.find(d => d.id === docTag);
  if (!doc) return '';

  return `## ${doc.title}

${doc.content}

\`\`\`typescript
${doc.codeExamples.join('\n\n')}
\`\`\``;
}

export function exportTrainingData(options: ExportOptions): ExportStats {
  const {
    library,
    tasksDir = './tasks',
    generatedDir = './generated',
    trainingDir = './training',
    onProgress
  } = options;

  const emit = (stage: string, percent: number, message: string) => {
    onProgress?.({ stage, percent, message });
  };

  emit('load', 0, 'Loading data...');
  const taskSet = loadTaskSet(library, tasksDir);
  const attempts = loadLatestAttempts(library, generatedDir);

  emit('process', 20, 'Processing attempts...');

  // Group attempts by task and variant, preserving iteration order
  const attemptsByTask = new Map<string, { a: Attempt[]; b: Attempt[] }>();

  for (const attempt of attempts) {
    if (!attemptsByTask.has(attempt.taskId)) {
      attemptsByTask.set(attempt.taskId, { a: [], b: [] });
    }
    const group = attemptsByTask.get(attempt.taskId)!;
    if (attempt.variant === 'a') {
      group.a.push(attempt);
    } else {
      group.b.push(attempt);
    }
  }

  // Sort each group by iteration
  for (const group of attemptsByTask.values()) {
    group.a.sort((x, y) => x.iteration - y.iteration);
    group.b.sort((x, y) => x.iteration - y.iteration);
  }

  emit('generate', 50, 'Generating training examples...');
  const sftExamples: SFTExample[] = [];
  const dpoExamples: DPOWithFeedback[] = [];
  const stats: ExportStats = {
    sftCount: 0,
    dpoCount: 0,
    dpoFromRetries: 0,
    bothPass: 0,
    aOnlyPass: 0,
    bOnlyPass: 0,
    bothFail: 0
  };

  for (const task of taskSet.tasks) {
    const group = attemptsByTask.get(task.id);
    if (!group) continue;

    const docContent = getDocSection(taskSet, task.docTag);

    // Find best attempts (first passing, or last if none pass)
    const aAttempts = group.a;
    const bAttempts = group.b;

    const aBest = aAttempts.find(a => a.passed) || aAttempts[aAttempts.length - 1];
    const bBest = bAttempts.find(b => b.passed) || bAttempts[bAttempts.length - 1];

    const aPassed = aBest?.passed ?? false;
    const bPassed = bBest?.passed ?? false;

    // Track outcome stats
    if (aPassed && bPassed) stats.bothPass++;
    else if (!aPassed && bPassed) stats.bOnlyPass++;
    else if (aPassed && !bPassed) stats.aOnlyPass++;
    else stats.bothFail++;

    // SFT: Include passing examples with their actual prompts
    if (bPassed) {
      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, true, docContent) },
          { role: 'assistant', content: bBest!.code }
        ]
      });
    }

    if (aPassed) {
      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, false) },
          { role: 'assistant', content: aBest!.code }
        ]
      });
    }

    // DPO: Create pairs from B retries (same prompt, different responses)
    // This is valid DPO: given (task + docs), prefer passing code over failing code
    if (bPassed && bAttempts.length > 1) {
      const bFirst = bAttempts[0];
      const bPassing = bAttempts.find(b => b.passed);

      if (bFirst && bPassing && !bFirst.passed) {
        // Valid DPO pair: same prompt, failed first attempt vs passing attempt
        const prompt = buildPrompt(task, true, docContent);
        dpoExamples.push({
          prompt,
          chosen: bPassing.code,
          rejected: bFirst.code,
          rejected_error: extractErrorSummary(bFirst.testOutput)
        });
        stats.dpoFromRetries++;
      }
    }
  }

  stats.sftCount = sftExamples.length;
  stats.dpoCount = dpoExamples.length;

  emit('write', 90, 'Writing training files...');
  const outDir = `${trainingDir}/${library}`;
  mkdirSync(outDir, { recursive: true });

  const sftContent = sftExamples.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(`${outDir}/sft.jsonl`, sftContent);

  // Write DPO without the extra error field (standard format)
  const dpoContent = dpoExamples.map(e => JSON.stringify({
    prompt: e.prompt,
    chosen: e.chosen,
    rejected: e.rejected
  })).join('\n');
  writeFileSync(`${outDir}/dpo.jsonl`, dpoContent);

  // Also write extended DPO with error context (useful for some training approaches)
  const dpoExtendedContent = dpoExamples.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(`${outDir}/dpo-extended.jsonl`, dpoExtendedContent);

  emit('done', 100, `Complete: ${stats.sftCount} SFT, ${stats.dpoCount} DPO (${stats.dpoFromRetries} from retries)`);

  return stats;
}

function extractErrorSummary(testOutput: string): string {
  // Extract the key error message from TAP output
  const errorMatch = testOutput.match(/error: ['"|\-]?(.*?)(?:\n|$)/i);
  if (errorMatch) {
    return errorMatch[1].trim().slice(0, 200);
  }

  // Fallback: look for assertion errors
  const assertMatch = testOutput.match(/ERR_ASSERTION|AssertionError/);
  if (assertMatch) {
    const lines = testOutput.split('\n');
    const errorLine = lines.find(l => l.includes('error:') || l.includes('expected:'));
    return errorLine?.trim().slice(0, 200) || 'Assertion failed';
  }

  return 'Test failed';
}
