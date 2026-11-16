import { env } from '../../config/env';
import { localStorageProvider } from './local';
import { createCloudinaryStorageProvider } from './cloudinary';
import type { StorageProvider } from './types';

export type { StorageProvider, UploadInput, UploadResult } from './types';

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  cached =
    env.STORAGE_DRIVER === 'cloudinary' && env.CLOUDINARY_URL
      ? createCloudinaryStorageProvider(env.CLOUDINARY_URL)
      : localStorageProvider;
  return cached;
}
