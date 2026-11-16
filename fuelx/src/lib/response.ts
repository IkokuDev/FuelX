import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export function sendOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  status = 200,
): void {
  res.status(status).json({ success: true, data: items, meta });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}
