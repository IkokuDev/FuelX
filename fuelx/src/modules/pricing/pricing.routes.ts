import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as controller from './pricing.controller';
import { updatePricingSchema } from './pricing.schemas';

/** Admin pricing, mounted at /admin/pricing. */
export const adminPricingRouter = Router();
adminPricingRouter.use(requireAuth, requireRole('admin'));
adminPricingRouter.get('/', controller.getAdminPricingHandler);
adminPricingRouter.put('/', validate('body', updatePricingSchema), controller.updateAdminPricingHandler);
