import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../lib/logger';

interface MemoryServerHandle {
  getUri(): string;
  stop(): Promise<boolean>;
}

let memoryServer: MemoryServerHandle | null = null;

/**
 * Connect to MongoDB. When MONGODB_URI is empty outside production we boot an
 * in-memory server so the whole app runs with zero external services.
 */
export async function connectDb(uriOverride?: string): Promise<string> {
  let uri = uriOverride ?? env.MONGODB_URI;

  if (!uri) {
    if (env.isProduction) {
      throw new Error('MONGODB_URI is required in production');
    }
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = (await MongoMemoryServer.create()) as unknown as MemoryServerHandle;
    uri = memoryServer.getUri();
    logger.info('Started in-memory MongoDB for development');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info('Connected to MongoDB');
  return uri;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
