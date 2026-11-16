export interface UploadInput {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder: string;
}

export interface UploadResult {
  url: string;
}

export interface StorageProvider {
  name: string;
  upload(input: UploadInput): Promise<UploadResult>;
}
