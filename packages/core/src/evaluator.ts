import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import type { TaskSet, Attempt, Result, EvaluationReport, ProgressCallback } from './types.js';

export interface EvaluateOptions {
  library: string;
  tasksDir?: string;
  generatedDir?: string;
  resultsDir?: string;
  onProgress?: ProgressCallback;
}

function loadTaskSet(library: string, tasksDir: string): TaskSet {
  const content = readFileSync(`${tasksDir}/${library}/tasks.json`, 'utf-8');
  return JSON.parse(content);
}

function loadAttempts(library: string, generatedDir: string): Attempt[] {
  const dir = `${generatedDir}/${library}`;
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

  const aFirstTry = aAttempts[0];
  const aPassedFirstTry = aFirstTry?.passed ?? false;

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

export function evaluate(options: EvaluateOptions): EvaluationReport {
  const {
    library,
    tasksDir = './tasks',
    generatedDir = './generated',
    resultsDir = './results',
    onProgress
  } = options;

  const emit = (stage: string, percent: number, message: string) => {
    onProgress?.({ stage, percent, message });
  };

  emit('load', 0, 'Loading task set and attempts...');
  const taskSet = loadTaskSet(library, tasksDir);
  const attempts = loadAttempts(library, generatedDir);
  const grouped = groupByTask(attempts);

  emit('evaluate', 20, 'Evaluating results...');
  const results: Result[] = [];
  for (const task of taskSet.tasks) {
    const taskAttempts = grouped.get(task.id) || [];
    if (taskAttempts.length > 0) {
      results.push(evaluateTask(task.id, taskAttempts, taskSet));
    }
  }

  emit('calculate', 60, 'Calculating metrics...');
  const totalTasks = results.length;

  const aPassedFirst = results.filter(r => r.a.passedFirstTry).length;
  const bPassedFirst = results.filter(r => r.b.passedFirstTry).length;

  const aFirstPassRate = totalTasks > 0 ? (aPassedFirst / totalTasks) * 100 : 0;
  const bFirstPassRate = totalTasks > 0 ? (bPassedFirst / totalTasks) * 100 : 0;
  const docImpact = bFirstPassRate - aFirstPassRate;

  const bFailedFirstPass = results.filter(r => !r.b.passedFirstTry).length;
  const bRescuedByRetry = results.filter(r => r.b.passedAfterRetry).length;
  const iterationValue = bFailedFirstPass > 0 ? (bRescuedByRetry / bFailedFirstPass) * 100 : 0;

  const bPassedFinal = results.filter(r => r.b.passedFirstTry || r.b.passedAfterRetry).length;
  const bFinalPassRate = totalTasks > 0 ? (bPassedFinal / totalTasks) * 100 : 0;

  const report: EvaluationReport = {
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

  emit('write', 90, 'Writing report...');
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(`${resultsDir}/${library}.json`, JSON.stringify(report, null, 2));

  emit('done', 100, `Complete: Doc impact ${docImpact >= 0 ? '+' : ''}${Math.round(docImpact)}pp`);

  return report;
}
