import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { geocodeLimiter } from '../../middleware/rate-limit';
import * as controller from './geo.controller';
import { geoSearchSchema, geoReverseSchema } from './geo.schemas';

export const geoRouter = Router();

geoRouter.get('/search', geocodeLimiter, validate('query', geoSearchSchema), controller.searchHandler);
geoRouter.get('/reverse', geocodeLimiter, validate('query', geoReverseSchema), controller.reverseHandler);
