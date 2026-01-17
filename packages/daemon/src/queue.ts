import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { Job, JobType, JobStatus, ProgressEvent } from '@autest/core';
import {
  generateTaskSuite,
  runTests,
  evaluate,
  exportTrainingData
} from '@autest/core';

export class JobQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private processing = false;
  private queue: string[] = [];

  createJob(type: JobType, library: string): Job {
    const job: Job = {
      id: randomUUID(),
      type,
      library,
      status: 'pending',
      progress: null,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this.processNext();

    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const jobId = this.queue.shift()!;
    const job = this.jobs.get(jobId)!;

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.emit('job:start', job);

    const onProgress = (event: ProgressEvent) => {
      job.progress = event;
      this.emit('job:progress', job, event);
    };

    try {
      let result: unknown;

      switch (job.type) {
        case 'generate':
          result = await generateTaskSuite({
            library: job.library,
            onProgress
          });
          break;

        case 'run':
          result = await runTests({
            library: job.library,
            variant: 'all',
            onProgress
          });
          break;

        case 'evaluate':
          result = evaluate({
            library: job.library,
            onProgress
          });
          break;

        case 'export':
          result = exportTrainingData({
            library: job.library,
            onProgress
          });
          break;
      }

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      this.emit('job:complete', job);

    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date().toISOString();
      this.emit('job:error', job, err);
    }

    this.processing = false;
    this.processNext();
  }
}
