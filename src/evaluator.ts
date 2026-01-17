import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import type { TaskSet, Attempt, Result, EvaluationReport } from './types.js';

function loadTaskSet(library: string): TaskSet {
  const content = readFileSync(`./tasks/${library}/tasks.json`, 'utf-8');
  return JSON.parse(content);
}

function loadAttempts(library: string): Attempt[] {
  const dir = `./generated/${library}`;
  const files = readdirSync(dir).filter(f => f.startsWith('attempts-') && f.endsWith('.json'));

  const allAttempts: Attempt[] = [];
  for (const file of files) {
    const content = readFileSync(`${dir}/${file}`, 'utf-8');
    allAttempts.push(...JSON.parse(content));
  }

  return allAttempts;
}

function groupByTask(attempts: Attempt[]): Map<string, Attempt[]> {
  const grouped = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const existing = grouped.get(attempt.taskId) || [];
    existing.push(attempt);
    grouped.set(attempt.taskId, existing);
  }
  return grouped;
}

function evaluateTask(taskId: string, attempts: Attempt[], taskSet: TaskSet): Result {
  const task = taskSet.tasks.find(t => t.id === taskId)!;

  const aAttempts = attempts.filter(a => a.variant === 'a').sort((x, y) => x.iteration - y.iteration);
  const bAttempts = attempts.filter(a => a.variant === 'b').sort((x, y) => x.iteration - y.iteration);

  // A only gets 1 try
  const aFirstTry = aAttempts[0];
  const aPassedFirstTry = aFirstTry?.passed ?? false;

  // B gets multiple tries
  const bFirstTry = bAttempts[0];
  const bPassedFirstTry = bFirstTry?.passed ?? false;
  const bPassedAny = bAttempts.some(a => a.passed);
  const bPassedAfterRetry = !bPassedFirstTry && bPassedAny;

  const bPassingAttempt = bAttempts.find(a => a.passed);

  return {
    taskId,
    docTag: task.docTag,
    a: {
      passedFirstTry: aPassedFirstTry,
      finalCode: aFirstTry?.code
    },
    b: {
      passedFirstTry: bPassedFirstTry,
      passedAfterRetry: bPassedAfterRetry,
      totalAttempts: bAttempts.length,
      finalCode: bPassedAny ? bPassingAttempt!.code : bAttempts[bAttempts.length - 1]?.code
    }
  };
}

function generateReport(library: string): EvaluationReport {
  const taskSet = loadTaskSet(library);
  const attempts = loadAttempts(library);
  const grouped = groupByTask(attempts);

  const results: Result[] = [];
  for (const task of taskSet.tasks) {
    const taskAttempts = grouped.get(task.id) || [];
    if (taskAttempts.length > 0) {
      results.push(evaluateTask(task.id, taskAttempts, taskSet));
    }
  }

  const totalTasks = results.length;

  // Round 1 metrics: First attempt comparison
  const aPassedFirst = results.filter(r => r.a.passedFirstTry).length;
  const bPassedFirst = results.filter(r => r.b.passedFirstTry).length;

  const aFirstPassRate = totalTasks > 0 ? (aPassedFirst / totalTasks) * 100 : 0;
  const bFirstPassRate = totalTasks > 0 ? (bPassedFirst / totalTasks) * 100 : 0;
  const docImpact = bFirstPassRate - aFirstPassRate;

  // Round 2 metrics: B iteration value
  const bFailedFirstPass = results.filter(r => !r.b.passedFirstTry).length;
  const bRescuedByRetry = results.filter(r => r.b.passedAfterRetry).length;
  const iterationValue = bFailedFirstPass > 0 ? (bRescuedByRetry / bFailedFirstPass) * 100 : 0;

  // Final outcome
  const bPassedFinal = results.filter(r => r.b.passedFirstTry || r.b.passedAfterRetry).length;
  const bFinalPassRate = totalTasks > 0 ? (bPassedFinal / totalTasks) * 100 : 0;

  return {
    library,
    generatedAt: taskSet.generatedAt,
    evaluatedAt: new Date().toISOString(),
    summary: {
      totalTasks,
      aFirstPassRate: Math.round(aFirstPassRate * 10) / 10,
      bFirstPassRate: Math.round(bFirstPassRate * 10) / 10,
      docImpact: Math.round(docImpact * 10) / 10,
      bFailedFirstPass,
      bRescuedByRetry,
      iterationValue: Math.round(iterationValue * 10) / 10,
      bFinalPassRate: Math.round(bFinalPassRate * 10) / 10
    },
    results
  };
}

