import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../../config/env';
import type { StorageProvider, UploadInput, UploadResult } from './types';

const ROOT = path.resolve(process.cwd(), 'uploads');

/** Development storage: writes under uploads/ and serves it at /uploads. */
export const localStorageProvider: StorageProvider = {
  name: 'local',
  async upload(input: UploadInput): Promise<UploadResult> {
    const ext = path.extname(input.filename) || '.bin';
    const safeName = `${crypto.randomUUID()}${ext}`;
    const dir = path.join(ROOT, input.folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, safeName), input.buffer);
    return { url: `${env.PUBLIC_URL}/uploads/${input.folder}/${safeName}` };
  },
};
