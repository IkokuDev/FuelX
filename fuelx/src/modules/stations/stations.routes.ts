import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as controller from './stations.controller';
import { createStationSchema, updateStationSchema } from './stations.schemas';

export const stationsRouter = Router();

stationsRouter.use(requireAuth, requireRole('admin'));

stationsRouter.get('/', controller.listHandler);
stationsRouter.post('/', validate('body', createStationSchema), controller.createHandler);
stationsRouter.patch('/:id', validate('body', updateStationSchema), controller.updateHandler);