function printReport(report: EvaluationReport) {
  const s = report.summary;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  A/B Evaluation Report: ${report.library.padEnd(35)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tasks: ${String(s.totalTasks).padEnd(44)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  ROUND 1: First Attempt (Doc Impact)                         ║');
  console.log(`║    A (no docs):   ${String(s.aFirstPassRate + '%').padEnd(40)}  ║`);
  console.log(`║    B (with docs): ${String(s.bFirstPassRate + '%').padEnd(40)}  ║`);
  console.log(`║    Doc Impact:    ${String((s.docImpact >= 0 ? '+' : '') + s.docImpact + ' pp').padEnd(40)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  ROUND 2: B Retries (Iteration Value)                        ║');
  console.log(`║    B failed first:  ${String(s.bFailedFirstPass).padEnd(38)}  ║`);
  console.log(`║    Rescued by retry: ${String(s.bRescuedByRetry).padEnd(37)}  ║`);
  console.log(`║    Iteration Value:  ${String(s.iterationValue + '%').padEnd(37)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  FINAL OUTCOME                                               ║');
  console.log(`║    A Final: ${String(s.aFirstPassRate + '%').padEnd(46)}  ║`);
  console.log(`║    B Final: ${String(s.bFinalPassRate + '%').padEnd(46)}  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\nDetailed Results:');
  console.log('─'.repeat(75));
  console.log('Task ID      │ Doc Tag      │ A (1st) │ B (1st) │ B (retry) │ Status');
  console.log('─'.repeat(75));

  for (const r of report.results) {
    const aStatus = r.a.passedFirstTry ? '✓' : '✗';
    const bFirstStatus = r.b.passedFirstTry ? '✓' : '✗';
    const bRetryStatus = r.b.passedAfterRetry ? '✓ rescued' : (r.b.passedFirstTry ? '─' : '✗');

    let outcome = '';
    if (r.a.passedFirstTry && r.b.passedFirstTry) outcome = 'both pass';
    else if (!r.a.passedFirstTry && r.b.passedFirstTry) outcome = 'doc helped';
    else if (!r.a.passedFirstTry && r.b.passedAfterRetry) outcome = 'retry helped';
    else if (r.a.passedFirstTry && !r.b.passedFirstTry) outcome = 'A > B (odd)';
    else outcome = 'both fail';

    console.log(
      `${r.taskId.padEnd(12)} │ ${r.docTag.padEnd(12)} │ ${aStatus.padEnd(7)} │ ${bFirstStatus.padEnd(7)} │ ${bRetryStatus.padEnd(9)} │ ${outcome}`
    );
  }
  console.log('─'.repeat(75));

  // Analysis by doc tag
  const byTag = new Map<string, { aFirst: number; bFirst: number; bFinal: number; total: number }>();
  for (const r of report.results) {
    const existing = byTag.get(r.docTag) || { aFirst: 0, bFirst: 0, bFinal: 0, total: 0 };
    existing.total++;
    if (r.a.passedFirstTry) existing.aFirst++;
    if (r.b.passedFirstTry) existing.bFirst++;
    if (r.b.passedFirstTry || r.b.passedAfterRetry) existing.bFinal++;
    byTag.set(r.docTag, existing);
  }

  console.log('\nBy Documentation Section:');
  for (const [tag, stats] of byTag) {
    console.log(`  ${tag}: A=${stats.aFirst}/${stats.total}, B(1st)=${stats.bFirst}/${stats.total}, B(final)=${stats.bFinal}/${stats.total}`);
  }
}

function main() {
  const library = process.argv[2] || 'node-fetch';

  try {
    const report = generateReport(library);

    // Save report
    mkdirSync('./results', { recursive: true });
    writeFileSync(`./results/${library}.json`, JSON.stringify(report, null, 2));

    printReport(report);
  } catch (err) {
    console.error('Error generating report:', err);
    console.error('Make sure you have run the tests first with: npm run run:all');
  }
}

main();
