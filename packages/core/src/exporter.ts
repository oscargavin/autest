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

export interface ExportStats {
  sftCount: number;
  dpoCount: number;
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
  const taskResults = new Map<string, { a?: Attempt; b?: Attempt }>();

  for (const attempt of attempts) {
    const key = attempt.taskId;
    if (!taskResults.has(key)) {
      taskResults.set(key, {});
    }

    const result = taskResults.get(key)!;
    const current = attempt.variant === 'a' ? result.a : result.b;

    if (!current || (!current.passed && attempt.passed) || (!current.passed && !attempt.passed)) {
      if (attempt.variant === 'a') {
        result.a = attempt;
      } else {
        result.b = attempt;
      }
    }
  }

  emit('generate', 50, 'Generating training examples...');
  const sftExamples: SFTExample[] = [];
  const dpoExamples: DPOExample[] = [];
  const stats: ExportStats = {
    sftCount: 0,
    dpoCount: 0,
    bothPass: 0,
    aOnlyPass: 0,
    bOnlyPass: 0,
    bothFail: 0
  };

  for (const task of taskSet.tasks) {
    const result = taskResults.get(task.id);
    if (!result) continue;

    const { a, b } = result;
    const aPassed = a?.passed ?? false;
    const bPassed = b?.passed ?? false;
    const docContent = getDocSection(taskSet, task.docTag);

    if (aPassed && bPassed) {
      stats.bothPass++;

      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, true, docContent) },
          { role: 'assistant', content: b!.code }
        ]
      });

      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, false) },
          { role: 'assistant', content: a!.code }
        ]
      });

    } else if (!aPassed && bPassed) {
      stats.bOnlyPass++;

      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, true, docContent) },
          { role: 'assistant', content: b!.code }
        ]
      });

      const prompt = buildPrompt(task, false);
      dpoExamples.push({
        prompt,
        chosen: b!.code,
        rejected: a!.code
      });

    } else if (aPassed && !bPassed) {
      stats.aOnlyPass++;

      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, false) },
          { role: 'assistant', content: a!.code }
        ]
      });

    } else {
      stats.bothFail++;
    }
  }

  stats.sftCount = sftExamples.length;
  stats.dpoCount = dpoExamples.length;

  emit('write', 90, 'Writing training files...');
  const outDir = `${trainingDir}/${library}`;
  mkdirSync(outDir, { recursive: true });

  const sftContent = sftExamples.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(`${outDir}/sft.jsonl`, sftContent);

  const dpoContent = dpoExamples.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(`${outDir}/dpo.jsonl`, dpoContent);

  emit('done', 100, `Complete: ${stats.sftCount} SFT, ${stats.dpoCount} DPO`);

  return stats;
}
