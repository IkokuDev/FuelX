import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import * as controller from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate('body', registerSchema), controller.registerHandler);
authRouter.post('/login', authLimiter, validate('body', loginSchema), controller.loginHandler);
authRouter.post('/refresh', authLimiter, controller.refreshHandler);
authRouter.post('/logout', requireAuth, controller.logoutHandler);
authRouter.get('/me', requireAuth, controller.meHandler);
