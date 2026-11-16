import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { requireDriverProfile } from '../../middleware/driver-profile';
import { validate } from '../../middleware/validate';
import * as controller from './dispatch.controller';
import {
  offerIdParamSchema,
  acceptOfferSchema,
  declineOfferSchema,
  goOnlineSchema,
  goOfflineSchema,
  updateLocationSchema,
} from './dispatch.schemas';

export const dispatchRouter = Router();

/** All routes here require driver role + approved profile. */
dispatchRouter.use(requireAuth, requireRole('driver'), requireDriverProfile);

// Wrapper to extract driverId from authenticated user
function withDriver(fn: (driverId: string, req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new Error('No user'));
      return;
    }
    fn(req.user.id, req, res, next);
  };
}

// Offer management
dispatchRouter.get('/offer/me', withDriver(controller.getMyOfferHandler));

dispatchRouter.post(
  '/offer/:offerId/accept',
  validate('params', offerIdParamSchema),
  validate('body', acceptOfferSchema),
  withDriver(controller.acceptOfferHandler),
);

dispatchRouter.post(
  '/offer/:offerId/decline',
  validate('params', offerIdParamSchema),
  validate('body', declineOfferSchema),
  withDriver(controller.declineOfferHandler),
);

// Driver availability
dispatchRouter.post(
  '/online',
  validate('body', goOnlineSchema),
  withDriver(controller.goOnlineHandler),
);

dispatchRouter.post(
  '/offline',
  validate('body', goOfflineSchema),
  withDriver(controller.goOfflineHandler),
);

// Location ping (REST fallback, Socket.IO is primary in Phase 7)
dispatchRouter.post(
  '/location',
  validate('body', updateLocationSchema),
  withDriver(controller.updateLocationHandler),
);

// Release current order
dispatchRouter.post('/release', withDriver(controller.releaseOrderHandler));