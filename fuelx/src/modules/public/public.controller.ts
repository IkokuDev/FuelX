import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { publicConfigHandler } from '../pricing/pricing.controller';
import { estimatePrice, getPublicStats, verifySealCode } from './public.service';
import type { EstimateInput } from './public.schemas';

export const configHandler = publicConfigHandler;

export const estimateHandler = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await estimatePrice(req.body as EstimateInput));
});

export const statsHandler = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await getPublicStats());
});

export const sealVerifyHandler = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await verifySealCode(req.params.code));
});
