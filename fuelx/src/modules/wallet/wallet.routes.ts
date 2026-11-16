import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { topupSchema } from '../payments/payments.schemas';
import * as controller from './wallet.controller';

export const walletRouter = Router();

walletRouter.use(requireAuth, requireRole('customer'));
walletRouter.get('/', controller.getWalletHandler);
walletRouter.post('/topup', validate('body', topupSchema), controller.topupHandler);
