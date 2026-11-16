import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { sendError } from '../lib/response';

interface MongoLikeError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  name: string;
  status?: number;
  statusCode?: number;
  type?: string;
  body?: unknown;
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    sendError(res, err.httpStatus, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) details[issue.path.join('.') || '(root)'] = issue.message;
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request', details);
    return;
  }

  const mongoErr = err as MongoLikeError;
  if (mongoErr?.name === 'ValidationError') {
    sendError(res, 400, 'VALIDATION_ERROR', mongoErr.message);
    return;
  }
  if (mongoErr?.name === 'CastError') {
    sendError(res, 400, 'VALIDATION_ERROR', 'Malformed identifier');
    return;
  }
  if (mongoErr?.code === 11000) {
    sendError(res, 409, 'CONFLICT', 'Resource already exists', {
      keys: Object.keys(mongoErr.keyValue ?? {}),
    });
    return;
  }

  // Body-parser and http-errors expose a numeric status in the 4xx range.
  const status = mongoErr?.status ?? mongoErr?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    sendError(
      res,
      status,
      'VALIDATION_ERROR',
      mongoErr.type === 'entity.too.large' ? 'Request body is too large' : 'Invalid request body',
    );
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}

export { AppError };
