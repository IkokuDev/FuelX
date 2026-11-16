import http from 'node:http';
import { createApp } from './app';
import { connectDb, disconnectDb } from './db/connect';
import { env } from './config/env';
import { logger } from './lib/logger';
import { attachRealtime } from './realtime/socket';
import { startJobs } from './jobs/scheduler';

async function main(): Promise<void> {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);

  attachRealtime(server);
  startJobs();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'FuelX server listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down');
    server.close();
    await disconnectDb();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal boot error');
  process.exit(1);
});
