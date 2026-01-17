import type { FastifyInstance } from 'fastify';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import type { JobType, Job, ProgressEvent } from '@autest/core';
import type { JobQueue } from './queue.js';

export function registerRoutes(fastify: FastifyInstance, queue: JobQueue) {
  // Create a job
  fastify.post<{
    Body: { type: JobType; library: string };
  }>('/api/jobs', async (request, reply) => {
    const { type, library } = request.body;

    if (!type || !library) {
      return reply.status(400).send({ error: 'type and library required' });
    }

    const validTypes: JobType[] = ['generate', 'run', 'evaluate', 'export', 'pipeline'];
    if (!validTypes.includes(type)) {
      return reply.status(400).send({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const job = queue.createJob(type, library);
    return { job };
  });

  // List all jobs
  fastify.get('/api/jobs', async () => {
    return { jobs: queue.getAllJobs() };
  });

  // Get a specific job
  fastify.get<{
    Params: { id: string };
  }>('/api/jobs/:id', async (request, reply) => {
    const job = queue.getJob(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    return { job };
  });

  // SSE endpoint for job progress
  fastify.get<{
    Params: { id: string };
  }>('/api/jobs/:id/sse', async (request, reply) => {
    const job = queue.getJob(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial state
    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('state', job);

    // If already complete, close immediately
    if (job.status === 'completed' || job.status === 'failed') {
      reply.raw.end();
      return;
    }

    // Listen for updates
    const onProgress = (j: Job, event: ProgressEvent) => {
      if (j.id === job.id) {
        sendEvent('progress', event);
      }
    };

    const onComplete = (j: Job) => {
      if (j.id === job.id) {
        sendEvent('complete', j);
        cleanup();
        reply.raw.end();
      }
    };

    const onError = (j: Job, err: unknown) => {
      if (j.id === job.id) {
        sendEvent('error', { error: j.error });
        cleanup();
        reply.raw.end();
      }
    };

    const cleanup = () => {
      queue.off('job:progress', onProgress);
      queue.off('job:complete', onComplete);
      queue.off('job:error', onError);
    };

    queue.on('job:progress', onProgress);
    queue.on('job:complete', onComplete);
    queue.on('job:error', onError);

    // Handle client disconnect
    request.raw.on('close', cleanup);
  });

  // List available libraries (from tasks/ directory)
  fastify.get('/api/libraries', async () => {
    const tasksDir = './tasks';
    if (!existsSync(tasksDir)) {
      return { libraries: [] };
    }

    const libraries = readdirSync(tasksDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const taskFile = `${tasksDir}/${d.name}/tasks.json`;
        if (existsSync(taskFile)) {
          try {
            const data = JSON.parse(readFileSync(taskFile, 'utf-8'));
            return {
              name: d.name,
              taskCount: data.tasks?.length || 0,
              docCount: data.docs?.length || 0,
              generatedAt: data.generatedAt
            };
          } catch {
            return { name: d.name, taskCount: 0, docCount: 0, generatedAt: null };
          }
        }
        return null;
      })
      .filter(Boolean);

    return { libraries };
  });

  // Get results for a library
  fastify.get<{
    Params: { library: string };
  }>('/api/results/:library', async (request, reply) => {
    const { library } = request.params;
    const resultFile = `./results/${library}.json`;

    if (!existsSync(resultFile)) {
      return reply.status(404).send({ error: 'Results not found' });
    }

    try {
      const data = JSON.parse(readFileSync(resultFile, 'utf-8'));
      return { results: data };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to read results' });
    }
  });

  // Get training data stats for a library
  fastify.get<{
    Params: { library: string };
  }>('/api/training/:library', async (request, reply) => {
    const { library } = request.params;
    const trainingDir = `./training/${library}`;

    if (!existsSync(trainingDir)) {
      return reply.status(404).send({ error: 'Training data not found' });
    }

    const sftFile = `${trainingDir}/sft.jsonl`;
    const dpoFile = `${trainingDir}/dpo.jsonl`;

    const stats = {
      sftCount: 0,
      dpoCount: 0,
      sftExamples: [] as unknown[],
      dpoExamples: [] as unknown[]
    };

    if (existsSync(sftFile)) {
      const lines = readFileSync(sftFile, 'utf-8').trim().split('\n').filter(Boolean);
      stats.sftCount = lines.length;
      stats.sftExamples = lines.slice(0, 5).map(l => JSON.parse(l));
    }

    if (existsSync(dpoFile)) {
      const lines = readFileSync(dpoFile, 'utf-8').trim().split('\n').filter(Boolean);
      stats.dpoCount = lines.length;
      stats.dpoExamples = lines.slice(0, 5).map(l => JSON.parse(l));
    }

    return { training: stats };
  });

  // Download SFT training data
  fastify.get<{
    Params: { library: string };
  }>('/api/training/:library/sft.jsonl', async (request, reply) => {
    const { library } = request.params;
    const sftFile = `./training/${library}/sft.jsonl`;

    if (!existsSync(sftFile)) {
      return reply.status(404).send({ error: 'SFT data not found' });
    }

    const content = readFileSync(sftFile, 'utf-8');
    reply.header('Content-Type', 'application/jsonl');
    reply.header('Content-Disposition', `attachment; filename="${library.replace('/', '-')}-sft.jsonl"`);
    return content;
  });

  // Download DPO training data
  fastify.get<{
    Params: { library: string };
  }>('/api/training/:library/dpo.jsonl', async (request, reply) => {
    const { library } = request.params;
    const dpoFile = `./training/${library}/dpo.jsonl`;

    if (!existsSync(dpoFile)) {
      return reply.status(404).send({ error: 'DPO data not found' });
    }

    const content = readFileSync(dpoFile, 'utf-8');
    reply.header('Content-Type', 'application/jsonl');
    reply.header('Content-Disposition', `attachment; filename="${library.replace('/', '-')}-dpo.jsonl"`);
    return content;
  });
}
