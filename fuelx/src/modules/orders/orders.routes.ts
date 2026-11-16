import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as controller from './orders.controller';
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from './orders.schemas';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post(
  '/',
  requireRole('customer'),
  validate('body', createOrderSchema),
  controller.createHandler,
);
ordersRouter.get(
  '/',
  requireRole('customer'),
  validate('query', listOrdersQuerySchema),
  controller.listHandler,
);
// Owner, assigned driver or admin may read the detail, so no role guard here.
ordersRouter.get('/:id', validate('params', orderIdParamSchema), controller.getHandler);
ordersRouter.post(
  '/:id/cancel',
  requireRole('customer'),
  validate('params', orderIdParamSchema),
  validate('body', cancelOrderSchema),
  controller.cancelHandler,
);
