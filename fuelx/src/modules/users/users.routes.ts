import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './users.controller';
import { pushSubscriptionSchema, updateMeSchema } from './users.schemas';

export const usersRouter = Router();

usersRouter.patch('/me', requireAuth, validate('body', updateMeSchema), controller.updateMeHandler);
usersRouter.post(
  '/me/push-subscription',
  requireAuth,
  validate('body', pushSubscriptionSchema),
  controller.pushSubscriptionHandler,
);
