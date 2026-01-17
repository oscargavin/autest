import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { JobQueue } from './queue.js';
import { registerRoutes } from './routes.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

async function main() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  const queue = new JobQueue();
  registerRoutes(fastify, queue);

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Daemon running at http://localhost:${PORT}`);
    console.log('   Endpoints:');
    console.log('   POST /api/jobs           - Create job');
    console.log('   GET  /api/jobs           - List jobs');
    console.log('   GET  /api/jobs/:id       - Get job');
    console.log('   GET  /api/jobs/:id/sse   - Stream progress');
    console.log('   GET  /api/libraries      - List libraries');
    console.log('   GET  /api/results/:lib   - Get results\n');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
