import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from './addresses.service';

export const listHandler = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, { addresses: await listAddresses(req.user!.id) });
});

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, { address: await createAddress(req.user!.id, req.body) }, 201);
});

export const updateHandler = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, { address: await updateAddress(req.user!.id, req.params.id, req.body) });
});

export const deleteHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteAddress(req.user!.id, req.params.id);
  sendOk(res, {});
});
