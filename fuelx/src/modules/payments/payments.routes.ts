import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './payments.controller';
import { mockCompleteSchema, referenceParamSchema } from './payments.schemas';

export const paymentsRouter = Router();

// Paystack calls this with no bearer token; the HMAC signature is the credential.
paymentsRouter.post('/paystack/webhook', controller.paystackWebhookHandler);

paymentsRouter.post(
  '/mock/:reference/complete',
  validate('params', referenceParamSchema),
  validate('body', mockCompleteSchema),
  controller.mockCompleteHandler,
);

paymentsRouter.get(
  '/verify/:reference',
  requireAuth,
  validate('params', referenceParamSchema),
  controller.verifyHandler,
);
