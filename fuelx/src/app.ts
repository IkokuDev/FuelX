import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { requestId } from './middleware/request-id';
import { globalLimiter } from './middleware/rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { sendOk } from './lib/response';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId ?? 'unknown',
      autoLogging: { ignore: (req) => req.url === '/healthz' },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Raw-body webhook must be registered before the JSON parser.
  app.use('/api/v1/payments/paystack/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(globalLimiter);

  app.get('/healthz', (_req, res) => {
    sendOk(res, { status: 'ok' });
  });

  app.use('/api/v1', apiRouter);

  const publicDir = path.resolve(process.cwd(), 'public');
  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
