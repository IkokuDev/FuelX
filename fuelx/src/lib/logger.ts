import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'otp',
      'otpHash',
      'token',
      'accessToken',
      'refreshToken',
      '*.password',
      '*.otp',
    ],
    censor: '[redacted]',
  },
});

export type Logger = typeof logger;
