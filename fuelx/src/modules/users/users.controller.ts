import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { savePushSubscription, updateMe } from './users.service';

export const updateMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateMe(req.user!.id, req.body);
  sendOk(res, { user });
});

export const pushSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  await savePushSubscription(req.user!.id, req.body);
  sendOk(res, { saved: true });
});
