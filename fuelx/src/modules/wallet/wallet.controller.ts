import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { getWallet } from './wallet.service';
import { startWalletTopup } from '../payments/payments.service';
import type { TopupInput } from '../payments/payments.schemas';

export const getWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await getWallet(req.user!.id);
  sendOk(res, wallet);
});

export const topupHandler = asyncHandler(async (req: Request, res: Response) => {
  const { amountKobo } = req.body as TopupInput;
  const result = await startWalletTopup(req.user!.id, amountKobo);
  sendOk(res, result, 201);
});
