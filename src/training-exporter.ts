import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import type { TaskSet, Attempt } from './types.js';

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

interface ExportStats {
  sftCount: number;
  dpoCount: number;
  bothPass: number;
  aOnlyPass: number;
  bOnlyPass: number;
  bothFail: number;
}

function loadLatestAttempts(library: string): Attempt[] {
  const dir = `./generated/${library}`;
  const files = readdirSync(dir).filter(f => f.startsWith('attempts-') && f.endsWith('.json'));

  if (files.length === 0) {
    throw new Error(`No attempt files found in ${dir}`);
  }

  // Get the most recent file
  const latest = files.sort().pop()!;
  return JSON.parse(readFileSync(`${dir}/${latest}`, 'utf-8'));
}

function loadTaskSet(library: string): TaskSet {
  return JSON.parse(readFileSync(`./tasks/${library}/tasks.json`, 'utf-8'));
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

export function exportTrainingData(library: string): ExportStats {
  console.log(`\n📦 Exporting training data for: ${library}\n`);

  const taskSet = loadTaskSet(library);
  const attempts = loadLatestAttempts(library);

  // Group attempts by task and variant, taking first passing or last attempt
  const taskResults = new Map<string, { a?: Attempt; b?: Attempt }>();

  for (const attempt of attempts) {
    const key = attempt.taskId;
    if (!taskResults.has(key)) {
      taskResults.set(key, {});
    }

    const result = taskResults.get(key)!;
    const current = attempt.variant === 'a' ? result.a : result.b;

    // Keep first passing attempt, or last attempt if none pass
    if (!current || (!current.passed && attempt.passed) || (!current.passed && !attempt.passed)) {
      if (attempt.variant === 'a') {
        result.a = attempt;
      } else {
        result.b = attempt;
      }
    }
  }

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
      // Both pass - use B's solution (with docs context) for SFT
      stats.bothPass++;

      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, true, docContent) },
          { role: 'assistant', content: b!.code }
        ]
      });

      // Also add A's solution as SFT (without docs)
      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, false) },
          { role: 'assistant', content: a!.code }
        ]
      });

    } else if (!aPassed && bPassed) {
      // A failed, B passed - DPO pair (docs helped)
      stats.bOnlyPass++;

      // SFT from B's success
      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, true, docContent) },
          { role: 'assistant', content: b!.code }
        ]
      });

      // DPO pair - same prompt, B chosen over A
      const prompt = buildPrompt(task, false); // Use no-docs prompt for fair comparison
      dpoExamples.push({
        prompt,
        chosen: b!.code,
        rejected: a!.code
      });

    } else if (aPassed && !bPassed) {
      // A passed but B failed (unusual) - just use A for SFT
      stats.aOnlyPass++;

      sftExamples.push({
        messages: [
          { role: 'system', content: 'You are an expert programmer. Write clean, working code.' },
          { role: 'user', content: buildPrompt(task, false) },
          { role: 'assistant', content: a!.code }
        ]
      });

    } else {
      // Both failed - no training value
      stats.bothFail++;
    }
  }

  stats.sftCount = sftExamples.length;
  stats.dpoCount = dpoExamples.length;

  // Write output files
  const outDir = `./training/${library}`;
  mkdirSync(outDir, { recursive: true });

  // SFT as JSONL
  const sftContent = sftExamples.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(`${outDir}/sft.jsonl`, sftContent);

  // DPO as JSONL
  const dpoContent = dpoExamples.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(`${outDir}/dpo.jsonl`, dpoContent);

  // Summary
  console.log('✅ Export complete!\n');
  console.log(`  📁 Output: ${outDir}/`);
  console.log(`  📄 SFT examples: ${stats.sftCount}`);
  console.log(`  🔀 DPO pairs: ${stats.dpoCount}`);
  console.log('\n  Breakdown:');
  console.log(`    Both pass:   ${stats.bothPass} tasks → ${stats.bothPass * 2} SFT`);
  console.log(`    B only pass: ${stats.bOnlyPass} tasks → ${stats.bOnlyPass} SFT + ${stats.bOnlyPass} DPO`);
  console.log(`    A only pass: ${stats.aOnlyPass} tasks → ${stats.aOnlyPass} SFT`);
  console.log(`    Both fail:   ${stats.bothFail} tasks → 0 examples`);

  return stats;
}

async function main() {
  const library = process.argv[2];

  if (!library) {
    console.error('Usage: npm run export -- <library-name>');
    process.exit(1);
  }

  try {
    exportTrainingData(library);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

main();
