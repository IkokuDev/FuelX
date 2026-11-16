import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mem: MongoMemoryServer | null = null;

export async function setupTestDb(): Promise<void> {
  if (!mem) {
    mem = await MongoMemoryServer.create();
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mem.getUri());
  }
}

export async function teardownTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mem) {
    await mem.stop();
    mem = null;
  }
}

export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export async function syncIndexes(): Promise<void> {
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}
