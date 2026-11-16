import crypto from 'node:crypto';
import type { StorageProvider, UploadInput, UploadResult } from './types';

interface ParsedCloudinaryUrl {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function parseCloudinaryUrl(url: string): ParsedCloudinaryUrl {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url);
  if (!match) throw new Error('CLOUDINARY_URL must look like cloudinary://key:secret@cloud');
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

function sign(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
}

export function createCloudinaryStorageProvider(cloudinaryUrl: string): StorageProvider {
  const { cloudName, apiKey, apiSecret } = parseCloudinaryUrl(cloudinaryUrl);

  return {
    name: 'cloudinary',
    async upload(input: UploadInput): Promise<UploadResult> {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const folder = `fuelx/${input.folder}`;
      const signature = sign({ folder, timestamp }, apiSecret);

      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(input.buffer)], { type: input.contentType }), input.filename);
      form.append('api_key', apiKey);
      form.append('timestamp', timestamp);
      form.append('folder', folder);
      form.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Cloudinary upload failed with ${res.status}`);
      }
      const body = (await res.json()) as { secure_url: string };
      return { url: body.secure_url };
    },
  };
}
