import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken, loadAuthUser, type AuthContextUser } from '../modules/auth/auth.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthContextUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized();
    }
    const token = header.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    req.user = await loadAuthUser(payload.sub);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuthStrict(req: Request, res: Response, next: NextFunction): void {
  void requireAuth(req, res, next);
}
