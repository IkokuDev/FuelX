import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as controller from './quotes.controller';
import { createQuoteSchema } from './quotes.schemas';

export const quotesRouter = Router();

quotesRouter.use(requireAuth, requireRole('customer'));
quotesRouter.post('/', validate('body', createQuoteSchema), controller.createHandler);
