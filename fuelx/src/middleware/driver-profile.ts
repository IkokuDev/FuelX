import type { NextFunction, Request, Response } from 'express';
import { DriverProfile } from '../models/driver-profile.model';
import { forbidden, notFound, conflict } from '../lib/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      driverProfile?: Awaited<ReturnType<typeof DriverProfile.findOne>>;
    }
  }
}

/**
 * Require an approved driver profile. Attaches it to req.driverProfile.
 * Must run after requireAuth and requireRole('driver').
 */
export async function requireDriverProfile(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(forbidden('Authentication required'));
      return;
    }
    const profile = await DriverProfile.findOne({ userId: req.user.id });
    if (!profile) {
      next(notFound('Driver profile not found'));
      return;
    }
    if (profile.approvalStatus !== 'approved') {
      next(conflict('NOT_APPROVED', 'Your driver account is not approved yet'));
      return;
    }
    req.driverProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
}