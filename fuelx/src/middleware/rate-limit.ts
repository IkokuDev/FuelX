import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { sendError } from '../lib/response';

const handler = (_req: Request, res: Response): void => {
  sendError(res, 429, 'RATE_LIMITED', 'Too many requests, please slow down');
};

const base = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler,
};

export const globalLimiter = rateLimit({ ...base, max: env.RATE_LIMIT_MAX });

export const authLimiter = rateLimit({ ...base, max: 20 });

export const sealVerifyLimiter = rateLimit({ ...base, max: 30 });

export const geocodeLimiter = rateLimit({ ...base, max: 60 });
