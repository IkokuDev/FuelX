import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { sealVerifyLimiter } from '../../middleware/rate-limit';
import * as controller from './public.controller';
import { estimateSchema, sealCodeParamSchema } from './public.schemas';

export const publicRouter = Router();

publicRouter.get('/config', controller.configHandler);
publicRouter.post('/estimate', validate('body', estimateSchema), controller.estimateHandler);
publicRouter.get('/stats', controller.statsHandler);
publicRouter.get(
  '/seals/:code/verify',
  sealVerifyLimiter,
  validate('params', sealCodeParamSchema),
  controller.sealVerifyHandler,
);
