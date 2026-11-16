import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { addressesRouter } from './modules/addresses/addresses.routes';
import { stationsRouter } from './modules/stations/stations.routes';
import { adminPricingRouter } from './modules/pricing/pricing.routes';
import { geoRouter } from './modules/geo/geo.routes';
import { publicRouter } from './modules/public/public.routes';
import { quotesRouter } from './modules/quotes/quotes.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { walletRouter } from './modules/wallet/wallet.routes';
import { dispatchRouter } from './modules/dispatch/dispatch.routes';

/**
 * Versioned API router. Everything under /api/v1 uses the success/error
 * envelope from the plan.
 */
export const apiRouter = Router();

apiRouter.get('/ping', (_req, res) => {
  res.json({ success: true, data: { pong: true } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/addresses', addressesRouter);
apiRouter.use('/quotes', quotesRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/geo', geoRouter);
apiRouter.use('/admin/stations', stationsRouter);
apiRouter.use('/admin/pricing', adminPricingRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/driver', dispatchRouter);
