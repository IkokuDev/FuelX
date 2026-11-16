import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as controller from './addresses.controller';
import { createAddressSchema, updateAddressSchema } from './addresses.schemas';

export const addressesRouter = Router();

addressesRouter.use(requireAuth, requireRole('customer'));

addressesRouter.get('/', controller.listHandler);
addressesRouter.post('/', validate('body', createAddressSchema), controller.createHandler);
addressesRouter.patch('/:id', validate('body', updateAddressSchema), controller.updateHandler);
addressesRouter.delete('/:id', controller.deleteHandler);
